import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
import LaptopFrame from '../components/ui/LaptopFrame'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import {
  BriefingDrawerContent,
  SourceWorkspaceAppContent,
  workspaceAppVariant,
  workspaceAppWindowTitle,
} from './BriefingScene'
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

function parseReferenceRows(raw: string): Record<string, unknown>[] | null {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
      return parsed as Record<string, unknown>[]
    }
  } catch {
    // Plain-text prior responses are rendered as notes.
  }
  return null
}

function stringifyRowValue(value: unknown, valueLabels?: Record<string, string>) {
  const raw = String(value ?? '')
  return valueLabels?.[raw] || raw
}

function PreviousResponseContent({
  raw,
  emptyText,
  fieldLabels,
  valueLabels,
}: {
  raw: string
  emptyText?: string
  fieldLabels?: Record<string, string>
  valueLabels?: Record<string, string>
}) {
  const trimmed = raw.trim()
  const rows = trimmed ? parseReferenceRows(trimmed) : null

  if (!trimmed) {
    return (
      <div style={{ fontSize: '0.8125rem', color: '#666', lineHeight: 1.6 }}>
        {emptyText || 'No prior response has been saved yet.'}
      </div>
    )
  }

  if (!rows) {
    return (
      <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.8125rem', lineHeight: 1.6, color: '#1E1E1A' }}>
        {trimmed}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {rows.map((row, idx) => (
        <div
          key={idx}
          style={{
            background: '#fff',
            border: '1px solid #CDBF94',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#6A5F46' }}>
            Prior item #{idx + 1}
          </div>
          {Object.entries(row).map(([key, value]) => {
            const valueText = valueLabels?.[String(value)] || String(value ?? '')
            if (!valueText.trim()) return null
            return (
              <div key={key} style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
                <strong>{fieldLabels?.[key] || key}: </strong>
                <span>{valueText}</span>
              </div>
            )
          })}
        </div>
      ))}
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
  const [activeAppTab, setActiveAppTab] = useState('entry')
  const [activeSourceFileIds, setActiveSourceFileIds] = useState<Record<string, string | null>>({})

  const def = node.definition
  const appTabs = node.appTabs || []
  const annotationSource = def.annotationSource
  const previousRef = def.previousResponseReference
  const showBriefingButton = Boolean(briefing && appTabs.length === 0 && !previousRef)
  const titleTabs = appTabs.length > 0 || previousRef
    ? [
      { id: 'entry', label: node.title },
      ...(previousRef ? [{ id: 'previous_response', label: previousRef.title }] : []),
      ...appTabs.map((tab) => ({ id: tab.id, label: tab.label })),
    ]
    : undefined
  const initialCount = def.initialCount ?? def.minItems ?? 3
  const storedItems = useMemo(() => {
    return parseItems(responses[def.bindingKey] || '', def.fields, initialCount)
  }, [responses, def.bindingKey, def.fields, initialCount])
  const annotationRows = useMemo(() => {
    if (!annotationSource) return []
    return parseReferenceRows(responses[annotationSource.bindingKey] || '') || []
  }, [annotationSource, responses])
  const items = useMemo(() => {
    if (!annotationSource) return storedItems
    const count = annotationRows.length || initialCount
    return Array.from({ length: count }, (_, idx) => {
      const sourceRow = annotationRows[idx] || {}
      const sourceSnapshot = Object.fromEntries(
        Object.entries(sourceRow).map(([key, value]) => [`source_${key}`, String(value ?? '')])
      )
      const saved = storedItems[idx] || {}
      const editableFields = Object.fromEntries(def.fields.map((field) => [field.key, saved[field.key] || '']))
      return { ...sourceSnapshot, ...editableFields } as Item
    })
  }, [annotationSource, annotationRows, storedItems, def.fields, initialCount])

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

  const annotationSourceReady = !annotationSource || annotationRows.length > 0
  const allFilled = annotationSourceReady && items.every((it) => def.fields.every((f) => (it[f.key] || '').trim().length > 0))
  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const ctx = { playerName, branchFlags, mcSelections }
  const sourceWorkspaceApps = briefing?.sourceWorkspace?.apps || []
  const workspaceFiles = sourceWorkspaceApps.flatMap((app) => app.files || [])
  const activeSourceTab = appTabs.find((tab) => tab.id === activeAppTab)
  const activeSourceApp = activeSourceTab?.sourceWorkspaceAppId
    ? sourceWorkspaceApps.find((app) => app.id === activeSourceTab.sourceWorkspaceAppId) || null
    : null
  const activeWindowVariant = (activeSourceApp ? workspaceAppVariant(activeSourceApp.kind) : appWindow) as LaptopFrameVariant | undefined
  const activeWindowTitle = activeSourceApp ? workspaceAppWindowTitle(activeSourceApp, ctx) : node.windowTitle
  const compactChecklistChrome = node.id === 'closing_checklist'

  const sourceTabContent = appTabs.map((tab) => (
    activeAppTab === tab.id && (
      (() => {
        const sourceApp = tab.sourceWorkspaceAppId
          ? sourceWorkspaceApps.find((app) => app.id === tab.sourceWorkspaceAppId) || null
          : null
        const sourceFileId = sourceApp
          ? activeSourceFileIds[tab.id] ?? tab.defaultSourceFileId ?? sourceApp.files?.[0]?.id ?? null
          : null

        if (sourceApp) {
          return (
            <SourceWorkspaceAppContent
              key={tab.id}
              app={sourceApp}
              workspaceFiles={workspaceFiles}
              activeFileId={sourceFileId}
              onOpenFile={(fileId) => setActiveSourceFileIds((prev) => ({ ...prev, [tab.id]: fileId }))}
              ctx={ctx}
              showAttachments={false}
            />
          )
        }

        return (
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
            {renderContentWithGlossary(interpolate(tab.content, ctx))}
          </div>
        )
      })()
    )
  ))

  const previousResponseContent = previousRef && activeAppTab === 'previous_response' ? (
    <div
      key="previous_response"
      style={{
        background: '#F7F1E3',
        border: '1px solid #CDBF94',
        padding: '1rem',
        minHeight: '100%',
      }}
    >
      <PreviousResponseContent
        raw={responses[previousRef.bindingKey] || ''}
        emptyText={previousRef.emptyText}
        fieldLabels={previousRef.fieldLabels}
        valueLabels={previousRef.valueLabels}
      />
    </div>
  ) : null

  const renderEditableFields = (item: Item, idx: number) => (
    <>
      {def.fields.map((field) => (
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
    </>
  )

  const annotationContent = annotationSource ? (
    <>
      {annotationRows.length === 0 && (
        <div
          style={{
            border: '1px solid #000',
            background: '#fff',
            padding: '1rem',
            fontSize: '0.875rem',
            lineHeight: 1.6,
          }}
        >
          {annotationSource.emptyText || 'No saved source rows are available yet.'}
        </div>
      )}
      {items.map((item, idx) => {
        const sourceRow = annotationRows[idx] || {}
        return (
          <div
            key={idx}
            style={{
              border: '1px solid #000',
              boxShadow: '4px 4px 0 #000',
              backgroundColor: '#F2EBD9',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'baseline' }}>
              <strong style={{ fontSize: '0.8125rem' }}>
                {(annotationSource.itemLabel || def.itemLabel)} #{idx + 1}
              </strong>
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', color: '#6A5F46' }}>
                Saved checklist row
              </span>
            </div>
            <div
              style={{
                background: '#fff',
                border: '1px solid #CDBF94',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              {Object.keys(sourceRow).length === 0 ? (
                <div style={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.5 }}>
                  Source row is missing. Go back and submit the checklist before annotating it.
                </div>
              ) : (
                Object.entries(sourceRow).map(([key, value]) => {
                  const valueText = stringifyRowValue(value, annotationSource.valueLabels)
                  if (!valueText.trim()) return null
                  return (
                    <div key={key} style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
                      <strong>{annotationSource.fieldLabels?.[key] || key}: </strong>
                      <span>{valueText}</span>
                    </div>
                  )
                })
              )}
            </div>
            {renderEditableFields(item, idx)}
          </div>
        )
      })}
    </>
  ) : null

  const formContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: appWindow ? '1rem' : '0' }}>
      {annotationSource ? annotationContent : items.map((item, idx) => (
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
          {renderEditableFields(item, idx)}
        </div>
      ))}

      {!annotationSource && (!def.maxItems || items.length < def.maxItems) && (
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

  const tabbedWindowContent = activeAppTab === 'entry' ? formContent : previousResponseContent || sourceTabContent

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
          {showBriefingButton && <ReferenceButton onClick={() => setRefOpen(true)} label="View Briefing" />}
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
              variant={activeWindowVariant || appWindow}
              title={activeWindowTitle}
              fill
              scrollable
              titleTabs={titleTabs}
              activeTitleTabId={activeAppTab}
              onTitleTabChange={setActiveAppTab}
              hideMenuBar={compactChecklistChrome}
              hideSpreadsheetFormulaBar={compactChecklistChrome}
            >
              {appTabs.length > 0 ? tabbedWindowContent : formContent}
            </LaptopFrame>
          </DesktopOverlay>
        ) : (
          formContent
        )}
      </motion.div>
      {showBriefingButton && briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
