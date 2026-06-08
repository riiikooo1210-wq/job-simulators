import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
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
import { BriefingDrawerContent } from './BriefingScene'
import type { KanbanBoardNode, KanbanCard as KanbanCardData } from '../types/game'

// ---- Card component ----
function KanbanCard({
  card,
  isDragging,
  showConstraint = true,
  compact = false,
}: {
  card: KanbanCardData
  isDragging?: boolean
  showConstraint?: boolean
  compact?: boolean
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: card.id })

  return (
    <div
      ref={setNodeRef}
      data-kanban-card-id={card.id}
      {...listeners}
      {...attributes}
      style={{
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        padding: compact ? '0.45rem 0.55rem' : '0.625rem 0.75rem',
        backgroundColor: '#fff',
        border: `1.5px solid ${isDragging ? '#B87D6B' : '#555'}`,
        borderRadius: '4px',
        fontSize: compact ? '0.76rem' : '0.8125rem',
        fontFamily: 'Inter, system-ui, sans-serif',
        lineHeight: compact ? 1.25 : 1.35,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        opacity: isDragging ? 0 : 1,
        boxShadow: compact ? '0 1px 2px rgba(0,0,0,0.12)' : '1px 1px 3px rgba(0,0,0,0.15)',
        overflowWrap: 'anywhere',
      }}
    >
      <div style={{ fontWeight: 650 }}>{card.text}</div>
      {showConstraint && card.constraint && (
        <div style={{
          marginTop: '0.375rem',
          paddingTop: '0.375rem',
          borderTop: '1px solid #E3D8B7',
          color: '#5F543F',
          fontSize: '0.72rem',
          lineHeight: 1.35,
        }}>
          <b style={{ color: '#3F605C' }}>Constraint:</b> {card.constraint}
        </div>
      )}
    </div>
  )
}

// ---- Column component ----
function KanbanColumn({ columnId, label, cards, activeId }: { columnId: string; label: string; cards: KanbanCardData[]; activeId?: string | null }) {
  const { isOver, setNodeRef } = useDroppable({ id: columnId })

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        minWidth: '180px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: isOver ? '#EFE8D2' : '#FBF7EA',
        border: `1px solid ${isOver ? '#3F605C' : '#CDBF94'}`,
        borderRadius: '6px',
        overflow: 'hidden',
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      {/* Column header */}
      <div style={{
        padding: '0.5rem 0.75rem',
        backgroundColor: '#EFE8D2',
        borderBottom: '1px solid #CDBF94',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#3F605C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span style={{
          fontSize: '0.65rem',
          backgroundColor: '#CDBF94',
          color: '#1E1E1A',
          padding: '1px 6px',
          borderRadius: '10px',
          fontWeight: 600,
        }}>
          {cards.length}
        </span>
      </div>

      {/* Cards area */}
      <div style={{
        flex: 1,
        padding: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.375rem',
        minHeight: '120px',
        overflowY: 'auto',
      }}>
        {cards.map((card) => (
          <KanbanCard key={card.id} card={card} isDragging={card.id === activeId} />
        ))}
        {cards.length === 0 && (
          <div style={{
            flex: 1,
            border: '1px dashed #CDBF94',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#7A7158',
            fontSize: '0.7rem',
            minHeight: '60px',
          }}>
            Drop here
          </div>
        )}
      </div>
    </div>
  )
}

