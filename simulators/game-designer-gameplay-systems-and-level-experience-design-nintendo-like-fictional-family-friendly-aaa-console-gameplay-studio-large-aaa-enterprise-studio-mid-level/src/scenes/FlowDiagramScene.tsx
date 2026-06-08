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
import type { Node, Edge, Connection, OnConnect } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
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
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { FlowDiagramSceneNode } from '../types/game'

// ---- Types ----
type NodeData = { label: string }
type FDNode = Node<NodeData>
type FDEdge = Edge<{ label?: string }>

interface SerializableFlow {
  nodes: { id: string; label: string; x: number; y: number }[]
  edges: { id: string; source: string; target: string; label: string }[]
}

// ---- Context for node label updates from inside ScreenNode ----
const LabelCtx = createContext<(id: string, label: string) => void>(() => {})

// ---- Custom Screen Node ----
function ScreenNode({ data, id, selected }: { data: NodeData; id: string; selected?: boolean }) {
  const updateLabel = useContext(LabelCtx)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(data.label)
  }, [data.label, editing])

  const commit = () => {
    const v = draft.trim() || 'Screen'
    setDraft(v)
    updateLabel(id, v)
    setEditing(false)
  }

  return (
    <div
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
      style={{
        minWidth: 130,
        padding: '8px 14px',
        background: selected ? '#FFF5E0' : '#fff',
        border: `2px solid ${selected ? '#B87D6B' : '#000'}`,
        boxShadow: selected ? '3px 3px 0 #B87D6B' : '3px 3px 0 #000',
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
        style={{ background: '#555', width: 8, height: 8, border: 'none' }}
      />
      {editing ? (
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
        <span>{data.label}</span>
      )}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555', width: 8, height: 8, border: 'none' }}
      />
    </div>
  )
}

const nodeTypes = { screen: ScreenNode }

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

  const rationaleKey = node.rationaleBindingKey ?? node.bindingKey + '_rationale'
  const rationale = responses[rationaleKey] ?? ''

  const { initNodes, initEdges } = useMemo(() => {
    try {
      const saved = JSON.parse(responses[node.bindingKey] ?? '') as SerializableFlow
      if (!Array.isArray(saved?.nodes)) throw new Error('invalid')
      return {
        initNodes: saved.nodes.map((n) => ({
          id: n.id,
          type: 'screen',
          position: { x: n.x, y: n.y },
          data: { label: n.label },
        } as FDNode)),
        initEdges: saved.edges.map((e) => makeEdge(e.source, e.target, e.id, e.label)),
      }
    } catch {
      return { initNodes: [] as FDNode[], initEdges: [] as FDEdge[] }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<FDNode>(initNodes)
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

  const persist = useCallback((nodes: FDNode[], edges: FDEdge[]) => {
    const data: SerializableFlow = {
      nodes: nodes.map((n) => ({ id: n.id, label: n.data.label, x: n.position.x, y: n.position.y })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.data?.label ?? (typeof e.label === 'string' ? e.label : ''),
      })),
    }
    setFreeTextResponse(node.bindingKey, JSON.stringify(data))
  }, [node.bindingKey, setFreeTextResponse])

  // Debounced persist for any state change (catches delete-key deletions etc.)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => persist(rfNodes, rfEdges), 200)
    return () => { if (persistTimerRef.current) clearTimeout(persistTimerRef.current) }
  }, [rfNodes, rfEdges, persist])

  // ---- Mutations ----

  const updateNodeLabel = useCallback((id: string, label: string) => {
    const updated = nodesRef.current.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, label } } : n
    )
    nodesRef.current = updated
    setRfNodes(updated)
    persist(updated, edgesRef.current)
  }, [setRfNodes, persist])

  const addScreen = useCallback(() => {
    const id = `s_${Date.now()}`
    const idx = nodesRef.current.length
    const newNode: FDNode = {
      id,
      type: 'screen',
      position: { x: 80 + (idx % 4) * 210, y: 60 + Math.floor(idx / 4) * 140 },
      data: { label: `Screen ${idx + 1}` },
    }
    const updated = [...nodesRef.current, newNode]
    nodesRef.current = updated
    setRfNodes(updated)
    persist(updated, edgesRef.current)
  }, [setRfNodes, persist])

  const onConnect: OnConnect = useCallback((params: Connection) => {
    const id = `e_${Date.now()}`
    const newEdge = makeEdge(params.source!, params.target!, id, 'tap')
    const updated = addEdge(newEdge, edgesRef.current)
    edgesRef.current = updated
    setRfEdges(updated)
    persist(nodesRef.current, updated)
    setSelEdgeId(id)
    setLabelDraft('tap')
  }, [setRfEdges, persist])

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: FDEdge) => {
    setSelEdgeId(edge.id)
    setLabelDraft(edge.data?.label ?? (typeof edge.label === 'string' ? edge.label : ''))
  }, [])

  const applyEdgeLabel = useCallback(() => {
    if (!selEdgeId) return
    const label = labelDraft.trim() || '→'
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

  const onPaneClick = useCallback(() => setSelEdgeId(null), [])

  const minNodes = node.minNodes ?? 2
  const minEdges = node.minEdges ?? 1
  const canSubmit =
    rfNodes.length >= minNodes &&
    rfEdges.length >= minEdges &&
    rationale.trim().length >= 20

  const appWindow = node.appWindow as LaptopFrameVariant | undefined

  const canvasAndControls = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: appWindow ? '0.75rem' : '0' }}>
      {/* Instructions */}
      <div style={{ fontSize: '0.75rem', lineHeight: 1.6, background: '#F2EBD9', color: '#555', border: '1px solid #ccc', padding: '0.4rem 0.6rem' }}>
        <strong>How to use:</strong> Click <strong>+ Add Screen</strong> to add a screen. Drag right handle → left handle to draw an arrow. Click an arrow to label it. Double-click a screen to rename.
      </div>

      {/* Flow canvas */}
      <div style={{ border: '1px solid #000', boxShadow: appWindow ? 'none' : '4px 4px 0 #000', height: appWindow ? 340 : 460, position: 'relative', background: '#FAFAF8' }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3, minZoom: 0.5 }}
          deleteKeyCode={['Delete', 'Backspace']}
          style={{ background: '#FAFAF8' }}
        >
          <Background color="#E8DCC8" gap={20} size={1} />
          <Controls />
          <Panel position="top-left">
            <button
              onClick={addScreen}
              style={{
                background: '#E8DCC8',
                border: '1px solid #000',
                boxShadow: appWindow ? 'none' : '2px 2px 0 #000',
                padding: '6px 14px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#000',
              }}
            >
              + Add Screen
            </button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Edge label editor */}
      {selEdge && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#FFF5E0', border: '1px solid #000' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#444', whiteSpace: 'nowrap' }}>Arrow label (trigger):</span>
          <input
            autoFocus
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyEdgeLabel()
              if (e.key === 'Escape') setSelEdgeId(null)
            }}
            placeholder="e.g. Tap invite button, Accept, Cancel"
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '0.8125rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              border: '1px solid #000',
              outline: 'none',
              background: '#fff',
              color: '#000',
            }}
          />
          <button
            onClick={applyEdgeLabel}
            style={{ padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, background: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Save
          </button>
          <button
            onClick={() => setSelEdgeId(null)}
            style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#666', background: 'transparent', border: '1px solid #ccc', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Status line */}
      <div style={{ fontSize: '0.75rem', color: '#666', display: 'flex', gap: '1rem' }}>
        <span>{rfNodes.length} screen{rfNodes.length !== 1 ? 's' : ''}</span>
        <span>{rfEdges.length} transition{rfEdges.length !== 1 ? 's' : ''}</span>
        {rfNodes.length < minNodes && (
          <span style={{ color: '#B87D6B' }}>Add at least {minNodes} screens.</span>
        )}
        {rfNodes.length >= minNodes && rfEdges.length < minEdges && (
          <span style={{ color: '#B87D6B' }}>Connect at least {minEdges} transition.</span>
        )}
      </div>

      {/* Rationale */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
          {node.rationalePrompt ?? 'Briefly explain your key design decisions for this flow.'}
        </label>
        <textarea
          value={rationale}
          onChange={(e) => setFreeTextResponse(rationaleKey, e.target.value)}
          placeholder="e.g. I started at the habit detail screen because that's where users already have context. The invite modal is lightweight to reduce friction. I included an empty state screen because first-time users will have no friends yet..."
          rows={3}
          style={{
            padding: '0.5rem 0.625rem',
            fontSize: '0.875rem',
            fontFamily: 'Inter, system-ui, sans-serif',
            border: '1px solid #000',
            backgroundColor: '#fff',
            color: '#000',
            outline: 'none',
            resize: 'vertical',
            boxShadow: appWindow ? 'none' : '3px 3px 0 #000',
          }}
        />
        {rationale.trim().length > 0 && rationale.trim().length < 20 && (
          <span style={{ fontSize: '0.75rem', color: '#B87D6B' }}>Please add a bit more detail.</span>
        )}
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
      <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration={hasWorkSurfaceVisual(node)}>
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

          {node.content && (
            <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
              {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
            </div>
          )}

          {/* Prompt box */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #000', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            {renderContentWithGlossary(interpolate(node.prompt, { playerName, branchFlags, mcSelections }))}
          </div>

          {appWindow ? (
            <WorkSurfaceFrame node={node} variant={appWindow} title={node.windowTitle ?? 'User Flow.fig'}>
              {canvasAndControls}
            </WorkSurfaceFrame>
          ) : (
            canvasAndControls
          )}
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
