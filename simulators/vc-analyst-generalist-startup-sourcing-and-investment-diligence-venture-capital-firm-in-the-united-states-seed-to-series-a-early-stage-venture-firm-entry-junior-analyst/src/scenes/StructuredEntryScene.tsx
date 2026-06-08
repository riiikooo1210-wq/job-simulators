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
type RowGuide = NonNullable<StructuredEntryNode['definition']['rowGuides']>[number]

function emptyItem(fields: { key: string }[], guide?: RowGuide): Item {
  return {
    ...(Object.fromEntries(fields.map((f) => [f.key, ''])) as Item),
    ...(guide?.fieldValues || {}),
  }
}

function parseItems(raw: string, fields: { key: string }[], initialCount: number, rowGuides?: RowGuide[]): Item[] {
  if (!raw) return Array.from({ length: initialCount }, (_unused, idx) => emptyItem(fields, rowGuides?.[idx]))
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const length = Math.max(initialCount, parsed.length)
      return Array.from({ length }, (_unused, idx) => ({
        ...emptyItem(fields, rowGuides?.[idx]),
        ...(parsed[idx] || {}),
        ...(rowGuides?.[idx]?.fieldValues || {}),
      }))
    }
  } catch {
    // ignore parse error
  }
  return Array.from({ length: initialCount }, (_unused, idx) => emptyItem(fields, rowGuides?.[idx]))
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
  const [openHints, setOpenHints] = useState<Record<number, boolean>>({})

  const def = node.definition
  const initialCount = def.initialCount ?? def.minItems ?? 3
  const items = useMemo(() => {
    return parseItems(responses[def.bindingKey] || '', def.fields, initialCount, def.rowGuides)
  }, [responses, def.bindingKey, def.fields, initialCount, def.rowGuides])

  const updateItem = (idx: number, key: string, value: string) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: value } : it))
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const addItem = () => {
    if (def.maxItems && items.length >= def.maxItems) return
    const next = [...items, emptyItem(def.fields, def.rowGuides?.[items.length])]
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const removeItem = (idx: number) => {
    if (def.minItems && items.length <= def.minItems) return
    const next = items.filter((_, i) => i !== idx)
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const allFilled = items.every((it) => def.fields.every((f) => (it[f.key] || '').trim().length > 0))
  const appWindow = resolveWorkSurfaceVariant(node, 'notion') as LaptopFrameVariant
  const sourceTabs = node.sourceWorkspace ? [] : mergeWorkSurfaceTabs(node, [])
  const sourceAppTabs = node.sourceWorkspace?.apps.map((app) => ({ id: `source-app:${app.id}`, label: app.label })) || []
  const titleTabs = sourceAppTabs.length > 0 || sourceTabs.length > 0
    ? [
        { id: 'editor', label: node.workSurface?.title || node.windowTitle || node.title },
        ...sourceAppTabs,
        ...sourceTabs.map((tab) => ({ id: tab.id, label: tab.label })),
      ]
    : undefined
  const presentation = def.presentation
    ?? (node.workSurface?.kind === 'spreadsheet_workbook' ? 'spreadsheet'
      : node.workSurface?.kind === 'ats_screening' ? 'screening_sheet'
      : node.workSurface?.kind === 'comment_queue' ? 'comment_queue'
      : node.appWindow === 'spreadsheet' ? 'spreadsheet'
      : 'cards')
  const tableLike = ['table', 'spreadsheet', 'screening_sheet', 'issue_list', 'comment_queue'].includes(presentation)

  const recordHintUsage = (idx: number) => {
    const guide = def.rowGuides?.[idx]
    if (!guide) return
    const key = `${def.bindingKey}_hint_usage`
    let usedHints: string[] = []
    try {
      const parsed = JSON.parse(responses[key] || '[]')
      if (Array.isArray(parsed)) usedHints = parsed.filter((item): item is string => typeof item === 'string')
    } catch {
      usedHints = []
    }
    const label = guide.title || `Row ${idx + 1}`
    if (!usedHints.includes(label)) {
      setFreeTextResponse(key, JSON.stringify([...usedHints, label]))
    }
  }

  const renderRowGuideHint = (idx: number) => {
    const hint = def.rowGuides?.[idx]?.hint
    if (!hint) return null
    const isOpen = !!openHints[idx]
    return (
      <div style={{ marginTop: '0.45rem' }}>
        <button
          type="button"
          onClick={() => {
            if (!openHints[idx]) recordHintUsage(idx)
            setOpenHints((prev) => ({ ...prev, [idx]: !prev[idx] }))
          }}
          style={{
            border: '1px solid #CDBF94',
            background: isOpen ? '#DCE6D2' : '#F7F1E3',
            color: '#1E1E1A',
            borderRadius: '4px',
            padding: '0.22rem 0.45rem',
            fontSize: '0.68rem',
            fontWeight: 800,
            fontFamily: 'Inter, system-ui, sans-serif',
            cursor: 'pointer',
          }}
        >
          {isOpen ? 'Hide hint' : 'Hint'}
        </button>
        <div style={{ marginTop: '0.25rem', fontSize: '0.62rem', lineHeight: 1.35, color: '#8A5C4B', fontWeight: 800 }}>
          Opening a hint is recorded and considered in assessment.
        </div>
        {isOpen && (
          <div
            style={{
              marginTop: '0.35rem',
              borderLeft: '3px solid #B87D6B',
              background: '#FFF8E8',
              padding: '0.45rem 0.55rem',
              fontSize: '0.72rem',
              lineHeight: 1.45,
              color: '#1E1E1A',
              fontWeight: 700,
            }}
          >
            {hint}
          </div>
        )}
      </div>
    )
  }

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

  const formContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      {tableLike ? (
        <div style={{ border: '1px solid #CDBF94', background: '#FBF7EA', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: Math.max(820, 220 + def.fields.length * 220) }}>
            <thead>
              <tr>
                <th style={{ width: 220, textAlign: 'left', padding: '0.55rem', borderBottom: '1px solid #CDBF94', background: '#EFE8D2', fontSize: '0.7rem', color: '#3A6B5E', textTransform: 'uppercase' }}>
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
                  <td style={{ padding: '0.5rem', borderTop: idx ? '1px solid #E4D8B9' : 0, verticalAlign: 'top', color: '#1E1E1A' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, lineHeight: 1.25 }}>
                      {def.rowGuides?.[idx]?.title || `#${idx + 1}`}
                    </div>
                    {def.rowGuides?.[idx]?.sourceHint && (
                      <div style={{ marginTop: '0.35rem', fontSize: '0.68rem', lineHeight: 1.35, color: '#6f6758', fontWeight: 700 }}>
                        {def.rowGuides[idx].sourceHint}
                      </div>
                    )}
                    {renderRowGuideHint(idx)}
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
              <div>
                <strong style={{ fontSize: '0.8125rem' }}>
                  {def.rowGuides?.[idx]?.title || `${def.itemLabel} #${idx + 1}`}
                </strong>
                {def.rowGuides?.[idx]?.sourceHint && (
                  <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: '#6f6758', fontWeight: 700 }}>
                    {def.rowGuides[idx].sourceHint}
                  </div>
                )}
                {renderRowGuideHint(idx)}
              </div>
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
      {renderContentWithGlossary(interpolate(tab.content, { playerName, branchFlags, mcSelections, freeTextResponses: responses }))}
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
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration={hasWorkSurfaceVisual(node)}>
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