function TimelineSlot({
  columnId,
  label,
  cards,
  activeId,
  bank = false,
}: {
  columnId: string
  label: string
  cards: KanbanCardData[]
  activeId?: string | null
  bank?: boolean
}) {
  const { isOver, setNodeRef } = useDroppable({ id: columnId })

  return (
    <section
      ref={setNodeRef}
      style={{
        display: bank ? 'flex' : 'grid',
        flexDirection: bank ? 'column' : undefined,
        gridTemplateColumns: bank ? undefined : 'minmax(7rem, 8.75rem) minmax(0, 1fr)',
        gap: bank ? '0.5rem' : '0.5rem',
        alignItems: bank ? 'stretch' : 'center',
        padding: bank ? '0.625rem' : '0.4rem 0.55rem',
        backgroundColor: isOver ? '#EFE8D2' : bank ? '#F7F1E3' : '#FBF7EA',
        border: `1px solid ${isOver ? '#3F605C' : '#CDBF94'}`,
        borderRadius: '6px',
        height: bank ? '100%' : undefined,
        minHeight: bank ? 0 : undefined,
        minWidth: 0,
        overflow: bank ? 'hidden' : undefined,
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: bank ? 'center' : 'flex-start',
          justifyContent: 'space-between',
          gap: '0.5rem',
          minWidth: 0,
        }}
      >
        <span style={{
          color: '#3F605C',
          fontSize: bank ? '0.76rem' : '0.71rem',
          fontWeight: 800,
          letterSpacing: '0.03em',
          textTransform: 'uppercase',
          lineHeight: 1.25,
        }}>
          {label}
        </span>
        <span style={{
          flexShrink: 0,
          fontSize: '0.68rem',
          backgroundColor: '#CDBF94',
          color: '#1E1E1A',
          padding: '1px 7px',
          borderRadius: '10px',
          fontWeight: 700,
        }}>
          {cards.length}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: bank ? '0.45rem' : '0.375rem',
          minHeight: bank ? 0 : '2.35rem',
          minWidth: 0,
          alignContent: 'start',
          flex: bank ? 1 : undefined,
          overflowY: bank ? 'auto' : undefined,
          paddingRight: bank ? '0.125rem' : undefined,
        }}
      >
        {cards.map((card) => (
          <KanbanCard
            key={card.id}
            card={card}
            isDragging={card.id === activeId}
            showConstraint={bank}
            compact={!bank}
          />
        ))}
        {cards.length === 0 && (
          <div style={{
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            minHeight: bank ? '5.5rem' : '2rem',
            border: '1px dashed #CDBF94',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#7A7158',
            fontSize: '0.74rem',
          }}>
            Drop here
          </div>
        )}
      </div>
    </section>
  )
}

// ---- Serialization helpers ----
function parseState(raw: string, cards: { id: string; initialColumn: string }[]): Record<string, string> {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) return parsed
  } catch {
    // fall through
  }
  return Object.fromEntries(cards.map((c) => [c.id, c.initialColumn]))
}

function serializeKanban(state: Record<string, string>): string {
  return JSON.stringify(state)
}

function pointerFromActivator(event: Event): { x: number; y: number } | null {
  if ('clientX' in event && 'clientY' in event) {
    return { x: Number(event.clientX), y: Number(event.clientY) }
  }
  return null
}

