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
import { npcs } from '../data/npcs'
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
import { npcReply } from '../services/gemini'
import { GeminiLiveSession, type LiveStatus } from '../services/geminiLive'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { ChatMessage, FlowDiagramCompanionConfig, FlowDiagramNodeKind, FlowDiagramNodeKindOption, FlowDiagramSceneNode } from '../types/game'

// ---- Types ----
type NodeData = { label: string; kind?: FlowDiagramNodeKind; locked?: boolean }
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
const DEFAULT_NODE_KINDS: FlowDiagramNodeKindOption[] = [
  { kind: 'entry_point', label: 'Entry point' },
  { kind: 'screen', label: 'Screen' },
  { kind: 'action', label: 'Action' },
  { kind: 'decision_branch', label: 'Decision branch' },
  { kind: 'final_interaction', label: 'Final interaction' },
]

const fallbackKindLabel = (kind: FlowDiagramNodeKind) =>
  DEFAULT_NODE_KINDS.find((item) => item.kind === kind)?.label ?? 'Screen'

function getNodePalette(kind: FlowDiagramNodeKind) {
  return {
    entry_point: { bg: '#E6EFE3', border: '#3A6B5E', shadow: '#3A6B5E' },
    screen: { bg: '#fff', border: '#000', shadow: '#000' },
    action: { bg: '#E9F0F4', border: '#4F8F9A', shadow: '#4F8F9A' },
    decision_branch: { bg: '#FFF5E0', border: '#B87D6B', shadow: '#B87D6B' },
    final_interaction: { bg: '#F4E2D9', border: '#8A513E', shadow: '#8A513E' },
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
  const kind = data.kind ?? 'screen'
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
  const borderColor = locked ? '#3A6B5E' : selected ? '#B87D6B' : palette.border
  const shadowColor = selected ? '#B87D6B' : palette.shadow
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
      {data.label.trim() ? data.label : <span style={{ color: '#8A8376', fontWeight: 700 }}>Type label</span>}
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
          style={{ background: '#555', width: 8, height: 8, border: 'none' }}
        />
        <div
          style={{
            position: 'absolute',
            width: 94,
            height: 94,
            transform: 'rotate(45deg)',
            background: palette.bg,
            border: `2px solid ${borderColor}`,
            boxShadow: `3px 3px 0 ${shadowColor}`,
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 26px', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
          {labelContent}
        </div>
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: '#555', width: 8, height: 8, border: 'none' }}
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
        minWidth: kind === 'screen' ? 130 : 148,
        maxWidth: 190,
        padding: '8px 14px',
        background: locked ? '#E6EFE3' : selected ? '#FFF5E0' : palette.bg,
        border: `${kind === 'final_interaction' ? 3 : 2}px solid ${borderColor}`,
        borderRadius: kind === 'screen' ? 0 : 999,
        boxShadow: `3px 3px 0 ${shadowColor}`,
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
      {labelContent}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555', width: 8, height: 8, border: 'none' }}
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

function summarizeFlowForCompanion(
  nodes: FDNode[],
  edges: FDEdge[],
  kindLabels: Map<FlowDiagramNodeKind, string>,
  rationale: string
) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const nodeLines = nodes.length
    ? nodes.map((node) => {
        const kind = node.data.kind ?? 'screen'
        const kindLabel = kindLabels.get(kind) ?? fallbackKindLabel(kind)
        return `- ${kindLabel}: ${node.data.label.trim() || '(blank)'}`
      })
    : ['- (no nodes yet)']
  const edgeLines = edges.length
    ? edges.map((edge) => {
        const source = nodeById.get(edge.source)?.data.label.trim() || edge.source
        const target = nodeById.get(edge.target)?.data.label.trim() || edge.target
        const label = edge.data?.label?.trim() || (typeof edge.label === 'string' ? edge.label.trim() : '')
        return `- ${source} -> ${target}${label ? ` (${label})` : ''}`
      })
    : ['- (no arrows yet)']

  const lines = [
    'CURRENT FLOW NODES:',
    ...nodeLines,
    'CURRENT ARROWS:',
    ...edgeLines,
  ]
  if (rationale.trim()) lines.push(`HANDOFF NOTE: ${rationale.trim()}`)
  return lines.join('\n')
}

function formatCompanionSection(title: string, items?: string[]): string {
  const cleanItems = (items ?? []).map((item) => item.trim()).filter(Boolean)
  if (!cleanItems.length) return ''
  return [`${title}:`, ...cleanItems.map((item) => `- ${item}`)].join('\n')
}

function buildFlowCompanionGoal(args: {
  companion: FlowDiagramCompanionConfig
  nodes: FDNode[]
  edges: FDEdge[]
  kindLabels: Map<FlowDiagramNodeKind, string>
  rationale: string
}) {
  const companionContext = [
    args.companion.systemGuidance?.trim() || '',
    formatCompanionSection('WELLNEST FACTS', args.companion.productFacts),
    formatCompanionSection('GOOD USER FLOW CRITERIA', args.companion.goodFlowCriteria),
    formatCompanionSection('FRIEND STREAKS DIRECTION', args.companion.directionGuide),
    formatCompanionSection('LEO RESPONSE POLICY', args.companion.responsePolicy),
  ].filter(Boolean).join('\n\n')

  return `You are Leo, the front-end engineer sitting beside the student in the same project room and reviewing a Friend Streaks user flow as a build handoff.

${companionContext}

CURRENT CONTEXT:
${summarizeFlowForCompanion(args.nodes, args.edges, args.kindLabels, args.rationale)}

RULES:
- Speak like a teammate looking at the same Figma file, not a teacher, tutor, or answer key.
- Speak naturally for a same-room workplace conversation.
- Anchor your reply to the player's current flow choice when possible.
- Do not write the user's final flow or rationale for them.
- Do not mention being an AI, model, simulator, or voice session.
- Use UX terms lightly and only when they help: Entry point, typed node labels, Decision branch paths, Edge case behavior, Final interaction, and arrow meaning.
- Ask at most one implementation-minded clarification question at a time about missing labels, Entry point, Decision branch, Edge case, Final interaction, states, or arrow meaning.
- If the user asks what to make, respond with one concrete question or tradeoff Leo would need clarified before building.
- Keep replies under 90 words.`
}

function MicIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
      {muted && <line x1="2" y1="2" x2="22" y2="22" strokeWidth={2.5} />}
    </svg>
  )
}

