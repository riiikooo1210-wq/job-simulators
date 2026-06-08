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
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { StructuredEntryNode } from '../types/game'

interface Props { node: StructuredEntryNode }

type Item = Record<string, string>
type AppTab = NonNullable<StructuredEntryNode['appTabs']>[number]
type PreviousResponseReference = NonNullable<StructuredEntryNode['definition']['previousResponseReference']>

type PlaygroundActionLogEntry = {
  action?: string
  label?: string
  objectId?: string
  targetId?: string
  primitive?: string
  observation?: string
  value?: number
}

type PreviousReferenceData = {
  observations: { label: string; value: string }[]
  completed: string[]
  actionLog: { label: string; detail?: string }[]
  warnings: string[]
}

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

function humanizeId(id: string) {
  return id
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function labelFor(id: string | undefined, ref: PreviousResponseReference) {
  if (!id) return ''
  return ref.fieldLabels?.[id] || ref.valueLabels?.[id] || humanizeId(id)
}

function uniqueLabels(values: string[]) {
  return values.filter((value, index) => value.trim() && values.indexOf(value) === index)
}

function parsePreviousReference(raw: string | undefined, ref: PreviousResponseReference): PreviousReferenceData | null {
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)

    if (Array.isArray(parsed)) {
      return {
        observations: parsed.flatMap((item, idx) => (
          item && typeof item === 'object'
            ? Object.entries(item)
                .filter(([, value]) => typeof value === 'string' && value.trim())
                .map(([key, value]) => ({ label: `${labelFor(key, ref)} #${idx + 1}`, value: value as string }))
            : []
        )),
        completed: [],
        actionLog: [],
        warnings: [],
      }
    }

    if (!parsed || typeof parsed !== 'object') return null
    const source = parsed as {
      observations?: Record<string, string>
      selectedObjects?: string[]
      placements?: Record<string, string>
      completedSteps?: string[]
      inspectedSurfaces?: string[]
      completedControls?: string[]
      controlValues?: Record<string, number>
      actionLog?: PlaygroundActionLogEntry[]
      warnings?: string[]
    }

    const observations = Object.entries(source.observations || {})
      .filter(([, value]) => typeof value === 'string' && value.trim())
      .map(([key, value]) => ({ label: labelFor(key, ref), value }))

    const completedIds = [
      ...(source.selectedObjects || []),
      ...Object.keys(source.placements || {}),
      ...(source.completedSteps || []),
      ...(source.inspectedSurfaces || []),
      ...(source.completedControls || []),
    ]

    const completed = uniqueLabels(completedIds.map((id) => {
      const value = source.controlValues?.[id]
      const label = labelFor(id, ref)
      return typeof value === 'number' ? `${label}: ${value}` : label
    }))

    const actionLog = (source.actionLog || [])
      .filter((entry) => entry.action !== 'safety_warning')
      .map((entry) => {
        const label = entry.label || labelFor(entry.objectId || entry.targetId, ref)
        const detail = [
          typeof entry.value === 'number' ? `Value: ${entry.value}` : '',
          entry.observation?.trim() ? entry.observation.trim() : '',
        ].filter(Boolean).join('\n')
        return { label, detail: detail || undefined }
      })
      .filter((entry) => entry.label.trim())

    return {
      observations,
      completed,
      actionLog,
      warnings: (source.warnings || []).filter((warning) => warning.trim()),
    }
  } catch {
    return {
      observations: [{ label: ref.title, value: raw }],
      completed: [],
      actionLog: [],
      warnings: [],
    }
  }
}

function ReferenceList({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {items.map((item, idx) => <li key={`${item}-${idx}`}>{item}</li>)}
    </ul>
  )
}

function AppTabContent({
  tab,
  context,
}: {
  tab: AppTab
  context: { playerName: string; branchFlags: Record<string, string>; mcSelections: Record<string, string> }
}) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e4dfd3',
        padding: '1rem',
        fontSize: '0.875rem',
        lineHeight: 1.65,
        color: '#242424',
        whiteSpace: 'pre-wrap',
      }}
    >
      {renderContentWithGlossary(interpolate(tab.content, context))}
    </div>
  )
}

