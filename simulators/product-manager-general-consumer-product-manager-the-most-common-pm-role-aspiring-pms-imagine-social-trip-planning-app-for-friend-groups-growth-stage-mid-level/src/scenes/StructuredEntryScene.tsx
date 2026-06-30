import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import WorkSurfaceFrame, {
  mergeWorkSurfaceTabs,
  resolveWorkSurfaceVariant,
} from '../components/layout/WorkSurfaceFrame'
import ActionButton from '../components/ui/ActionButton'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import { organizeSourceTabs, renderSourceTab } from './sourceTabs'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { StructuredEntryNode } from '../types/game'

interface Props { node: StructuredEntryNode }

type Item = Record<string, string>

function parseItems(raw: string, fields: { key: string }[], initialCount: number): Item[] {
  if (!raw) return Array.from({ length: initialCount }, () =>
    Object.fromEntries(fields.map((f) => [f.key, ''])) as Item
  )
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // ignore parse error
  }
  return Array.from({ length: initialCount }, () =>
    Object.fromEntries(fields.map((f) => [f.key, ''])) as Item
  )
}

function parseSourceNotes(raw: string | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return { note: raw }
  }
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
  const [activeItemIndex, setActiveItemIndex] = useState(0)

  const def = node.definition
  const initialCount = def.initialCount ?? def.minItems ?? 3
  const itemTitle = (idx: number) => def.itemTitles?.[idx] || `${def.itemLabel} #${idx + 1}`
  const items = useMemo(() => {
    return parseItems(responses[def.bindingKey] || '', def.fields, initialCount)
  }, [responses, def.bindingKey, def.fields, initialCount])

  const updateItem = (idx: number, key: string, value: string) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: value } : it))
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const addItem = () => {
    if (def.maxItems && items.length >= def.maxItems) return
    const next = [...items, Object.fromEntries(def.fields.map((f) => [f.key, ''])) as Item]
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const removeItem = (idx: number) => {
    if (def.minItems && items.length <= def.minItems) return
    const next = items.filter((_, i) => i !== idx)
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const allFilled = items.every((it) => def.fields.every((f) => (it[f.key] || '').trim().length > 0))
  const appWindow = resolveWorkSurfaceVariant(node, 'notion') as LaptopFrameVariant
  const appTabs = organizeSourceTabs(mergeWorkSurfaceTabs(node))
  const titleTabs = appTabs.length > 0
    ? [{ id: 'editor', label: node.workSurface?.title || node.windowTitle || node.title }, ...appTabs.map((tab) => ({ id: tab.id, label: tab.label }))]
    : undefined
  const presentation = def.presentation
    ?? (node.workSurface?.kind === 'spreadsheet_workbook' ? 'spreadsheet'
      : node.workSurface?.kind === 'ats_screening' ? 'screening_sheet'
      : node.workSurface?.kind === 'comment_queue' ? 'comment_queue'
      : node.appWindow === 'spreadsheet' ? 'spreadsheet'
      : 'cards')
  const tableLike = ['table', 'spreadsheet', 'screening_sheet', 'issue_list', 'comment_queue'].includes(presentation)
  const guidedProblemNotes = presentation === 'guided_problem_notes'
  const showBriefingReference = Boolean(briefing && !guidedProblemNotes)
  const sourceNotes = useMemo(() => parseSourceNotes(def.sourceBindingKey ? responses[def.sourceBindingKey] : undefined), [responses, def.sourceBindingKey])
  const sourceTab = appTabs.find((tab) => tab.sourceBindingKey === def.sourceBindingKey)
  const activeItem = items[activeItemIndex] || {}
  const activeSourceKey = def.itemSourceKeys?.[activeItemIndex]
  const activeSourceNote = activeSourceKey ? sourceNotes[activeSourceKey] : ''
  const activeSourceLabel = activeSourceKey ? sourceTab?.sourceBindingLabels?.[activeSourceKey] : undefined
  const isItemComplete = (item: Item) => def.fields.every((field) => (item[field.key] || '').trim().length > 0)
  const completedCount = items.filter(isItemComplete).length

  const renderControl = (idx: number, field: typeof def.fields[number], compact = false) => {
    const commonStyle = {
      width: '100%',
      padding: compact ? '0.42rem 0.5rem' : '0.5rem 0.625rem',
      fontSize: compact ? '0.78rem' : '0.875rem',
      fontFamily: 'Inter, system-ui, sans-serif',
      border: '1px solid #CDBF94',
      backgroundColor: '#FBF7EA',
      color: '#1E1E1A',
      outline: 'none',
      borderRadius: '4px',
    }
    if (field.multiline) {
      return (
        <textarea
          value={items[idx]?.[field.key] || ''}
          onChange={(e) => updateItem(idx, field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={compact ? 2 : field.rows ?? 3}
          style={{ ...commonStyle, resize: 'vertical' }}
        />
      )
    }
    return (
      <input
        type="text"
        value={items[idx]?.[field.key] || ''}
        onChange={(e) => updateItem(idx, field.key, e.target.value)}
        placeholder={field.placeholder}
        style={commonStyle}
      />
    )
  }

  const renderGuidedField = (field: typeof def.fields[number]) => (
    <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label style={{ fontSize: '0.84rem', fontWeight: 850, color: '#1E1E1A' }}>{field.label}</label>
      {field.helperText && (
        <div style={{ fontSize: '0.74rem', lineHeight: 1.45, color: '#6A604B' }}>
          {renderContentWithGlossary(interpolate(field.helperText, { playerName, branchFlags, mcSelections }))}
        </div>
      )}
      {renderControl(activeItemIndex, field, true)}
    </div>
  )

  const guidedProblemNotesContent = (
    <div className="problem-notes-workspace" data-testid="problem-notes-workspace">
      <aside className="problem-notes-rail" data-testid="problem-notes-rail">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>
            Draft progress
          </div>
          <div style={{ fontSize: '1.35rem', lineHeight: 1, fontWeight: 900, color: '#1E1E1A' }}>
            {completedCount}/{items.length}
          </div>
          <div style={{ height: 8, borderRadius: 999, background: '#E4D8B9', overflow: 'hidden', border: '1px solid #CDBF94' }}>
            <div
              style={{
                width: `${items.length ? (completedCount / items.length) * 100 : 0}%`,
                height: '100%',
                background: '#3A6B5E',
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {items.map((item, idx) => {
            const active = idx === activeItemIndex
            const complete = isItemComplete(item)
            return (
              <button
                key={idx}
                type="button"
                data-testid="problem-notes-rail-item"
                onClick={() => setActiveItemIndex(idx)}
                style={{
                  textAlign: 'left',
                  padding: '0.65rem',
                  border: active ? '2px solid #3A6B5E' : '1px solid #CDBF94',
                  borderRadius: 8,
                  background: active ? '#E5F4EC' : '#FBF7EA',
                  color: '#1E1E1A',
                  cursor: 'pointer',
                  boxShadow: active ? '3px 3px 0 #000' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 900 }}>{idx + 1}. {itemTitle(idx)}</span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 900,
                      color: complete ? '#F7F1E3' : '#6A604B',
                      background: complete ? '#3A6B5E' : '#EFE8D2',
                      border: '1px solid #CDBF94',
                      borderRadius: 999,
                      padding: '0.12rem 0.38rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {complete ? 'Done' : 'Draft'}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      <main className="problem-notes-editor">
        <div className="problem-notes-editor-header">
          <div>
            <div style={{ fontSize: '0.68rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>
              Note {activeItemIndex + 1} of {items.length}
            </div>
            <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.35rem', lineHeight: 1.1 }}>{itemTitle(activeItemIndex)}</h2>
          </div>
          <span
            style={{
              border: '1px solid #CDBF94',
              background: isItemComplete(activeItem) ? '#DDEDDD' : '#EFE8D2',
              color: isItemComplete(activeItem) ? '#255247' : '#6A604B',
              borderRadius: 999,
              padding: '0.3rem 0.6rem',
              fontSize: '0.72rem',
              fontWeight: 900,
              whiteSpace: 'nowrap',
            }}
          >
            {isItemComplete(activeItem) ? 'Ready' : 'Needs work'}
          </span>
        </div>

        <section className="problem-notes-source-card" data-testid="problem-notes-source-note">
          <div style={{ fontSize: '0.68rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>
            Your app note
          </div>
          <div style={{ fontSize: '0.86rem', lineHeight: 1.55, color: '#1E1E1A', marginTop: '0.35rem' }}>
            {activeSourceNote || `No saved note yet for ${activeSourceLabel || itemTitle(activeItemIndex)}.`}
          </div>
        </section>

        {def.example && (
          <section className="problem-notes-example-card" data-testid="problem-notes-example-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', marginBottom: '0.55rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#1E1E1A' }}>
                {def.example.title || 'Use this as a guide'}
              </div>
              <span style={{ color: '#B87D6B', fontSize: '0.68rem', fontWeight: 900 }}>Example</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.55rem' }}>
              {def.fields.map((field) => (
                <div key={field.key} style={{ borderTop: '1px solid #E4D8B9', paddingTop: '0.45rem' }}>
                  <div style={{ fontSize: '0.66rem', color: '#3A6B5E', fontWeight: 900 }}>{field.label}</div>
                  <div style={{ fontSize: '0.74rem', lineHeight: 1.45, color: '#4A4337', marginTop: '0.2rem' }}>
                    {def.example?.[field.key]}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="problem-notes-active-editor" data-testid="problem-notes-active-editor">
          {def.fields.map(renderGuidedField)}
        </section>

        <div className="problem-notes-nav" data-testid="problem-notes-nav">
          <button
            type="button"
            onClick={() => setActiveItemIndex((idx) => Math.max(0, idx - 1))}
            disabled={activeItemIndex === 0}
            style={{
              border: '1px solid #000',
              background: '#FBF7EA',
              color: '#1E1E1A',
              borderRadius: 6,
              padding: '0.65rem 0.9rem',
              fontWeight: 850,
              cursor: activeItemIndex === 0 ? 'not-allowed' : 'pointer',
              opacity: activeItemIndex === 0 ? 0.45 : 1,
            }}
          >
            Back note
          </button>
          <button
            type="button"
            onClick={() => setActiveItemIndex((idx) => Math.min(items.length - 1, idx + 1))}
            disabled={activeItemIndex === items.length - 1}
            style={{
              border: '1px solid #000',
              background: '#FBF7EA',
              color: '#1E1E1A',
              borderRadius: 6,
              padding: '0.65rem 0.9rem',
              fontWeight: 850,
              cursor: activeItemIndex === items.length - 1 ? 'not-allowed' : 'pointer',
              opacity: activeItemIndex === items.length - 1 ? 0.45 : 1,
            }}
          >
            Next note
          </button>
          <button
            type="button"
            onClick={() => goNext(node)}
            disabled={!allFilled}
            style={{
              marginLeft: 'auto',
              border: '1px solid #000',
              background: allFilled ? '#3A6B5E' : '#E4D8B9',
              color: allFilled ? '#F7F1E3' : '#6A604B',
              borderRadius: 6,
              padding: '0.65rem 1rem',
              fontWeight: 900,
              boxShadow: allFilled ? '3px 3px 0 #000' : 'none',
              cursor: allFilled ? 'pointer' : 'not-allowed',
            }}
          >
            Submit
          </button>
        </div>
      </main>
    </div>
  )

  const formContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      {tableLike ? (
        <div style={{ border: '1px solid #CDBF94', background: '#FBF7EA', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: Math.max(620, def.fields.length * 180) }}>
            <thead>
              <tr>
                <th style={{ width: 96, textAlign: 'left', padding: '0.55rem', borderBottom: '1px solid #CDBF94', background: '#EFE8D2', fontSize: '0.7rem', color: '#3A6B5E', textTransform: 'uppercase' }}>
                  {def.itemLabel}
                </th>
                {def.fields.map((field) => (
                  <th key={field.key} style={{ textAlign: 'left', padding: '0.55rem', borderBottom: '1px solid #CDBF94', background: '#EFE8D2', fontSize: '0.7rem', color: '#3A6B5E', textTransform: 'uppercase' }}>
                    {field.label}
                  </th>
                ))}
                <th style={{ width: 72, borderBottom: '1px solid #CDBF94', background: '#EFE8D2' }} />
              </tr>
            </thead>
            <tbody>
              {items.map((_item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '0.5rem', borderTop: idx ? '1px solid #E4D8B9' : 0, fontSize: '0.78rem', fontWeight: 800, color: '#1E1E1A' }}>
                    {itemTitle(idx)}
                  </td>
                  {def.fields.map((field) => (
                    <td key={field.key} style={{ padding: '0.5rem', borderTop: idx ? '1px solid #E4D8B9' : 0, verticalAlign: 'top' }}>
                      {renderControl(idx, field, true)}
                    </td>
                  ))}
                  <td style={{ padding: '0.5rem', borderTop: idx ? '1px solid #E4D8B9' : 0, textAlign: 'right' }}>
                    {(!def.minItems || items.length > def.minItems) && (
                      <button
                        onClick={() => removeItem(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#B87D6B', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800 }}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        items.map((_item, idx) => (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong style={{ fontSize: '0.8125rem' }}>
                {itemTitle(idx)}
              </strong>
              {(!def.minItems || items.length > def.minItems) && (
                <button
                  onClick={() => removeItem(idx)}
                  style={{ background: 'transparent', border: 'none', color: '#B87D6B', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Remove
                </button>
              )}
            </div>
            {def.fields.map((field) => (
              <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#444' }}>{field.label}</label>
                {renderControl(idx, field)}
              </div>
            ))}
          </div>
        ))
      )}

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
        <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
    </div>
  )

  const tabbedWindowContent = activeAppTab === 'editor' ? (
    guidedProblemNotes ? guidedProblemNotesContent : formContent
  ) : (
    appTabs.map((tab) => (
      activeAppTab === tab.id && (
        <div key={tab.id} style={{ minHeight: '100%' }}>
          {renderSourceTab(tab, { playerName, branchFlags, mcSelections, freeTextResponses: responses })}
        </div>
      )
    ))
  )

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
          {showBriefingReference && <ReferenceButton onClick={() => setRefOpen(true)} label="View Briefing" />}
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

        <WorkSurfaceFrame
          node={node}
          variant={appWindow}
          title={node.workSurface?.title || node.windowTitle}
          titleTabs={titleTabs}
          activeTitleTabId={activeAppTab}
          onTitleTabChange={setActiveAppTab}
        >
          {appTabs.length > 0 ? tabbedWindowContent : formContent}
        </WorkSurfaceFrame>
      </motion.div>
      {showBriefingReference && briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
