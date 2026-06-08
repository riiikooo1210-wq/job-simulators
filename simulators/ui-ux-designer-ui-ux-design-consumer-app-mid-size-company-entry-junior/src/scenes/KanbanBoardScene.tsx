import { useCallback, useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
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
import { BriefingDrawerContent } from './BriefingScene'
import type { KanbanBoardNode } from '../types/game'

// ---- Card component ----
function KanbanCard({ card, isDragging }: { card: { id: string; text: string }; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: card.id })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999, opacity: 0.85 }
    : {}

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        padding: '0.625rem 0.75rem',
        backgroundColor: isDragging ? '#FFF5E0' : '#fff',
        border: `1.5px solid ${isDragging ? '#B87D6B' : '#555'}`,
        borderRadius: '4px',
        fontSize: '0.8125rem',
        fontFamily: 'Inter, system-ui, sans-serif',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : '1px 1px 3px rgba(0,0,0,0.15)',
        ...style,
      }}
    >
      {card.text}
    </div>
  )
}

// ---- Column component ----
function KanbanColumn({ columnId, label, cards }: { columnId: string; label: string; cards: { id: string; text: string }[] }) {
  const { isOver, setNodeRef } = useDroppable({ id: columnId })

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: isOver ? '#1A2030' : '#161B22',
        border: `1px solid ${isOver ? '#4A90D9' : '#21262D'}`,
        borderRadius: '6px',
        overflow: 'hidden',
        transition: 'border-color 0.15s, background-color 0.15s',
      }}
    >
      {/* Column header */}
      <div style={{
        padding: '0.5rem 0.75rem',
        backgroundColor: '#0D1117',
        borderBottom: '1px solid #21262D',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8B949E', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span style={{
          fontSize: '0.65rem',
          backgroundColor: '#21262D',
          color: '#8B949E',
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
      }}>
        {cards.map((card) => (
          <KanbanCard key={card.id} card={card} />
        ))}
        {cards.length === 0 && (
          <div style={{
            flex: 1,
            border: '1px dashed #21262D',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#484F58',
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

  const rationaleKey = node.rationaleBindingKey ?? node.bindingKey + '_rationale'
  const rationale = responses[rationaleKey] ?? ''

  const cardState = useMemo(
    () => parseState(responses[node.bindingKey] ?? '', node.cards),
    [responses[node.bindingKey]] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Live column highlight handled by useDroppable's isOver
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const cardId = active.id as string
    const targetCol = over.id as string
    const validCol = node.columns.some((c) => c.id === targetCol)
    if (!validCol) return
    const updated = { ...cardState, [cardId]: targetCol }
    setFreeTextResponse(node.bindingKey, serializeKanban(updated))
  }, [cardState, node.columns, node.bindingKey, setFreeTextResponse])

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
  const canSubmit = movedCount >= 1 && rationale.trim().length >= 20
  const activeCard = node.cards.find((c) => c.id === activeId)
  const appWindow = node.appWindow ?? 'kanban'

  const boardContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        {/* Kanban columns */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem', flex: 1, minHeight: 0, overflowX: 'auto' }}>
          {node.columns.map((col) => (
            <KanbanColumn key={col.id} columnId={col.id} label={col.label} cards={columnCards[col.id] ?? []} />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <div style={{
              padding: '0.625rem 0.75rem',
              backgroundColor: '#FFF5E0',
              border: '1.5px solid #B87D6B',
              borderRadius: '4px',
              fontSize: '0.8125rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)',
              cursor: 'grabbing',
              opacity: 0.95,
            }}>
              {activeCard.text}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Rationale + submit area */}
      <div style={{ borderTop: '1px solid #21262D', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', backgroundColor: '#0D1117' }}>
        <div style={{ fontSize: '0.7rem', color: '#8B949E' }}>
          {movedCount} card{movedCount !== 1 ? 's' : ''} moved · {node.cards.length - movedCount} in original position
        </div>
        <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#C9D1D9' }}>
          {node.rationalePrompt ?? 'Explain your key prioritization decisions.'}
        </label>
        <textarea
          value={rationale}
          onChange={(e) => setFreeTextResponse(rationaleKey, e.target.value)}
          placeholder="e.g. I moved the auth bug fix to This Sprint because it's blocking our launch. The dark mode feature stays in backlog since it's nice-to-have but not critical..."
          rows={3}
          style={{
            padding: '0.5rem 0.625rem',
            fontSize: '0.8125rem',
            fontFamily: 'Inter, system-ui, sans-serif',
            border: '1px solid #30363D',
            backgroundColor: '#161B22',
            color: '#C9D1D9',
            outline: 'none',
            resize: 'vertical',
            borderRadius: '4px',
          }}
        />
        {rationale.trim().length > 0 && rationale.trim().length < 20 && (
          <span style={{ fontSize: '0.7rem', color: '#B87D6B' }}>Please add a bit more detail.</span>
        )}
        <ActionButton
          text="Submit"
          onClick={() => goNext(node)}
          disabled={!canSubmit}
          variant={canSubmit ? 'primary' : 'secondary'}
        />
        {import.meta.env.DEV && (
          <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
        )}
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
          <LaptopFrame variant={appWindow as any} title={node.windowTitle ?? node.title} fill>
            {boardContent}
          </LaptopFrame>
        </DesktopOverlay>
      </motion.div>

      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
