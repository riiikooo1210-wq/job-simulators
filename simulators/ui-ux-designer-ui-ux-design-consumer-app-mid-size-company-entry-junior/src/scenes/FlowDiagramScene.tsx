import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  Panel,
} from '@xyflow/react'
import type { Node, Edge, Connection, OnConnect, NodeChange, ReactFlowInstance } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import LaptopFrame from '../components/ui/LaptopFrame'
import ActionButton from '../components/ui/ActionButton'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import WellNestExistingAppMock, { wellNestFlowReferenceHint, wellNestWorkspaceMaxHeight } from '../components/ui/WellNestExistingAppMock'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { FlowDiagramNodeKind, FlowDiagramNodeKindOption, FlowDiagramSceneNode } from '../types/game'

// ---- Types ----
type NodeData = { label: string; kind?: FlowDiagramNodeKind; placeholder?: string; locked?: boolean }
type FDNode = Node<NodeData>
type FDEdge = Edge<{ label?: string }>

interface SerializableFlow {
  nodes: { id: string; label: string; x: number; y: number; kind?: FlowDiagramNodeKind }[]
  edges: { id: string; source: string; target: string; label: string }[]
}

// ---- Context for node label updates from inside ScreenNode ----
const LabelCtx = createContext<(id: string, label: string) => void>(() => {})

const LEGACY_START_NODE_ID = 'friend_streaks_home'
const LEGACY_START_NODE_LABEL = 'Friend Streaks Home'
const START_NODE_POSITION = { x: 80, y: 60 }
const DEFAULT_EDGE_LABEL = ''
const INITIAL_FIT_VIEW_OPTIONS = { padding: 0.45, minZoom: 0.35, maxZoom: 0.75 } as const
const VISIBLE_NODE_MARGIN = 48
const NEW_NODE_OFFSETS = [
  { x: 180, y: 0 },
  { x: 180, y: 88 },
  { x: 0, y: 88 },
  { x: -180, y: 88 },
  { x: -180, y: 0 },
  { x: 0, y: 0 },
] as const
const FLOW_HANDLE_STYLE = {
  background: '#2563EB',
  width: 12,
  height: 12,
  border: '2px solid #FFFFFF',
  boxShadow: '0 1px 4px rgba(15, 23, 42, 0.3)',
} as const
const DEFAULT_NODE_KINDS: FlowDiagramNodeKindOption[] = [
  { kind: 'entry_point', label: 'Entry point', defaultLabel: 'Hydration Detail' },
  { kind: 'step', label: 'Step', defaultLabel: 'Tap Invite Friend' },
  { kind: 'decision_branch', label: 'Decision branch', defaultLabel: 'Does friend have WellNest?' },
  { kind: 'final_interaction', label: 'Final screen', defaultLabel: 'Shared Streak screen' },
]
const MIN_RATIONALE_CHARS = 20
const flowMonitorScreenBounds = { left: '11.8%', top: '7.4%', width: '76.4%', height: '78.4%' }

const normalizeFlowKind = (kind: FlowDiagramNodeKind | undefined): FlowDiagramNodeKind =>
  kind === 'screen' || kind === 'action' ? 'step' : kind ?? 'step'

const fallbackKindLabel = (kind: FlowDiagramNodeKind) =>
  DEFAULT_NODE_KINDS.find((item) => item.kind === normalizeFlowKind(kind))?.label ?? 'Step'

function fallbackKindPlaceholder(kind: FlowDiagramNodeKind) {
  return DEFAULT_NODE_KINDS.find((item) => item.kind === normalizeFlowKind(kind))?.defaultLabel ?? 'Tap Invite Friend'
}

