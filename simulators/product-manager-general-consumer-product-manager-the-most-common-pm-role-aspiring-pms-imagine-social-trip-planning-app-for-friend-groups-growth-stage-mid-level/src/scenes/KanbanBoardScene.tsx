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
import WorkSurfaceFrame, { hasWorkSurfaceVisual } from '../components/layout/WorkSurfaceFrame'
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
          <KanbanCard key={card.id} card={card} />
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
  const [activeAppTab, setActiveAppTab] = useState('board')

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
  const requiredMovedCount = node.requireAllCardsMoved ? node.cards.length : 1
  const canSubmit = movedCount >= requiredMovedCount && rationale.trim().length >= 20
  const activeCard = node.cards.find((c) => c.id === activeId)
  const appWindow = node.appWindow ?? 'kanban'
  const referenceTabs = useMemo(() => {
    const explicitTabs = node.referenceTabs?.filter((tab) => tab.content?.trim().length > 0) ?? []
    if (explicitTabs.length > 0) return explicitTabs
    if (!node.referenceContent) return []
    return [{ id: 'reference', label: node.referenceTitle || 'Reference', content: node.referenceContent }]
  }, [node.referenceTabs, node.referenceTitle, node.referenceContent])
  const activeReferenceTab = referenceTabs.find((tab) => activeAppTab === `reference:${tab.id}`)
  const titleTabs = [
    { id: 'board', label: node.windowTitle ?? node.title },
    ...referenceTabs.map((tab) => ({ id: `reference:${tab.id}`, label: tab.label })),
    { id: 'rationale', label: 'Rationale' },
  ]

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
        {import.meta.env.DEV && (
          <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
        )}
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
        {activeReferenceTab?.label && (
          <div style={{ fontSize: '0.75rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
            {activeReferenceTab.label}
          </div>
        )}
        {renderContentWithGlossary(interpolate(activeReferenceTab?.content || '', { playerName, branchFlags, mcSelections }))}
      </div>
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
          {briefing && <ReferenceButton onClick={() => setRefOpen(true)} label="View Briefing" />}
        </div>
        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}

        <WorkSurfaceFrame
            node={node}
            variant={appWindow as any}
            title={node.windowTitle ?? node.title}
            titleTabs={appWindow === 'kanban' ? titleTabs : undefined}
            activeTitleTabId={activeAppTab}
            onTitleTabChange={setActiveAppTab}
          >
            {activeAppTab === 'rationale' ? rationaleContent : activeReferenceTab ? referenceContent : boardContent}
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
