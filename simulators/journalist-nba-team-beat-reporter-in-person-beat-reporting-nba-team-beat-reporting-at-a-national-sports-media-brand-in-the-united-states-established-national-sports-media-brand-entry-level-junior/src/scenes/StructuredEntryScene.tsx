import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
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
      return parsed.map((item, idx) => {
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
  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const appTabs = node.appTabs || []
  const titleTabs = appTabs.length > 0
    ? [{ id: 'editor', label: node.windowTitle || node.title }, ...appTabs.map((tab) => ({ id: tab.id, label: tab.label }))]
    : undefined

  const formContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: appWindow ? '1rem' : '0' }}>
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            border: '1px solid #000',
            boxShadow: '4px 4px 0 #000',
            backgroundColor: '#F2EBD9',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
            <div>
              <strong style={{ fontSize: '0.8125rem' }}>
                {def.rowGuides?.[idx]?.title || item.rowTitle || `${def.itemLabel} #${idx + 1}`}
              </strong>
              {def.rowGuides?.[idx]?.sourceHint && (
                <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', lineHeight: 1.45, color: '#5B5546', fontWeight: 600 }}>
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
            <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#444' }}>{field.label}</label>
              {field.multiline ? (
                <textarea
                  value={item[field.key] || ''}
                  onChange={(e) => updateItem(idx, field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={field.rows ?? 3}
                  style={{
                    padding: '0.5rem 0.625rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    color: '#000',
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
                    padding: '0.5rem 0.625rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    color: '#000',
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
          onClick={addItem}
          style={{
            background: '#E8DCC8',
            border: '1px dashed #000',
            padding: '0.625rem 1rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          + Add another {def.itemLabel.toLowerCase()}
        </button>
      )}

      <ActionButton
        text="Submit"
        onClick={() => goNext(node)}
        disabled={!allFilled}
        variant={allFilled ? 'primary' : 'secondary'}
      />
      {import.meta.env.DEV && (
        <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
      )}
    </div>
  )

  const tabContent = (tabId: string) => {
    const rawTab = appTabs.find((candidate) => candidate.id === tabId)
    const tab = rawTab ? interpolateTab(rawTab, { playerName, branchFlags, mcSelections }) : null
    if (!tab) return null
    const isStructured = tab.kind === 'editor_thread' || tab.kind === 'email' || tab.kind === 'game_materials' || tab.kind === 'social_media'
    const messages = tab.slackMessages ?? []
    return (
      <div
        style={{
          background: isStructured ? 'transparent' : '#F7F1E3',
          border: isStructured ? 'none' : '1px solid #CDBF94',
          padding: isStructured ? 0 : '1rem',
          margin: '1rem',
          fontSize: '0.875rem',
          lineHeight: 1.65,
          color: '#1E1E1A',
          whiteSpace: 'pre-wrap',
          minHeight: 'calc(100% - 2rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
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
        {!isStructured && renderContentWithGlossary(tab.content || '')}
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
        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #000',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {renderContentWithGlossary(interpolate(node.prompt, { playerName, branchFlags, mcSelections }))}
        </div>

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
              {activeAppTab === 'editor' ? formContent : tabContent(activeAppTab)}
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
