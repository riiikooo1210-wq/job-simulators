import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import LaptopFrame from '../components/ui/LaptopFrame'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import EmailBlock from '../components/ui/EmailBlock'
import MetricsTable from '../components/ui/MetricsTable'
import SlackMessageEnhanced from '../components/ui/SlackMessageEnhanced'
import MaterialSection from '../components/ui/MaterialSection'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent, CmsSidebarRules, SocialFeed } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { StaticAppTab, StructuredEntryField, StructuredEntryNode } from '../types/game'

interface Props { node: StructuredEntryNode }

type Item = Record<string, string>
type RowGuide = {
  title: string
  sourceHint?: string
  hiddenFields?: string[]
  fieldOverrides?: Record<string, Partial<Omit<StructuredEntryField, 'key'>>>
  fieldValues?: Record<string, string>
}

function interpolateTab(tab: StaticAppTab, ctx: { playerName: string; branchFlags: Record<string, string>; mcSelections: Record<string, string> }): StaticAppTab {
  return {
    ...tab,
    content: interpolate(tab.content, ctx),
    slackMessages: tab.slackMessages?.map((message) => ({
      ...message,
      sender: interpolate(message.sender, ctx),
      role: interpolate(message.role, ctx),
      timestamp: interpolate(message.timestamp, ctx),
      content: interpolate(message.content, ctx),
      avatarInitials: message.avatarInitials ? interpolate(message.avatarInitials, ctx) : undefined,
    })),
    emails: tab.emails?.map((email) => ({
      ...email,
      from: interpolate(email.from, ctx),
      to: interpolate(email.to, ctx),
      subject: interpolate(email.subject, ctx),
      content: interpolate(email.content, ctx),
    })),
    socialPosts: tab.socialPosts?.map((post) => ({
      ...post,
      handle: interpolate(post.handle, ctx),
      displayName: post.displayName ? interpolate(post.displayName, ctx) : undefined,
      timestamp: post.timestamp ? interpolate(post.timestamp, ctx) : undefined,
      content: interpolate(post.content, ctx),
      badge: post.badge ? interpolate(post.badge, ctx) : undefined,
      verification: post.verification ? interpolate(post.verification, ctx) : undefined,
      engagement: post.engagement ? interpolate(post.engagement, ctx) : undefined,
    })),
    cmsSidebarRules: tab.cmsSidebarRules?.map((rule) => ({
      ...rule,
      label: interpolate(rule.label, ctx),
      detail: interpolate(rule.detail, ctx),
    })),
  }
}

function createEmptyItem(fields: StructuredEntryField[], rowGuide?: RowGuide): Item {
  return {
    ...(rowGuide?.fieldValues || {}),
    ...Object.fromEntries(fields.map((f) => [f.key, rowGuide?.fieldValues?.[f.key] || ''])),
    ...(rowGuide?.title ? { rowTitle: rowGuide.title } : {}),
  } as Item
}