function getNodePalette(kind: FlowDiagramNodeKind) {
  return {
    entry_point: { bg: '#EFF6FF', border: '#2563EB', shadow: 'rgba(37, 99, 235, 0.18)' },
    step: { bg: '#EEF2FF', border: '#4F46E5', shadow: 'rgba(79, 70, 229, 0.18)' },
    screen: { bg: '#EEF2FF', border: '#4F46E5', shadow: 'rgba(79, 70, 229, 0.18)' },
    action: { bg: '#EEF2FF', border: '#4F46E5', shadow: 'rgba(79, 70, 229, 0.18)' },
    decision_branch: { bg: '#FFFBEB', border: '#D97706', shadow: 'rgba(217, 119, 6, 0.18)' },
    final_interaction: { bg: '#ECFDF5', border: '#059669', shadow: 'rgba(5, 150, 105, 0.2)' },
  }[kind]
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

function fallbackNewNodePosition(index: number) {
  return {
    x: START_NODE_POSITION.x + (index % 4) * 210,
    y: START_NODE_POSITION.y + Math.floor(index / 4) * 140,
  }
}

function estimateNodeSize(kind: FlowDiagramNodeKind) {
  return kind === 'decision_branch'
    ? { width: 168, height: 118 }
    : { width: 190, height: 72 }
}

function getVisibleElementRect(element: HTMLElement) {
  const win = element.ownerDocument.defaultView
  const elementRect = element.getBoundingClientRect()
  let left = Math.max(0, elementRect.left)
  let top = Math.max(0, elementRect.top)
  let right = Math.min(win?.innerWidth ?? elementRect.right, elementRect.right)
  let bottom = Math.min(win?.innerHeight ?? elementRect.bottom, elementRect.bottom)

  if (win) {
    let parent = element.parentElement
    while (parent) {
      const style = win.getComputedStyle(parent)
      const clipsContent = [style.overflow, style.overflowX, style.overflowY].some((value) =>
        value === 'auto' || value === 'scroll' || value === 'hidden' || value === 'clip'
      )

      if (clipsContent) {
        const parentRect = parent.getBoundingClientRect()
        left = Math.max(left, parentRect.left)
        top = Math.max(top, parentRect.top)
        right = Math.min(right, parentRect.right)
        bottom = Math.min(bottom, parentRect.bottom)
      }

      parent = parent.parentElement
    }
  }

  return {
    left,
    top,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
}

function getVisibleNewNodePosition(
  flowInstance: ReactFlowInstance<FDNode, FDEdge> | null,
  canvasElement: HTMLDivElement | null,
  index: number,
  kind: FlowDiagramNodeKind
) {
  if (!flowInstance || !canvasElement) return fallbackNewNodePosition(index)

  const rect = getVisibleElementRect(canvasElement)
  if (rect.width <= 0 || rect.height <= 0) return fallbackNewNodePosition(index)

  const offset = NEW_NODE_OFFSETS[Math.max(0, index - 1) % NEW_NODE_OFFSETS.length]
  const size = estimateNodeSize(kind)
  const flowCenter = flowInstance.screenToFlowPosition({
    x: rect.left + rect.width / 2 + offset.x,
    y: rect.top + rect.height / 2 + offset.y,
  })
  const visibleTopLeft = flowInstance.screenToFlowPosition({
    x: rect.left + VISIBLE_NODE_MARGIN,
    y: rect.top + VISIBLE_NODE_MARGIN,
  })
  const visibleBottomRight = flowInstance.screenToFlowPosition({
    x: rect.right - VISIBLE_NODE_MARGIN,
    y: rect.bottom - VISIBLE_NODE_MARGIN,
  })

  const minX = Math.min(visibleTopLeft.x, visibleBottomRight.x)
  const minY = Math.min(visibleTopLeft.y, visibleBottomRight.y)
  const maxX = Math.max(minX, Math.max(visibleTopLeft.x, visibleBottomRight.x) - size.width)
  const maxY = Math.max(minY, Math.max(visibleTopLeft.y, visibleBottomRight.y) - size.height)

  return {
    x: Math.round(clamp(flowCenter.x - size.width / 2, minX, maxX)),
    y: Math.round(clamp(flowCenter.y - size.height / 2, minY, maxY)),
  }
}

function makeStartNode(
  startNode: NonNullable<FlowDiagramSceneNode['startNode']>,
  position = START_NODE_POSITION
): FDNode {
  return {
    id: startNode.id ?? LEGACY_START_NODE_ID,
    type: 'screen',
    position,
    data: { label: startNode.label, kind: startNode.kind ?? 'entry_point', locked: true },
    deletable: false,
  }
}

// ---- Custom Flow Node ----
function FlowNode({ data, id, selected }: { data: NodeData; id: string; selected?: boolean }) {
  const updateLabel = useContext(LabelCtx)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const inputRef = useRef<HTMLInputElement>(null)
  const locked = Boolean(data.locked)
  const kind = data.kind ?? 'step'
  const kindLabel = fallbackKindLabel(kind)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(data.label)
  }, [data.label, editing])

  const commit = () => {
    if (locked) {
      setDraft(data.label)
      setEditing(false)
      return
    }
    const v = draft.trim()
    setDraft(v)
    updateLabel(id, v)
    setEditing(false)
  }

  const palette = getNodePalette(kind)
  const borderColor = locked ? '#059669' : selected ? '#2563EB' : palette.border
  const shadowColor = selected ? 'rgba(37, 99, 235, 0.24)' : palette.shadow
  const labelContent = editing ? (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') { setDraft(data.label); setEditing(false) }
      }}
      style={{
        width: '100%',
        border: 'none',
        outline: 'none',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'center',
        background: 'transparent',
      }}
    />
  ) : (
    <span>
      <span style={{ display: 'block', color: borderColor, fontSize: 10, fontWeight: 900, lineHeight: 1.1, textTransform: 'uppercase' }}>
        {kindLabel}
      </span>
      {data.label.trim() ? data.label : <span style={{ color: '#9CA3AF', fontWeight: 700 }}>{data.placeholder ?? fallbackKindPlaceholder(kind)}</span>}
    </span>
  )

  if (kind === 'decision_branch') {
    return (
      <div
        onDoubleClick={(e) => {
          e.stopPropagation()
          if (!locked) setEditing(true)
        }}
        style={{
          width: 168,
          height: 118,
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          fontSize: 12,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 700,
          cursor: 'grab',
          userSelect: 'none',
          color: '#1E1E1A',
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          style={FLOW_HANDLE_STYLE}
        />
        <div
          style={{
            position: 'absolute',
            width: 94,
            height: 94,
            transform: 'rotate(45deg)',
            background: palette.bg,
            border: `2px solid ${borderColor}`,
            boxShadow: `0 10px 26px ${shadowColor}`,
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 26px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
          {labelContent}
        </div>
        <Handle
          type="source"
          position={Position.Right}
          style={FLOW_HANDLE_STYLE}
        />
      </div>
    )
  }

  return (
    <div
      onDoubleClick={(e) => {
        e.stopPropagation()
        if (!locked) setEditing(true)
      }}
      style={{
        minWidth: 148,
        maxWidth: 190,
        padding: '8px 14px',
        background: locked ? '#ECFDF5' : selected ? '#EFF6FF' : palette.bg,
        border: `${kind === 'final_interaction' ? 3 : 2}px solid ${borderColor}`,
        borderRadius: 999,
        boxShadow: `0 10px 26px ${shadowColor}`,
        textAlign: 'center',
        fontSize: 13,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontWeight: 600,
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={FLOW_HANDLE_STYLE}
      />
      {labelContent}
      <Handle
        type="source"
        position={Position.Right}
        style={FLOW_HANDLE_STYLE}
      />
    </div>
  )
}

const nodeTypes = { screen: FlowNode }

// ---- Edge factory ----
function makeEdge(source: string, target: string, id: string, label: string): FDEdge {
  return {
    id,
    source,
    target,
    label,
    data: { label },
    markerEnd: { type: MarkerType.ArrowClosed },
    style: { stroke: '#000', strokeWidth: 2 },
    labelStyle: { fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif', fill: '#333' },
    labelBgStyle: { fill: '#F2EBD9', stroke: '#000', strokeWidth: 1 },
    labelBgPadding: [4, 4] as [number, number],
  }
}

function getNodeDisplayLabel(node: FDNode | undefined) {
  if (!node) return 'that block'
  return node.data.label.trim() || node.data.placeholder || fallbackKindPlaceholder(node.data.kind ?? 'step')
}

// ---- Main Component ----
export default function FlowDiagramScene({ node }: { node: FlowDiagramSceneNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const [wellNestHint, setWellNestHint] = useState('')
  const [isNarrowFlowLayout, setIsNarrowFlowLayout] = useState(false)
  const canvasRef = useRef<HTMLDivElement>(null)
  const flowInstanceRef = useRef<ReactFlowInstance<FDNode, FDEdge> | null>(null)

  useEffect(() => {
    if (!node.wellNestAppMock) {
      setIsNarrowFlowLayout(false)
      return
    }

    const updateLayout = () => setIsNarrowFlowLayout(window.innerWidth < 760)
    updateLayout()
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [node.wellNestAppMock])

  const rationaleKey = node.rationaleBindingKey ?? node.bindingKey + '_rationale'
  const rationale = responses[rationaleKey] ?? ''
  const startNode = useMemo(
    () => node.startNode
      ? ({
          id: node.startNode.id ?? LEGACY_START_NODE_ID,
          label: node.startNode.label,
          kind: node.startNode.kind ?? 'entry_point',
        } satisfies NonNullable<FlowDiagramSceneNode['startNode']>)
      : null,
    [node.startNode]
  )
  const nodeKindOptions = useMemo(() => node.nodeKinds?.length ? node.nodeKinds : DEFAULT_NODE_KINDS, [node.nodeKinds])
  const nodeKindLabels = useMemo(() => new Map(nodeKindOptions.map((item) => [item.kind, item.label])), [nodeKindOptions])

  const { initNodes, initEdges } = useMemo(() => {
    try {
      const saved = JSON.parse(responses[node.bindingKey] ?? '') as SerializableFlow
      if (!Array.isArray(saved?.nodes)) throw new Error('invalid')
      const startSaved = startNode
        ? saved.nodes.find((n) =>
            n.id === startNode.id ||
            n.id === LEGACY_START_NODE_ID ||
            n.label.trim().toLowerCase() === startNode.label.toLowerCase() ||
            n.label.trim().toLowerCase() === LEGACY_START_NODE_LABEL.toLowerCase()
          )
        : undefined
      const idMap = new Map<string, string>()
      if (startNode && startSaved && startSaved.id !== startNode.id) idMap.set(startSaved.id, startNode.id)
      const shouldShiftExisting = Boolean(startNode && !startSaved && saved.nodes.length > 0)
      const nonStartNodes = saved.nodes.filter((n) => n !== startSaved)
      const hydratedNodes: FDNode[] = [
        ...(startNode ? [makeStartNode(startNode, startSaved ? { x: startSaved.x, y: startSaved.y } : START_NODE_POSITION)] : []),
        ...nonStartNodes.map((n) => ({
          id: n.id,
          type: 'screen',
          position: { x: shouldShiftExisting ? n.x + 210 : n.x, y: n.y },
          data: { label: n.label, kind: n.kind ?? 'step', placeholder: fallbackKindPlaceholder(n.kind ?? 'step') },
        } as FDNode)),
      ]
      const nodeIds = new Set(hydratedNodes.map((n) => n.id))
      return {
        initNodes: hydratedNodes,
        initEdges: saved.edges
          .map((e) => ({
            ...e,
            source: idMap.get(e.source) ?? e.source,
            target: idMap.get(e.target) ?? e.target,
          }))
          .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
          .map((e) => makeEdge(e.source, e.target, e.id, e.label)),
      }
    } catch {
      return { initNodes: startNode ? [makeStartNode(startNode)] : [] as FDNode[], initEdges: [] as FDEdge[] }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [rfNodes, setRfNodes, applyNodesChange] = useNodesState<FDNode>(initNodes)
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<FDEdge>(initEdges)

  // Mutable refs so callbacks always see latest values without stale closures
  const nodesRef = useRef<FDNode[]>(initNodes)
  const edgesRef = useRef<FDEdge[]>(initEdges)
  useEffect(() => { nodesRef.current = rfNodes }, [rfNodes])
  useEffect(() => { edgesRef.current = rfEdges }, [rfEdges])

  // Selected edge for inline label editing
  const [selEdgeId, setSelEdgeId] = useState<string | null>(null)
  const selEdge = rfEdges.find((e) => e.id === selEdgeId)
  const [labelDraft, setLabelDraft] = useState('')
  const [connectMode, setConnectMode] = useState(false)
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null)
  const [connectMessage, setConnectMessage] = useState('Click "Connect blocks", then pick two blocks to add an arrow.')

  const persist = useCallback((nodes: FDNode[], edges: FDEdge[]) => {
    const normalizedNodes = startNode
      ? (
          nodes.some((n) => n.id === startNode.id)
            ? nodes.map((n) => n.id === startNode.id ? { ...n, data: { ...n.data, label: startNode.label, kind: startNode.kind, locked: true }, deletable: false } : n)
            : [makeStartNode(startNode), ...nodes]
        )
      : nodes
    const nodeIds = new Set(normalizedNodes.map((n) => n.id))
    const normalizedEdges = edges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
    const data: SerializableFlow = {
      nodes: normalizedNodes.map((n) => ({ id: n.id, label: n.data.label, kind: n.data.kind ?? 'step', x: n.position.x, y: n.position.y })),
      edges: normalizedEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.data?.label ?? (typeof e.label === 'string' ? e.label : ''),
      })),
    }
    setFreeTextResponse(node.bindingKey, JSON.stringify(data))
  }, [node.bindingKey, setFreeTextResponse, startNode])

  // Debounced persist for any state change (catches delete-key deletions etc.)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => persist(rfNodes, rfEdges), 200)
    return () => { if (persistTimerRef.current) clearTimeout(persistTimerRef.current) }
  }, [rfNodes, rfEdges, persist])

  // ---- Mutations ----

  const onNodesChange = useCallback((changes: NodeChange<FDNode>[]) => {
    const safeChanges = changes.filter((change) => !(startNode && change.type === 'remove' && change.id === startNode.id))
    if (safeChanges.length > 0) applyNodesChange(safeChanges)
  }, [applyNodesChange, startNode])

  const updateNodeLabel = useCallback((id: string, label: string) => {
    if (startNode && id === startNode.id) return
    const updated = nodesRef.current.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, label } } : n
    )
    nodesRef.current = updated
    setRfNodes(updated)
    persist(updated, edgesRef.current)
  }, [setRfNodes, persist, startNode])

  const addFlowNode = useCallback((kindOption: FlowDiagramNodeKindOption) => {
    const id = `${kindOption.kind}_${Date.now()}`
    const idx = nodesRef.current.length
    const newNode: FDNode = {
      id,
      type: 'screen',
      position: getVisibleNewNodePosition(flowInstanceRef.current, canvasRef.current, idx, kindOption.kind),
      data: { label: '', kind: kindOption.kind, placeholder: kindOption.defaultLabel ?? fallbackKindPlaceholder(kindOption.kind) },
    }
    const updated = [...nodesRef.current, newNode]
    nodesRef.current = updated
    setRfNodes(updated)
    persist(updated, edgesRef.current)
  }, [setRfNodes, persist])

  const highlightConnectSource = useCallback((sourceId: string | null) => {
    const updated = nodesRef.current.map((n) => ({ ...n, selected: n.id === sourceId }))
    nodesRef.current = updated
    setRfNodes(updated)
  }, [setRfNodes])

  const createArrowBetweenBlocks = useCallback((source: string | null | undefined, target: string | null | undefined) => {
    if (!source || !target) return false
    if (source === target) {
      setConnectMessage('Choose a different block for the arrow end.')
      return false
    }

    const existingEdge = edgesRef.current.find((edge) => edge.source === source && edge.target === target)
    if (existingEdge) {
      setSelEdgeId(existingEdge.id)
      setLabelDraft(existingEdge.data?.label ?? (typeof existingEdge.label === 'string' ? existingEdge.label : ''))
      setConnectMessage('That arrow already exists. You can label it below.')
      return true
    }

    const id = `e_${Date.now()}`
    const newEdge = makeEdge(source, target, id, DEFAULT_EDGE_LABEL)
    const updated = addEdge(newEdge, edgesRef.current)
    edgesRef.current = updated
    setRfEdges(updated)
    persist(nodesRef.current, updated)
    setSelEdgeId(id)
    setLabelDraft(DEFAULT_EDGE_LABEL)
    setConnectMessage('Arrow added. Click the arrow if you want to label it.')
    return true
  }, [setRfEdges, persist])

  const onConnect: OnConnect = useCallback((params: Connection) => {
    createArrowBetweenBlocks(params.source, params.target)
  }, [createArrowBetweenBlocks])

  const toggleConnectMode = useCallback(() => {
    const nextMode = !connectMode
    setConnectMode(nextMode)
    setConnectSourceId(null)
    highlightConnectSource(null)
    setSelEdgeId(null)
    setConnectMessage(nextMode ? 'Click the first block for the arrow.' : 'Click "Connect blocks", then pick two blocks to add an arrow.')
  }, [connectMode, highlightConnectSource])

  const onNodeClick = useCallback((event: React.MouseEvent, clickedNode: FDNode) => {
    if (!connectMode) return
    event.stopPropagation()
    setSelEdgeId(null)

    if (!connectSourceId) {
      setConnectSourceId(clickedNode.id)
      highlightConnectSource(clickedNode.id)
      setConnectMessage(`Start: ${getNodeDisplayLabel(clickedNode)}. Now click the block this arrow should point to.`)
      return
    }

    const created = createArrowBetweenBlocks(connectSourceId, clickedNode.id)
    if (created) {
      setConnectSourceId(null)
      setConnectMode(false)
      highlightConnectSource(null)
    }
  }, [connectMode, connectSourceId, createArrowBetweenBlocks, highlightConnectSource])

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: FDEdge) => {
    setSelEdgeId(edge.id)
    setLabelDraft(edge.data?.label ?? (typeof edge.label === 'string' ? edge.label : ''))
  }, [])

  const applyEdgeLabel = useCallback(() => {
    if (!selEdgeId) return
    const label = labelDraft.trim()
    const updated = edgesRef.current.map((e) =>
      e.id === selEdgeId ? { ...e, label, data: { ...e.data, label } } : e
    )
    edgesRef.current = updated
    setRfEdges(updated)
    persist(nodesRef.current, updated)
    setSelEdgeId(null)
  }, [selEdgeId, labelDraft, setRfEdges, persist])

  const onNodeDragStop = useCallback((_: React.MouseEvent, draggedNode: FDNode) => {
    const updated = nodesRef.current.map((n) =>
      n.id === draggedNode.id ? { ...n, position: draggedNode.position } : n
    )
    nodesRef.current = updated
    persist(updated, edgesRef.current)
  }, [persist])

  const onPaneClick = useCallback(() => {
    setSelEdgeId(null)
    if (connectMode && connectSourceId) {
      setConnectSourceId(null)
      highlightConnectSource(null)
      setConnectMessage('Start again: click the first block for the arrow.')
    }
  }, [connectMode, connectSourceId, highlightConnectSource])

  const minNodes = node.minNodes ?? 2
  const minEdges = node.minEdges ?? 1
  const requiredNodeKinds = node.requiredNodeKinds ?? []
  const normalizedNodeKinds = rfNodes.map((rfNode) => normalizeFlowKind(rfNode.data.kind))
  const presentNodeKinds = new Set(normalizedNodeKinds)
  const missingKinds = requiredNodeKinds.filter((kind) => !presentNodeKinds.has(kind))
  const missingKindCounts = (node.requiredKindCounts ?? []).filter((requirement) =>
    normalizedNodeKinds.filter((kind) => kind === normalizeFlowKind(requirement.kind)).length < requirement.min
  )
  const unlabeledNodeCount = rfNodes.filter((rfNode) => !rfNode.data.label.trim()).length
  const rationaleReady = rationale.trim().length >= MIN_RATIONALE_CHARS
  const canSubmit =
    rfNodes.length >= minNodes &&
    rfEdges.length >= minEdges &&
    missingKinds.length === 0 &&
    missingKindCounts.length === 0 &&
    unlabeledNodeCount === 0 &&
    rationaleReady

  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const compactChecklistItems = [
    'Add 1 {{Entry point}}: Home habit card or Hydration Detail.',
    'Add 1 {{Decision branch}} (a Yes/No question): "Does friend already have WellNest?"',
    'Add 2 or more Step blocks: one invite step and one No/problem path.',
    'Add 1 Final screen: "Shared Streak screen." Then connect blocks and write Note for Leo.',
  ]

  const flowGuidePanel = (
    <section data-ui-surface="flow-task-guide" style={{ border: '1px solid #D1D5DB', borderRadius: 10, background: '#FFFFFF', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)', padding: '0.72rem 0.82rem', display: 'grid', gap: '0.65rem' }}>
      <div style={{ display: 'grid', gap: '0.35rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#111827' }}>Build a flow map Leo can use</div>
        {node.content && (
          <div style={{ fontSize: '0.78rem', lineHeight: 1.45, color: '#374151', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}
      </div>

      <div data-ui-surface="flow-compact-checklist" style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.55rem', display: 'grid', gap: '0.4rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#111827', textTransform: 'uppercase' }}>Do these 4 things</div>
        <ol style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.28rem', fontSize: '0.78rem', lineHeight: 1.45, color: '#374151' }}>
          {compactChecklistItems.map((item) => (
            <li key={item}>
              {renderContentWithGlossary(interpolate(item, { playerName, branchFlags, mcSelections }))}
            </li>
          ))}
        </ol>
      </div>

      {node.exampleFlow?.length ? (
        <details data-ui-surface="flow-example-details" style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.55rem', fontSize: '0.74rem', lineHeight: 1.4, color: '#374151' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 900, color: '#111827' }}>
            See an example flow
          </summary>
          <div style={{ paddingTop: '0.45rem' }}>
            <div style={{ fontWeight: 800 }}>One possible example, not the only answer:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.32rem', marginTop: '0.35rem' }}>
              {node.exampleFlow.map((step, index) => {
                const palette = getNodePalette(step.kind)
                return (
                  <span key={`${step.kind}-${step.label}-${index}`} style={{ display: 'contents' }}>
                    {index > 0 && <span style={{ color: '#8A513E', fontWeight: 900 }}>→</span>}
                    <span
                      style={{
                        border: `${step.kind === 'final_interaction' ? 2 : 1}px solid ${palette.border}`,
                        borderRadius: 8,
                        background: palette.bg,
                        color: '#111827',
                        padding: '0.18rem 0.35rem',
                        fontWeight: 800,
                      }}
                    >
                      <span style={{ color: palette.border }}>{nodeKindLabels.get(step.kind) ?? fallbackKindLabel(step.kind)}:</span> {step.label}
                    </span>
                  </span>
                )
              })}
            </div>
            {node.exampleBranch && (
              <div style={{ marginTop: '0.35rem', color: '#4B5563', fontWeight: 700 }}>
                {node.exampleBranch}
              </div>
            )}
          </div>
        </details>
      ) : null}

      <details data-ui-surface="flow-board-help-details" style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.55rem', fontSize: '0.74rem', lineHeight: 1.45, color: '#4B5563' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 900, color: '#111827' }}>
          How to use the board
        </summary>
        <div style={{ paddingTop: '0.4rem' }}>
          Use the four block buttons, click Connect blocks, choose the first block, then choose the block the arrow should point to. Double-click a block to type your label.
        </div>
      </details>
    </section>
  )

  const canvasAndControls = (
    <div data-ui-surface="realistic-flow-diagram-tool" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: appWindow ? '0.75rem' : '0', background: appWindow ? '#F8FAFC' : 'transparent', color: '#111827' }}>
      {appWindow && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0.65rem', border: '1px solid #E5E7EB', borderRadius: 10, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', flexShrink: 0 }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap' }}>Friend Streaks flow board</span>
            <span style={{ fontSize: '0.64rem', color: '#6B7280', whiteSpace: 'nowrap' }}>Draft saved</span>
          </div>
        </div>
      )}

      {/* Flow canvas */}
      <div ref={canvasRef} style={{ border: '1px solid #D1D5DB', borderRadius: 12, boxShadow: appWindow ? 'inset 0 0 0 1px rgba(255,255,255,0.6)' : '0 10px 24px rgba(15, 23, 42, 0.12)', height: appWindow ? 340 : 460, position: 'relative', background: '#F9FAFB', overflow: 'hidden' }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeClick={onNodeClick}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onPaneClick}
          onInit={(instance) => { flowInstanceRef.current = instance }}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={INITIAL_FIT_VIEW_OPTIONS}
          minZoom={0.25}
          deleteKeyCode={['Delete', 'Backspace']}
          style={{ background: '#F9FAFB' }}
        >
          <Background color="#E5E7EB" gap={20} size={1} />
          <Controls />
          <Panel position="top-left">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxWidth: 520 }}>
              {nodeKindOptions.map((kindOption) => (
                <button
                  key={kindOption.kind}
                  onClick={() => addFlowNode(kindOption)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.1)',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: '#111827',
                  }}
                >
                  + {kindOption.label}
                </button>
              ))}
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  toggleConnectMode()
                }}
                aria-pressed={connectMode}
                title="Click this, then click two blocks to add an arrow."
                style={{
                  background: connectMode ? '#2563EB' : '#111827',
                  border: `1px solid ${connectMode ? '#1D4ED8' : '#111827'}`,
                  borderRadius: 8,
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.16)',
                  padding: '6px 10px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  color: '#FFFFFF',
                }}
              >
                → Connect blocks
              </button>
              {connectMode && (
                <button
                  onClick={(event) => {
                    event.stopPropagation()
                    setConnectMode(false)
                    setConnectSourceId(null)
                    highlightConnectSource(null)
                    setConnectMessage('Click "Connect blocks", then pick two blocks to add an arrow.')
                  }}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #D1D5DB',
                    borderRadius: 8,
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: '#374151',
                  }}
                >
                  Cancel
                </button>
              )}
              <div style={{ flexBasis: '100%', background: connectMode ? '#EFF6FF' : '#FFFFFF', border: `1px solid ${connectMode ? '#93C5FD' : '#E5E7EB'}`, borderRadius: 8, padding: '5px 8px', fontSize: '0.7rem', fontWeight: 700, color: connectMode ? '#1D4ED8' : '#4B5563', boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)' }}>
                {connectMessage}
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Edge label editor */}
      {selEdge && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.75rem', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 10, boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>Path label:</span>
          <input
            autoFocus
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyEdgeLabel()
              if (e.key === 'Escape') setSelEdgeId(null)
            }}
            placeholder="e.g. Yes, No, Invite ignored, Invite declined, Missed day"
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '0.8125rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              border: '1px solid #D1D5DB',
              borderRadius: 6,
              outline: 'none',
              background: '#fff',
              color: '#111827',
            }}
          />
          <button
            onClick={applyEdgeLabel}
            style={{ padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Save
          </button>
          <button
            onClick={() => setSelEdgeId(null)}
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#4B5563', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 6, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Status line */}
      <div style={{ fontSize: '0.75rem', color: '#4B5563', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        <span>{rfNodes.length} block{rfNodes.length !== 1 ? 's' : ''}</span>
        <span>{rfEdges.length} arrow{rfEdges.length !== 1 ? 's' : ''}</span>
        {rfNodes.length < minNodes && (
          <span style={{ color: '#D97706' }}>Add {minNodes - rfNodes.length} more block{minNodes - rfNodes.length !== 1 ? 's' : ''}.</span>
        )}
        {rfNodes.length >= minNodes && rfEdges.length < minEdges && (
          <span style={{ color: '#D97706' }}>Add at least {minEdges} arrow{minEdges !== 1 ? 's' : ''} between blocks.</span>
        )}
        {missingKinds.length > 0 && (
          <span style={{ color: '#D97706' }}>
            Add: {missingKinds.map((kind) => nodeKindLabels.get(kind) ?? fallbackKindLabel(kind)).join(', ')}.
          </span>
        )}
        {missingKindCounts.map((requirement) => (
          <span key={requirement.kind} style={{ color: '#D97706' }}>
            {requirement.hint ?? `Add ${requirement.min} ${nodeKindLabels.get(requirement.kind) ?? fallbackKindLabel(requirement.kind)} blocks.`}
          </span>
        ))}
        {unlabeledNodeCount > 0 && (
          <span style={{ color: '#D97706' }}>Type a label inside each block.</span>
        )}
        {!rationaleReady && (
          <span style={{ color: '#D97706' }}>Add a short Note for Leo.</span>
        )}
      </div>
    </div>
  )

  const currentAppReference = node.wellNestAppMock ? (
    <aside
      data-ui-surface="current-wellnest-app-reference"
      style={{
        border: '2px solid #0EA5E9',
        borderRadius: 16,
        background: '#FFFFFF',
        boxShadow: '0 18px 42px rgba(14, 165, 233, 0.22)',
        padding: '0.78rem',
        minWidth: isNarrowFlowLayout ? 280 : 300,
        flex: isNarrowFlowLayout ? '0 1 min(100%, 320px)' : '0 0 340px',
        height: '100%',
        minHeight: isNarrowFlowLayout ? 640 : 0,
        maxHeight: isNarrowFlowLayout ? wellNestWorkspaceMaxHeight : '100%',
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        gap: '0.62rem',
        color: '#111827',
        alignSelf: 'stretch',
        position: isNarrowFlowLayout ? 'relative' : 'sticky',
        top: '0.75rem',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'grid', gap: '0.42rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          <span style={{ borderRadius: 999, background: '#E0F2FE', color: '#0369A1', padding: '0.12rem 0.42rem', fontSize: '0.58rem', fontWeight: 900, textTransform: 'uppercase' }}>
            Live app reference
          </span>
          <span style={{ fontSize: '0.78rem', fontWeight: 900, color: '#111827' }}>Current WellNest app</span>
        </div>
        <div style={{ fontSize: '0.72rem', lineHeight: 1.4, color: '#111827', fontWeight: 800 }}>
          Use this app while you build your flow.
        </div>
        <div style={{ fontSize: '0.68rem', lineHeight: 1.4, color: '#4B5563' }}>
          {wellNestFlowReferenceHint}
        </div>
        <div data-ui-surface="wellnest-reference-try-this" style={{ border: '1px solid #BAE6FD', borderRadius: 10, background: '#F0F9FF', padding: '0.42rem 0.5rem', display: 'grid', gap: '0.22rem', fontSize: '0.66rem', lineHeight: 1.35, color: '#075985' }}>
          <strong style={{ color: '#0C4A6E' }}>Try this first:</strong>
          <span>Tap Hydration, mark it complete, then check Profile.</span>
        </div>
        {wellNestHint && (
          <div aria-live="polite" style={{ border: '1px solid #CDBF94', borderRadius: 8, background: '#FBF7EA', padding: '0.4rem 0.48rem', fontSize: '0.68rem', lineHeight: 1.4, color: '#4B4538' }}>
            {wellNestHint}
          </div>
        )}
      </div>
      <div style={{ minHeight: 0 }}>
        <WellNestExistingAppMock onHintChange={setWellNestHint} showReset maxPhoneWidth={isNarrowFlowLayout ? 170 : 190} />
      </div>
    </aside>
  ) : null

  const flowBoardFrame = (
    <LaptopFrame variant={appWindow} title={node.windowTitle ?? 'User Flow.fig'} fill scrollable showFigmaToolbar={false}>
      {canvasAndControls}
    </LaptopFrame>
  )

  const flowWorkspace = node.wellNestAppMock && !isNarrowFlowLayout ? (
    <div
      data-ui-surface="flow-workspace-with-app-reference"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        flexWrap: 'nowrap',
        gap: '1rem',
        width: '100%',
        height: '100%',
        minWidth: 0,
      }}
    >
      <div style={{ flex: '1 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {flowBoardFrame}
      </div>
      {currentAppReference}
    </div>
  ) : (
    flowBoardFrame
  )

  const stackedAppReference = node.wellNestAppMock && isNarrowFlowLayout && currentAppReference ? (
    <div
      data-ui-surface="flow-mobile-app-reference-stack"
      style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        marginBottom: '0.75rem',
      }}
    >
      {currentAppReference}
    </div>
  ) : null

  const stackedFlowBoard = node.wellNestAppMock && isNarrowFlowLayout ? (
    <div
      data-ui-surface="flow-mobile-board-stack"
      style={{
        width: '100%',
        height: 'min(76dvh, 640px)',
        minHeight: 460,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {flowBoardFrame}
    </div>
  ) : null

  const submissionControls = (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <div style={{ display: 'grid', gap: '0.35rem', border: '1px solid #D1D5DB', borderRadius: 10, background: '#FFFFFF', padding: '0.65rem 0.75rem' }}>
        <label htmlFor={`${node.id}-rationale`} style={{ fontSize: '0.82rem', fontWeight: 900, color: '#111827' }}>
          {node.rationalePrompt ?? 'Note for Leo'}
        </label>
        <textarea
          id={`${node.id}-rationale`}
          value={rationale}
          onChange={(e) => setFreeTextResponse(rationaleKey, e.target.value)}
          placeholder={node.rationalePlaceholder ?? 'Write one sentence about an important choice in your flow.'}
          rows={2}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '0.55rem 0.65rem',
            fontSize: '0.82rem',
            lineHeight: 1.45,
            fontFamily: 'Inter, system-ui, sans-serif',
            border: '1px solid #D1D5DB',
            borderRadius: 8,
            backgroundColor: '#fff',
            color: '#111827',
            outline: 'none',
            resize: 'vertical',
          }}
        />
        <span style={{ fontSize: '0.72rem', color: rationaleReady ? '#047857' : '#D97706' }}>
          {rationaleReady ? 'Note saved with your flow.' : `Write one clear sentence, at least ${MIN_RATIONALE_CHARS} characters.`}
        </span>
      </div>

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
  )

  return (
    <LabelCtx.Provider value={updateNodeLabel}>
      <SceneWrapper illustration={node.illustration} showBack backLabel="Back">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
            {briefing && <ReferenceButton onClick={() => setRefOpen(true)} label="View Briefing" />}
          </div>

          {flowGuidePanel}

          {appWindow && stackedFlowBoard ? (
            <>
              {stackedAppReference}
              {stackedFlowBoard}
            </>
          ) : appWindow ? (
            <>
              <DesktopOverlay contentBounds={node.wellNestAppMock ? flowMonitorScreenBounds : undefined}>
                {flowWorkspace}
              </DesktopOverlay>
              {stackedAppReference}
            </>
          ) : (
            canvasAndControls
          )}

          {submissionControls}
        </motion.div>

        {briefing && (
          <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
            <BriefingDrawerContent node={briefing} />
          </ReferenceDrawer>
        )}
      </SceneWrapper>
    </LabelCtx.Provider>
  )
}