function PreviousResponseReferenceCard({
  refSpec,
  raw,
}: {
  refSpec: PreviousResponseReference
  raw: string | undefined
}) {
  const data = parsePreviousReference(raw, refSpec)
  const hasContent = Boolean(data && (
    data.observations.length > 0
    || data.completed.length > 0
    || data.actionLog.length > 0
    || data.warnings.length > 0
  ))

  return (
    <section
      style={{
        background: '#FFF8E8',
        border: '1px solid #000',
        boxShadow: '4px 4px 0 #000',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#000' }}>{refSpec.title}</div>
      {!hasContent && (
        <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.6, color: '#4b4b4b' }}>
          {refSpec.emptyText || 'No saved observations are available yet.'}
        </p>
      )}
      {data?.observations.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>Observed and Noted by You</div>
          {data.observations.map((item, idx) => (
            <div key={`${item.label}-${idx}`} style={{ borderLeft: '3px solid #3A6B5E', paddingLeft: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#222' }}>{item.label}</div>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.55, color: '#222', whiteSpace: 'pre-wrap' }}>{item.value}</div>
            </div>
          ))}
        </div>
      ) : null}
      {data?.completed.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', lineHeight: 1.55, color: '#222' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>Workplace Actions Completed</div>
          <ReferenceList items={data.completed} />
        </div>
      ) : null}
      {data?.actionLog.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>Action Log</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {data.actionLog.map((entry, idx) => (
              <div key={`${entry.label}-${idx}`} style={{ fontSize: '0.875rem', lineHeight: 1.55, color: '#222' }}>
                <b>{entry.label}</b>
                {entry.detail && <div style={{ whiteSpace: 'pre-wrap' }}>{entry.detail}</div>}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {data?.warnings.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', lineHeight: 1.55, color: '#8A3D2E' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#8A3D2E', textTransform: 'uppercase' }}>Prior Scene Warnings</div>
          <ReferenceList items={data.warnings} />
        </div>
      ) : null}
    </section>
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
  const [activeTab, setActiveTab] = useState('input')

  const def = node.definition
  const previousReference = def.previousResponseReference
  const initialCount = def.initialCount ?? def.minItems ?? 3
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
  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const context = { playerName, branchFlags, mcSelections }
  const appTabs = node.appTabs || []
  const sourceTab = appTabs.find((tab) => tab.id === activeTab)

  const promptBlock = (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid #000',
        padding: '0.75rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 600,
      }}
    >
      {renderContentWithGlossary(interpolate(node.prompt, context))}
    </div>
  )

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

  const inputOutputWindow = appWindow && previousReference ? (
    <DesktopOverlay>
      <LaptopFrame
        variant={appWindow}
        title={node.windowTitle}
        fill
        scrollable
        titleTabs={[
          { id: 'input', label: def.inputTabLabel || previousReference.title },
          ...appTabs.map((tab) => ({ id: tab.id, label: tab.label })),
          { id: 'output', label: def.outputTabLabel || def.itemLabel },
        ]}
        activeTitleTabId={activeTab}
        onTitleTabChange={setActiveTab}
      >
        {activeTab === 'input' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
            {node.content && (
              <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
                {renderContentWithGlossary(interpolate(node.content, context))}
              </div>
            )}
            <PreviousResponseReferenceCard
              refSpec={previousReference}
              raw={responses[previousReference.bindingKey]}
            />
          </div>
        ) : sourceTab ? (
          <div style={{ padding: '1rem' }}>
            <AppTabContent tab={sourceTab} context={context} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem 1rem 0' }}>
              {promptBlock}
            </div>
            {formContent}
          </div>
        )}
      </LaptopFrame>
    </DesktopOverlay>
  ) : null

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

        {inputOutputWindow || (appWindow ? (
          <DesktopOverlay>
            <LaptopFrame variant={appWindow} title={node.windowTitle} fill scrollable>
              {formContent}
            </LaptopFrame>
          </DesktopOverlay>
        ) : (
          <>
            {node.content && (
              <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
                {renderContentWithGlossary(interpolate(node.content, context))}
              </div>
            )}
            {previousReference && (
              <PreviousResponseReferenceCard
                refSpec={previousReference}
                raw={responses[previousReference.bindingKey]}
              />
            )}
            {promptBlock}
            {formContent}
          </>
        ))}
      </motion.div>
      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