function parseItems(raw: string, fields: StructuredEntryField[], initialCount: number, rowGuides?: RowGuide[]): Item[] {
  if (!raw) return Array.from({ length: initialCount }, (_unused, idx) =>
    createEmptyItem(fields, rowGuides?.[idx])
  )
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const normalizedParsed = [...parsed]
      const proofRowIndex = rowGuides?.findIndex((rowGuide) =>
        rowGuide.title === 'Proof and publish limits' || rowGuide.title === 'Safe fact and unsafe claim'
      ) ?? -1
      if (proofRowIndex >= 0) {
        const confirmedFact = parsed.find((item) => item?.rowTitle === 'Confirmed fact from the given sources')
        const claimToLeaveOut = parsed.find((item) => item?.rowTitle === 'Unconfirmed claim to leave out')
        if (confirmedFact || claimToLeaveOut) {
          normalizedParsed[proofRowIndex] = {
            rowTitle: rowGuides?.[proofRowIndex]?.title || 'Safe fact and unsafe claim',
            need: confirmedFact?.need || normalizedParsed[proofRowIndex]?.need || '',
            source: confirmedFact?.source || normalizedParsed[proofRowIndex]?.source || '',
            question: claimToLeaveOut?.need || normalizedParsed[proofRowIndex]?.question || '',
            risk: claimToLeaveOut?.risk || normalizedParsed[proofRowIndex]?.risk || '',
          }
        }
      }

      return Array.from({ length: initialCount }, (_unused, idx) => normalizedParsed[idx] || {}).map((item, idx) => {
        const rowGuide = rowGuides?.[idx]
        const normalized = { ...(item || {}) } as Item
        rowGuide?.hiddenFields?.forEach((key) => {
          delete normalized[key]
        })
        return {
          ...normalized,
          ...(rowGuide?.title && !item?.rowTitle ? { rowTitle: rowGuide.title } : {}),
        }
      })
    }
  } catch {
    // ignore parse error
  }
  return Array.from({ length: initialCount }, (_unused, idx) =>
    createEmptyItem(fields, rowGuides?.[idx])
  )
}

function fieldsForRow(fields: StructuredEntryField[], rowGuide?: RowGuide) {
  const hidden = new Set(rowGuide?.hiddenFields || [])
  return fields
    .filter((field) => !hidden.has(field.key))
    .map((field) => ({
      ...field,
      ...(rowGuide?.fieldOverrides?.[field.key] || {}),
    }))
}

function parseSourceNoteSections(content: string) {
  const sections = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [title = '', ...lines] = block.split('\n').map((line) => line.trim()).filter(Boolean)
      return {
        title,
        bullets: lines.map((line) => line.replace(/^-\s*/, '')).filter(Boolean),
      }
    })

  if (sections.length === 0 || sections.some((section) => section.bullets.length === 0)) return null
  return sections
}