// ---- Main Component ----
export default function KanbanBoardScene({ node }: { node: KanbanBoardNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<{
    startPointerX: number
    startPointerY: number
    pointerX: number
    pointerY: number
    offsetX: number
    offsetY: number
    width: number
  } | null>(null)
  const [activeAppTab, setActiveAppTab] = useState('board')

  const hideRationale = node.hideRationale === true
  const rationaleKey = node.rationaleBindingKey ?? node.bindingKey + '_rationale'
  const rationale = responses[rationaleKey] ?? ''

  const cardState = useMemo(
    () => parseState(responses[node.bindingKey] ?? '', node.cards),
    [responses[node.bindingKey]] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const cardId = event.active.id as string
    setActiveId(cardId)
    const pointer = pointerFromActivator(event.activatorEvent)
    const cardEl = document.querySelector<HTMLElement>(`[data-kanban-card-id="${cardId}"]`)
    const rect = cardEl?.getBoundingClientRect()
    if (pointer && rect) {
      setDragPreview({
        startPointerX: pointer.x,
        startPointerY: pointer.y,
        pointerX: pointer.x,
        pointerY: pointer.y,
        offsetX: pointer.x - rect.left,
        offsetY: pointer.y - rect.top,
        width: rect.width,
      })
    }
  }, [])

  const clearDragState = useCallback(() => {
    setActiveId(null)
    setDragPreview(null)
  }, [])

  useEffect(() => {
    if (!activeId) return

    const handlePointerMove = (event: PointerEvent) => {
      setDragPreview((current) => current
        ? { ...current, pointerX: event.clientX, pointerY: event.clientY }
        : current)
    }
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      setDragPreview((current) => current
        ? { ...current, pointerX: touch.clientX, pointerY: touch.clientY }
        : current)
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [activeId])

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Live column highlight handled by useDroppable's isOver
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    clearDragState()
    const { active, over } = event
    if (!over) return
    const cardId = active.id as string
    const targetCol = over.id as string
    const validCol = node.columns.some((c) => c.id === targetCol)
    if (!validCol) return
    const updated = { ...cardState, [cardId]: targetCol }
    setFreeTextResponse(node.bindingKey, serializeKanban(updated))
  }, [cardState, clearDragState, node.columns, node.bindingKey, setFreeTextResponse])

  // Group cards by column
  const columnCards = useMemo(() => {
    const map: Record<string, typeof node.cards> = {}
    node.columns.forEach((col) => { map[col.id] = [] })
    node.cards.forEach((card) => {
      const colId = cardState[card.id] ?? card.initialColumn
      if (map[colId]) map[colId].push(card)
    })
    return map
  }, [cardState, node.columns, node.cards])

  const movedCount = node.cards.filter((c) => (cardState[c.id] ?? c.initialColumn) !== c.initialColumn).length
  const requiredMovedCount = node.requireAllCardsMoved ? node.cards.length : 1
  const canSubmit = movedCount >= requiredMovedCount && (hideRationale || rationale.trim().length >= 20)
  const activeCard = node.cards.find((c) => c.id === activeId)
  const appWindow = node.appWindow ?? 'kanban'
  const isTimeline = node.layout === 'timeline'
  const unscheduledColumn = node.columns.find((col) => col.id === 'unscheduled') ?? node.columns[0]
  const timelineColumns = node.columns.filter((col) => col.id !== unscheduledColumn?.id)
  const activeColumnId = activeCard ? (cardState[activeCard.id] ?? activeCard.initialColumn) : null
  const overlayShowsConstraint = !isTimeline || activeColumnId === unscheduledColumn?.id
  const titleTabs = [
    { id: 'board', label: node.windowTitle ?? node.title },
    ...(node.referenceContent ? [{ id: 'reference', label: node.referenceTitle || 'Reference' }] : []),
    ...(!hideRationale ? [{ id: 'rationale', label: 'Screening notes' }] : []),
  ]

  const boardContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={clearDragState}
      >
        {isTimeline ? (
          <div style={{
            flex: 1,
            minHeight: 0,
            padding: '0.75rem',
            display: 'grid',
            gridTemplateColumns: 'minmax(17rem, 38%) minmax(0, 1fr)',
            gap: '0.75rem',
            overflow: 'hidden',
          }}>
            {unscheduledColumn && (
              <TimelineSlot
                columnId={unscheduledColumn.id}
                label="Unscheduled task bank"
                cards={columnCards[unscheduledColumn.id] ?? []}
                activeId={activeId}
                bank
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', minHeight: 0, overflowY: 'auto', paddingRight: '0.125rem' }}>
              {timelineColumns.map((col) => (
                <TimelineSlot key={col.id} columnId={col.id} label={col.label} cards={columnCards[col.id] ?? []} activeId={activeId} />
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', flex: 1, minHeight: 0, overflowX: 'auto' }}>
            {node.columns.map((col) => (
              <KanbanColumn key={col.id} columnId={col.id} label={col.label} cards={columnCards[col.id] ?? []} activeId={activeId} />
            ))}
          </div>
        )}

        {activeCard && dragPreview && createPortal((
          <div style={{
            position: 'fixed',
            left: dragPreview.pointerX - dragPreview.offsetX,
            top: dragPreview.pointerY - dragPreview.offsetY,
            zIndex: 9999,
            pointerEvents: 'none',
            padding: '0.625rem 0.75rem',
            backgroundColor: '#FFF5E0',
            border: '1.5px solid #B87D6B',
            borderRadius: '4px',
            fontSize: '0.8125rem',
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
            cursor: 'grabbing',
            opacity: 0.97,
            lineHeight: 1.35,
            width: Math.min(dragPreview.width, isTimeline && !overlayShowsConstraint ? 288 : 352),
            maxWidth: 'min(26rem, 80vw)',
            boxSizing: 'border-box',
            overflowWrap: 'anywhere',
          }}>
            <div style={{ fontWeight: 650 }}>{activeCard.text}</div>
            {overlayShowsConstraint && activeCard.constraint && (
              <div style={{ marginTop: '0.375rem', paddingTop: '0.375rem', borderTop: '1px solid #E3D8B7', color: '#5F543F', fontSize: '0.72rem', lineHeight: 1.35 }}>
                <b style={{ color: '#3F605C' }}>Constraint:</b> {activeCard.constraint}
              </div>
            )}
          </div>
        ), document.body)}
      </DndContext>
    </div>
  )

  const rationaleContent = (
    <div style={{ minHeight: '100%', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', backgroundColor: '#F7F1E3' }}>
      <div style={{ border: '1px solid #CDBF94', backgroundColor: '#FBF7EA', padding: '0.75rem', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        <div style={{ fontSize: '0.7rem', color: '#3F605C' }}>
          {node.requireAllCardsMoved
            ? `${movedCount}/${node.cards.length} card${node.cards.length !== 1 ? 's' : ''} sorted`
            : `${movedCount} card${movedCount !== 1 ? 's' : ''} moved · ${node.cards.length - movedCount} in original position`}
        </div>
        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1E1E1A' }}>
          {node.rationalePrompt ?? 'Explain your key prioritization decisions.'}
        </label>
        <textarea
          value={rationale}
          onChange={(e) => setFreeTextResponse(rationaleKey, e.target.value)}
          placeholder={node.rationalePlaceholder ?? "e.g. I moved the auth bug fix to This Sprint because it's blocking our launch. The dark mode feature stays in backlog since it's nice-to-have but not critical..."}
          rows={3}
          style={{
            padding: '0.5rem 0.625rem',
            fontSize: '0.8125rem',
            fontFamily: 'Inter, system-ui, sans-serif',
            border: '1px solid #CDBF94',
            backgroundColor: '#fff',
            color: '#1E1E1A',
            outline: 'none',
            resize: 'vertical',
            borderRadius: '4px',
          }}
        />
        {rationale.trim().length > 0 && rationale.trim().length < 20 && (
          <span style={{ fontSize: '0.7rem', color: '#B87D6B' }}>Please add a bit more detail.</span>
        )}
        {movedCount < requiredMovedCount && (
          <span style={{ fontSize: '0.7rem', color: '#3F605C' }}>
            {node.requireAllCardsMoved
              ? `Sort all ${node.cards.length} cards before submitting.`
              : 'Move at least one card before submitting.'}
          </span>
        )}
        <ActionButton
          text="Submit"
          onClick={() => goNext(node)}
          disabled={!canSubmit}
          variant={canSubmit ? 'primary' : 'secondary'}
        />
      </div>
    </div>
  )

  const referenceContent = (
    <div style={{ minHeight: '100%', padding: '0.875rem', backgroundColor: '#F7F1E3', color: '#1E1E1A' }}>
      <div
        style={{
          border: '1px solid #CDBF94',
          backgroundColor: '#FBF7EA',
          padding: '0.875rem',
          borderRadius: '6px',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {node.referenceTitle && (
          <div style={{ fontSize: '0.75rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
            {node.referenceTitle}
          </div>
        )}
        {renderContentWithGlossary(interpolate(node.referenceContent || '', { playerName, branchFlags, mcSelections }))}
      </div>
    </div>
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
          {briefing && <ReferenceButton onClick={() => setRefOpen(true)} label="View Briefing" />}
        </div>
        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}

        <DesktopOverlay>
          <LaptopFrame
            variant={appWindow as any}
            title={node.windowTitle ?? node.title}
            fill
            titleTabs={appWindow === 'kanban' ? titleTabs : undefined}
            activeTitleTabId={activeAppTab}
            onTitleTabChange={setActiveAppTab}
          >
            {activeAppTab === 'rationale' && !hideRationale ? rationaleContent : activeAppTab === 'reference' ? referenceContent : boardContent}
          </LaptopFrame>
        </DesktopOverlay>
        {hideRationale && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
            <ActionButton
              text="Submit"
              onClick={() => goNext(node)}
              disabled={!canSubmit}
              variant={canSubmit ? 'primary' : 'secondary'}
              fullWidth={false}
            />
          </div>
        )}
        {import.meta.env.DEV && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
          </div>
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
