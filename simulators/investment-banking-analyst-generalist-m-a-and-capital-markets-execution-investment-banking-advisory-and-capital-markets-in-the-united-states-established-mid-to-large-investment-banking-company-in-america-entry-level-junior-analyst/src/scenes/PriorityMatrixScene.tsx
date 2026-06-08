import { useCallback, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import LaptopFrame from '../components/ui/LaptopFrame'
import ActionButton from '../components/ui/ActionButton'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { showDevControls } from '../lib/devControls'
import { BriefingDrawerContent } from './BriefingScene'
import type { PriorityMatrixNode } from '../types/game'

// Quadrant IDs follow "high/low-yAxis-xAxis" convention
type QuadrantId = 'high-low' | 'high-high' | 'low-low' | 'low-high'

interface PlacedItem {
  quadrant: QuadrantId
  xPct: number   // 0-100 within quadrant
  yPct: number   // 0-100 within quadrant
}

const quadrantIds: QuadrantId[] = ['high-low', 'high-high', 'low-low', 'low-high']

function isQuadrantId(value: string): value is QuadrantId {
  return quadrantIds.includes(value as QuadrantId)
}

// ---- Draggable item ----
function DraggableItem({
  item,
  variant = 'unplaced',
  isActive = false,
}: {
  item: { id: string; label: string }
  variant?: 'unplaced' | 'placed'
  isActive?: boolean
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: item.id })
  const isPlaced = variant === 'placed'

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        padding: isPlaced ? '0.25rem 0.42rem' : '0.28rem 0.45rem',
        backgroundColor: isPlaced ? '#3A6B5E' : '#F7F1E3',
        border: isPlaced ? '1.5px solid #24483F' : '1.5px solid #6B9EA6',
        borderRadius: isPlaced ? '14px' : '20px',
        fontSize: isPlaced ? '0.62rem' : '0.68rem',
        lineHeight: 1.2,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: isPlaced ? '#F7F1E3' : '#24483F',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: isPlaced ? '0 2px 6px rgba(58,107,94,0.24)' : '0 1px 3px rgba(107,158,166,0.2)',
        whiteSpace: 'normal',
        maxWidth: isPlaced ? '14rem' : '13rem',
        minWidth: 0,
        overflowWrap: 'anywhere',
        textAlign: 'left',
        opacity: isActive ? 0.35 : 1,
      }}
      title={item.label}
    >
      {renderContentWithGlossary(item.label)}
    </div>
  )
}

// ---- Quadrant drop zone ----
function Quadrant({
  id,
  label,
  labelColor,
  placedItems,
  activeId,
}: {
  id: QuadrantId
  label: string
  labelColor: string
  placedItems: { id: string; label: string; xPct: number; yPct: number }[]
  activeId: string | null
}) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      id={`quadrant-${id}`}
      ref={setNodeRef}
      style={{
        height: '100%',
        position: 'relative',
        backgroundColor: isOver ? 'rgba(107,158,166,0.16)' : 'transparent',
        border: `1px solid ${isOver ? '#6B9EA6' : '#CDBF94'}`,
        transition: 'background-color 0.1s, border-color 0.1s',
        overflow: 'hidden',
        minHeight: '112px',
      }}
    >
      {/* Quadrant label */}
      <span style={{
        position: 'absolute',
        top: '4px',
        left: '6px',
        fontSize: '0.55rem',
        fontWeight: 700,
        color: labelColor,
        textTransform: 'uppercase',
        letterSpacing: 0,
        opacity: 0.6,
        pointerEvents: 'none',
      }}>
        {label}
      </span>

      <div
        style={{
          position: 'absolute',
          inset: '1.2rem 0.35rem 0.35rem',
          display: 'flex',
          alignContent: 'flex-start',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '0.25rem',
          overflowY: 'auto',
        }}
      >
        {placedItems.map((item) => (
          <DraggableItem
            key={item.id}
            item={item}
            variant="placed"
            isActive={activeId === item.id}
          />
        ))}
      </div>
    </div>
  )
}

// ---- Serialization ----
function parseState(raw: string): Record<string, PlacedItem> {
  try {
    const p = JSON.parse(raw)
    if (typeof p === 'object' && p !== null) return p
  } catch {
    // fall through
  }
  return {}
}

