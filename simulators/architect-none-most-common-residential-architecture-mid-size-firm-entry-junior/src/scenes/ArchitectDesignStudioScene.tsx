import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
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
import { storyline } from '../data/storyline'
import { BriefingDrawerContent } from './BriefingScene'
import { renderStructuredEntryAppTab } from './StructuredEntryScene'
import type { ArchitectDesignStudioNode, StructuredEntryNode } from '../types/game'
import type { StructuredEntryContext } from './StructuredEntryScene'

type RoomLabelId = 'kitchen' | 'mudroom' | 'bedroom'
type ActiveTool = 'select' | RoomLabelId
type AppTabId = 'revit' | 'verifyReplies' | 'replySummary'
type RevitViewId = 'level1' | 'level2' | 'westElevation'

interface Point {
  x: number
  y: number
}

interface Rect extends Point {
  w: number
  h: number
}

interface PlacedItem extends Point {
  placed: boolean
}

interface StudioState {
  footprint: Rect
  labels: Record<RoomLabelId, PlacedItem>
  windowStrategy: string
  notes: string
}

type DragState =
  | { kind: 'footprint'; start: Point; startFootprint: Rect }
  | { kind: 'resize-east' | 'resize-west' | 'resize-south'; start: Point; startFootprint: Rect }
  | { kind: 'label'; id: RoomLabelId; start: Point; startItem: PlacedItem }

const SITE = { w: 100, h: 75 }
const LEVEL_1_IMAGE_ZOOM = 1.005
const EXISTING_HOUSE: Rect = { x: 28, y: 10, w: 50, h: 27 }
const REAR_LOT_Y = 71.36
const HOUSE_REAR_Y = EXISTING_HOUSE.y + EXISTING_HOUSE.h
const TREE = { x: 24, y: 52, buffer: 11 }
const FIELD_CONFLICT_ZONE: Rect = { x: 69.25, y: 35.8, w: 9, h: 8 }
const FEET_PER_SITE_UNIT = 1.4

const appTabs: { id: AppTabId; label: string }[] = [
  { id: 'revit', label: 'Revit' },
  { id: 'verifyReplies', label: 'Verify Replies' },
  { id: 'replySummary', label: 'Reply Summary' },
]

const reviewVerifyRepliesNode = storyline.nodes.review_verify_replies as StructuredEntryNode | undefined
const verifyRepliesTab = reviewVerifyRepliesNode?.appTabs?.find((tab) => tab.id === 'verify_replies')

const roomTools: { id: RoomLabelId; label: string; shortLabel: string; level: RevitViewId }[] = [
  { id: 'kitchen', label: 'Kitchen remodel area', shortLabel: 'Kitchen', level: 'level1' },
  { id: 'mudroom', label: 'Mudroom entry zone', shortLabel: 'Mudroom', level: 'level1' },
  { id: 'bedroom', label: 'Bedroom suite above', shortLabel: 'Suite', level: 'level2' },
]

const windowStrategies = [
  { id: 'higher_sill', label: 'Higher sill' },
  { id: 'translucent_glass', label: 'Translucent glass' },
  { id: 'smaller_window', label: 'Smaller window' },
  { id: 'landscape_screen', label: 'Landscape screen' },
]

const defaultState: StudioState = {
  footprint: { x: 38, y: HOUSE_REAR_Y, w: 38, h: 18 },
  labels: {
    kitchen: { x: 63, y: 45, placed: false },
    mudroom: { x: 49, y: 45, placed: false },
    bedroom: { x: 63, y: 45, placed: false },
  },
  windowStrategy: '',
  notes: '',
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function countNoteWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function parseState(raw: string | undefined): StudioState {
  if (!raw) return defaultState
  try {
    const parsed = JSON.parse(raw)
    const option = parsed?.option ?? parsed
    return {
      footprint: { ...defaultState.footprint, ...(option.footprint || {}) },
      labels: {
        kitchen: { ...defaultState.labels.kitchen, ...(option.labels?.kitchen || {}) },
        mudroom: { ...defaultState.labels.mudroom, ...(option.labels?.mudroom || {}) },
        bedroom: { ...defaultState.labels.bedroom, ...(option.labels?.bedroom || {}) },
      },
      windowStrategy: typeof option.windowStrategy === 'string' ? option.windowStrategy : '',
      notes: typeof option.notes === 'string' ? option.notes : '',
    }
  } catch {
    return defaultState
  }
}

function rectsOverlap(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function distanceFromPointToRect(point: Point, rect: Rect) {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.w))
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.h))
  return Math.sqrt(dx * dx + dy * dy)
}