function TextTabContent({ content }: { content: string }) {
  const sections = parseSourceNoteSections(content)
  if (!sections) {
    return (
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {renderContentWithGlossary(content)}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {sections.map((section, index) => (
        <section
          key={`${section.title}-${index}`}
          style={{
            borderBottom: index === sections.length - 1 ? 'none' : '1px solid #E0E0E0',
            paddingBottom: index === sections.length - 1 ? 0 : '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          <strong
            style={{
              fontSize: '0.78rem',
              color: '#202124',
              textTransform: 'uppercase',
              lineHeight: 1.25,
              letterSpacing: '0.02em',
            }}
          >
            {section.title}
          </strong>
          <ul
            style={{
              margin: 0,
              paddingLeft: '1.1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.32rem',
            }}
          >
            {section.bullets.map((bullet, bulletIndex) => (
              <li
                key={`${section.title}-${bulletIndex}`}
                style={{
                  paddingLeft: '0.15rem',
                  minWidth: 0,
                }}
              >
                {renderContentWithGlossary(bullet)}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function DocsToolbar() {
  const selectStyle = {
    border: '1px solid #DADCE0',
    borderRadius: '3px',
    padding: '0.18rem 0.45rem',
    background: '#FFFFFF',
    color: '#3C4043',
    fontSize: '0.68rem',
    lineHeight: 1.2,
    whiteSpace: 'nowrap' as const,
  }
  const buttonStyle = {
    border: '1px solid transparent',
    borderRadius: '3px',
    background: 'transparent',
    color: '#3C4043',
    fontSize: '0.72rem',
    fontWeight: 700,
    minWidth: '1.45rem',
    height: '1.45rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  return (
    <div style={{ background: '#FFFFFF', borderBottom: '1px solid #DADCE0', flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.45rem 0.75rem 0.3rem',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#202124', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Cyclones Game Night Reporting Plan
          </div>
          <div style={{ fontSize: '0.62rem', color: '#5F6368', marginTop: '0.1rem' }}>
            Saved in Full Court Wire
          </div>
        </div>
        <div style={{ fontSize: '0.65rem', color: '#1A73E8', fontWeight: 700, whiteSpace: 'nowrap' }}>
          Editing
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.25rem 0.75rem 0.45rem',
          overflowX: 'auto',
        }}
      >
        <span style={selectStyle}>100%</span>
        <span style={selectStyle}>Normal text</span>
        <span style={selectStyle}>Arial</span>
        <span style={selectStyle}>11</span>
        <span style={{ width: 1, height: 18, background: '#DADCE0', margin: '0 0.18rem' }} />
        <span style={buttonStyle}>B</span>
        <span style={{ ...buttonStyle, fontStyle: 'italic' }}>I</span>
        <span style={{ ...buttonStyle, textDecoration: 'underline' }}>U</span>
        <span style={{ width: 1, height: 18, background: '#DADCE0', margin: '0 0.18rem' }} />
        <span style={selectStyle}>Bullets</span>
        <span style={selectStyle}>Comment</span>
      </div>
    </div>
  )
}

function DocsEditorSurface({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#EEF1F4',
        fontFamily: 'Arial, Inter, system-ui, sans-serif',
        color: '#202124',
      }}
    >
      <DocsToolbar />
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          padding: '1rem',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: 'min(100%, 760px)',
            minHeight: '100%',
            background: '#FFFFFF',
            border: '1px solid #DADCE0',
            boxShadow: '0 1px 4px rgba(60,64,67,0.18)',
            padding: '1.15rem 1.3rem',
            fontSize: '0.8125rem',
            lineHeight: 1.48,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

export default function StructuredEntryScene({ node }: Props) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const [activeAppTab, setActiveAppTab] = useState('editor')

  useEffect(() => {
    setActiveAppTab('editor')
  }, [node.id])

  const def = node.definition
  const initialCount = def.initialCount ?? def.minItems ?? 3
  const items = useMemo(() => {
    return parseItems(responses[def.bindingKey] || '', def.fields, initialCount, def.rowGuides)
  }, [responses, def.bindingKey, def.fields, def.rowGuides, initialCount])

  const updateItem = (idx: number, key: string, value: string) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: value } : it))
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const addItem = () => {
    if (def.maxItems && items.length >= def.maxItems) return
    const next = [...items, createEmptyItem(def.fields, def.rowGuides?.[items.length])]
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const removeItem = (idx: number) => {
    if (def.minItems && items.length <= def.minItems) return
    const next = items.filter((_, i) => i !== idx)
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const allFilled = items.every((it, idx) =>
    fieldsForRow(def.fields, def.rowGuides?.[idx]).every((f) => (it[f.key] || '').trim().length > 0)
  )
  const rowCompletion = items.map((it, idx) => {
    const visibleFields = fieldsForRow(def.fields, def.rowGuides?.[idx])
    return {
      title: def.rowGuides?.[idx]?.title || it.rowTitle || `${def.itemLabel} #${idx + 1}`,
      complete: visibleFields.every((f) => (it[f.key] || '').trim().length > 0),
    }
  })
  const completedRows = rowCompletion.filter((row) => row.complete).length
  const unitLabel = def.rowGuides?.length ? 'row' : def.itemLabel.toLowerCase()
  const pluralUnitLabel = items.length === 1 ? unitLabel : `${unitLabel}s`
  const rowCountLabel = `${items.length === 3 ? 'all three' : `all ${items.length}`} ${pluralUnitLabel}`
  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const appTabs = node.appTabs || []
  const titleTabs = appTabs.length > 0
    ? [{ id: 'editor', label: node.windowTitle || node.title }, ...appTabs.map((tab) => ({ id: tab.id, label: tab.label }))]
    : undefined

  const formContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          border: '1px solid #DADCE0',
          borderRadius: '4px',
          background: '#F8FAFC',
          boxShadow: '0 1px 2px rgba(60,64,67,0.12)',
          padding: '0.55rem 0.65rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.42rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '0.74rem', color: '#202124' }}>
            {completedRows}/{items.length} {pluralUnitLabel} complete
          </strong>
          <span style={{ fontSize: '0.68rem', color: '#5F6368', fontWeight: 600 }}>
            Scroll to complete {rowCountLabel}; Submit unlocks when every field is filled.
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {rowCompletion.map((row, idx) => (
            <span
              key={`${row.title}-${idx}`}
              style={{
                border: `1px solid ${row.complete ? '#B7E0C1' : '#E0D4B8'}`,
                borderRadius: '999px',
                background: row.complete ? '#EFF8F1' : '#FFF8E6',
                color: row.complete ? '#1F6B3A' : '#6D5624',
                padding: '0.16rem 0.45rem',
                fontSize: '0.65rem',
                fontWeight: 700,
                lineHeight: 1.25,
                maxWidth: '100%',
              }}
            >
              {row.title}: {row.complete ? 'Done' : 'Needs fields'}
            </span>
          ))}
        </div>
      </div>

      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            border: '1px solid #DADCE0',
            borderRadius: '4px',
            backgroundColor: '#FFFFFF',
            padding: '0.8rem 0.9rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
            <div>
              <strong style={{ fontSize: '0.84rem', color: '#202124' }}>
                {def.rowGuides?.[idx]?.title || item.rowTitle || `${def.itemLabel} #${idx + 1}`}
              </strong>
              {def.rowGuides?.[idx]?.sourceHint && (
                <div style={{ marginTop: '0.22rem', fontSize: '0.72rem', lineHeight: 1.4, color: '#5F6368', fontWeight: 500 }}>
                  {def.rowGuides[idx].sourceHint}
                </div>
              )}
            </div>
            {(!def.minItems || items.length > def.minItems) && (
              <button
                onClick={() => removeItem(idx)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#c0392b',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
              >
                Remove
              </button>
            )}
          </div>
          {fieldsForRow(def.fields, def.rowGuides?.[idx]).map((field) => (
            <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3C4043' }}>{field.label}</label>
              {field.multiline ? (
                <textarea
                  value={item[field.key] || ''}
                  onChange={(e) => updateItem(idx, field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={field.rows ?? 3}
                  style={{
                    padding: '0.45rem 0.55rem',
                    fontSize: '0.8rem',
                    lineHeight: 1.4,
                    fontFamily: 'Arial, Inter, system-ui, sans-serif',
                    border: '1px solid #DADCE0',
                    borderRadius: '3px',
                    backgroundColor: '#fff',
                    color: '#202124',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              ) : (
                <input
                  type="text"
                  value={item[field.key] || ''}
                  onChange={(e) => updateItem(idx, field.key, e.target.value)}
                  placeholder={field.placeholder}
                  style={{
                    padding: '0.45rem 0.55rem',
                    fontSize: '0.8rem',
                    fontFamily: 'Arial, Inter, system-ui, sans-serif',
                    border: '1px solid #DADCE0',
                    borderRadius: '3px',
                    backgroundColor: '#fff',
                    color: '#202124',
                    outline: 'none',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      {(!def.maxItems || items.length < def.maxItems) && (
        <button
          type="button"
          onClick={addItem}
          style={{
            background: '#FFFFFF',
            border: '1px dashed #DADCE0',
            borderRadius: '4px',
            padding: '0.5rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Arial, Inter, system-ui, sans-serif',
            color: '#3C4043',
          }}
        >
          + Add another {def.itemLabel.toLowerCase()}
        </button>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.25rem' }}>
        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => goNext(node)}
            style={{
              border: '1px solid #DADCE0',
              borderRadius: '4px',
              background: '#FFFFFF',
              color: '#3C4043',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.45rem 0.7rem',
              cursor: 'pointer',
            }}
          >
            Skip (dev)
          </button>
        )}
        <button
          type="button"
          onClick={() => goNext(node)}
          disabled={!allFilled}
          style={{
            border: '1px solid transparent',
            borderRadius: '4px',
            background: allFilled ? '#1A73E8' : '#DADCE0',
            color: allFilled ? '#FFFFFF' : '#5F6368',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.45rem 0.85rem',
            cursor: allFilled ? 'pointer' : 'not-allowed',
          }}
        >
          Submit
        </button>
      </div>
    </div>
  )

  const tabContent = (tabId: string) => {
    const rawTab = appTabs.find((candidate) => candidate.id === tabId)
    const tab = rawTab ? interpolateTab(rawTab, { playerName, branchFlags, mcSelections }) : null
    if (!tab) return null
    const isStructured = tab.kind === 'editor_thread' || tab.kind === 'email' || tab.kind === 'game_materials' || tab.kind === 'social_media'
    const messages = tab.slackMessages ?? []
    if (!isStructured) {
      return (
        <DocsEditorSurface>
          <TextTabContent content={tab.content || ''} />
        </DocsEditorSurface>
      )
    }

    return (
      <div
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          margin: '1rem',
          fontSize: '0.8125rem',
          fontFamily: 'Inter, system-ui, sans-serif',
          lineHeight: 1.5,
          color: '#1E1E1A',
          whiteSpace: 'pre-wrap',
          minHeight: 'calc(100% - 2rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {tab.kind === 'editor_thread' && messages.map((message, i) => (
          <SlackMessageEnhanced key={`${message.sender}-${i}`} message={message} initialExpanded showUnreadDot={i === messages.length - 1} />
        ))}
        {tab.kind === 'email' && tab.emails?.map((email, i) => (
          <EmailBlock key={`${email.subject}-${i}`} email={email} initialExpanded={i === 0} />
        ))}
        {tab.kind === 'game_materials' && (
          <>
            {tab.metrics && tab.metrics.length > 0 && (
              <MaterialSection title="Stats Context">
                <MetricsTable metrics={tab.metrics} />
              </MaterialSection>
            )}
            {tab.cmsSidebarRules && tab.cmsSidebarRules.length > 0 && (
              <MaterialSection title="CMS Rules">
                <CmsSidebarRules rules={tab.cmsSidebarRules} />
              </MaterialSection>
            )}
          </>
        )}
        {tab.kind === 'social_media' && tab.socialPosts && <SocialFeed posts={tab.socialPosts} />}
      </div>
    )
  }

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
          {briefing && <ReferenceButton onClick={() => setRefOpen(true)} label="View Briefing" />}
        </div>
        <section
          style={{
            backgroundColor: '#FFFBF1',
            border: '1px solid #000',
            boxShadow: '3px 3px 0 #000',
            padding: '0.875rem 1rem',
            fontSize: '0.875rem',
            lineHeight: 1.55,
            color: '#1E1E1A',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
          }}
        >
          <strong style={{ fontSize: '0.72rem', color: '#3A6B5E', textTransform: 'uppercase' }}>
            Instructions
          </strong>
          {node.content && (
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
            </div>
          )}
          <div style={{ fontWeight: 700, whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.prompt, { playerName, branchFlags, mcSelections }))}
          </div>
        </section>

        {appWindow ? (
          <DesktopOverlay>
            <LaptopFrame
              variant={appWindow}
              title={node.windowTitle}
              fill
              scrollable
              titleTabs={titleTabs}
              activeTitleTabId={activeAppTab}
              onTitleTabChange={setActiveAppTab}
            >
              {activeAppTab === 'editor' ? (
                <DocsEditorSurface>{formContent}</DocsEditorSurface>
              ) : tabContent(activeAppTab)}
            </LaptopFrame>
          </DesktopOverlay>
        ) : (
          formContent
        )}
      </motion.div>
      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
