import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import WorkSurfaceFrame, {
  hasWorkSurfaceVisual,
  mergeWorkSurfaceTabs,
  resolveWorkSurfaceVariant,
} from '../components/layout/WorkSurfaceFrame'
import ActionButton from '../components/ui/ActionButton'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import SourceWorkspacePanel from '../components/ui/SourceWorkspacePanel'
import TimelineDocumentTable from '../components/ui/TimelineDocumentTable'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { StructuredEntryNode } from '../types/game'

interface Props { node: StructuredEntryNode }

type Item = Record<string, string>
type SourceTab = NonNullable<NonNullable<StructuredEntryNode['workSurface']>['sourceTabs']>[number]

function buildInitialItems(fields: { key: string }[], initialCount: number, initialItems?: Item[]): Item[] {
  if (initialItems?.length) {
    return initialItems.map((item) => ({
      ...Object.fromEntries(fields.map((f) => [f.key, ''])),
      ...item,
    }) as Item)
  }
  return Array.from({ length: initialCount }, () =>
    Object.fromEntries(fields.map((f) => [f.key, ''])) as Item
  )
}

function parseItems(raw: string, fields: { key: string }[], initialCount: number, initialItems?: Item[]): Item[] {
  if (!raw) return buildInitialItems(fields, initialCount, initialItems)
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // ignore parse error
  }
  return buildInitialItems(fields, initialCount, initialItems)
}

