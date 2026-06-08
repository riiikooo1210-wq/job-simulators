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
import SlackCompose from '../components/ui/SlackCompose'
import SlackMessageEnhanced from '../components/ui/SlackMessageEnhanced'
import { countWords } from '../components/ui/LongFormEditor'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import type { PriorityMatrixNode } from '../types/game'

// Quadrant IDs follow "high/low-yAxis-xAxis" convention
type QuadrantId = 'high-low' | 'high-high' | 'low-low' | 'low-high'

interface PlacedItem {
  quadrant: QuadrantId
  xPct: number   // 0-100 within quadrant
  yPct: number   // 0-100 within quadrant
}

// ---- Draggable item (from sidebar) ----
function SidebarItem({ item }: { item: { id: string; label: string } }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: item.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 999 } : {}

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        padding: '0.5rem 0.75rem',
        backgroundColor: '#FFF7E6',
        border: '1.5px solid #C9B26D',
        borderRadius: '20px',
        fontSize: '0.8rem',
        fontFamily: 'Inter, system-ui, sans-serif',
        cursor: 'grab',
        userSelect: 'none',
        boxShadow: '0 1px 3px rgba(95, 76, 18, 0.18)',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {item.label}
    </div>
  )
}

function PlacedMatrixItem({ item }: { item: { id: string; label: string; xPct: number; yPct: number } }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const dragTransform = transform
    ? `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px))`
    : 'translate(-50%, -50%)'

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: 'absolute',
        left: `${item.xPct}%`,
        top: `${item.yPct}%`,
        transform: dragTransform,
        padding: '0.3rem 0.6rem',
        backgroundColor: '#3A6B5E',
        border: '1.5px solid #1E1E1A',
        borderRadius: '16px',
        fontSize: '0.7rem',
        fontFamily: 'Inter, system-ui, sans-serif',
        color: '#fff',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 6px rgba(58,107,94,0.35)',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        maxWidth: '120px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        opacity: isDragging ? 0.35 : 1,
        zIndex: isDragging ? 10 : 2,
      }}
      title={`${item.label} - drag to reposition`}
    >
      {item.label}
    </div>
  )
}