function analyzeState(state: StudioState) {
  const southEdge = state.footprint.y + state.footprint.h
  const rearSetback = (REAR_LOT_Y - southEdge) * FEET_PER_SITE_UNIT
  const area = state.footprint.w * state.footprint.h
  const lotCoverage = 42 + area / 150
  const treeClearance = (distanceFromPointToRect({ x: TREE.x, y: TREE.y }, state.footprint) - TREE.buffer) * FEET_PER_SITE_UNIT
  const fieldConflict = rectsOverlap(state.footprint, FIELD_CONFLICT_ZONE)
  const roomsPlaced = roomTools.every((tool) => state.labels[tool.id].placed)

  const checks = [
    {
      id: 'setback',
      label: 'Rear setback',
      value: `${rearSetback.toFixed(1)} ft clear`,
      ok: rearSetback >= 25,
      severity: rearSetback >= 25 ? 'ok' : 'blocker',
      message: rearSetback >= 25 ? 'Addition edge is inside the required line.' : 'Pull the rear edge north or reduce depth to reach 25 ft.',
    },
    {
      id: 'coverage',
      label: 'Lot coverage',
      value: `${lotCoverage.toFixed(1)}%`,
      ok: lotCoverage <= 45,
      severity: lotCoverage <= 45 ? 'ok' : 'blocker',
      message: lotCoverage <= 45 ? 'Option stays under the 45% worksheet threshold.' : 'Reduce width or depth before review.',
    },
    {
      id: 'tree',
      label: 'Maple tree buffer',
      value: treeClearance >= 0 ? `${treeClearance.toFixed(1)} ft clear` : `${Math.abs(treeClearance).toFixed(1)} ft overlap`,
      ok: treeClearance >= 0,
      severity: treeClearance >= 0 ? 'ok' : 'blocker',
      message: treeClearance >= 0 ? 'Footprint avoids the root-protection buffer.' : 'Shift or narrow the option away from the maple buffer.',
    },
    {
      id: 'field',
      label: 'Utility clear zone',
      value: fieldConflict ? 'overlap' : 'clear',
      ok: !fieldConflict,
      severity: fieldConflict ? 'blocker' : 'ok',
      message: fieldConflict ? 'Shift or narrow the footprint away from Maya/Owen clear zone.' : 'Footprint stays clear of the resolved utility zone.',
    },
  ]

  const blockers = checks.filter((check) => check.severity === 'blocker')
  return {
    rearSetback,
    lotCoverage,
    treeClearance,
    fieldConflict,
    roomsPlaced,
    checks,
    blockers,
  }
}

function responsePayload(state: StudioState) {
  const analysis = analyzeState(state)
  return JSON.stringify({
    closestRealTool: 'Autodesk Revit',
    simulatedTool: 'Revit-like BIM floor-plan editor for a residential schematic option study',
    option: state,
    constraintCheck: {
      rearSetbackFeet: Number(analysis.rearSetback.toFixed(1)),
      lotCoveragePercent: Number(analysis.lotCoverage.toFixed(1)),
      mapleTreeClearanceFeet: Number(analysis.treeClearance.toFixed(1)),
      basementWindowUtilityConflict: analysis.fieldConflict,
      blockers: analysis.blockers.map((item) => item.label),
    },
  }, null, 2)
}

function statusColor(severity: string) {
  if (severity === 'blocker') return '#B87D6B'
  if (severity === 'warning') return '#D2A39A'
  return '#3A6B5E'
}

