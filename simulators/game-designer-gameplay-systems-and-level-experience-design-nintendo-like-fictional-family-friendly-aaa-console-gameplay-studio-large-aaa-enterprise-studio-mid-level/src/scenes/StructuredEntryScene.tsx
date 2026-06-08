import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import WorkSurfaceFrame, {
  hasWorkSurfaceVisual,
  resolveWorkSurfaceVariant,
} from '../components/layout/WorkSurfaceFrame'
import ActionButton from '../components/ui/ActionButton'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type {
  StructuredEntryNode,
  StructuredEntryPreviousResponseReference,
  StructuredEntryVisualBoard,
  StructuredEntryVisualHotspot,
} from '../types/game'

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

function parseReferenceItems(raw: string): Item[] {
  const normalizeObject = (value: unknown): Item | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        entryValue == null ? '' : String(entryValue),
      ])
    ) as Item
  }

  if (!raw.trim()) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(normalizeObject).filter((item): item is Item => item !== null)
    const item = normalizeObject(parsed)
    if (item) return [item]
    if (typeof parsed === 'string' && parsed.trim()) return [{ response: parsed }]
  } catch {
    return [{ response: raw }]
  }
  return []
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function PreviousResponseReferenceCard({
  reference,
  rawResponse,
}: {
  reference: StructuredEntryPreviousResponseReference
  rawResponse: string
}) {
  const referenceItems = useMemo(() => parseReferenceItems(rawResponse), [rawResponse])
  const hasContent = referenceItems.some((item) => Object.values(item).some((value) => value.trim().length > 0))

  return (
    <section
      style={{
        border: '1px solid #CDBF94',
        backgroundColor: '#FBF7EA',
        padding: '0.875rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
      }}
    >
      <div style={{ fontSize: '0.6875rem', color: '#3A6B5E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
        {reference.title}
      </div>

      {!hasContent ? (
        <p style={{ margin: 0, fontSize: '0.8125rem', lineHeight: 1.55, color: '#6f6758' }}>
          {reference.emptyText || 'No previous response yet.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {referenceItems.map((item, idx) => {
            const entries = Object.entries(item).filter(([, value]) => value.trim().length > 0)
            if (entries.length === 0) return null
            return (
              <div
                key={idx}
                style={{
                  border: '1px solid #E4D8B9',
                  backgroundColor: '#F7F1E3',
                  padding: '0.7rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                }}
              >
                {referenceItems.length > 1 && (
                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
                    Entry {idx + 1}
                  </div>
                )}
                {entries.map(([key, value]) => (
                  <div key={key}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6f6758', textTransform: 'uppercase', letterSpacing: 0 }}>
                      {reference.fieldLabels?.[key] || humanizeKey(key)}
                    </div>
                    <div style={{ marginTop: '0.18rem', fontSize: '0.8125rem', lineHeight: 1.55, color: '#1E1E1A', whiteSpace: 'pre-wrap' }}>
                      {reference.valueLabels?.[value] || value}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function MiniLevelFallback() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: '#DCE6D2' }} />
      <div style={{ position: 'absolute', left: '0%', right: '0%', bottom: '0%', height: '28%', backgroundColor: '#5F7F62', borderTop: '2px solid #1E1E1A' }} />
      <div style={{ position: 'absolute', left: '8%', top: '60%', width: '26%', height: '10%', backgroundColor: '#CDBF94', border: '2px solid #1E1E1A', boxShadow: '0 0.45rem 0 #3F605C' }} />
      <div style={{ position: 'absolute', left: '70%', top: '47%', width: '22%', height: '10%', backgroundColor: '#CDBF94', border: '2px solid #1E1E1A', boxShadow: '0 0.45rem 0 #3F605C' }} />
      <div style={{ position: 'absolute', left: '35%', top: '61%', width: '34%', height: '16%', backgroundColor: '#6B9EA6', borderTop: '2px solid #1E1E1A' }} />
      <div style={{ position: 'absolute', left: '41%', top: '44%', width: '3%', height: '19%', backgroundColor: '#3F605C', border: '1px solid #1E1E1A' }} />
      <div style={{ position: 'absolute', left: '37.5%', top: '37%', width: '10%', height: '10%', borderRadius: '999px', backgroundColor: '#C75448', border: '2px solid #1E1E1A' }} />
      <div style={{ position: 'absolute', left: '45%', top: '39%', width: '28%', height: '17%', border: '2px solid #3F605C', backgroundColor: 'rgba(95, 127, 98, 0.28)', borderRadius: '50% 18% 18% 50%' }} />
      <div style={{ position: 'absolute', left: '50%', top: '42%', color: '#3F605C', fontSize: '1.25rem', fontWeight: 900, letterSpacing: 0 }}>
        &gt;&gt;&gt;
      </div>
      {['74%', '79%', '84%'].map((left, i) => (
        <div
          key={left}
          style={{
            position: 'absolute',
            left,
            top: `${35 + i * 3}%`,
            width: '1.15rem',
            height: '1.15rem',
            borderRadius: '999px',
            backgroundColor: '#E8DCC8',
            border: '2px solid #1E1E1A',
          }}
        />
      ))}
      <div style={{ position: 'absolute', left: '12%', top: '51%', fontSize: '0.72rem', fontWeight: 900, color: '#1E1E1A', backgroundColor: 'rgba(247, 241, 227, 0.86)', border: '1px solid #1E1E1A', padding: '0.18rem 0.3rem' }}>
        safe start
      </div>
      <div style={{ position: 'absolute', left: '72%', top: '39%', fontSize: '0.72rem', fontWeight: 900, color: '#1E1E1A', backgroundColor: 'rgba(247, 241, 227, 0.86)', border: '1px solid #1E1E1A', padding: '0.18rem 0.3rem' }}>
        landing
      </div>
    </>
  )
}

function TutorialLevelStage({
  board,
  selectedHotspotId,
  selectedHotspotIds,
  onSelect,
}: {
  board: StructuredEntryVisualBoard
  selectedHotspotId: string
  selectedHotspotIds: Set<string>
  onSelect: (id: string) => void
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(board.imagePath && !imageFailed)

  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '16 / 9',
        width: '100%',
        overflow: 'hidden',
        border: '1px solid #000',
        backgroundColor: '#E8DCC8',
      }}
      aria-label={board.stageTitle || 'Tutorial level slice'}
    >
      <MiniLevelFallback />
      {showImage && (
        <img
          src={board.imagePath}
          alt={board.imageAlt || ''}
          onError={() => setImageFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {board.hotspots.map((hotspot) => {
        const selectedForBeat = selectedHotspotId === hotspot.id
        const usedElsewhere = !selectedForBeat && selectedHotspotIds.has(hotspot.id)
        return (
          <button
            key={hotspot.id}
            type="button"
            onClick={() => onSelect(hotspot.id)}
            title={hotspot.description || hotspot.label}
            aria-pressed={selectedForBeat}
            style={{
              position: 'absolute',
              left: `${hotspot.xPct}%`,
              top: `${hotspot.yPct}%`,
              width: `${hotspot.wPct}%`,
              height: `${hotspot.hPct}%`,
              border: selectedForBeat ? '2px solid #C75448' : '1.5px dashed rgba(30, 30, 26, 0.78)',
              backgroundColor: selectedForBeat ? 'rgba(199, 84, 72, 0.18)' : usedElsewhere ? 'rgba(95, 127, 98, 0.18)' : 'rgba(247, 241, 227, 0.08)',
              color: '#1E1E1A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.2rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '0.68rem',
              fontWeight: 900,
              lineHeight: 1.1,
              textAlign: 'center',
              boxShadow: selectedForBeat ? '3px 3px 0 #1E1E1A' : 'none',
            }}
          >
            <span style={{ backgroundColor: 'rgba(247, 241, 227, 0.9)', border: '1px solid rgba(30, 30, 26, 0.7)', padding: '0.12rem 0.22rem' }}>
              {hotspot.shortLabel || hotspot.label}
            </span>
          </button>
        )
      })}
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
  const [activeBeatIndex, setActiveBeatIndex] = useState(0)

  const def = node.definition
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
  const appWindow = resolveWorkSurfaceVariant(node, 'notion') as LaptopFrameVariant
  const presentation = def.presentation
    ?? (node.workSurface?.kind === 'spreadsheet_workbook' ? 'spreadsheet'
      : node.workSurface?.kind === 'ats_screening' ? 'screening_sheet'
      : node.workSurface?.kind === 'comment_queue' ? 'comment_queue'
      : node.appWindow === 'spreadsheet' ? 'spreadsheet'
      : 'cards')
  const tableLike = ['table', 'spreadsheet', 'screening_sheet', 'issue_list', 'comment_queue'].includes(presentation)
  const visualBoard = def.visualBoard
  const tutorialBoard = presentation === 'tutorial_beat_board' ? visualBoard : undefined
  const activeItemIndex = Math.min(activeBeatIndex, Math.max(items.length - 1, 0))
  const activeItem = items[activeItemIndex] || {}
  const hotspotById = useMemo(() => {
    return new Map((visualBoard?.hotspots || []).map((hotspot) => [hotspot.id, hotspot]))
  }, [visualBoard])
  const selectedHotspotIds = useMemo(() => {
    return new Set(items.map((item) => item.stage_focus).filter(Boolean))
  }, [items])
  const activeHotspotId = activeItem.stage_focus || ''
  const activeHotspot = hotspotById.get(activeHotspotId)
  const previousResponseReference = def.previousResponseReference
  const hasReferenceDrawer = Boolean(briefing || previousResponseReference)

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

  const selectHotspotForActiveBeat = (hotspotId: string) => {
    updateItem(activeItemIndex, 'stage_focus', hotspotId)
  }

  const renderTutorialField = (field: typeof def.fields[number]) => {
    if (field.key === 'stage_focus') {
      return (
        <div
          style={{
            border: '1px solid #CDBF94',
            backgroundColor: '#FBF7EA',
            padding: '0.55rem 0.65rem',
            fontSize: '0.82rem',
            lineHeight: 1.5,
            minHeight: '2.45rem',
          }}
        >
          {activeHotspot ? (
            <>
              <strong>{activeHotspot.label}</strong>
              {activeHotspot.description && <span style={{ color: '#555' }}> - {activeHotspot.description}</span>}
            </>
          ) : (
            <span style={{ color: '#6f6758' }}>Choose a place on the level map.</span>
          )}
        </div>
      )
    }
    return renderControl(activeItemIndex, field)
  }

  const renderTutorialBeatBoard = (board: StructuredEntryVisualBoard) => {
    const beatMeta = board.beats?.[activeItemIndex]
    const editableFields = def.fields
    const singleNote = items.length === 1 && def.maxItems === 1

    return (
      <div className="tutorial-beat-board" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem' }}>
        <div
          className="tutorial-beat-board-grid"
          style={{
            display: 'grid',
            gap: '0.75rem',
            alignItems: 'start',
          }}
        >
          <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
                {board.stageTitle || 'Mini level'}
              </div>
              {board.subtitle && (
                <p style={{ marginTop: '0.28rem', fontSize: '0.82rem', lineHeight: 1.55, color: '#333' }}>
                  {board.subtitle}
                </p>
              )}
            </div>

            <TutorialLevelStage
              board={board}
              selectedHotspotId={activeHotspotId}
              selectedHotspotIds={selectedHotspotIds}
              onSelect={selectHotspotForActiveBeat}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 10rem), 1fr))', gap: '0.5rem' }}>
              {board.hotspots.map((hotspot: StructuredEntryVisualHotspot) => {
                const selectedForBeat = activeHotspotId === hotspot.id
                return (
                  <button
                    key={hotspot.id}
                    type="button"
                    onClick={() => selectHotspotForActiveBeat(hotspot.id)}
                    style={{
                      border: selectedForBeat ? '2px solid #C75448' : '1px solid #CDBF94',
                      backgroundColor: selectedForBeat ? '#F2EBD9' : '#FBF7EA',
                      color: '#1E1E1A',
                      cursor: 'pointer',
                      padding: '0.55rem',
                      textAlign: 'left',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: '0.76rem', lineHeight: 1.25 }}>{hotspot.label}</strong>
                    {hotspot.description && (
                      <span style={{ display: 'block', marginTop: '0.2rem', fontSize: '0.68rem', lineHeight: 1.35, color: '#555' }}>
                        {hotspot.description}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </section>

          <section className="tutorial-beat-board-note" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!singleNote && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 9rem), 1fr))', gap: '0.5rem' }}>
                {items.map((item, idx) => {
                  const beat = board.beats?.[idx]
                  const selected = idx === activeItemIndex
                  const complete = def.fields.every((field) => (item[field.key] || '').trim().length > 0)
                  const focus = hotspotById.get(item.stage_focus || '')
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveBeatIndex(idx)}
                      style={{
                        border: selected ? '2px solid #1E1E1A' : '1px solid #CDBF94',
                        backgroundColor: selected ? '#E8DCC8' : '#FBF7EA',
                        color: '#1E1E1A',
                        boxShadow: selected ? '3px 3px 0 #1E1E1A' : 'none',
                        cursor: 'pointer',
                        padding: '0.6rem',
                        minHeight: '5.25rem',
                        textAlign: 'left',
                        fontFamily: 'Inter, system-ui, sans-serif',
                      }}
                    >
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 }}>
                        Entry {idx + 1}{complete ? ' - done' : ''}
                      </span>
                      <strong style={{ display: 'block', marginTop: '0.2rem', fontSize: '0.86rem', lineHeight: 1.25 }}>
                        {beat?.label || `${def.itemLabel} ${idx + 1}`}
                      </strong>
                      <span style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.7rem', lineHeight: 1.3, color: '#555' }}>
                        {focus ? focus.label : 'Pick a level area'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <div
              style={{
                border: '1px solid #000',
                backgroundColor: '#F7F1E3',
                padding: '0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
                  {singleNote ? 'Design note' : `Editing entry ${activeItemIndex + 1}`}
                </div>
                {!singleNote && (
                  <h3 style={{ margin: '0.15rem 0 0', fontSize: '1rem', lineHeight: 1.3 }}>
                    {beatMeta?.label || `${def.itemLabel} ${activeItemIndex + 1}`}
                  </h3>
                )}
                {beatMeta?.helper && (
                  <p style={{ marginTop: '0.3rem', fontSize: '0.78rem', lineHeight: 1.5, color: '#555' }}>
                    {beatMeta.helper}
                  </p>
                )}
              </div>

              {editableFields.map((field) => (
                <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E1E1A' }}>{field.label}</label>
                  {renderTutorialField(field)}
                </div>
              ))}
            </div>
          </section>
        </div>

        {board.helperText && (
          <div style={{ border: '1px solid #CDBF94', backgroundColor: '#FBF7EA', padding: '0.75rem', fontSize: '0.8rem', lineHeight: 1.55, color: '#333' }}>
            {board.helperText}
          </div>
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
  }

  const formContent = tutorialBoard ? renderTutorialBeatBoard(tutorialBoard) : (
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
          {hasReferenceDrawer && <ReferenceButton onClick={() => setRefOpen(true)} label="View Briefing" />}
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
        >
          {formContent}
        </WorkSurfaceFrame>
      </motion.div>
      {hasReferenceDrawer && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing?.title || 'Reference Info'}>
          {briefing && <BriefingDrawerContent node={briefing} />}
          {previousResponseReference && (
            <PreviousResponseReferenceCard
              reference={previousResponseReference}
              rawResponse={responses[previousResponseReference.bindingKey] || ''}
            />
          )}
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