function FlowDiagramCompanionPanel({
  node,
  companion,
  nodes,
  edges,
  rationale,
  kindLabels,
}: {
  node: FlowDiagramSceneNode
  companion: FlowDiagramCompanionConfig
  nodes: FDNode[]
  edges: FDEdge[]
  rationale: string
  kindLabels: Map<FlowDiagramNodeKind, string>
}) {
  const npc = npcs[companion.npcId]
  const conversationKey = `companion:${node.id}:${companion.npcId}`
  const messages = useGameStore((s) => s.npcConversations[conversationKey] || [])
  const appendNpcMessage = useGameStore((s) => s.appendNpcMessage)
  const [status, setStatus] = useState<LiveStatus>('idle')
  const [statusDetail, setStatusDetail] = useState('')
  const [muted, setMuted] = useState(true)
  const [npcSpeaking, setNpcSpeaking] = useState(false)
  const [liveUser, setLiveUser] = useState('')
  const [liveNpc, setLiveNpc] = useState('')
  const [typedInput, setTypedInput] = useState('')
  const [typedLoading, setTypedLoading] = useState(false)
  const [typedError, setTypedError] = useState<string | null>(null)

  const sessionRef = useRef<GeminiLiveSession | null>(null)
  const pendingUserRef = useRef('')
  const pendingNpcRef = useRef('')
  const lastRoleRef = useRef<'user' | 'npc' | null>(null)
  const liveContextRef = useRef('')

  const goalPrompt = useMemo(
    () => buildFlowCompanionGoal({ companion, nodes, edges, kindLabels, rationale }),
    [companion, nodes, edges, kindLabels, rationale]
  )
  const contextSignature = useMemo(
    () => JSON.stringify({
      nodes: nodes.map((flowNode) => ({
        id: flowNode.id,
        kind: flowNode.data.kind ?? 'screen',
        label: flowNode.data.label,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.data?.label ?? (typeof edge.label === 'string' ? edge.label : ''),
      })),
      rationale,
    }),
    [nodes, edges, rationale]
  )
  const contextChanged = Boolean(sessionRef.current && liveContextRef.current && liveContextRef.current !== contextSignature)

  useEffect(() => {
    return () => {
      sessionRef.current?.stop()
      sessionRef.current = null
    }
  }, [])

  const flushPending = (role: 'user' | 'npc') => {
    const pending = role === 'user' ? pendingUserRef.current : pendingNpcRef.current
    const trimmed = pending.trim()
    if (!trimmed) return
    appendNpcMessage(conversationKey, { role, content: trimmed, ts: new Date().toISOString() })
    if (role === 'user') {
      pendingUserRef.current = ''
      setLiveUser('')
    } else {
      pendingNpcRef.current = ''
      setLiveNpc('')
    }
  }

  const startVoice = async () => {
    if (!npc || sessionRef.current) return
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      setStatus('error')
      setStatusDetail('Gemini API key not configured.')
      return
    }

    const session = new GeminiLiveSession({
      onStatus: (next, detail) => {
        setStatus(next)
        if (detail) setStatusDetail(detail)
      },
      onUserTranscript: (text) => {
        if (lastRoleRef.current === 'npc') flushPending('npc')
        lastRoleRef.current = 'user'
        pendingUserRef.current += text
        setLiveUser(pendingUserRef.current)
      },
      onNpcTranscript: (text) => {
        if (lastRoleRef.current === 'user') flushPending('user')
        lastRoleRef.current = 'npc'
        pendingNpcRef.current += text
        setLiveNpc(pendingNpcRef.current)
      },
      onNpcSpeakingChange: (speaking) => {
        setNpcSpeaking(speaking)
        if (!speaking) {
          flushPending('npc')
          lastRoleRef.current = null
        }
      },
    })

    session.setMuted(true)
    setMuted(true)
    sessionRef.current = session
    liveContextRef.current = contextSignature
    await session.start({
      apiKey,
      voiceName: companion.voiceName,
      systemPrompt: `You are ${npc.name}, ${npc.role}.

PERSONA:
${npc.persona}
${npc.voice ? `\nVOICE:\n${npc.voice}\n` : ''}
${goalPrompt}`,
    })
  }

  const stopVoice = () => {
    flushPending('user')
    flushPending('npc')
    sessionRef.current?.stop()
    sessionRef.current = null
    liveContextRef.current = ''
    setMuted(true)
    setNpcSpeaking(false)
  }

  const toggleMuted = () => {
    const next = !muted
    setMuted(next)
    sessionRef.current?.setMuted(next)
  }

  const submitTyped = async () => {
    const trimmed = typedInput.trim()
    if (!trimmed || typedLoading || !npc) return
    const userMessage: ChatMessage = { role: 'user', content: trimmed, ts: new Date().toISOString() }
    setTypedError(null)
    setTypedInput('')
    appendNpcMessage(conversationKey, userMessage)
    setTypedLoading(true)
    try {
      const history: ChatMessage[] = [...messages, userMessage]
      const reply = await npcReply({ npcId: companion.npcId, history, goalPrompt, channel: 'chat' })
      appendNpcMessage(conversationKey, { role: 'npc', content: reply, ts: new Date().toISOString() })
    } catch (err) {
      setTypedError(err instanceof Error ? err.message : 'Leo reply failed')
    } finally {
      setTypedLoading(false)
    }
  }

  if (!npc) {
    return (
      <div style={{ border: '1px solid #B87D6B', background: '#F4E2D9', padding: '0.75rem', color: '#7B3D32' }}>
        Unknown companion NPC: <code>{companion.npcId}</code>
      </div>
    )
  }

  const initials = npc.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const inVoice = status === 'connecting' || status === 'connected'
  const statusLabel =
    status === 'connecting' ? 'Connecting...'
    : status === 'connected' ? (muted ? 'Muted' : npcSpeaking ? `${npc.name} is talking...` : 'Listening...')
    : status === 'error' ? 'Voice unavailable'
    : 'Ready'

  return (
    <section data-testid="flow-diagram-companion" style={{ border: '1px solid #000', background: '#F7F1E3', boxShadow: '3px 3px 0 #000', padding: '0.8rem', display: 'grid', gap: '0.65rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <div style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid #000', background: '#4F8F9A', color: '#F7F1E3', display: 'grid', placeItems: 'center', fontSize: '0.78rem', fontWeight: 900, boxShadow: npcSpeaking ? '0 0 0 4px rgba(79,143,154,0.32)' : 'none' }}>
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1E1E1A' }}>{companion.title || `Talk with ${npc.name.split(' ')[0]}`}</div>
          <div style={{ fontSize: '0.72rem', color: '#6A604B' }}>{npc.name}, {npc.role}</div>
        </div>
      </div>

      <div style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.55rem', fontSize: '0.75rem', lineHeight: 1.45, color: '#4B4538' }}>
        Stuck on the flow? Talk it through with Leo in the same room while he looks at your Figma canvas.
      </div>

      {contextChanged && (
        <div style={{ border: '1px solid #B87D6B', background: '#F4E2D9', padding: '0.5rem', fontSize: '0.7rem', lineHeight: 1.4, color: '#7B3D32' }}>
          Flow context changed. Stop and restart voice so Leo sees the latest canvas.
        </div>
      )}

      <div style={{ border: '1px solid #CDBF94', background: '#FFFDF5', padding: '0.6rem', minHeight: 96, maxHeight: 190, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {messages.length === 0 && !liveUser && !liveNpc && (
          <div style={{ fontSize: '0.75rem', color: '#6A604B', lineHeight: 1.45 }}>
            Start voice, then unmute when you want to ask Leo about a flow decision.
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
            <div style={{ fontSize: '0.64rem', color: '#6A604B', marginBottom: 2 }}>
              {message.role === 'user' ? 'You' : npc.name}
            </div>
            <div
              style={{
                border: '1px solid #CDBF94',
                background: message.role === 'user' ? '#4F8F9A' : '#F7F1E3',
                color: message.role === 'user' ? '#F7F1E3' : '#1E1E1A',
                padding: '0.45rem 0.55rem',
                fontSize: '0.75rem',
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
              }}
            >
              {message.content}
            </div>
          </div>
        ))}
        {liveUser && <div style={{ alignSelf: 'flex-end', fontSize: '0.72rem', color: '#6A604B', border: '1px dashed #CDBF94', padding: '0.4rem' }}>{liveUser}</div>}
        {liveNpc && <div style={{ alignSelf: 'flex-start', fontSize: '0.72rem', color: '#6A604B', border: '1px dashed #CDBF94', padding: '0.4rem' }}>{liveNpc}</div>}
      </div>

      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {!inVoice ? (
          <button
            type="button"
            onClick={startVoice}
            style={{ border: '1px solid #000', background: '#3A6B5E', color: '#F2EBD9', borderRadius: 6, padding: '0.45rem 0.65rem', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            Start voice
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleMuted}
              style={{ border: '1px solid #000', background: muted ? '#F2EBD9' : '#DCE6D2', color: '#1E1E1A', borderRadius: 6, padding: '0.45rem 0.65rem', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', gap: '0.35rem', alignItems: 'center' }}
            >
              <MicIcon muted={muted} />
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button
              type="button"
              onClick={stopVoice}
              style={{ border: '1px solid #B87D6B', background: '#F4E2D9', color: '#1E1E1A', borderRadius: 6, padding: '0.45rem 0.65rem', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Stop
            </button>
          </>
        )}
        <span style={{ fontSize: '0.68rem', color: status === 'error' ? '#7B3D32' : '#6A604B' }}>
          {statusLabel}{status === 'error' && statusDetail ? `: ${statusDetail}` : ''}
        </span>
      </div>

      {status === 'error' && (
        <div style={{ display: 'grid', gap: '0.45rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#6A604B' }}>{companion.fallbackPrompt || 'Type to Leo instead.'}</div>
          <textarea
            value={typedInput}
            onChange={(event) => setTypedInput(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submitTyped()
            }}
            rows={2}
            placeholder="Ask Leo about this flow..."
            style={{ border: '1px solid #000', background: '#fff', color: '#1E1E1A', padding: '0.55rem', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.82rem', resize: 'vertical' }}
          />
          <button
            type="button"
            onClick={submitTyped}
            disabled={!typedInput.trim() || typedLoading}
            style={{ justifySelf: 'start', border: '1px solid #000', background: typedInput.trim() && !typedLoading ? '#3A6B5E' : '#EFE8D2', color: typedInput.trim() && !typedLoading ? '#F7F1E3' : '#6A604B', boxShadow: '2px 2px 0 #000', padding: '0.45rem 0.75rem', fontSize: '0.78rem', fontWeight: 900, cursor: typedInput.trim() && !typedLoading ? 'pointer' : 'not-allowed', fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {typedLoading ? 'Sending...' : 'Send'}
          </button>
          {typedError && <div style={{ fontSize: '0.72rem', color: '#7B3D32' }}>{typedError}</div>}
        </div>
      )}
    </section>
  )
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
  const canvasRef = useRef<HTMLDivElement>(null)
  const flowInstanceRef = useRef<ReactFlowInstance<FDNode, FDEdge> | null>(null)

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
          data: { label: n.label, kind: n.kind ?? 'screen' },
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
      nodes: normalizedNodes.map((n) => ({ id: n.id, label: n.data.label, kind: n.data.kind ?? 'screen', x: n.position.x, y: n.position.y })),
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
      data: { label: '', kind: kindOption.kind },
    }
    const updated = [...nodesRef.current, newNode]
    nodesRef.current = updated
    setRfNodes(updated)
    persist(updated, edgesRef.current)
  }, [setRfNodes, persist])

  const onConnect: OnConnect = useCallback((params: Connection) => {
    const id = `e_${Date.now()}`
    const newEdge = makeEdge(params.source!, params.target!, id, DEFAULT_EDGE_LABEL)
    const updated = addEdge(newEdge, edgesRef.current)
    edgesRef.current = updated
    setRfEdges(updated)
    persist(nodesRef.current, updated)
    setSelEdgeId(id)
    setLabelDraft(DEFAULT_EDGE_LABEL)
  }, [setRfEdges, persist])

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

  const onPaneClick = useCallback(() => setSelEdgeId(null), [])

  const minNodes = node.minNodes ?? 2
  const minEdges = node.minEdges ?? 1
  const requiredNodeKinds = node.requiredNodeKinds ?? []
  const presentNodeKinds = new Set(rfNodes.map((rfNode) => rfNode.data.kind ?? 'screen'))
  const missingKinds = requiredNodeKinds.filter((kind) => !presentNodeKinds.has(kind))
  const unlabeledNodeCount = rfNodes.filter((rfNode) => !rfNode.data.label.trim()).length
  const canSubmit =
    rfNodes.length >= minNodes &&
    rfEdges.length >= minEdges &&
    missingKinds.length === 0 &&
    unlabeledNodeCount === 0

  const appWindow = node.appWindow as LaptopFrameVariant | undefined

  const canvasAndControls = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: appWindow ? '0.75rem' : '0' }}>
      {node.exampleFlow?.length ? (
        <div style={{ fontSize: '0.75rem', lineHeight: 1.45, background: '#F7F1E3', color: '#333', border: '1px solid #CDBF94', padding: '0.45rem 0.6rem' }}>
          <strong>Example:</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem' }}>
            {node.exampleFlow.map((step, index) => {
              const palette = getNodePalette(step.kind)
              return (
                <span key={`${step.kind}-${step.label}-${index}`} style={{ display: 'contents' }}>
                  {index > 0 && <span style={{ color: '#8A513E', fontWeight: 900 }}>→</span>}
                  <span
                    style={{
                      border: `${step.kind === 'final_interaction' ? 2 : 1}px solid ${palette.border}`,
                      background: palette.bg,
                      boxShadow: `2px 2px 0 ${palette.shadow}`,
                      color: '#1E1E1A',
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
        </div>
      ) : null}

      {node.legendItems?.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.35rem', fontSize: '0.72rem', lineHeight: 1.35 }}>
          {node.legendItems.map((item) => (
            <div key={item.label} style={{ border: '1px solid #D8D1C1', background: '#FFFDF5', padding: '0.35rem 0.45rem' }}>
              <strong>{item.label}:</strong> {item.description}
            </div>
          ))}
        </div>
      ) : null}

      {/* Instructions */}
      <div style={{ fontSize: '0.75rem', lineHeight: 1.6, background: '#F2EBD9', color: '#555', border: '1px solid #ccc', padding: '0.4rem 0.6rem' }}>
        <strong>How to use:</strong> Add node types, connect them with arrows, and label arrows only when the path needs clarification, like Yes, No, Invite ignored, or Missed day.
      </div>

      {/* Flow canvas */}
      <div ref={canvasRef} style={{ border: '1px solid #000', boxShadow: appWindow ? 'none' : '4px 4px 0 #000', height: appWindow ? 340 : 460, position: 'relative', background: '#FAFAF8' }}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onPaneClick}
          onInit={(instance) => { flowInstanceRef.current = instance }}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={INITIAL_FIT_VIEW_OPTIONS}
          minZoom={0.25}
          deleteKeyCode={['Delete', 'Backspace']}
          style={{ background: '#FAFAF8' }}
        >
          <Background color="#E8DCC8" gap={20} size={1} />
          <Controls />
          <Panel position="top-left">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', maxWidth: 520 }}>
              {nodeKindOptions.map((kindOption) => (
                <button
                  key={kindOption.kind}
                  onClick={() => addFlowNode(kindOption)}
                  style={{
                    background: '#E8DCC8',
                    border: '1px solid #000',
                    boxShadow: appWindow ? 'none' : '2px 2px 0 #000',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    color: '#000',
                  }}
                >
                  + {kindOption.label}
                </button>
              ))}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Edge label editor */}
      {selEdge && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#FFF5E0', border: '1px solid #000' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#444', whiteSpace: 'nowrap' }}>Path label:</span>
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
      <div style={{ fontSize: '0.75rem', color: '#666', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
        <span>{rfNodes.length} node{rfNodes.length !== 1 ? 's' : ''}</span>
        <span>{rfEdges.length} transition{rfEdges.length !== 1 ? 's' : ''}</span>
        {rfNodes.length < minNodes && (
          <span style={{ color: '#B87D6B' }}>Add at least {minNodes} nodes.</span>
        )}
        {rfNodes.length >= minNodes && rfEdges.length < minEdges && (
          <span style={{ color: '#B87D6B' }}>Connect at least {minEdges} transition.</span>
        )}
        {missingKinds.length > 0 && (
          <span style={{ color: '#B87D6B' }}>
            Add: {missingKinds.map((kind) => nodeKindLabels.get(kind) ?? fallbackKindLabel(kind)).join(', ')}.
          </span>
        )}
        {unlabeledNodeCount > 0 && (
          <span style={{ color: '#B87D6B' }}>Type a label inside each node.</span>
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

          {node.content && (
            <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
              {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
            </div>
          )}

          {/* Prompt box */}
          <div style={{ backgroundColor: '#fff', border: '1px solid #000', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
            {interpolate(node.prompt, { playerName, branchFlags, mcSelections })}
          </div>

          {appWindow ? (
            <DesktopOverlay>
              <LaptopFrame variant={appWindow} title={node.windowTitle ?? 'User Flow.fig'} fill scrollable>
                {canvasAndControls}
              </LaptopFrame>
            </DesktopOverlay>
          ) : (
            canvasAndControls
          )}

          {node.companion && (
            <FlowDiagramCompanionPanel
              node={node}
              companion={node.companion}
              nodes={rfNodes}
              edges={rfEdges}
              rationale={rationale}
              kindLabels={nodeKindLabels}
            />
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