function timelineCommentComplete(item: Item) {
  return Boolean(
    item.status?.trim()
      && item.planner_note?.trim()
      && item.recommended_fix?.trim()
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
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(0)

  const def = node.definition
  const initialCount = def.initialCount ?? def.minItems ?? 3
  const items = useMemo(() => {
    return parseItems(responses[def.bindingKey] || '', def.fields, initialCount, def.initialItems)
  }, [responses, def.bindingKey, def.fields, initialCount, def.initialItems])

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

  const presentation = def.presentation
    ?? (node.workSurface?.kind === 'spreadsheet_workbook' ? 'spreadsheet'
      : node.workSurface?.kind === 'ats_screening' ? 'screening_sheet'
      : node.workSurface?.kind === 'comment_queue' ? 'comment_queue'
      : node.appWindow === 'spreadsheet' ? 'spreadsheet'
      : 'cards')
  const isTimelineReview = presentation === 'timeline_review'
  const completedTimelineRows = items.filter(timelineCommentComplete).length
  const allFilled = isTimelineReview
    ? completedTimelineRows >= (def.minItems ?? 3)
    : items.every((it) => def.fields.every((f) => (it[f.key] || '').trim().length > 0))
  const appWindow = resolveWorkSurfaceVariant(node, 'notion') as LaptopFrameVariant
  const sourceTabs = node.sourceWorkspace ? [] : mergeWorkSurfaceTabs(node, [])
  const sourceAppTabs = node.sourceWorkspace?.apps.map((app) => ({ id: `source-app:${app.id}`, label: app.label })) || []
  const titleTabs = sourceAppTabs.length > 0 || sourceTabs.length > 0
    ? [
        { id: 'editor', label: isTimelineReview ? 'Timeline Review' : node.workSurface?.title || node.windowTitle || node.title },
        ...sourceAppTabs,
        ...sourceTabs.map((tab) => ({ id: tab.id, label: tab.label })),
      ]
    : undefined
  const tableLike = ['table', 'spreadsheet', 'screening_sheet', 'issue_list', 'comment_queue'].includes(presentation)

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

  const renderTimelineCommentField = (
    fieldKey: 'planner_note' | 'recommended_fix',
    label: string,
    placeholder: string,
    rows = 3,
  ) => {
    const item = items[activeTimelineIndex] || items[0] || {}
    return (
      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
          {label}
        </span>
        <textarea
          value={item[fieldKey] || ''}
          onChange={(event) => updateItem(activeTimelineIndex, fieldKey, event.target.value)}
          placeholder={placeholder}
          rows={rows}
          style={{
            width: '100%',
            padding: '0.55rem 0.65rem',
            border: '1px solid #CDBF94',
            background: '#FBF7EA',
            color: '#1E1E1A',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '0.82rem',
            lineHeight: 1.45,
            resize: 'vertical',
            borderRadius: '4px',
          }}
        />
      </label>
    )
  }

  const timelineReviewContent = (() => {
    const activeItem = items[activeTimelineIndex] || items[0] || {}
    const activeRowId = activeItem.id || `${activeItem.time || 'row'}-${activeTimelineIndex}`
    const minimumRows = def.minItems ?? 3
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
            padding: '0.7rem 0.85rem',
            border: '1px solid #CDBF94',
            background: '#F2EBD9',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#1E1E1A' }}>
              There are 5 issues / open items in this draft timeline.
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6f6758', lineHeight: 1.45, marginTop: '0.15rem' }}>
              Use the four source tabs, then add a status, comment, and recommended fix to each row that needs attention.
            </div>
          </div>
          <div
            style={{
              padding: '0.28rem 0.5rem',
              border: '1px solid #000',
              background: allFilled ? '#DCE6D2' : '#FBF7EA',
              color: allFilled ? '#315D50' : '#6f6758',
              fontSize: '0.72rem',
              fontWeight: 900,
              whiteSpace: 'nowrap',
            }}
          >
            {completedTimelineRows}/{minimumRows} open items commented
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(13.75rem, 16rem)',
            gap: '0.85rem',
            alignItems: 'start',
          }}
        >
          <TimelineDocumentTable
            rows={items}
            activeRowId={activeRowId}
            showInlineStatus
            onSelectRow={(_row, index) => setActiveTimelineIndex(index)}
          />

          <div
            style={{
              border: '1px solid #000',
              background: '#F7F1E3',
              minWidth: 0,
              alignSelf: 'start',
              position: 'sticky',
              top: '0.75rem',
            }}
          >
            <div style={{ padding: '0.7rem 0.85rem', borderBottom: '1px solid #000', background: '#EFE8D2' }}>
              <div style={{ fontSize: '0.68rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 }}>
                Planner comment
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, lineHeight: 1.3, marginTop: '0.15rem' }}>
                {activeItem.time || '-'} - {activeItem.timeline_item || activeItem.item || 'Timeline row'}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.85rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
                  Status
                </span>
                <select
                  value={activeItem.status || ''}
                  onChange={(event) => updateItem(activeTimelineIndex, 'status', event.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.65rem',
                    border: '1px solid #CDBF94',
                    background: '#FBF7EA',
                    color: '#1E1E1A',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: '0.82rem',
                    borderRadius: '4px',
                  }}
                >
                  <option value="">No comment yet</option>
                  <option value="Needs correction">Needs correction</option>
                  <option value="Timing risk">Timing risk</option>
                  <option value="Open item">Open item</option>
                  <option value="Missing detail">Missing detail</option>
                  <option value="Weather dependency">Weather dependency</option>
                </select>
              </label>

              {renderTimelineCommentField(
                'planner_note',
                'Comment',
                'Name the conflict, risk, missing detail, or open decision in this timeline row.',
              )}
              {renderTimelineCommentField(
                'recommended_fix',
                'Recommended fix',
                'Explain the corrected time, sequence, confirmation, or decision needed.',
              )}
            </div>
          </div>
        </div>

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
  })()

  const formContent = isTimelineReview ? timelineReviewContent : (
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
                    #{idx + 1}
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
                {def.itemLabel} #{idx + 1}
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
      {import.meta.env.DEV && (
        <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
      )}
    </div>
  )

  const renderSourceTab = (tab: SourceTab) => (
    <div
      key={tab.id}
      style={{
        background: '#F7F1E3',
        border: '1px solid #CDBF94',
        padding: '1rem',
        fontSize: '0.875rem',
        lineHeight: 1.65,
        color: '#1E1E1A',
        whiteSpace: 'pre-wrap',
        minHeight: '100%',
      }}
    >
      {renderContentWithGlossary(interpolate(tab.content, { playerName, branchFlags, mcSelections }))}
    </div>
  )

  const activeSourceAppId = activeAppTab.startsWith('source-app:')
    ? activeAppTab.replace('source-app:', '')
    : null
  const activeSourceTab = sourceTabs.find((tab) => tab.id === activeAppTab)
  const tabbedContent = activeSourceAppId && node.sourceWorkspace ? (
    <SourceWorkspacePanel
      sourceWorkspace={node.sourceWorkspace}
      activeAppId={activeSourceAppId}
      ctx={{ playerName, branchFlags, mcSelections }}
    />
  ) : activeSourceTab ? (
    renderSourceTab(activeSourceTab)
  ) : (
    formContent
  )

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration={hasWorkSurfaceVisual(node) && !node.illustration}>
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

        <WorkSurfaceFrame
          node={node}
          variant={appWindow}
          title={node.workSurface?.title || node.windowTitle}
          titleTabs={titleTabs}
          activeTitleTabId={activeAppTab}
          onTitleTabChange={setActiveAppTab}
        >
          {titleTabs ? tabbedContent : formContent}
        </WorkSurfaceFrame>
      </motion.div>
      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