// ---- Quadrant drop zone ----
function Quadrant({
  id,
  label,
  labelColor,
  placedItems,
}: {
  id: QuadrantId
  label: string
  labelColor: string
  placedItems: { id: string; label: string; xPct: number; yPct: number }[]
}) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        height: '100%',
        position: 'relative',
        backgroundColor: isOver ? 'rgba(15, 107, 90, 0.08)' : 'transparent',
        border: `1px solid ${isOver ? '#80B9A9' : '#CDBF9F'}`,
        transition: 'background-color 0.1s, border-color 0.1s',
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      {/* Quadrant label */}
      <span style={{
        position: 'absolute',
        top: '6px',
        left: '8px',
        fontSize: '0.6rem',
        fontWeight: 700,
        color: labelColor,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        opacity: 0.6,
        pointerEvents: 'none',
      }}>
        {label}
      </span>

      {/* Placed items */}
      {placedItems.map((item) => (
        <PlacedMatrixItem key={item.id} item={item} />
      ))}
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
  const [activeAppTab, setActiveAppTab] = useState('matrix')
  const matrixRef = useRef<HTMLDivElement>(null)

  const rationaleKey = node.rationaleBindingKey ?? node.bindingKey + '_rationale'
  const rationale = responses[rationaleKey] ?? ''
  const showRationale = Boolean(node.rationalePrompt)
  const slackTab = node.slackTab
  const slackTabId = slackTab?.id ?? 'slack'
  const slackKey = slackTab?.bindingKey ?? `${node.bindingKey}_slack`
  const slackChoiceKey = slackTab?.choiceBindingKey ?? `${slackKey}_choice`
  const slackReasonKey = slackTab?.reasonBindingKey ?? `${slackKey}_reason`
  const slackChoiceOptions = slackTab?.choiceOptions?.length
    ? slackTab.choiceOptions
    : node.items.map((item) => ({ id: item.id, label: item.label }))
  const slackChoice = slackTab ? responses[slackChoiceKey] ?? '' : ''
  const slackReason = slackTab ? responses[slackReasonKey] ?? '' : ''
  const slackWordCount = countWords(slackReason)
  const composeSlackMessage = (choice: string, reason: string) => {
    const trimmedReason = reason.trim()
    if (!choice.trim()) return trimmedReason
    return `Leo, I would handle ${choice.trim()} first.\nReason: ${trimmedReason}`
  }

  const placedState = useMemo(() => parseState(responses[node.bindingKey] ?? ''), [responses[node.bindingKey]]) // eslint-disable-line react-hooks/exhaustive-deps

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const handleDragStart = useCallback((e: DragStartEvent) => setActiveId(e.active.id as string), [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over) return
    const itemId = active.id as string
    const quadrant = over.id as QuadrantId

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
  const allItemsPlaced = placedItemIds.length >= node.items.length
  const canSubmit = allItemsPlaced && (!showRationale || rationale.trim().length >= 20)
  const slackChoiceSelected = !slackTab || slackChoice.trim().length > 0
  const slackMeetsMin = !slackTab?.minWords || slackWordCount >= slackTab.minWords
  const slackUnderMax = !slackTab?.maxWords || slackWordCount <= slackTab.maxWords
  const canSendSlack = allItemsPlaced && slackChoiceSelected && slackMeetsMin && slackUnderMax
  const interpolatedReference = node.referenceContent
    ? interpolate(node.referenceContent, { playerName, branchFlags, mcSelections })
    : ''
  const referenceTabs = node.referenceTabs ?? []
  const activeReferenceTab = referenceTabs.find((tab) => tab.id === activeAppTab)
  const activeSlackTab = Boolean(slackTab && activeAppTab === slackTabId)
  const titleTabs = referenceTabs.length > 0 || slackTab
    ? [
        { id: 'matrix', label: 'Matrix' },
        ...referenceTabs.map((tab) => ({ id: tab.id, label: tab.label })),
        ...(slackTab ? [{ id: slackTabId, label: slackTab.label ?? 'Slack' }] : []),
      ]
    : undefined

  const quadrants: { id: QuadrantId; label: string; color: string }[] = [
    { id: 'high-low', label: `High ${node.yAxis.label} / Low ${node.xAxis.label}`, color: '#1F7A5A' },
    { id: 'high-high', label: `High ${node.yAxis.label} / High ${node.xAxis.label}`, color: '#B76E00' },
    { id: 'low-low', label: `Low ${node.yAxis.label} / Low ${node.xAxis.label}`, color: '#6B6B5F' },
    { id: 'low-high', label: `Low ${node.yAxis.label} / High ${node.xAxis.label}`, color: '#B84A3A' },
  ]
  const sceneIllustration = node.illustration || (node.id === 'lead_priority' ? '/scenes/lead_priority.png' : undefined)

  return (
    <SceneWrapper illustration={sceneIllustration} showBack backLabel="Back">
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
        {interpolatedReference && (
          <div
            style={{
              backgroundColor: '#FFFCF4',
              border: '1px solid #000',
              boxShadow: '3px 3px 0 #000',
              padding: '0.875rem 1rem',
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              color: '#2d2d2d',
              whiteSpace: 'pre-wrap',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '0.5rem' }}>
              {node.referenceTitle ?? 'Source Artifact'}
            </strong>
            {renderContentWithGlossary(interpolatedReference)}
          </div>
        )}

        <DesktopOverlay>
          <LaptopFrame
            variant="miro"
            title={node.windowTitle ?? node.title}
            fill
            scrollable
            titleTabs={titleTabs}
            activeTitleTabId={activeAppTab}
            onTitleTabChange={setActiveAppTab}
          >
            {activeSlackTab && slackTab ? (
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', height: '100%', backgroundColor: '#F7F1E3' }}>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #e0e0e0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                    backgroundColor: '#fff',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1d1c1d' }}>
                    {slackTab.windowTitle ?? 'Leo Martinez'}
                  </span>
                  <span style={{ fontSize: '0.75rem', lineHeight: 1.5, color: '#616061' }}>
                    {renderContentWithGlossary(interpolate(slackTab.prompt, { playerName, branchFlags, mcSelections, freeTextResponses: responses }))}
                  </span>
                </div>
                {slackTab.slackMessages && slackTab.slackMessages.length > 0 && (
                  <div style={{ padding: '0.75rem 1rem 0.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {slackTab.slackMessages.map((message, index) => (
                      <SlackMessageEnhanced
                        key={index}
                        message={{
                          ...message,
                          content: interpolate(message.content, { playerName, branchFlags, mcSelections, freeTextResponses: responses }),
                        }}
                        delay={0}
                        initialExpanded
                        showUnreadDot={index === (slackTab.slackMessages?.length ?? 0) - 1}
                      />
                    ))}
                  </div>
                )}
                {!allItemsPlaced && (
                  <div style={{ padding: '0 1rem', fontSize: '0.75rem', color: '#8A5A00' }}>
                    Place all {node.items.length} companies on the Matrix tab before sending Leo the update.
                  </div>
                )}
                <div style={{ flex: '0 0 auto', marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0.75rem 1rem 0.25rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d1c1d' }}>
                      {slackTab.choicePrompt ?? 'New inbound lead to handle first'}
                    </label>
                    <select
                      value={slackChoice}
                      onChange={(event) => {
                        const choice = event.target.value
                        setFreeTextResponse(slackChoiceKey, choice)
                        setFreeTextResponse(slackKey, composeSlackMessage(choice, slackReason))
                      }}
                      style={{
                        width: '100%',
                        border: '1px solid #ccc',
                        borderRadius: '6px',
                        backgroundColor: '#fff',
                        color: '#1d1c1d',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: '0.875rem',
                        padding: '0.625rem 0.75rem',
                        outline: 'none',
                      }}
                    >
                      <option value="">{slackTab.choicePlaceholder ?? 'Select a company...'}</option>
                      {slackChoiceOptions.map((option) => (
                        <option key={option.id} value={option.label}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ padding: '0.375rem 1rem 0', fontSize: '0.75rem', fontWeight: 800, color: '#1d1c1d' }}>
                    {slackTab.reasonLabel ?? 'Reason for Leo'}
                  </div>
                  <SlackCompose
                    channel={slackTab.windowTitle ?? 'Leo Martinez'}
                    value={slackReason}
                    onChange={(value) => {
                      setFreeTextResponse(slackReasonKey, value)
                      setFreeTextResponse(slackKey, composeSlackMessage(slackChoice, value))
                    }}
                    placeholder={slackTab.placeholder}
                    minWords={slackTab.minWords}
                    maxWords={slackTab.maxWords}
                    onSend={() => {
                      setFreeTextResponse(slackKey, composeSlackMessage(slackChoice, slackReason))
                      goNext(node)
                    }}
                    sendDisabled={!canSendSlack}
                    showChannelHeader={false}
                  />
                </div>
                {import.meta.env.DEV && (
                  <div style={{ flex: '0 0 auto', padding: '0 1rem 1rem' }}>
                    <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
                  </div>
                )}
              </div>
            ) : activeReferenceTab ? (
              <div style={{ minHeight: '100%', padding: '0.875rem', backgroundColor: '#F7F1E3', color: '#1E1E1A' }}>
                <div
                  style={{
                    border: '1px solid #CDBF94',
                    backgroundColor: '#FBF7EA',
                    padding: '0.875rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    lineHeight: 1.65,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                    {activeReferenceTab.label}
                  </div>
                  {renderContentWithGlossary(interpolate(activeReferenceTab.content, { playerName, branchFlags, mcSelections }))}
                </div>
              </div>
            ) : (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', padding: '0.75rem', gap: '0.75rem' }}>

                {/* Unplaced items sidebar */}
                {unplacedItems.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', padding: '0.5rem 0.75rem', backgroundColor: '#FFF8E8', border: '1px solid #CDBF9F', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#6F5B1A', width: '100%', marginBottom: '0.125rem' }}>DRAG EVERY COMPANY ONTO THE MATRIX</span>
                    {unplacedItems.map((item) => <SidebarItem key={item.id} item={item} />)}
                  </div>
                )}

                {/* Matrix */}
                <div ref={matrixRef} style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', height: 'clamp(330px, 44vh, 430px)', minHeight: 0 }}>
                  {/* Y-axis label */}
                  <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, gap: 0 }}>
                    {/* Y axis */}
                    <div style={{ width: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '20px' }}>
                      <span style={{ fontSize: '0.6rem', color: '#2D665A', fontWeight: 700, writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
                        ↑ {node.yAxis.highLabel} {node.yAxis.label} {node.yAxis.lowLabel} ↓
                      </span>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* 2x2 grid */}
                      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', border: '2px solid #CDBF9F', backgroundColor: '#F6F0DE' }}>
                        {quadrants.map((q) => (
                          <div key={q.id} id={`quadrant-${q.id}`} style={{ minHeight: 0 }}>
                            <Quadrant
                              id={q.id}
                              label={q.label}
                              labelColor={q.color}
                              placedItems={node.items
                                .filter((it) => placedState[it.id]?.quadrant === q.id)
                                .map((it) => ({ id: it.id, label: it.label, xPct: placedState[it.id].xPct, yPct: placedState[it.id].yPct }))}
                            />
                          </div>
                        ))}
                      </div>
                      {/* X axis */}
                      <div style={{ height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '0.6rem', color: '#2D665A', fontWeight: 700 }}>
                          ← {node.xAxis.lowLabel} {node.xAxis.label} {node.xAxis.highLabel} →
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optional rationale + submit */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', flex: '0 0 auto', paddingTop: '0.5rem', borderTop: '1px solid #CDBF94', backgroundColor: '#F7F1E3' }}>
                  {showRationale && (
                    <>
                      <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#294A44' }}>
                        {node.rationalePrompt}
                      </label>
                      <textarea
                        value={rationale}
                        onChange={(e) => setFreeTextResponse(rationaleKey, e.target.value)}
                        placeholder={node.rationalePlaceholder ?? 'Explain which item you would handle first and why...'}
                        rows={3}
                        style={{
                          padding: '0.5rem 0.625rem',
                          fontSize: '0.8125rem',
                          fontFamily: 'Inter, system-ui, sans-serif',
                          border: '1px solid #CDBF9F',
                          backgroundColor: '#FFFCF4',
                          color: '#333',
                          outline: 'none',
                          resize: 'vertical',
                          borderRadius: '4px',
                        }}
                      />
                      {rationale.trim().length > 0 && rationale.trim().length < 20 && (
                        <span style={{ fontSize: '0.7rem', color: '#B87D6B' }}>Please add a bit more detail.</span>
                      )}
                    </>
                  )}
                  {!allItemsPlaced && (
                    <span style={{ fontSize: '0.7rem', color: '#8A5A00' }}>
                      Place all {node.items.length} companies before submitting.
                    </span>
                  )}
                  <ActionButton
                    text={slackTab ? 'Open Slack' : 'Submit'}
                    onClick={() => {
                      if (slackTab) {
                        setActiveAppTab(slackTabId)
                        return
                      }
                      goNext(node)
                    }}
                    disabled={!canSubmit}
                    variant={canSubmit ? 'primary' : 'secondary'}
                  />
                  {import.meta.env.DEV && (
                    <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
                  )}
                </div>
              </div>

              <DragOverlay>
                {activeItem ? (
                  <div style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: '#0F6B5A',
                    border: '1.5px solid #063F36',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: '#fff',
                    boxShadow: '0 8px 20px rgba(15, 63, 54, 0.34)',
                    cursor: 'grabbing',
                    whiteSpace: 'nowrap',
                  }}>
                    {activeItem.label}
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
            )}
          </LaptopFrame>
        </DesktopOverlay>

        {/* Rationale outside for accessibility (no appWindow) */}
      </motion.div>

      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