function toolButtonStyle(active: boolean): CSSProperties {
  return {
    width: '100%',
    border: '1px solid #1E1E1A',
    background: active ? '#3A6B5E' : '#FBF7EA',
    color: active ? '#F2EBD9' : '#1E1E1A',
    borderRadius: 4,
    padding: '0.45rem 0.5rem',
    fontSize: '0.72rem',
    fontWeight: 800,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: 'Inter, system-ui, sans-serif',
  }
}

function parseReplySummary(raw: string | undefined) {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const firstSummary = parsed.find((item) => typeof item?.summary === 'string')?.summary
      return firstSummary ?? ''
    }
    if (typeof parsed?.summary === 'string') return parsed.summary
  } catch {
    return raw
  }
  return ''
}

export default function ArchitectDesignStudioScene({ node }: { node: ArchitectDesignStudioNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const [studio, setStudio] = useState(() => parseState(responses[node.bindingKey]))
  const [activeAppTab, setActiveAppTab] = useState<AppTabId>('revit')
  const [activeLevel, setActiveLevel] = useState<RevitViewId>('level1')
  const [activeTool, setActiveTool] = useState<ActiveTool>('select')
  const [drag, setDrag] = useState<DragState | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const context = { playerName, branchFlags, mcSelections }
  const analysis = useMemo(() => analyzeState(studio), [studio])
  const replySummary = useMemo(() => parseReplySummary(responses.verify_resolution_summary), [responses.verify_resolution_summary])
  const visibleRoomTools = roomTools.filter((tool) => tool.level === activeLevel)
  const minNotesWords = node.minNotesWords ?? Math.ceil((node.minNotesChars ?? 90) / 5)
  const noteWordCount = countNoteWords(studio.notes)
  const notesReady = noteWordCount >= minNotesWords
  const windowReady = studio.windowStrategy === 'translucent_glass'
  const canSubmit = analysis.blockers.length === 0 && analysis.roomsPlaced && windowReady && notesReady

  const save = (next: StudioState) => {
    setStudio(next)
    setFreeTextResponse(node.bindingKey, responsePayload(next))
  }

  const updateOption = (updater: (state: StudioState) => StudioState) => {
    save(updater(studio))
  }

  const setFootprint = (footprint: Rect) => {
    updateOption((state) => ({
      ...state,
      footprint: {
        x: clamp(footprint.x, 16, 52),
        y: HOUSE_REAR_Y,
        w: clamp(footprint.w, 22, 45),
        h: clamp(footprint.h, 10, 24),
      },
    }))
  }

  const pointFromEvent = (event: ReactPointerEvent<SVGElement>): Point => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return { x: 0, y: 0 }
    const point = svg.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const svgPoint = point.matrixTransform(matrix.inverse())
    return {
      x: clamp(svgPoint.x, 0, SITE.w),
      y: clamp(svgPoint.y, 0, SITE.h),
    }
  }

  const startDrag = (event: ReactPointerEvent<SVGElement>, nextDrag: DragState) => {
    event.preventDefault()
    event.stopPropagation()
    setDrag(nextDrag)
  }

  const placeActiveTool = (point: Point) => {
    if (activeTool === 'select') return
    const id = activeTool
    save({
      ...studio,
      labels: {
        ...studio.labels,
        [id]: { x: clamp(point.x, 6, 94), y: clamp(point.y, 8, 69), placed: true },
      },
    })
  }

  const placeRoomTool = (id: RoomLabelId) => {
    const item = studio.labels[id]
    if (!item.placed) {
      updateOption((state) => ({
        ...state,
        labels: {
          ...state.labels,
          [id]: { ...state.labels[id], placed: true },
        },
      }))
    }
    setActiveTool('select')
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag) return
    const point = pointFromEvent(event)
    const dx = point.x - drag.start.x
    const dy = point.y - drag.start.y

    if (drag.kind === 'footprint') {
      setFootprint({ ...drag.startFootprint, x: drag.startFootprint.x + dx })
      return
    }
    if (drag.kind === 'resize-east') {
      setFootprint({ ...drag.startFootprint, w: drag.startFootprint.w + dx })
      return
    }
    if (drag.kind === 'resize-west') {
      const x = drag.startFootprint.x + dx
      const east = drag.startFootprint.x + drag.startFootprint.w
      setFootprint({ ...drag.startFootprint, x, w: east - x })
      return
    }
    if (drag.kind === 'resize-south') {
      setFootprint({ ...drag.startFootprint, h: drag.startFootprint.h + dy })
      return
    }
    if (drag.kind === 'label') {
      save({
        ...studio,
        labels: {
          ...studio.labels,
          [drag.id]: {
            ...drag.startItem,
            x: clamp(drag.startItem.x + dx, 6, 94),
            y: clamp(drag.startItem.y + dy, 8, 69),
            placed: true,
          },
        },
      })
      return
    }
  }

  const selectedWindowStrategy = windowStrategies.find((item) => item.id === studio.windowStrategy)
  const planImageZoom = activeLevel === 'level1' ? LEVEL_1_IMAGE_ZOOM : 1
  const planImageWidth = SITE.w * planImageZoom
  const planImageHeight = SITE.h * planImageZoom
  const planImageX = -(planImageWidth - SITE.w) / 2
  const planImageY = -(planImageHeight - SITE.h) / 2

  return (
    <SceneWrapper illustration={undefined} hideIllustration showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
            {node.toolModel && (
              <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', fontWeight: 800, color: '#3A6B5E' }}>
                Closest real tool: {node.toolModel}
              </div>
            )}
          </div>
          {briefing && <ReferenceButton onClick={() => setRefOpen(true)} label="View Briefing" />}
        </div>
        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, context))}
          </div>
        )}
        <div style={{ backgroundColor: '#FBF7EA', border: '1px solid #CDBF94', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 650 }}>
          {renderContentWithGlossary(interpolate(node.prompt, context))}
        </div>

        <DesktopOverlay width="80%" height="82%" laptopZoom={1.05} laptopOffsetX="-1%">
          <LaptopFrame
            variant="bim"
            title={node.windowTitle ?? 'Maple Street Addition.rvt'}
            titleTabs={appTabs}
            activeTitleTabId={activeAppTab}
            onTitleTabChange={(id) => {
              setActiveAppTab(id as AppTabId)
              setActiveTool('select')
              setDrag(null)
            }}
            fill
          >
            <div style={{ height: '100%', minWidth: 0, display: 'grid', gridTemplateColumns: activeAppTab === 'revit' ? '145px minmax(280px, 1fr) 220px' : 'minmax(280px, 1fr)', background: '#F7F1E3', color: '#1E1E1A' }}>
              {activeAppTab === 'revit' && (
                <aside style={{ borderRight: '1px solid #CDBF94', background: '#EFE8D2', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', overflow: 'auto' }}>
                  <section style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <PanelTitle>Project Views</PanelTitle>
                    {[
                      { id: 'level1' as RevitViewId, label: 'Level 1' },
                      { id: 'level2' as RevitViewId, label: 'Level 2' },
                      { id: 'westElevation' as RevitViewId, label: 'West Elevation' },
                    ].map((view) => (
                      <button
                        key={view.id}
                        type="button"
                        onClick={() => {
                          setActiveLevel(view.id)
                          setActiveTool('select')
                          setDrag(null)
                        }}
                        style={toolButtonStyle(activeLevel === view.id)}
                      >
                        {view.label}
                      </button>
                    ))}
                  </section>

                  {activeLevel !== 'westElevation' ? (
                    <>
                      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <PanelTitle>Modify</PanelTitle>
                        <button type="button" onClick={() => setActiveTool('select')} style={toolButtonStyle(activeTool === 'select')}>Select / move</button>
                        <div style={{ fontSize: '0.6rem', lineHeight: 1.35, color: '#6A604B' }}>
                          Click a room tag button to place it. Drag placed tags to refine the drawing.
                        </div>
                      </section>

                      <section style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <PanelTitle>Room Tags</PanelTitle>
                        {visibleRoomTools.map((tool) => (
                          <button key={tool.id} type="button" onClick={() => placeRoomTool(tool.id)} style={toolButtonStyle(studio.labels[tool.id].placed)}>
                            {tool.label}
                          </button>
                        ))}
                      </section>

                    </>
                  ) : (
                    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <PanelTitle>Elevation Task</PanelTitle>
                      <div style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.45rem', borderRadius: 4, fontSize: '0.66rem', lineHeight: 1.4, color: '#6A604B' }}>
                        Use the West Window Strategy buttons to place a privacy approach at the upper-right bedroom-window location.
                      </div>
                    </section>
                  )}
                </aside>
              )}

              <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
                <div style={{ borderBottom: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.38rem 0.55rem', display: 'flex', gap: '0.45rem', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 850, color: '#3A6B5E' }}>
                    {activeAppTab === 'revit'
                      ? activeLevel === 'level1'
                        ? 'Level 1 - Proposed Plan'
                        : activeLevel === 'level2'
                          ? 'Level 2 - Proposed Plan'
                          : 'A201 West Elevation'
                      : appTabs.find((tab) => tab.id === activeAppTab)?.label}
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', color: '#6A604B', fontSize: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {activeAppTab === 'revit' ? (
                      <>
                        <span>Scale 1/8 in = 1 ft</span>
                        <span>Detail level: Medium</span>
                        <span>Workset: Maple Street</span>
                      </>
                    ) : (
                      <span>Source view</span>
                    )}
                  </div>
                </div>

                {activeAppTab === 'revit' ? (
                  activeLevel === 'westElevation' ? (
                    <WestElevationCanvas strategyId={studio.windowStrategy} selectedWindowStrategy={selectedWindowStrategy?.label} />
                  ) : (
                <div style={{ flex: 1, minHeight: 0, padding: '0.75rem', overflow: 'auto', background: '#F2EBD9', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                  <div style={{ width: '100%', aspectRatio: '4 / 3', border: '1px solid #1E1E1A', background: '#FBF7EA', boxShadow: '4px 4px 0 rgba(0,0,0,0.22)' }}>
                    <svg
                      ref={svgRef}
                      viewBox={`0 0 ${SITE.w} ${SITE.h}`}
                      preserveAspectRatio="xMidYMid meet"
                      onPointerMove={handlePointerMove}
                      onPointerUp={() => setDrag(null)}
                      onPointerLeave={() => setDrag(null)}
                      style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none', cursor: activeTool === 'select' ? 'default' : 'crosshair' }}
                    >
                      <rect x={0} y={0} width={SITE.w} height={SITE.h} fill="#FBF7EA" />
                      <image
                        href={activeLevel === 'level1' ? '/action-assets/revit/level1.png' : '/action-assets/revit/level2.png'}
                        x={planImageX}
                        y={planImageY}
                        width={planImageWidth}
                        height={planImageHeight}
                        preserveAspectRatio="none"
                      />

                      <rect
                        x={0}
                        y={0}
                        width={SITE.w}
                        height={SITE.h}
                        fill="transparent"
                        onPointerDown={(event) => placeActiveTool(pointFromEvent(event))}
                      />

                      <g
                        onPointerDown={(event) => startDrag(event, { kind: 'footprint', start: pointFromEvent(event), startFootprint: studio.footprint })}
                        style={{ cursor: 'move' }}
                      >
                        <rect
                          x={studio.footprint.x}
                          y={studio.footprint.y}
                          width={studio.footprint.w}
                          height={studio.footprint.h}
                          fill="#B87D6B"
                          opacity={0.22}
                          stroke="#B87D6B"
                          strokeWidth={0.75}
                        />
                        <text x={studio.footprint.x + 1.4} y={studio.footprint.y + 3} fontSize={1.45} fill="#8B5E50" fontWeight={900}>
                          {activeLevel === 'level1' ? 'proposed rear addition' : 'suite footprint above'}
                        </text>
                      </g>

                      <line x1={studio.footprint.x} x2={studio.footprint.x + studio.footprint.w} y1={studio.footprint.y + studio.footprint.h + 2.2} y2={studio.footprint.y + studio.footprint.h + 2.2} stroke="#1E1E1A" strokeWidth={0.25} />
                      <text x={studio.footprint.x + studio.footprint.w / 2 - 2.4} y={studio.footprint.y + studio.footprint.h + 4.3} fontSize={1.4} fill="#1E1E1A" fontWeight={800}>{studio.footprint.w.toFixed(0)} ft</text>
                      <line x1={studio.footprint.x + studio.footprint.w + 2} x2={studio.footprint.x + studio.footprint.w + 2} y1={studio.footprint.y} y2={studio.footprint.y + studio.footprint.h} stroke="#1E1E1A" strokeWidth={0.25} />
                      <text x={studio.footprint.x + studio.footprint.w + 2.8} y={studio.footprint.y + studio.footprint.h / 2} fontSize={1.4} fill="#1E1E1A" fontWeight={800}>{studio.footprint.h.toFixed(0)} ft</text>

                      <circle
                        cx={studio.footprint.x + studio.footprint.w}
                        cy={studio.footprint.y + studio.footprint.h / 2}
                        r={1.15}
                        fill="#3A6B5E"
                        stroke="#1E1E1A"
                        strokeWidth={0.25}
                        onPointerDown={(event) => startDrag(event, { kind: 'resize-east', start: pointFromEvent(event), startFootprint: studio.footprint })}
                        style={{ cursor: 'ew-resize' }}
                      />
                      <circle
                        cx={studio.footprint.x}
                        cy={studio.footprint.y + studio.footprint.h / 2}
                        r={1.15}
                        fill="#3A6B5E"
                        stroke="#1E1E1A"
                        strokeWidth={0.25}
                        onPointerDown={(event) => startDrag(event, { kind: 'resize-west', start: pointFromEvent(event), startFootprint: studio.footprint })}
                        style={{ cursor: 'ew-resize' }}
                      />
                      <circle
                        cx={studio.footprint.x + studio.footprint.w / 2}
                        cy={studio.footprint.y + studio.footprint.h}
                        r={1.15}
                        fill="#3A6B5E"
                        stroke="#1E1E1A"
                        strokeWidth={0.25}
                        onPointerDown={(event) => startDrag(event, { kind: 'resize-south', start: pointFromEvent(event), startFootprint: studio.footprint })}
                        style={{ cursor: 'ns-resize' }}
                      />

                      {roomTools.filter((tool) => tool.level === activeLevel).map((tool) => {
                        const item = studio.labels[tool.id]
                        if (!item.placed) return null
                        return (
                          <g
                            key={tool.id}
                            onPointerDown={(event) => startDrag(event, { kind: 'label', id: tool.id, start: pointFromEvent(event), startItem: item })}
                            style={{ cursor: 'move' }}
                          >
                            <rect x={item.x - 4.4} y={item.y - 2} width={8.8} height={4} rx={0.8} fill="#F7F1E3" stroke="#1E1E1A" strokeWidth={0.3} />
                            <text x={item.x} y={item.y + 0.45} textAnchor="middle" fontSize={1.25} fontWeight={900} fill="#1E1E1A">{tool.shortLabel}</text>
                          </g>
                        )
                      })}

                    </svg>
                  </div>
                </div>
                  )
                ) : (
                  <SourceTabContent activeTab={activeAppTab} replySummary={replySummary} context={context} />
                )}
              </main>

              {activeAppTab === 'revit' && (
                <aside style={{ borderLeft: '1px solid #CDBF94', background: '#EFE8D2', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', overflow: 'auto' }}>
                {activeAppTab === 'revit' && activeLevel !== 'westElevation' && (
                  <section style={{ border: '1px solid #CDBF94', background: '#FBF7EA', borderRadius: 6, padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <PanelTitle>Properties</PanelTitle>
                    <RangeControl label="Width" value={studio.footprint.w} min={22} max={45} unit="ft" onChange={(value) => setFootprint({ ...studio.footprint, w: value })} />
                    <RangeControl label="Depth" value={studio.footprint.h} min={10} max={24} unit="ft" onChange={(value) => setFootprint({ ...studio.footprint, h: value })} />
                    <RangeControl label="Shift east" value={studio.footprint.x} min={16} max={52} unit="ft" onChange={(value) => setFootprint({ ...studio.footprint, x: value })} />
                  </section>
                )}

                {activeLevel === 'westElevation' && (
                  <section style={{ border: '1px solid #CDBF94', background: '#FBF7EA', borderRadius: 6, padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    <PanelTitle>West Window Strategy</PanelTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                      {windowStrategies.map((strategy) => {
                        const active = studio.windowStrategy === strategy.id
                        return (
                          <button
                            key={strategy.id}
                            type="button"
                            onClick={() => save({ ...studio, windowStrategy: strategy.id })}
                            style={{
                              border: '1px solid #1E1E1A',
                              borderRadius: 4,
                              background: active ? '#6B9EA6' : '#F7F1E3',
                              color: '#1E1E1A',
                              padding: '0.35rem',
                              fontSize: '0.68rem',
                              fontWeight: 850,
                              cursor: 'pointer',
                              fontFamily: 'Inter, system-ui, sans-serif',
                            }}
                          >
                            {strategy.label}
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#6A604B' }}>
                      Selected: {selectedWindowStrategy?.label ?? 'none'}
                    </div>
                  </section>
                )}

                {activeLevel !== 'westElevation' && (
                  <section style={{ border: '1px solid #CDBF94', background: '#FBF7EA', borderRadius: 6, padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <PanelTitle>Constraint Check</PanelTitle>
                    {analysis.checks.map((check) => (
                      <div key={check.id} style={{ borderLeft: `4px solid ${statusColor(check.severity)}`, background: '#F7F1E3', padding: '0.4rem 0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', fontSize: '0.68rem', fontWeight: 900 }}>
                          <span>{check.label}</span>
                          <span>{check.value}</span>
                        </div>
                        <div style={{ marginTop: '0.2rem', fontSize: '0.64rem', lineHeight: 1.35, color: '#6A604B' }}>{check.message}</div>
                      </div>
                    ))}
                  </section>
                )}

                </aside>
              )}
            </div>
          </LaptopFrame>
        </DesktopOverlay>

        <section style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: '#3A6B5E' }}>Design Notes</h2>
              <div style={{ marginTop: '0.25rem', fontSize: '0.78rem', lineHeight: 1.55, color: '#555' }}>
                Write a short note to Maya/Owen that explains the plan move, the room locations, the translucent-glass privacy choice, and how the option handles setback, lot coverage, maple tree, and utility-clear constraints.
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: notesReady ? '#3A6B5E' : '#6A604B', fontWeight: 800 }}>
              {noteWordCount}/{minNotesWords} words minimum
            </div>
          </div>
          <textarea
            value={studio.notes}
            onChange={(event) => save({ ...studio, notes: event.target.value })}
            placeholder={node.notesPlaceholder ?? 'Write 3-5 sentences for Maya/Owen: state the footprint move, where kitchen/mudroom/suite go, why the west-window strategy fits privacy/daylight, which constraints are clear, and what still needs review before permit drawings.'}
            rows={5}
            style={{
              resize: 'vertical',
              border: '1px solid #CDBF94',
              background: '#F7F1E3',
              color: '#1E1E1A',
              borderRadius: 4,
              padding: '0.65rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '0.82rem',
              lineHeight: 1.5,
              minHeight: 120,
            }}
          />
        </section>

        <section style={{ border: '1px solid #B87D6B', background: '#F2EBD9', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 360px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 950, color: '#8B5E50', marginBottom: '0.25rem' }}>Submit Full Schematic Option</div>
            <div style={{ fontSize: '0.75rem', lineHeight: 1.45, color: canSubmit ? '#3A6B5E' : '#6A604B' }}>
              Required: Level 1 kitchen/mudroom tags, Level 2 suite tag, Translucent glass privacy strategy, live constraints with no blockers, and design notes.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <ActionButton text="Submit option study" onClick={() => goNext(node)} disabled={!canSubmit} variant="primary" fullWidth={false} />
            {import.meta.env.DEV && <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />}
          </div>
        </section>
      </motion.div>

      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}

function WestElevationCanvas({
  strategyId,
  selectedWindowStrategy,
}: {
  strategyId: string
  selectedWindowStrategy?: string
}) {
  const target = { x: 61.4, y: 22.8, w: 12.4, h: 12.75 }
  const placedWindowHref = strategyId ? `/action-assets/revit/${strategyId}.png` : ''
  const placedWindowScale = strategyId === 'smaller_window' ? 0.8 : 1
  const placedWindow = {
    x: target.x + (target.w - target.w * placedWindowScale) / 2,
    y: target.y + (target.h - target.h * placedWindowScale) / 2,
    w: target.w * placedWindowScale,
    h: target.h * placedWindowScale,
  }

  return (
    <div style={{ flex: 1, minHeight: 0, padding: '0.75rem', overflow: 'auto', background: '#F2EBD9', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div style={{ width: '100%', border: '1px solid #1E1E1A', background: '#FBF7EA', boxShadow: '4px 4px 0 rgba(0,0,0,0.22)', display: 'flex', flexDirection: 'column' }}>
        <svg viewBox={`0 0 ${SITE.w} ${SITE.h}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', aspectRatio: '4 / 3', height: 'auto', display: 'block', flexShrink: 0 }}>
          <rect x={0} y={0} width={SITE.w} height={SITE.h} fill="#FBF7EA" />
          <image
            href="/action-assets/revit/west_elevation.png"
            x={0}
            y={0}
            width={SITE.w}
            height={SITE.h}
            preserveAspectRatio="none"
          />
          {placedWindowHref && (
            <image
              href={placedWindowHref}
              x={placedWindow.x}
              y={placedWindow.y}
              width={placedWindow.w}
              height={placedWindow.h}
              preserveAspectRatio="xMidYMid meet"
            />
          )}
        </svg>
        <div style={{ borderTop: '1px solid #CDBF94', padding: '0.6rem 0.75rem', fontSize: '0.75rem', lineHeight: 1.55, color: '#333' }}>
          West bedroom window privacy review. Placed strategy: <strong>{selectedWindowStrategy ?? 'none yet'}</strong>. Dana wants privacy without losing daylight, so the resolved direction is translucent/privacy glass.
        </div>
      </div>
    </div>
  )
}

function SourceTabContent({
  activeTab,
  replySummary,
  context,
}: {
  activeTab: Exclude<AppTabId, 'revit'>
  replySummary: string
  context: StructuredEntryContext
}) {
  if (activeTab === 'replySummary') {
    return (
      <div style={{ flex: 1, minHeight: 0, padding: '0.75rem', overflow: 'auto', background: '#F2EBD9' }}>
        <div style={{ minHeight: 420, border: '1px solid #1E1E1A', background: '#FBF7EA', boxShadow: '4px 4px 0 rgba(0,0,0,0.22)', padding: '0.9rem', fontSize: '0.82rem', lineHeight: 1.6, color: '#1E1E1A', whiteSpace: 'pre-wrap' }}>
          {replySummary.trim()}
        </div>
      </div>
    )
  }

  if (verifyRepliesTab) {
    return (
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', background: '#F7F1E3' }}>
        {renderStructuredEntryAppTab(verifyRepliesTab, context)}
      </div>
    )
  }

  return (
    <div style={{ flex: 1, minHeight: 0, background: '#F7F1E3' }} />
  )
}

function PanelTitle({ children }: { children: string }) {
  return <div style={{ fontSize: '0.68rem', fontWeight: 950, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#3A6B5E' }}>{children}</div>
}

function RangeControl({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  unit: string
  onChange: (value: number) => void
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 850 }}>
        <span>{label}</span>
        <span>{value.toFixed(0)} {unit}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ accentColor: '#3A6B5E', width: '100%' }}
      />
    </label>
  )
}