// ---- Main Component ----
export default function PriorityMatrixScene({ node }: { node: PriorityMatrixNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const matrixRef = useRef<HTMLDivElement>(null)

  const rationaleKey = node.rationaleBindingKey ?? node.bindingKey + '_rationale'
  const rationale = responses[rationaleKey] ?? ''

  const placedState = useMemo(() => parseState(responses[node.bindingKey] ?? ''), [responses[node.bindingKey]]) // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleDragStart = useCallback((e: DragStartEvent) => setActiveId(e.active.id as string), [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const itemId = active.id as string
    const overId = String(over.id)
    if (!isQuadrantId(overId)) return
    const quadrant = overId

    // Calculate position within quadrant from drag delta
    const overEl = document.getElementById(`quadrant-${quadrant}`)
    if (!overEl) {
      const updated = { ...placedState, [itemId]: { quadrant, xPct: 50, yPct: 50 } }
      setFreeTextResponse(node.bindingKey, JSON.stringify(updated))
      return
    }
    const rect = overEl.getBoundingClientRect()
    const finalX = event.active.rect.current.translated
    if (!finalX) {
      const updated = { ...placedState, [itemId]: { quadrant, xPct: 50, yPct: 50 } }
      setFreeTextResponse(node.bindingKey, JSON.stringify(updated))
      return
    }
    const xPct = Math.max(10, Math.min(90, ((finalX.left + finalX.width / 2 - rect.left) / rect.width) * 100))
    const yPct = Math.max(10, Math.min(90, ((finalX.top + finalX.height / 2 - rect.top) / rect.height) * 100))
    const updated = { ...placedState, [itemId]: { quadrant, xPct, yPct } }
    setFreeTextResponse(node.bindingKey, JSON.stringify(updated))
  }, [placedState, node.bindingKey, setFreeTextResponse])

  const placedItemIds = Object.keys(placedState)
  const unplacedItems = node.items.filter((it) => !placedItemIds.includes(it.id))
  const activeItem = node.items.find((it) => it.id === activeId)
  const allItemsPlaced = placedItemIds.length === node.items.length
  const canSubmit = allItemsPlaced && rationale.trim().length >= 20

  const quadrants: { id: QuadrantId; label: string; color: string }[] = [
    { id: 'high-low', label: `High ${node.yAxis.label} / Low ${node.xAxis.label}`, color: '#3A6B5E' },
    { id: 'high-high', label: `High ${node.yAxis.label} / High ${node.xAxis.label}`, color: '#B87D6B' },
    { id: 'low-low', label: `Low ${node.yAxis.label} / Low ${node.xAxis.label}`, color: '#666' },
    { id: 'low-high', label: `Low ${node.yAxis.label} / High ${node.xAxis.label}`, color: '#6B9EA6' },
  ]

  return (
    <SceneWrapper showBack backLabel="Back">
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

        <DesktopOverlay width="74%" height="82%">
          <LaptopFrame variant="miro" title={node.windowTitle ?? node.title} fill scrollable contentPadding="0.55rem">
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '24rem', gap: '0.35rem' }}>

                {/* Unplaced items sidebar */}
                {unplacedItems.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', padding: '0.45rem 0.625rem', backgroundColor: '#F7F1E3', border: '1px solid #CDBF94', borderRadius: '6px', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#24483F', width: '100%', marginBottom: '0.1rem', letterSpacing: 0 }}>DRAG ITEMS ONTO THE MATRIX</span>
                    {unplacedItems.map((item) => <DraggableItem key={item.id} item={item} isActive={activeId === item.id} />)}
                  </div>
                )}

                {/* Matrix */}
                <div ref={matrixRef} style={{ flex: '1 0 16rem', display: 'flex', flexDirection: 'column', minHeight: '16rem', overflow: 'auto' }}>
                  {/* Y-axis label */}
                  <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, gap: 0 }}>
                    {/* Y axis */}
                    <div style={{ width: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '20px' }}>
                      <span style={{ fontSize: '0.6rem', color: '#24483F', fontWeight: 700, writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', letterSpacing: 0 }}>
                        ↑ {node.yAxis.highLabel} {node.yAxis.label} {node.yAxis.lowLabel} ↓
                      </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* 2x2 grid */}
                      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', border: '2px solid #CDBF94', backgroundColor: '#EFE8D2', minHeight: 0 }}>
                        {quadrants.map((q) => (
                          <Quadrant
                            key={q.id}
                            id={q.id}
                            label={q.label}
                            labelColor={q.color}
                            activeId={activeId}
                            placedItems={node.items
                              .filter((it) => placedState[it.id]?.quadrant === q.id)
                            .map((it) => ({ id: it.id, label: it.label, xPct: placedState[it.id].xPct, yPct: placedState[it.id].yPct }))}
                          />
                        ))}
                      </div>
                      {/* X axis */}
                      <div style={{ height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.6rem', color: '#24483F', fontWeight: 700, letterSpacing: 0 }}>
                          ← {node.xAxis.lowLabel} {node.xAxis.label} {node.xAxis.highLabel} →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DragOverlay>
                {activeItem ? (
                  <div style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#3A6B5E',
                    border: '1.5px solid #24483F',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: '#F7F1E3',
                    boxShadow: '0 8px 20px rgba(58,107,94,0.35)',
                    cursor: 'grabbing',
                    whiteSpace: 'normal',
                    maxWidth: '14rem',
                    overflowWrap: 'anywhere',
                    lineHeight: 1.25,
                    textAlign: 'left',
                  }}>
                    {renderContentWithGlossary(activeItem.label)}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </LaptopFrame>
        </DesktopOverlay>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 700, color: '#24483F' }}>
            {node.rationalePrompt ?? 'Explain your top-priority pick and why.'}
          </label>
          <textarea
            value={rationale}
            onChange={(e) => setFreeTextResponse(rationaleKey, e.target.value)}
            placeholder="Name the two requests you would handle first, who you would involve, and the risk you are reducing."
            rows={3}
            style={{
              padding: '0.75rem',
              fontSize: '0.875rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              border: '1px solid #000',
              backgroundColor: '#F7F1E3',
              color: '#333',
              outline: 'none',
              resize: 'vertical',
              borderRadius: '0',
              lineHeight: 1.45,
            }}
          />
          {rationale.trim().length > 0 && rationale.trim().length < 20 && (
            <span style={{ fontSize: '0.75rem', color: '#B87D6B' }}>Please add a bit more detail.</span>
          )}
          {!allItemsPlaced && (
            <span style={{ fontSize: '0.75rem', color: '#B87D6B' }}>
              Place all {node.items.length} requests before submitting. You can move any placed card until you submit.
            </span>
          )}
          <ActionButton
            text="Submit"
            onClick={() => goNext(node)}
            disabled={!canSubmit}
            variant={canSubmit ? 'primary' : 'secondary'}
          />
          {showDevControls && (
            <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
          )}
        </div>
      </motion.div>

      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
