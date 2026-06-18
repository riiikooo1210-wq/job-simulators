import { type DragEvent, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { storyline } from '../data/storyline'
import { npcs } from '../data/npcs'
import { GeminiLiveSession, type LiveStatus } from '../services/geminiLive'
import {
  getSequencedTaskAvailability,
  MED_PASS_SAFETY_CHECKS_SCENE_ID,
  ROOM_512_ASSESSMENT_SCENE_ID,
  ROOM_512_WRISTBAND_TASK_ID,
  STAT_LAB_DRAW_SCENE_ID,
} from './physicalPlaygroundAvailability'
import type {
  ActionDropTarget,
  ActionInteractiveObject,
  ActionSimulationNode,
  ActionSimulationStep,
  ChatMessage,
  PhysicalPlaygroundNode,
  PlaygroundControl,
  VisualAssetsRequired,
  VoiceMeetingNode,
} from '../types/game'

type PlaygroundNode = ActionSimulationNode | PhysicalPlaygroundNode
type StageKind = 'object' | 'target' | 'readable' | 'control' | 'step'

interface ImageHoldTarget {
  x: number
  y: number
  w: number
  h: number
  label?: string
  instruction?: string
  completionText?: string
}

interface SelectableImageItem {
  id: string
  label: string
  x?: number
  y?: number
  w?: number
  h?: number
  buttonW?: number
  buttonH?: number
  checkX?: number
  checkY?: number
  checkW?: number
  checkH?: number
  correct?: boolean
}

interface ModalReferenceCard {
  title: string
  content?: string
  assetId?: string
  assetPath?: string
  buttonLabel?: string
}

interface ModalChoiceOption {
  id: string
  label: string
  correct?: boolean
  feedback?: string
}

interface ActionLogEntry {
  at: string
  action: string
  label: string
  objectId?: string
  targetId?: string
  value?: number
  primitive?: string
  observation?: string
}

interface PlaygroundState {
  selectedObjects: string[]
  placements: Record<string, string>
  completedSteps: string[]
  inspectedSurfaces: string[]
  completedControls: string[]
  controlValues: Record<string, number>
  observations: Record<string, string>
  warnings: string[]
  actionLog: ActionLogEntry[]
}

interface AssetHitbox {
  x: number
  y: number
  w: number
  h: number
}

interface ModalContent {
  title: string
  body: string
  image?: string
  subjectId: string
  kind: 'object' | 'surface'
  primitive?: string
  matchSurfaces?: { label: string; value: string }[]
  matchQuestion?: string
  correctMatch?: boolean
  choiceQuestion?: string
  choiceOptions?: ModalChoiceOption[]
  observationPrompt?: string
  observationPlaceholder?: string
  requiresObservationText?: boolean
  expectedObservation?: string
  narrationText?: string
  npcName?: string
  npcLine?: string
  visibleFindings?: string[]
  imageHoldTarget?: ImageHoldTarget
  selectableItems?: SelectableImageItem[]
  selectableAutoComplete?: boolean
  selectableSubmitLabel?: string
  selectableMissingFeedback?: string
  selectableWrongFeedback?: string
  completeLabel?: string
  voiceNodeId?: string
  voiceStarted?: boolean
  embeddedSceneNodeId?: string
  modalReference?: ModalReferenceCard
  safetyWarning?: string
}

interface SceneLink {
  id: string
  label: string
  verb?: string
  next: string
  x: number
  y: number
  w: number
  h: number
  requiresObjects?: string[]
  requiresSteps?: string[]
  requiresReadables?: string[]
  requiresControls?: string[]
  requiresNodes?: string[]
  lockedText?: string
  modalObjectId?: string
  modalAssetId?: string
  modalAssetPath?: string
  modalBody?: string
  modalCompleteLabel?: string
  modalVoiceNodeId?: string
  modalSceneNodeId?: string
  primitive?: string
  choiceQuestion?: string
  choiceOptions?: ModalChoiceOption[]
  observationPrompt?: string
  observationPlaceholder?: string
  requiresObservationText?: boolean
  expectedObservation?: string
  narrationText?: string
  npcName?: string
  npcLine?: string
  visibleFindings?: string[]
  imageHoldTarget?: ImageHoldTarget
}

interface StageSupplyOverlay {
  id: string
  label: string
  src: string
  x: number
  y: number
  w: number
  h: number
  rotate?: number
  z?: number
  linkedObjectId?: string
}

const initialState: PlaygroundState = {
  selectedObjects: [],
  placements: {},
  completedSteps: [],
  inspectedSurfaces: [],
  completedControls: [],
  controlValues: {},
  observations: {},
  warnings: [],
  actionLog: [],
}

const ASSET_CATEGORIES: Array<keyof VisualAssetsRequired> = [
  'backgrounds',
  'characters',
  'interactiveObjects',
  'readableSurfaces',
  'dropTargets',
  'stateVariants',
  'overlays',
]

const DRAG_PRIMITIVES = new Set([
  'drag_object_to_target',
  'drag_object_between_zones',
  'drag_along_path',
  'drag_with_snap',
  'drag_to_connect',
  'drag_to_disconnect',
  'drag_to_reorder',
  'drag_to_sort',
  'drag_to_stack',
  'drag_to_uncover',
  'drag_to_open',
  'drag_to_close',
  'drag_to_resize',
  'drag_to_position',
  'place_item_on_surface',
  'insert_item',
  'attach_item',
])

const HOLD_PRIMITIVES = new Set([
  'press_and_hold_target',
  'long_press_target',
  'timed_hold',
  'timed_release',
])

const HAND_HYGIENE_FIRST_SCENE_ID = ROOM_512_ASSESSMENT_SCENE_ID
const HAND_HYGIENE_OBJECT_ID = 'hand_hygiene'
const HAND_HYGIENE_REFERENCE_EXEMPT_IDS = new Set(['review_orders'])
const HAND_HYGIENE_FIRST_WARNING = 'Sanitize your hands before doing anything else in the room.'
const WRISTBAND_SECOND_WARNING = 'Scan the wristband before starting the rest of the bedside assessment.'
const SEQUENCED_TASK_WARNING_PREFIX = 'Complete '
const SAFETY_WARNING_RED = '#B87D6B'
const TABLET_ASSET_SRC = '/action-assets/tablet.PNG'

const SCENE_TABLET_OVERLAYS: Record<string, StageSupplyOverlay[]> = {
  scene2_assessment: [
    {
      id: 'assessment_emar_tablet',
      label: 'eMAR tablet',
      src: TABLET_ASSET_SRC,
      x: 80,
      y: 56,
      w: 18,
      h: 18,
      z: 8,
      linkedObjectId: 'review_orders',
    },
  ],
  scene2_med_pass: [
    {
      id: 'med_pass_emar_tablet',
      label: 'eMAR tablet',
      src: TABLET_ASSET_SRC,
      x: 0.5,
      y: 46.5,
      w: 28,
      h: 28,
      z: 8,
    },
  ],
}

const TABLET_SCREEN_LINES: Record<string, string[]> = {
  scene2_assessment: ['Vance 512', 'Meds due', 'Pain plan'],
  scene2_med_pass: ['Vance 512', 'Meds due', 'Allergies', 'Scan + reassess'],
}

const MED_PASS_CART_SUPPLY_OVERLAYS: StageSupplyOverlay[] = [
  {
    id: 'barcode_scanner',
    label: 'Barcode scanner',
    src: '/action-assets/scene2_med_pass/barcode-scanner.PNG',
    x: 24.2,
    y: 45,
    w: 8,
    h: 18,
    rotate: -68,
    z: 4,
  },
  {
    id: 'acetaminophen_bag',
    label: 'IV acetaminophen',
    src: '/action-assets/scene2_med_pass/iv-acetaminophen.PNG',
    x: 28.5,
    y: 44,
    w: 9,
    h: 21,
    rotate: 7,
    z: 3,
  },
  {
    id: 'ibuprofen',
    label: 'Ibuprofen',
    src: '/action-assets/scene2_med_pass/ibuprofen.png',
    x: 21,
    y: 55,
    w: 6.2,
    h: 8.8,
    rotate: -8,
    z: 5,
  },
  {
    id: 'water_cup',
    label: 'Water cup',
    src: '/action-assets/scene2_med_pass/water-cup.png',
    x: 27,
    y: 55.5,
    w: 6.4,
    h: 10.5,
    rotate: 6,
    z: 5,
  },
  {
    id: 'flush',
    label: 'Saline flush',
    src: '/action-assets/scene2_med_pass/saline-flush.png',
    x: 32.5,
    y: 60,
    w: 14.5,
    h: 5.2,
    rotate: -4,
    z: 6,
  },
  {
    id: 'pain_scale',
    label: 'Pain scale card',
    src: '/action-assets/scene2_med_pass/pain-scale.PNG',
    x: 12,
    y: 62.5,
    w: 15.5,
    h: 7.4,
    rotate: 2,
    z: 6,
  },
]

const MED_PASS_USED_AFTER_ADMINISTRATION = new Set(['acetaminophen_bag', 'ibuprofen', 'water_cup', 'flush'])

const LAB_DRAW_SUPPLY_OVERLAYS: StageSupplyOverlay[] = [
  {
    id: 'gloves',
    label: 'Gloves',
    src: '/action-assets/scene3_lab_draw/gloves.PNG',
    x: 18,
    y: 54,
    w: 7.2,
    h: 11.8,
    rotate: -7,
    z: 5,
  },
  {
    id: 'tourniquet',
    label: 'Tourniquet',
    src: '/action-assets/scene3_lab_draw/tourniquet.PNG',
    x: 21,
    y: 60.5,
    w: 11.5,
    h: 7,
    rotate: -18,
    z: 7,
  },
  {
    id: 'alcohol_swab',
    label: 'Alcohol swab',
    src: '/action-assets/scene3_lab_draw/alcohol-swap.PNG',
    x: 24.5,
    y: 53,
    w: 5.8,
    h: 8,
    rotate: 8,
    z: 6,
  },
  {
    id: 'butterfly',
    label: 'Butterfly needle',
    src: '/action-assets/scene3_lab_draw/butterfly-needle.PNG',
    x: 27.5,
    y: 50.5,
    w: 6.8,
    h: 11.8,
    rotate: 13,
    z: 6,
  },
  {
    id: 'lavender_tube',
    label: 'Lavender tube',
    src: '/action-assets/scene3_lab_draw/lavender-tube.PNG',
    x: 34.5,
    y: 49,
    w: 2.9,
    h: 13.5,
    rotate: 7,
    z: 8,
  },
  {
    id: 'labels',
    label: 'Specimen labels',
    src: '/action-assets/scene3_lab_draw/specimen-labels.PNG',
    x: 29.5,
    y: 57.5,
    w: 6.3,
    h: 9.8,
    rotate: -4,
    z: 8,
  },
  {
    id: 'gauze',
    label: 'Gauze and tape',
    src: '/action-assets/scene3_lab_draw/gauze-tape.PNG',
    x: 32,
    y: 54.5,
    w: 6.3,
    h: 9.8,
    rotate: 5,
    z: 8,
  },
  {
    id: 'specimen_bag',
    label: 'Specimen bag',
    src: '/action-assets/scene3_lab_draw/specimen-bag.PNG',
    x: 13.5,
    y: 57.5,
    w: 7.8,
    h: 12.8,
    rotate: 6,
    z: 4,
  },
]

const LAB_DRAW_USED_AFTER_PERFORM_DRAW = new Set(['gloves', 'tourniquet', 'alcohol_swab', 'butterfly', 'lavender_tube', 'gauze'])
const LAB_DRAW_USED_AFTER_LABELING = new Set(['labels'])
const LAB_DRAW_USED_AFTER_SEND = new Set(['specimen_bag'])

function selectedSupplyOverlays(nodeId: string, state: PlaygroundState) {
  if (nodeId === 'scene2_med_pass') {
    return MED_PASS_CART_SUPPLY_OVERLAYS.filter((item) => (
      state.selectedObjects.includes(item.id)
      && (!state.selectedObjects.includes('administer_meds') || !MED_PASS_USED_AFTER_ADMINISTRATION.has(item.id))
    ))
  }

  if (nodeId === 'scene3_lab_draw') {
    return LAB_DRAW_SUPPLY_OVERLAYS.filter((item) => (
      state.selectedObjects.includes(item.id)
      && (!state.selectedObjects.includes('perform_draw') || !LAB_DRAW_USED_AFTER_PERFORM_DRAW.has(item.id))
      && (!state.selectedObjects.includes('label_bedside') || !LAB_DRAW_USED_AFTER_LABELING.has(item.id))
      && (!state.selectedObjects.includes('dispose_send') || !LAB_DRAW_USED_AFTER_SEND.has(item.id))
    ))
  }

  return []
}

function parseState(raw: string | undefined): PlaygroundState {
  if (!raw) return initialState
  try {
    const parsed = JSON.parse(raw)
    return {
      selectedObjects: Array.isArray(parsed.selectedObjects) ? parsed.selectedObjects : [],
      placements: parsed.placements && typeof parsed.placements === 'object' ? parsed.placements : {},
      completedSteps: Array.isArray(parsed.completedSteps) ? parsed.completedSteps : [],
      inspectedSurfaces: Array.isArray(parsed.inspectedSurfaces) ? parsed.inspectedSurfaces : [],
      completedControls: Array.isArray(parsed.completedControls) ? parsed.completedControls : [],
      controlValues: parsed.controlValues && typeof parsed.controlValues === 'object' ? parsed.controlValues : {},
      observations: parsed.observations && typeof parsed.observations === 'object' ? parsed.observations : {},
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      actionLog: Array.isArray(parsed.actionLog) ? parsed.actionLog : [],
    }
  } catch {
    return initialState
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function completedTaskIdsForState(state: PlaygroundState) {
  return unique([
    ...state.selectedObjects,
    ...Object.keys(state.placements),
    ...state.completedSteps,
    ...state.inspectedSurfaces,
    ...state.completedControls,
  ])
}

function taskAvailabilityClass(state: 'available' | 'locked' | 'completed') {
  if (state === 'locked') return 'is-sequence-locked'
  if (state === 'completed') return 'is-sequence-completed'
  return ''
}

function normalizeAssetPath(path: string | undefined): string | undefined {
  if (!path) return undefined
  if (path.startsWith('public/')) return `/${path.slice('public/'.length)}`
  if (path.startsWith('/public/')) return path.slice('/public'.length)
  if (path.startsWith('/')) return path
  return `/${path}`
}

function buildAssetLookup(assets: VisualAssetsRequired | undefined) {
  const lookup: Record<string, string> = {}
  if (!assets) return lookup
  for (const category of ASSET_CATEGORIES) {
    for (const asset of assets[category] || []) {
      const filename = normalizeAssetPath(asset.filename)
      if (asset.id && filename) lookup[asset.id] = filename
    }
  }
  return lookup
}

function getAssetPath(item: { assetPath?: string; assetId?: string }, lookup: Record<string, string>) {
  return normalizeAssetPath(item.assetPath || (item.assetId ? lookup[item.assetId] : undefined))
}

function displayAssetPath(path: string | undefined) {
  if (!path) return 'No asset path configured'
  if (path.startsWith('/')) return `public${path}`
  return path
}

function GeneratedAssetImage({
  src,
  label,
  compact = false,
  imageRotate,
  imageFlipY,
  imageOffsetX,
  imageOffsetY,
  hitbox,
}: {
  src: string
  label: string
  compact?: boolean
  imageRotate?: number
  imageFlipY?: boolean
  imageOffsetX?: number
  imageOffsetY?: number
  hitbox?: AssetHitbox
}) {
  const [failed, setFailed] = useState(false)
  const transform = [
    (imageOffsetX || imageOffsetY) ? `translate(${imageOffsetX || 0}%, ${imageOffsetY || 0}%)` : '',
    imageFlipY ? 'scaleY(-1)' : '',
    imageRotate ? `rotate(${imageRotate}deg)` : '',
  ].filter(Boolean).join(' ')
  if (failed) {
    return (
      <div className={`physical-playground-asset-placeholder ${compact ? 'is-compact' : ''}`}>
        <b>Clinical visual unavailable</b>
        <span>{label}</span>
        <code>{displayAssetPath(src)}</code>
      </div>
    )
  }
  return (
    <span className="physical-playground-generated-asset">
      <img
        src={src}
        alt=""
        style={transform ? { transform, transformOrigin: 'center center' } : undefined}
        onError={() => setFailed(true)}
      />
      {hitbox && (
        <span
          className="physical-playground-generated-asset-hitbox"
          draggable
          style={{
            left: `${hitbox.x}%`,
            top: `${hitbox.y}%`,
            width: `${hitbox.w}%`,
            height: `${hitbox.h}%`,
          }}
          aria-hidden="true"
        />
      )}
    </span>
  )
}

function setDragPreviewFromAsset(event: DragEvent<HTMLElement>, objectId: string) {
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', objectId)
  const dragRoot = event.currentTarget.closest('.physical-playground-object') || event.currentTarget
  const asset = dragRoot.querySelector('.physical-playground-generated-asset') as HTMLElement | null
  if (asset) {
    const offsetY = objectId === 'butterfly_draw' ? asset.offsetHeight * 1.05 : asset.offsetHeight / 2
    event.dataTransfer.setDragImage(asset, asset.offsetWidth / 2, offsetY)
  }
}

function ModalMicIcon({ muted }: { muted: boolean }) {
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

function buildPopupVoicePrompt(args: {
  node: VoiceMeetingNode
  npc: { name: string; role: string; persona: string; voice?: string }
  playerName: string
  goalPrompt: string
  meetingContext: string
}) {
  const { node, npc, playerName, goalPrompt, meetingContext } = args
  const initial = (node.initialMessages || [])
    .map((m) => `${m.role === 'user' ? playerName || 'Student' : npc.name}: ${m.content}`)
    .join('\n')

  return `You are ${npc.name}, ${npc.role}, in an in-person bedside conversation with ${playerName || 'the student'}.

PERSONA:
${npc.persona}
${npc.voice ? `\nVOICE: ${npc.voice}` : ''}

CONVERSATION GOAL:
${goalPrompt}

CONVERSATION CONTEXT:
${meetingContext || 'Use the scene context and your persona to make this feel like a realistic workplace conversation.'}

${initial ? `INITIAL CONTEXT MESSAGES:\n${initial}\n` : ''}
RULES:
- Speak naturally, like a real person in this workplace setting.
- Keep each turn under 90 words unless the student asks for detail.
- Ask follow-up questions only when the student's explanation is unclear or incomplete.
- Do not mention being an AI, a model, or a simulator.
- Do not grade the student during the conversation.
- Stay focused on the conversation goal and bedside safety.`
}

function PopupVoiceMeeting({
  nodeId,
  onComplete,
}: {
  nodeId: string
  onComplete: () => void
}) {
  const rawNode = storyline.nodes[nodeId]
  const voiceNode = rawNode?.type === 'voice_meeting' ? rawNode as VoiceMeetingNode : null
  const npc = voiceNode ? npcs[voiceNode.npcId] : null
  const conversationKey = voiceNode && npc ? `voice:${voiceNode.id}:${voiceNode.npcId}` : `voice:${nodeId}`
  const messages = useGameStore((s) => s.npcConversations[conversationKey] || [])
  const appendNpcMessage = useGameStore((s) => s.appendNpcMessage)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)

  const [status, setStatus] = useState<LiveStatus>('idle')
  const [statusDetail, setStatusDetail] = useState('')
  const [muted, setMuted] = useState(false)
  const [meetingEnded, setMeetingEnded] = useState(false)
  const [npcSpeaking, setNpcSpeaking] = useState(false)
  const [liveUser, setLiveUser] = useState('')
  const [liveNpc, setLiveNpc] = useState('')

  const sessionRef = useRef<GeminiLiveSession | null>(null)
  const pendingUserRef = useRef('')
  const pendingNpcRef = useRef('')
  const lastRoleRef = useRef<'user' | 'npc' | null>(null)
  const initializedRef = useRef(false)
  const startAttemptedRef = useRef(false)
  const speechRecognitionRef = useRef<any | null>(null)
  const speechShouldRunRef = useRef(false)
  const localSpeechActiveRef = useRef(false)
  const localFinalTranscriptRef = useRef('')
  const geminiUserTranscriptRef = useRef('')
  const transcriptRef = useRef<HTMLDivElement | null>(null)

  const goalPrompt = voiceNode ? interpolate(voiceNode.goalPrompt, { playerName, branchFlags, mcSelections }) : ''
  const meetingContext = voiceNode ? interpolate(voiceNode.meetingContext || voiceNode.content || '', { playerName, branchFlags, mcSelections }) : ''
  const prepReference = voiceNode?.prepReferenceContent
    ? interpolate(voiceNode.prepReferenceContent, { playerName, branchFlags, mcSelections })
    : ''
  const minTurns = voiceNode?.minTurns ?? 1
  const maxTurns = voiceNode?.maxTurns ?? 3
  const userTurns = messages.filter((m) => m.role === 'user').length
  const inCall = status !== 'idle' && status !== 'closed' && status !== 'error'
  const canComplete = meetingEnded && userTurns >= minTurns
  const canStartTalking = !inCall && !meetingEnded

  const updateUserTranscript = (text: string, source: 'local' | 'gemini') => {
    const trimmed = text.trim()
    if (!trimmed) return
    if (source === 'local') localSpeechActiveRef.current = true
    lastRoleRef.current = 'user'
    if (source === 'local' || !localSpeechActiveRef.current || trimmed.length > pendingUserRef.current.trim().length + 12) {
      pendingUserRef.current = trimmed
      setLiveUser(trimmed)
    }
  }

  const flushPending = (role: 'user' | 'npc') => {
    const pending = role === 'user' ? pendingUserRef.current : pendingNpcRef.current
    const trimmed = pending.trim()
    if (!trimmed) return
    const msg: ChatMessage = { role, content: trimmed, ts: new Date().toISOString() }
    appendNpcMessage(conversationKey, msg)
    if (role === 'user') {
      pendingUserRef.current = ''
      localFinalTranscriptRef.current = ''
      geminiUserTranscriptRef.current = ''
      localSpeechActiveRef.current = false
      setLiveUser('')
    } else {
      pendingNpcRef.current = ''
      setLiveNpc('')
    }
  }

  const startLocalTranscript = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Recognition || speechRecognitionRef.current || meetingEnded) return

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i]?.[0]?.transcript || ''
        if (event.results[i]?.isFinal) finalText += `${transcript} `
        else interimText += transcript
      }
      if (finalText) localFinalTranscriptRef.current += finalText
      const combined = `${localFinalTranscriptRef.current}${interimText}`.trim()
      if (!combined) return
      updateUserTranscript(combined, 'local')
    }

    recognition.onerror = () => {
      speechRecognitionRef.current = null
    }

    recognition.onend = () => {
      speechRecognitionRef.current = null
      if (speechShouldRunRef.current && !npcSpeaking && !meetingEnded) {
        window.setTimeout(() => startLocalTranscript(), 250)
      }
    }

    try {
      speechShouldRunRef.current = true
      speechRecognitionRef.current = recognition
      recognition.start()
    } catch {
      speechRecognitionRef.current = null
    }
  }

  const stopLocalTranscript = () => {
    speechShouldRunRef.current = false
    try { speechRecognitionRef.current?.stop() } catch { /* noop */ }
    speechRecognitionRef.current = null
  }

  const endMeeting = () => {
    stopLocalTranscript()
    flushPending('user')
    flushPending('npc')
    sessionRef.current?.stop()
    sessionRef.current = null
    setMeetingEnded(true)
    setMuted(false)
  }

  const startMeeting = async () => {
    if (!voiceNode || !npc || sessionRef.current || startAttemptedRef.current) return
    startAttemptedRef.current = true
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      setStatus('error')
      setStatusDetail('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env.')
      return
    }

    const session = new GeminiLiveSession({
      onStatus: (s, detail) => {
        setStatus(s)
        if (detail) setStatusDetail(detail)
      },
      onUserTranscript: (text) => {
        if (lastRoleRef.current === 'npc') flushPending('npc')
        geminiUserTranscriptRef.current += text
        updateUserTranscript(geminiUserTranscriptRef.current, 'gemini')
      },
      onNpcTranscript: (text) => {
        stopLocalTranscript()
        if (lastRoleRef.current === 'user') flushPending('user')
        lastRoleRef.current = 'npc'
        pendingNpcRef.current += text
        setLiveNpc(pendingNpcRef.current)
      },
      onNpcSpeakingChange: (speaking) => {
        setNpcSpeaking(speaking)
        if (speaking) stopLocalTranscript()
        if (!speaking) {
          flushPending('npc')
          lastRoleRef.current = null
          if (sessionRef.current && !meetingEnded) {
            speechShouldRunRef.current = true
            startLocalTranscript()
          }
        }
      },
    })

    sessionRef.current = session
    try {
      await session.start({
        apiKey,
        voiceName: voiceNode.voiceName,
        systemPrompt: buildPopupVoicePrompt({ node: voiceNode, npc, playerName, goalPrompt, meetingContext }),
      })
      localFinalTranscriptRef.current = ''
      geminiUserTranscriptRef.current = ''
      localSpeechActiveRef.current = false
      startLocalTranscript()
    } catch (error) {
      session.stop()
      stopLocalTranscript()
      sessionRef.current = null
      startAttemptedRef.current = false
      setStatus('error')
      setStatusDetail(error instanceof Error ? error.message : 'Unable to start the voice conversation.')
    }
  }

  useEffect(() => {
    if (!voiceNode || initializedRef.current) return
    initializedRef.current = true
    if (voiceNode.initialMessages?.length && messages.length === 0) {
      voiceNode.initialMessages.forEach((m) => appendNpcMessage(conversationKey, m))
    }
  }, [appendNpcMessage, conversationKey, messages.length, voiceNode])

  useEffect(() => {
    return () => {
      stopLocalTranscript()
      sessionRef.current?.stop()
      sessionRef.current = null
    }
  }, [])

  useEffect(() => {
    if (userTurns >= maxTurns && status === 'connected' && !meetingEnded) {
      endMeeting()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTurns, maxTurns, status, meetingEnded])

  useEffect(() => {
    if (!transcriptRef.current) return
    transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
  }, [messages.length, liveUser, liveNpc])

  if (!voiceNode || !npc) {
    return <div className="physical-playground-voice-panel is-error">Voice conversation is not configured for this task.</div>
  }

  const statusLabel =
    status === 'connecting' ? 'Connecting...'
    : status === 'connected' ? (muted ? 'Muted' : npcSpeaking ? `${npc.name} is speaking...` : 'Listening...')
    : status === 'closed' ? (userTurns > 0 || meetingEnded ? 'Conversation ended' : 'Start talking')
    : status === 'error' ? (userTurns > 0 ? `Error: ${statusDetail}` : 'Start talking')
    : 'Start talking'
  const showStatusLabel = statusLabel !== 'Start talking'

  const toggleMuted = () => {
    const next = !muted
    setMuted(next)
    sessionRef.current?.setMuted(next)
  }

  return (
    <div className="physical-playground-voice-panel">
      <div className="physical-playground-voice-status">
        <div>
          <b>{npc.name}</b>
          <span>{npc.role}</span>
        </div>
        {showStatusLabel && <span>{statusLabel}</span>}
      </div>
      <div className="physical-playground-voice-main">
        {prepReference && (
          <section className="physical-playground-voice-notes">
            <b>{voiceNode.prepReferenceTitle || 'Conversation Notes'}</b>
            <span>{renderContentWithGlossary(prepReference)}</span>
          </section>
        )}
        <div className="physical-playground-voice-transcript" ref={transcriptRef}>
          {messages.length === 0 && !liveUser && !liveNpc && (
            <span className="is-empty">Speak naturally to {npc.name}. The transcript will appear here.</span>
          )}
          {messages.map((m, i) => (
            <div key={`${m.ts || i}-${i}`} className={m.role === 'user' ? 'is-user' : 'is-npc'}>
              <b>{m.role === 'user' ? 'You' : npc.name}</b>
              <span>{m.content}</span>
            </div>
          ))}
          {liveUser && (
            <div className="is-user is-live">
              <b>You</b>
              <span>{liveUser}</span>
            </div>
          )}
          {liveNpc && (
            <div className="is-npc is-live">
              <b>{npc.name}</b>
              <span>{liveNpc}</span>
            </div>
          )}
        </div>
      </div>
      <div className="physical-playground-voice-controls">
        {canStartTalking && (
          <button type="button" onClick={() => {
            startAttemptedRef.current = false
            setStatus('idle')
            setStatusDetail('')
            void startMeeting()
          }}>
            <ModalMicIcon muted={false} />
            Start talking
          </button>
        )}
        {inCall && (
          <>
            <button type="button" onClick={toggleMuted}>
              <ModalMicIcon muted={muted} />
              {muted ? 'Unmute' : 'Mute'}
            </button>
            <button type="button" onClick={endMeeting}>Finish conversation</button>
          </>
        )}
        {canComplete && (
          <button type="button" className="is-primary" onClick={onComplete}>
            Complete explanation
          </button>
        )}
      </div>
      {!canComplete && (
        <p className="physical-playground-voice-hint">
          Speak at least {minTurns} turn{minTurns === 1 ? '' : 's'}, then finish the conversation to complete this task.
        </p>
      )}
    </div>
  )
}

function fallbackRect(index: number, kind: StageKind) {
  const cols = kind === 'target' ? 2 : 4
  const w = kind === 'target' ? 16 : 13
  const h = kind === 'target' ? 12 : 10
  const xStart = kind === 'target' ? 62 : 6
  const yStart = kind === 'target' ? 68 : 64
  const x = xStart + (index % cols) * (w + 2)
  const y = yStart + Math.floor(index / cols) * (h + 2)
  return { x: Math.min(x, 94 - w), y: Math.min(y, 92 - h), w, h }
}

function rectFor(item: { x?: number; y?: number; w?: number; h?: number }, index: number, kind: StageKind) {
  if (
    typeof item.x === 'number'
    && typeof item.y === 'number'
    && typeof item.w === 'number'
    && typeof item.h === 'number'
  ) {
    return { x: item.x, y: item.y, w: item.w, h: item.h }
  }
  return fallbackRect(index, kind)
}

function stageStyle(item: { x?: number; y?: number; w?: number; h?: number }, index: number, kind: StageKind) {
  const rect = rectFor(item, index, kind)
  return {
    left: `${rect.x}%`,
    top: `${rect.y}%`,
    width: `${rect.w}%`,
    height: `${rect.h}%`,
  }
}

function placedAssetStyle(object: ActionInteractiveObject | undefined, target: ActionDropTarget) {
  if (
    typeof object?.w !== 'number'
    || typeof object.h !== 'number'
    || typeof target.w !== 'number'
    || typeof target.h !== 'number'
  ) return undefined
  const placedW = object.placedW ?? object.w
  const placedH = object.placedH ?? object.h

  return {
    position: 'absolute' as const,
    left: `${50 + (object.placedOffsetX ?? 0)}%`,
    top: `${50 + (object.placedOffsetY ?? 0)}%`,
    width: `${(placedW / target.w) * 100}%`,
    height: `${(placedH / target.h) * 100}%`,
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none' as const,
  }
}

function stageSupplyOverlayStyle(item: StageSupplyOverlay) {
  return {
    left: `${item.x}%`,
    top: `${item.y}%`,
    width: `${item.w}%`,
    height: `${item.h}%`,
    zIndex: item.z ?? 3,
    transform: item.rotate ? `rotate(${item.rotate}deg)` : undefined,
  }
}

function imageHoldTargetStyle(target: ImageHoldTarget) {
  return {
    left: `${target.x}%`,
    top: `${target.y}%`,
    width: `${target.w}%`,
    height: `${target.h}%`,
  }
}

function imageItemStyle(item: SelectableImageItem) {
  if (
    typeof item.x !== 'number'
    || typeof item.y !== 'number'
    || typeof item.w !== 'number'
    || typeof item.h !== 'number'
  ) return undefined

  const w = item.buttonW ?? item.w
  const h = item.buttonH ?? item.h
  return {
    left: `${item.x + (item.w - w) / 2}%`,
    top: `${item.y + (item.h - h) / 2}%`,
    width: `${w}%`,
    height: `${h}%`,
  }
}

function imageItemCheckStyle(item: SelectableImageItem) {
  if (
    typeof item.checkX !== 'number'
    || typeof item.checkY !== 'number'
    || typeof item.checkW !== 'number'
    || typeof item.checkH !== 'number'
  ) return undefined

  return {
    left: `${item.checkX}%`,
    top: `${item.checkY}%`,
    width: `${item.checkW}%`,
    height: `${item.checkH}%`,
  }
}

function isDragObject(object: ActionInteractiveObject) {
  return object.interactionRole === 'draggable' || (object.primitives || []).some((p) => DRAG_PRIMITIVES.has(p))
}

function needsHold(primitives: string[] | undefined, stepPrimitive?: string) {
  return [...(primitives || []), stepPrimitive || ''].some((p) => HOLD_PRIMITIVES.has(p))
}

function actionHint(args: { role?: string; primitives?: string[]; draggable?: boolean }) {
  if (args.draggable) return 'Drag'
  if (args.role === 'readable') return 'Inspect'
  if (needsHold(args.primitives)) return 'Press and hold'
  if (args.role === 'control') return 'Adjust'
  if (args.primitives?.includes('select_from_image')) return 'Select'
  return 'Press'
}

function shouldShowStageAsset(nodeId: string, id: string) {
  if (nodeId !== 'scene2_assessment') return true
  return id === 'place_call_light'
}

function stepPrimitive(step: ActionSimulationStep) {
  return step.digitalPrimitive || (step as any).primitive || ''
}

function legacyToPlayground(node: PlaygroundNode) {
  const anyNode = node as any
  const actionItems = (anyNode.actionGroups || []).flatMap((group: any) => group.items || [])
  const supplies = anyNode.supplies || []
  const useLegacyObjects = !(node.interactiveObjects || []).length
  const useLegacySteps = !(node.steps || []).length
  const legacyObjects: ActionInteractiveObject[] = actionItems.map((item: any) => ({
    id: item.id,
    label: item.objectLabel || item.label,
    detail: item.detail || item.finding,
    readableText: item.readableText || item.finding,
    assetPath: item.assetPath,
    interactionRole: item.interaction === 'drag_to_target' ? 'draggable' : (item.interaction === 'slider' ? 'control' : (item.readableText ? 'readable' : 'clickable')),
    primitives: [item.primitive].filter(Boolean),
    required: (anyNode.requiredActionIds || []).includes(item.id) || item.required,
  }))
  const supplyObjects: ActionInteractiveObject[] = supplies.map((supply: any) => ({
    id: supply.id,
    label: supply.label,
    detail: supply.detail,
    assetPath: supply.assetPath,
    interactionRole: 'draggable',
    primitives: ['drag_object_to_target'],
    required: (anyNode.requiredSupplyIds || []).includes(supply.id),
  }))
  const legacySteps: ActionSimulationStep[] = (anyNode.steps || []).map((step: any) => ({
    id: step.id,
    label: step.label,
    instruction: step.instruction || step.detail || step.finding || step.label,
    digitalPrimitive: step.digitalPrimitive || step.primitive || 'single_click_target',
    objectIds: step.objectIds || step.requiresSupplies || step.requiresActions,
    requiresSteps: step.requiresSteps,
    requiresObjects: step.requiresObjects || [...(step.requiresSupplies || []), ...(step.requiresActions || [])],
    successFeedback: step.successFeedback || step.finding,
    failureHint: step.failureHint,
    x: step.x,
    y: step.y,
    w: step.w,
    h: step.h,
  }))
  return {
    objects: useLegacyObjects ? [...legacyObjects, ...supplyObjects] : (node.interactiveObjects || []),
    targets: node.dropTargets || [],
    readables: node.readableSurfaces || [],
    controls: node.controls || [],
    steps: useLegacySteps ? legacySteps : (node.steps || []),
    requiredObjects: node.requiredObjectIds?.length
      ? node.requiredObjectIds
      : unique([...(anyNode.requiredSupplyIds || []), ...(anyNode.requiredActionIds || [])]),
  }
}

export default function PhysicalPlaygroundScene({
  node,
  embedded = false,
  embeddedCompleteLabel = 'Complete task',
  onEmbeddedComplete,
}: {
  node: PlaygroundNode
  embedded?: boolean
  embeddedCompleteLabel?: string
  onEmbeddedComplete?: () => void
}) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const navigateTo = useGameStore((s) => s.navigateTo)
  const visitedNodes = useGameStore((s) => s.visitedNodes)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const state = useMemo(() => parseState(responses[node.id]), [responses, node.id])
  const context = { playerName, branchFlags, mcSelections }
  const lookup = useMemo(() => buildAssetLookup(node.visualAssetsRequired), [node.visualAssetsRequired])
  const derived = useMemo(() => legacyToPlayground(node), [node])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalContent | null>(null)
  const [modalObservation, setModalObservation] = useState('')
  const [modalSelections, setModalSelections] = useState<string[]>([])
  const [modalImageFailed, setModalImageFailed] = useState(false)
  const [modalHoldComplete, setModalHoldComplete] = useState(false)
  const [modalHoldActive, setModalHoldActive] = useState(false)
  const [modalHoldMessage, setModalHoldMessage] = useState('')
  const [referenceModal, setReferenceModal] = useState<ModalReferenceCard | null>(null)
  const holdTimer = useRef<number | null>(null)
  const modalHoldTimer = useRef<number | null>(null)

  const save = (next: PlaygroundState) => {
    setFreeTextResponse(node.id, JSON.stringify({
      sceneType: node.type,
      simulatedAction: node.simulatedAction,
      learningGoal: node.learningGoal,
      digitalPrimitives: node.digitalPrimitives,
      selectedObjects: next.selectedObjects,
      placements: next.placements,
      completedSteps: next.completedSteps,
      inspectedSurfaces: next.inspectedSurfaces,
      completedControls: next.completedControls,
      controlValues: next.controlValues,
      observations: next.observations,
      actionLog: next.actionLog,
      warnings: next.warnings,
    }, null, 2))
  }

  const resetPlayground = () => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current)
      holdTimer.current = null
    }
    if (modalHoldTimer.current) {
      window.clearTimeout(modalHoldTimer.current)
      modalHoldTimer.current = null
    }
    setDraggingId(null)
    setModal(null)
    setModalObservation('')
    setModalSelections([])
    setModalImageFailed(false)
    setModalHoldComplete(false)
    setModalHoldActive(false)
    setModalHoldMessage('')
    setReferenceModal(null)
    save(initialState)
  }

  const record = (
    current: PlaygroundState,
    action: string,
    label: string,
    extra: Omit<ActionLogEntry, 'at' | 'action' | 'label'> = {},
  ) => ({
    ...current,
    actionLog: [
      ...current.actionLog,
      { at: new Date().toISOString(), action, label, ...extra },
    ],
  })

  const addWarning = (current: PlaygroundState, message: string): PlaygroundState => ({
    ...current,
    warnings: [...current.warnings.filter((warning) => warning !== message), message],
  })

  const warn = (message: string) => {
    save(addWarning(state, message))
  }

  const hasStartedBedsideWork = (current: PlaygroundState) => (
    current.selectedObjects.length > 0
    || Object.keys(current.placements).length > 0
    || current.completedSteps.length > 0
    || current.inspectedSurfaces.length > 0
    || current.completedControls.length > 0
  )

  const requiresHandHygieneFirst = node.id === HAND_HYGIENE_FIRST_SCENE_ID || derived.requiredObjects.includes(HAND_HYGIENE_OBJECT_ID)
  const handHygieneDone = (current: PlaygroundState) => (
    current.selectedObjects.includes(HAND_HYGIENE_OBJECT_ID) || Boolean(current.placements[HAND_HYGIENE_OBJECT_ID])
  )
  const isHandHygieneReferenceExempt = (attemptedId: string | undefined) => (
    node.id !== HAND_HYGIENE_FIRST_SCENE_ID && HAND_HYGIENE_REFERENCE_EXEMPT_IDS.has(attemptedId || '')
  )
  const shouldBlockForHandHygiene = (current: PlaygroundState, attemptedId: string | undefined) => (
    requiresHandHygieneFirst
      && attemptedId !== HAND_HYGIENE_OBJECT_ID
      && !isHandHygieneReferenceExempt(attemptedId)
      && !handHygieneDone(current)
  )
  const blockForHandHygiene = (
    current: PlaygroundState,
    attemptedId: string | undefined,
    attemptedLabel: string,
    primitive?: string,
  ) => {
    if (!shouldBlockForHandHygiene(current, attemptedId)) return false
    save(record(
      addWarning(current, HAND_HYGIENE_FIRST_WARNING),
      'safety_warning',
      `Started ${attemptedLabel} before hand hygiene`,
      { objectId: attemptedId, primitive },
    ))
    return true
  }
  const sequencedAvailabilityFor = (current: PlaygroundState, taskId: string | undefined) => getSequencedTaskAvailability({
    sceneId: node.id,
    taskId,
    completedTaskIds: completedTaskIdsForState(current),
  })
  const sequenceWarningFor = (requiredId: string | undefined, attemptedLabel: string) => {
    const requiredLabel = taskLabelFor(requiredId)
    return `${SEQUENCED_TASK_WARNING_PREFIX}${requiredLabel} before starting ${attemptedLabel}.`
  }
  const blockForSequencedTask = (
    current: PlaygroundState,
    attemptedId: string | undefined,
    attemptedLabel: string,
    primitive?: string,
  ) => {
    const availability = sequencedAvailabilityFor(current, attemptedId)
    if (availability.state !== 'locked') return false
    const warning = node.id === ROOM_512_ASSESSMENT_SCENE_ID && availability.lockedBy === ROOM_512_WRISTBAND_TASK_ID
      ? WRISTBAND_SECOND_WARNING
      : sequenceWarningFor(availability.lockedBy, attemptedLabel)
    save(record(
      addWarning(current, warning),
      'safety_warning',
      `Started ${attemptedLabel} before ${availability.lockedBy || 'the current sequence step'}`,
      { objectId: attemptedId, primitive },
    ))
    return true
  }
  const blockForTaskSequence = (
    current: PlaygroundState,
    attemptedId: string | undefined,
    attemptedLabel: string,
    primitive?: string,
  ) => (
    blockForHandHygiene(current, attemptedId, attemptedLabel, primitive)
    || blockForSequencedTask(current, attemptedId, attemptedLabel, primitive)
  )

  const withHandHygieneFirstWarning = (
    current: PlaygroundState,
    attemptedId: string | undefined,
    attemptedLabel: string,
    primitive?: string,
  ): PlaygroundState => {
    if (!requiresHandHygieneFirst) return current
    if (attemptedId === HAND_HYGIENE_OBJECT_ID) return current
    if (isHandHygieneReferenceExempt(attemptedId)) return current
    if (handHygieneDone(current)) return current
    if (hasStartedBedsideWork(current) || current.warnings.includes(HAND_HYGIENE_FIRST_WARNING)) return current

    return record(
      addWarning(current, HAND_HYGIENE_FIRST_WARNING),
      'safety_warning',
      `Started ${attemptedLabel} before hand hygiene`,
      { objectId: attemptedId, primitive },
    )
  }

  const requirementsMet = (step: ActionSimulationStep, nextState: PlaygroundState) => {
    const requiredSteps = step.requiresSteps || []
    const requiredObjects = [
      ...(step.requiresObjects || []),
      ...((step as any).requiresSupplies || []),
      ...((step as any).requiresActions || []),
    ]
    const requiredControls = (step as any).requiresControls || []
    const missingSteps = requiredSteps.filter((id) => !nextState.completedSteps.includes(id))
    const missingObjects = requiredObjects.filter((id) => !nextState.selectedObjects.includes(id) && !nextState.placements[id])
    const missingControls = requiredControls.filter((id: string) => !nextState.completedControls.includes(id))
    return {
      ok: missingSteps.length === 0 && missingObjects.length === 0 && missingControls.length === 0,
      missingSteps,
      missingObjects,
      missingControls,
    }
  }

  const objectRequirementsMet = (object: ActionInteractiveObject, nextState: PlaygroundState) => {
    const requiredSteps = (object as any).requiresSteps || []
    const requiredObjects = (object as any).requiresObjects || []
    const requiredControls = (object as any).requiresControls || []
    const missingSteps = requiredSteps.filter((id: string) => !nextState.completedSteps.includes(id))
    const missingObjects = requiredObjects.filter((id: string) => !nextState.selectedObjects.includes(id) && !nextState.placements[id])
    const missingControls = requiredControls.filter((id: string) => !nextState.completedControls.includes(id))
    return {
      ok: missingSteps.length === 0 && missingObjects.length === 0 && missingControls.length === 0,
      missingSteps,
      missingObjects,
      missingControls,
    }
  }

  const controlRequirementsMet = (control: PlaygroundControl, nextState: PlaygroundState) => {
    const requiredSteps = control.requiresSteps || []
    const requiredObjects = control.requiresObjects || []
    const missingSteps = requiredSteps.filter((id) => !nextState.completedSteps.includes(id))
    const missingObjects = requiredObjects.filter((id) => !nextState.selectedObjects.includes(id) && !nextState.placements[id])
    return {
      ok: missingSteps.length === 0 && missingObjects.length === 0,
      missingSteps,
      missingObjects,
    }
  }

  const autoCompleteSteps = (
    nextState: PlaygroundState,
    objectId: string | undefined,
    targetId: string | undefined,
    primitive: string | undefined,
  ) => {
    let updated = nextState
    for (const step of derived.steps) {
      if (updated.completedSteps.includes(step.id)) continue
      const matchesObject = !step.objectIds?.length || (objectId && step.objectIds.includes(objectId))
      const matchesTarget = !step.targetId || step.targetId === targetId
      const matchesPrimitive = !primitive || !stepPrimitive(step) || stepPrimitive(step) === primitive
      if (!matchesObject || !matchesTarget || !matchesPrimitive) continue
      const req = requirementsMet(step, updated)
      if (!req.ok) continue
      updated = record(
        { ...updated, completedSteps: [...updated.completedSteps, step.id] },
        'complete_step',
        step.label,
        { objectId, targetId, primitive: stepPrimitive(step) },
      )
    }
    return updated
  }

  const completeObject = (object: ActionInteractiveObject, action: string) => {
    const primitive = object.primitives?.[0]
    if (blockForTaskSequence(state, object.id, object.label, primitive)) return
    if ((object as any).correct === false) {
      warn((object as any).incorrectFeedback || `${object.label} does not belong in this task.`)
      return
    }
    if (node.id === 'scene2_reassessment_reminder' && primitive === 'select_from_image' && state.selectedObjects.includes(object.id)) {
      const next = record(
        { ...state, selectedObjects: state.selectedObjects.filter((id) => id !== object.id) },
        'unselect_reassessment_check',
        object.label,
        { objectId: object.id, primitive },
      )
      save(next)
      return
    }
    const baseState = withHandHygieneFirstWarning(state, object.id, object.label, primitive)
    let next = record(
      { ...baseState, selectedObjects: unique([...baseState.selectedObjects, object.id]) },
      action,
      object.label,
      { objectId: object.id, primitive },
    )
    next = autoCompleteSteps(next, object.id, undefined, primitive)
    save(next)
  }

  const inspect = (subject: {
    id: string
    label: string
    readableText?: string
    detail?: string
    assetPath?: string
    assetId?: string
    modalAssetId?: string
    primitives?: string[]
    matchSurfaces?: { label: string; value: string }[]
    matchQuestion?: string
    correctMatch?: boolean
    choiceQuestion?: string
    choiceOptions?: ModalChoiceOption[]
    playerInstruction?: string
    observationPrompt?: string
    observationPlaceholder?: string
    requiresObservationText?: boolean
    expectedObservation?: string
    narrationText?: string
    npcName?: string
    npcLine?: string
    visibleFindings?: string[]
    imageHoldTarget?: ImageHoldTarget
    selectableItems?: SelectableImageItem[]
    selectableAutoComplete?: boolean
    selectableSubmitLabel?: string
    selectableMissingFeedback?: string
    selectableWrongFeedback?: string
    modalCompleteLabel?: string
    modalReference?: ModalReferenceCard
  }, kind: 'object' | 'surface') => {
    if (blockForTaskSequence(state, subject.id, subject.label, subject.primitives?.[0])) return
    const modalAsset = subject.modalAssetId ? normalizeAssetPath(lookup[subject.modalAssetId] || subject.modalAssetId) : undefined
    const image = modalAsset || getAssetPath(subject, lookup)
    const body = subject.playerInstruction || subject.readableText || subject.detail || 'Inspect the visible details, then record what you observed.'
    const next = withHandHygieneFirstWarning(state, subject.id, subject.label, subject.primitives?.[0])
    if (next !== state) save(next)
    const safetyWarning = next !== state ? HAND_HYGIENE_FIRST_WARNING : undefined
    setModalObservation(state.observations[subject.id] || '')
    setModalSelections([])
    setModalImageFailed(false)
    setModalHoldComplete(false)
    setModalHoldActive(false)
    setModalHoldMessage('')
    setModal({
      title: subject.label,
      body,
      image,
      subjectId: subject.id,
      kind,
      primitive: subject.primitives?.[0],
      matchSurfaces: subject.matchSurfaces,
      matchQuestion: subject.matchQuestion,
      correctMatch: subject.correctMatch,
      choiceQuestion: subject.choiceQuestion,
      choiceOptions: subject.choiceOptions,
      observationPrompt: subject.observationPrompt,
      observationPlaceholder: subject.observationPlaceholder,
      requiresObservationText: subject.requiresObservationText,
      expectedObservation: subject.expectedObservation,
      narrationText: subject.narrationText,
      npcName: subject.npcName,
      npcLine: subject.npcLine,
      visibleFindings: subject.visibleFindings,
      imageHoldTarget: subject.imageHoldTarget,
      selectableItems: subject.selectableItems,
      selectableAutoComplete: subject.selectableAutoComplete,
      selectableSubmitLabel: subject.selectableSubmitLabel,
      selectableMissingFeedback: subject.selectableMissingFeedback,
      selectableWrongFeedback: subject.selectableWrongFeedback,
      completeLabel: subject.modalCompleteLabel,
      modalReference: subject.modalReference,
      safetyWarning,
    })
  }

  const inspectSceneLink = (link: SceneLink) => {
    const modalAsset = link.modalAssetId ? normalizeAssetPath(lookup[link.modalAssetId] || link.modalAssetId) : undefined
    const image = modalAsset || normalizeAssetPath(link.modalAssetPath)
    const primitive = link.primitive || 'inspect_image'
    setModalObservation(state.observations[link.modalObjectId || link.id] || '')
    setModalSelections([])
    setModalImageFailed(false)
    setModalHoldComplete(false)
    setModalHoldActive(false)
    setModalHoldMessage('')
    setModal({
      title: link.label,
      body: link.modalBody || 'Inspect the visible details, then record what you completed.',
      image,
      subjectId: link.modalObjectId || link.id,
      kind: 'object',
      primitive,
      completeLabel: link.modalCompleteLabel,
      voiceNodeId: link.modalVoiceNodeId,
      voiceStarted: Boolean(link.modalVoiceNodeId),
      embeddedSceneNodeId: link.modalSceneNodeId,
      choiceQuestion: link.choiceQuestion,
      choiceOptions: link.choiceOptions,
      observationPrompt: link.observationPrompt,
      observationPlaceholder: link.observationPlaceholder,
      requiresObservationText: link.requiresObservationText,
      expectedObservation: link.expectedObservation,
      narrationText: link.narrationText,
      npcName: link.npcName,
      npcLine: link.npcLine,
      visibleFindings: link.visibleFindings,
      imageHoldTarget: link.imageHoldTarget,
    })
  }

  const completeSelectableInspection = (current: ModalContent, selectedIds: string[]) => {
    const selectableItems = current.selectableItems || []
    if (!selectableItems.length) return
    const correctItems = selectableItems.filter((item) => item.correct === true)
    const correctIds = correctItems.map((item) => item.id)
    const wrongItems = selectableItems.filter((item) => selectedIds.includes(item.id) && item.correct !== true)
    const missingItems = correctItems.filter((item) => !selectedIds.includes(item.id))
    if (wrongItems.length || missingItems.length) {
      const message = wrongItems.length
        ? current.selectableWrongFeedback || `Only collect supplies needed for this med pass. Leave ${wrongItems.map((item) => item.label).join(', ')} in the drawer.`
        : current.selectableMissingFeedback || `Select the ordered med-pass supplies before recording: ${missingItems.map((item) => item.label).join(', ')}.`
      let next = withHandHygieneFirstWarning(state, current.subjectId, current.title, current.primitive)
      next = addWarning(next, message)
      save(next)
      setModal((openModal) => openModal ? { ...openModal, safetyWarning: message } : openModal)
      return
    }

    let next = withHandHygieneFirstWarning(state, current.subjectId, current.title, current.primitive)
    next = {
      ...next,
      selectedObjects: unique([...next.selectedObjects, current.subjectId, ...correctIds]),
    }
    next = record(
      next,
      'select_image_items',
      current.title,
      {
        objectId: current.subjectId,
        primitive: current.primitive,
        observation: `Selected: ${correctItems.map((item) => item.label).join(', ')}`,
      },
    )
    next = autoCompleteSteps(next, current.subjectId, undefined, current.primitive)
    save(next)
    setModal(null)
    setModalObservation('')
    setModalSelections([])
    setModalHoldComplete(false)
    setModalHoldActive(false)
    setModalHoldMessage('')
  }

  const toggleModalSelection = (itemId: string) => {
    const nextSelections = modalSelections.includes(itemId)
      ? modalSelections.filter((id) => id !== itemId)
      : [...modalSelections, itemId]
    setModalSelections(nextSelections)
    if (modal?.selectableAutoComplete) completeSelectableInspection(modal, nextSelections)
  }

  const completeInspection = (current: ModalContent, answer?: boolean, choiceId?: string) => {
    if (current.imageHoldTarget && !modalHoldComplete) {
      let next = withHandHygieneFirstWarning(state, current.subjectId, current.title, current.primitive)
      next = addWarning(next, current.imageHoldTarget.instruction || 'Press and hold the marked point in the image before recording the observation.')
      save(next)
      setModalHoldMessage('Press and hold the popup button first.')
      return
    }

    if (current.matchSurfaces?.length) {
      const expected = current.correctMatch ?? true
      if (answer !== expected) {
        let next = withHandHygieneFirstWarning(state, current.subjectId, current.title, current.primitive)
        next = addWarning(
          next,
          expected
            ? 'Compare the visible identifiers again. The name and DOB need to match before you proceed.'
            : 'Compare the visible identifiers again. This is not a safe match.',
        )
        save(next)
        return
      }
    }

    if (current.choiceOptions?.length) {
      const selectedChoice = current.choiceOptions.find((choice) => choice.id === choiceId)
      if (!selectedChoice) return

      if (selectedChoice.correct !== true) {
        const message = selectedChoice.feedback || 'Review the visible information again before proceeding.'
        let next = withHandHygieneFirstWarning(state, current.subjectId, current.title, current.primitive)
        next = addWarning(next, message)
        save(next)
        setModal((openModal) => openModal ? { ...openModal, safetyWarning: message } : openModal)
        return
      }

      let next: PlaygroundState = withHandHygieneFirstWarning(state, current.subjectId, current.title, current.primitive)
      if (current.kind === 'surface') {
        next = {
          ...next,
          inspectedSurfaces: unique([...next.inspectedSurfaces, current.subjectId]),
        }
      } else {
        next = {
          ...next,
          selectedObjects: unique([...next.selectedObjects, current.subjectId]),
        }
      }
      next = record(
        next,
        'answer_choice',
        current.title,
        { objectId: current.subjectId, primitive: current.primitive, observation: `Selected: ${selectedChoice.label}` },
      )
      next = autoCompleteSteps(next, current.subjectId, undefined, current.primitive)
      save(next)
      setModal(null)
      setModalObservation('')
      setModalSelections([])
      setModalHoldComplete(false)
      setModalHoldActive(false)
      setModalHoldMessage('')
      return
    }

    if (current.selectableItems?.length) {
      completeSelectableInspection(current, modalSelections)
      return
    }

    const observation = modalObservation.trim()
    if (current.requiresObservationText && !observation) {
      let next = withHandHygieneFirstWarning(state, current.subjectId, current.title, current.primitive)
      next = addWarning(next, 'Write the observation you would record before submitting it.')
      save(next)
      return
    }

    let next: PlaygroundState = withHandHygieneFirstWarning(state, current.subjectId, current.title, current.primitive)
    if (current.kind === 'surface') {
      next = {
        ...next,
        inspectedSurfaces: unique([...next.inspectedSurfaces, current.subjectId]),
      }
    } else {
      next = {
        ...next,
        selectedObjects: unique([...next.selectedObjects, current.subjectId]),
      }
    }
    if (observation) {
      next = {
        ...next,
        observations: { ...next.observations, [current.subjectId]: observation },
      }
    }
    next = record(
      next,
      current.kind === 'surface' ? 'inspect_surface' : 'inspect_object',
      current.title,
      { objectId: current.subjectId, primitive: current.primitive, observation: observation || undefined },
    )
    next = autoCompleteSteps(next, current.subjectId, undefined, current.primitive)
    save(next)
    setModal(null)
    setModalObservation('')
    setModalSelections([])
    setModalHoldComplete(false)
    setModalHoldActive(false)
    setModalHoldMessage('')
  }

  const placeObject = (objectId: string, target: ActionDropTarget) => {
    if (blockForTaskSequence(state, objectId, derived.objects.find((o) => o.id === objectId)?.label || objectId)) {
      setDraggingId(null)
      return
    }
    const targetAllowsObject = !target.accepts?.length || target.accepts.includes(objectId)
    if (!targetAllowsObject) {
      warn(`${derived.objects.find((o) => o.id === objectId)?.label || objectId} does not belong on ${target.label}.`)
      return
    }
    const object = derived.objects.find((o) => o.id === objectId)
    if (object) {
      const req = objectRequirementsMet(object, state)
      if (!req.ok) {
        warn(`Finish the needed prior move first: ${[...req.missingSteps, ...req.missingObjects, ...req.missingControls].join(', ')}.`)
        return
      }
    }
    const primitive = object?.primitives?.find((p) => DRAG_PRIMITIVES.has(p)) || 'drag_object_to_target'
    const baseState = withHandHygieneFirstWarning(state, objectId, object?.label || objectId, primitive)
    const shouldConsume = Boolean((object as any)?.consumeOnPlace)
    let next = record(
      {
        ...baseState,
        selectedObjects: unique([...baseState.selectedObjects, objectId]),
        placements: shouldConsume
          ? Object.fromEntries(Object.entries(baseState.placements).filter(([id]) => id !== objectId))
          : { ...baseState.placements, [objectId]: target.id },
      },
      'place_object',
      `${object?.label || objectId} -> ${target.label}`,
      { objectId, targetId: target.id, primitive },
    )
    next = autoCompleteSteps(next, objectId, target.id, primitive)
    save(next)
  }

  const completeStageStep = (step: ActionSimulationStep) => {
    if (blockForTaskSequence(state, step.id, step.label, stepPrimitive(step))) return
    const req = requirementsMet(step, state)
    if (!req.ok) {
      warn(step.failureHint || `Finish the needed prior move first: ${[...req.missingSteps, ...req.missingObjects, ...req.missingControls].join(', ')}.`)
      return
    }
    const baseState = withHandHygieneFirstWarning(state, step.id, step.label, stepPrimitive(step))
    save(record(
      { ...baseState, completedSteps: unique([...baseState.completedSteps, step.id]) },
      'complete_stage_step',
      step.label,
      { primitive: stepPrimitive(step) },
    ))
  }

  const changeControl = (control: PlaygroundControl, value: number) => {
    if (blockForTaskSequence(state, control.id, control.label, control.digitalPrimitive || control.primitive)) return
    const req = controlRequirementsMet(control, state)
    if (!req.ok) {
      warn(`Finish the needed prior move first: ${[...req.missingSteps, ...req.missingObjects].join(', ')}.`)
      return
    }
    const min = control.successMin ?? control.requiredValue
    const max = control.successMax ?? control.requiredValue
    const hasTargetRange = typeof min === 'number' || typeof max === 'number'
    const complete = hasTargetRange
      ? (typeof min !== 'number' || value >= min) && (typeof max !== 'number' || value <= max)
      : true
    const primitive = control.digitalPrimitive || control.primitive || 'set_numeric_value'
    const baseState = withHandHygieneFirstWarning(state, control.id, control.label, primitive)
    let next = record(
      {
        ...baseState,
        controlValues: { ...baseState.controlValues, [control.id]: value },
        completedControls: complete
          ? unique([...baseState.completedControls, control.id])
          : baseState.completedControls.filter((id) => id !== control.id),
      },
      'adjust_control',
      control.label,
      { objectId: control.id, value, primitive },
    )
    next = autoCompleteSteps(next, control.id, undefined, primitive)
    save(next)
  }

  const beginHold = (done: () => void) => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null
      done()
    }, 650)
  }

  const cancelHold = () => {
    if (!holdTimer.current) return
    window.clearTimeout(holdTimer.current)
    holdTimer.current = null
    warn('Hold a little longer to complete that step.')
  }

  const beginModalHold = () => {
    if (!modal?.imageHoldTarget || modalHoldComplete) return
    if (modalHoldTimer.current) window.clearTimeout(modalHoldTimer.current)
    setModalHoldActive(true)
    setModalHoldMessage('Keep holding until it completes.')
    modalHoldTimer.current = window.setTimeout(() => {
      modalHoldTimer.current = null
      setModalHoldActive(false)
      setModalHoldComplete(true)
      setModalHoldMessage(modal.imageHoldTarget?.completionText || 'Action completed.')
    }, 750)
  }

  const cancelModalHold = () => {
    if (!modalHoldTimer.current) return
    window.clearTimeout(modalHoldTimer.current)
    modalHoldTimer.current = null
    setModalHoldActive(false)
    if (!modalHoldComplete) setModalHoldMessage('Hold a little longer to complete that action.')
  }

  const closeModal = () => {
    cancelModalHold()
    setModal(null)
    setReferenceModal(null)
    setModalSelections([])
    setModalHoldComplete(false)
    setModalHoldActive(false)
    setModalHoldMessage('')
  }

  const controlMeetsTarget = (controlId: string) => {
    const control = derived.controls.find((item) => item.id === controlId)
    if (!control) return state.completedControls.includes(controlId)
    const value = state.controlValues[control.id] ?? control.initialValue ?? control.min ?? 0
    const min = control.successMin ?? control.requiredValue
    const max = control.successMax ?? control.requiredValue
    const hasTargetRange = typeof min === 'number' || typeof max === 'number'
    if (!hasTargetRange) return state.completedControls.includes(controlId)
    return (typeof min !== 'number' || value >= min) && (typeof max !== 'number' || value <= max)
  }

  const activeStateBackground = (node.stateBackgrounds || []).find((variant) => (
    (variant.whenControl && controlMeetsTarget(variant.whenControl))
    || (variant.whenObject && (state.selectedObjects.includes(variant.whenObject) || Boolean(state.placements[variant.whenObject])))
    || (variant.whenStep && state.completedSteps.includes(variant.whenStep))
  ))
  const background = normalizeAssetPath(activeStateBackground?.filename || node.background?.filename) || node.illustration || `/scenes/${node.id}.png`
  const requiredObjects = derived.requiredObjects.length
    ? derived.requiredObjects
    : derived.objects.filter((o) => o.required).map((o) => o.id)
  const requiredSteps = node.requiredStepIds || derived.steps.map((s) => s.id)
  const requiredReadables = node.requiredReadableSurfaceIds || derived.readables.filter((s) => s.required).map((s) => s.id)
  const requiredControls = node.requiredControlIds || derived.controls.filter((c) => c.required).map((c) => c.id)
  const impliedCompletedStepIds = (() => {
    const done = new Set(state.completedSteps)
    let changed = true
    while (changed) {
      changed = false
      for (const step of derived.steps) {
        if (done.has(step.id)) continue
        const objectIds = step.objectIds || []
        const placedOnTarget = objectIds.length > 0 && (!step.targetId || objectIds.every((id) => state.placements[id] === step.targetId))
        const requiredObjectsDone = (step.requiresObjects || []).every((id) => state.selectedObjects.includes(id) || Boolean(state.placements[id]))
        const requiredStepsDone = (step.requiresSteps || []).every((id) => done.has(id))
        if (placedOnTarget && requiredObjectsDone && requiredStepsDone) {
          done.add(step.id)
          changed = true
        }
      }
    }
    return done
  })()
  const objectsDone = requiredObjects.every((id) => {
    const object = derived.objects.find((candidate) => candidate.id === id)
    const hasDropTarget = derived.targets.some((target) => !target.accepts?.length || target.accepts.includes(id))
    if ((object as any)?.consumeOnPlace) return state.selectedObjects.includes(id) || Boolean(state.placements[id])
    if (object && isDragObject(object) && hasDropTarget) return Boolean(state.placements[id])
    return state.selectedObjects.includes(id) || Boolean(state.placements[id])
  })
  const stepsDone = requiredSteps.every((id) => impliedCompletedStepIds.has(id))
  const readablesDone = requiredReadables.every((id) => state.inspectedSurfaces.includes(id))
  const controlsDone = requiredControls.every((id) => state.completedControls.includes(id))
  const canSubmit = objectsDone && stepsDone && readablesDone && controlsDone
  const activeStepCount = state.completedSteps.length + state.selectedObjects.length + Object.keys(state.placements).length + state.inspectedSurfaces.length + state.completedControls.length
  const referenceModalAsset = referenceModal ? getAssetPath(referenceModal, lookup) : undefined
  const postStageHint = (node as any).postStageHint as string | undefined
  const [postStageHintLead, postStageHintBody] = postStageHint ? postStageHint.split(/\n\n(.+)/s) : []
  const inlineReassessmentOptions = node.id === 'scene2_reassessment_reminder'
    ? derived.objects.filter((object) => object.primitives?.includes('select_from_image'))
    : []
  const selectedInlineReassessmentOptions = state.selectedObjects
    .map((id) => inlineReassessmentOptions.find((object) => object.id === id))
    .filter((object): object is ActionInteractiveObject => Boolean(object && (object as any).correct !== false))
  const sceneLinks = (((node as any).sceneLinks || []) as SceneLink[])
  const visibleSceneLinks = embedded ? [] : sceneLinks
  const defaultSceneLinkWarning = 'Finish the earlier medication-pass work before starting this step.'
  const sceneLinkWarningMessages = sceneLinks.map((link) => link.lockedText || defaultSceneLinkWarning)
  const clearSceneLinkWarnings = (current: PlaygroundState): PlaygroundState => ({
    ...current,
    warnings: current.warnings.filter((warning) => !sceneLinkWarningMessages.includes(warning)),
  })
  const warnSceneLink = (link: SceneLink) => {
    save(addWarning(clearSceneLinkWarnings(state), link.lockedText || defaultSceneLinkWarning))
  }
  function taskLabelFor(taskId: string | undefined) {
    if (!taskId) return 'the highlighted safety check'
    const object = derived.objects.find((candidate) => candidate.id === taskId)
    if (object) return object.label
    const readable = derived.readables.find((candidate) => candidate.id === taskId)
    if (readable) return readable.label
    const control = derived.controls.find((candidate) => candidate.id === taskId)
    if (control) return control.label
    const step = derived.steps.find((candidate) => candidate.id === taskId)
    if (step) return step.label
    const link = sceneLinks.find((candidate) => candidate.id === taskId || candidate.modalObjectId === taskId)
    if (link) return link.label
    return taskId.replace(/_/g, ' ')
  }

  const hasObjectOrPlacement = (id: string) => state.selectedObjects.includes(id) || Boolean(state.placements[id])
  const requirementIdDone = (id: string) => (
    hasObjectOrPlacement(id)
    || impliedCompletedStepIds.has(id)
    || state.inspectedSurfaces.includes(id)
    || state.completedControls.includes(id)
    || visitedNodes.includes(id)
  )
  const sceneLinkReady = (link: SceneLink) => (
    (link.requiresObjects || []).every((id) => hasObjectOrPlacement(id))
    && (link.requiresSteps || []).every((id) => impliedCompletedStepIds.has(id))
    && (link.requiresReadables || []).every((id) => state.inspectedSurfaces.includes(id))
    && (link.requiresControls || []).every((id) => state.completedControls.includes(id))
    && (link.requiresNodes || []).every((id) => visitedNodes.includes(id))
  )
  const subjectDone = (id: string) => (
    hasObjectOrPlacement(id)
    || state.inspectedSurfaces.includes(id)
    || impliedCompletedStepIds.has(id)
    || state.completedControls.includes(id)
  )
  const sequencedTaskWarningResolved = (warning: string) => {
    if (!warning.startsWith(SEQUENCED_TASK_WARNING_PREFIX)) return false
    const taskIds = unique([
      ...derived.objects.map((object) => object.id),
      ...derived.readables.map((surface) => surface.id),
      ...derived.controls.map((control) => control.id),
      ...derived.steps.map((step) => step.id),
      ...sceneLinks.flatMap((link) => [link.id, link.modalObjectId].filter((id): id is string => Boolean(id))),
    ])
    return taskIds.some((taskId) => warning.startsWith(`Complete ${taskLabelFor(taskId)} before`) && subjectDone(taskId))
  }
  const warningDependencyIds = (warning: string) => {
    const match = warning.match(/^Finish the needed prior move first:\s*(.+)\.$/)
    if (!match) return []
    return match[1].split(',').map((id) => id.trim()).filter(Boolean)
  }
  const objectPlacementWarningResolved = (warning: string) => {
    const object = derived.objects.find((candidate) => warning.startsWith(`${candidate.label} does not belong on `))
    return object ? hasObjectOrPlacement(object.id) : false
  }
  const selectionWarningResolved = (warning: string) => {
    const selectableObject = derived.objects.find((object) => {
      const selectableItems = (object as any).selectableItems || []
      if (!selectableItems.length) return false
      return warning === (object as any).selectableMissingFeedback
        || warning === (object as any).selectableWrongFeedback
        || warning.startsWith('Select the ordered')
        || warning.startsWith('Only collect supplies needed')
    })
    if (!selectableObject) return false
    const correctIds = (((selectableObject as any).selectableItems || []) as SelectableImageItem[])
      .filter((item) => item.correct === true)
      .map((item) => item.id)
    return subjectDone(selectableObject.id) && correctIds.every(hasObjectOrPlacement)
  }
  const choiceWarningResolved = (warning: string) => {
    const subjects = [...derived.objects, ...derived.readables]
    const subject = subjects.find((candidate) => (
      (candidate.choiceOptions || []).some((choice) => choice.feedback === warning)
      || (warning === 'Review the visible information again before proceeding.' && (candidate.choiceOptions || []).length > 0)
    ))
    if (!subject) return false
    return subjectDone(subject.id)
  }
  const matchWarningResolved = (warning: string) => {
    if (!warning.startsWith('Compare the visible identifiers again.')) return false
    const subjects = [...derived.objects, ...derived.readables]
    return subjects.some((candidate) => (
      (candidate.matchSurfaces || []).length > 0 && subjectDone(candidate.id)
    ))
  }
  const modalHoldWarningResolved = (warning: string) => {
    const subjects = [...derived.objects, ...derived.readables]
    if (subjects.some((candidate) => {
      const instruction = candidate.imageHoldTarget?.instruction || 'Press and hold the marked point in the image before recording the observation.'
      return candidate.imageHoldTarget && warning === instruction && subjectDone(candidate.id)
    })) return true
    return sceneLinks.some((link) => {
      const subjectId = link.modalObjectId || link.id
      const instruction = link.imageHoldTarget?.instruction || 'Press and hold the marked point in the image before recording the observation.'
      return Boolean(link.imageHoldTarget && warning === instruction && subjectDone(subjectId))
    })
  }
  const incorrectObjectWarningResolved = (warning: string) => {
    const incorrectObject = derived.objects.find((object) => (
      (object as any).incorrectFeedback === warning
      || warning === `${object.label} does not belong in this task.`
    ))
    if (!incorrectObject) return false
    const siblingCorrectRequiredObjects = requiredObjects.filter((id) => id !== incorrectObject.id)
    return siblingCorrectRequiredObjects.length > 0
      ? siblingCorrectRequiredObjects.every(requirementIdDone)
      : canSubmit
  }
  const observationWarningResolved = (warning: string) => {
    if (warning !== 'Write the observation you would record before submitting it.') return false
    const observationIds = [
      ...derived.objects.filter((object) => object.requiresObservationText).map((object) => object.id),
      ...derived.readables.filter((surface) => surface.requiresObservationText).map((surface) => surface.id),
      ...sceneLinks.filter((link) => link.requiresObservationText).map((link) => link.modalObjectId || link.id),
    ]
    return observationIds.some((id) => state.observations[id]?.trim() && subjectDone(id))
  }
  const holdWarningResolved = (warning: string) => {
    if (warning !== 'Hold a little longer to complete that step.') return false
    return derived.objects.some((object) => needsHold(object.primitives) && hasObjectOrPlacement(object.id))
      || derived.steps.some((step) => needsHold(undefined, stepPrimitive(step)) && state.completedSteps.includes(step.id))
  }
  const warningResolved = (warning: string) => {
    if (canSubmit) return true
    if (warning === HAND_HYGIENE_FIRST_WARNING) return handHygieneDone(state)
    if (warning === WRISTBAND_SECOND_WARNING) return subjectDone(ROOM_512_WRISTBAND_TASK_ID)

    const matchingSceneLink = sceneLinks.find((link) => (
      (link.lockedText || 'Finish the earlier medication-pass work before starting this step.') === warning
    ))
    if (matchingSceneLink) return sceneLinkReady(matchingSceneLink)

    const matchingStep = derived.steps.find((step) => step.failureHint === warning)
    if (matchingStep) return impliedCompletedStepIds.has(matchingStep.id) || requirementsMet(matchingStep, state).ok

    const dependencyIds = warningDependencyIds(warning)
    if (dependencyIds.length) return dependencyIds.every(requirementIdDone)

    if (objectPlacementWarningResolved(warning)) return true
    if (selectionWarningResolved(warning)) return true
    if (choiceWarningResolved(warning)) return true
    if (matchWarningResolved(warning)) return true
    if (modalHoldWarningResolved(warning)) return true
    if (incorrectObjectWarningResolved(warning)) return true
    if (observationWarningResolved(warning)) return true
    if (holdWarningResolved(warning)) return true
    if (sequencedTaskWarningResolved(warning)) return true

    return false
  }
  const activeWarnings = state.warnings.filter((warning) => !warningResolved(warning))
  const latestWarning = activeWarnings[activeWarnings.length - 1]
  const modalSafetyWarning = modal?.safetyWarning === HAND_HYGIENE_FIRST_WARNING && handHygieneDone(state)
    ? undefined
    : modal?.safetyWarning
  const completedTaskIds = completedTaskIdsForState(state)
  const availabilityForTask = (taskId: string | undefined) => (
    node.id === ROOM_512_ASSESSMENT_SCENE_ID || node.id === MED_PASS_SAFETY_CHECKS_SCENE_ID || node.id === STAT_LAB_DRAW_SCENE_ID
      ? getSequencedTaskAvailability({ sceneId: node.id, taskId, completedTaskIds })
      : { state: 'available' as const }
  )
  const warningStyle = {
    border: `1px solid ${SAFETY_WARNING_RED}`,
    background: '#F2EBD9',
    color: SAFETY_WARNING_RED,
    padding: '0.75rem',
    fontSize: '0.78rem',
    fontWeight: 900,
    lineHeight: 1.45,
  }

  const content = (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={embedded ? 'physical-playground-embedded-content' : undefined}
        style={{ display: 'flex', flexDirection: 'column', gap: embedded ? '0.75rem' : '1rem' }}
      >
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
          <div style={{ marginTop: '0.45rem', color: '#3A6B5E', fontWeight: 800, fontSize: '0.875rem' }}>
            {renderContentWithGlossary(interpolate(node.learningGoal, context))}
          </div>
        </div>

        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, context))}
          </div>
        )}

        <section className={`physical-playground physical-playground--${node.id}`}>
          <div className={`physical-playground-stage physical-playground-stage--${node.id}`} aria-label={`${node.title} workplace stage`}>
            <img
              src={background}
              alt=""
              className="physical-playground-bg"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />

            {import.meta.env.DEV && !embedded && (
              <button
                type="button"
                className="physical-playground-dev-reset"
                onClick={resetPlayground}
                aria-label={`Reset ${node.title} playground`}
              >
                Dev reset
              </button>
            )}

            {import.meta.env.DEV && !embedded && ![
              'scene2_assessment',
              'scene2_med_pass',
              'scene3_lab_draw',
              'scene3_perform_draw',
              'scene3_label_specimen',
              'scene3_dispose_send',
              'scene4_stabilize',
            ].includes(node.id) && (node.background?.coordinateMap || []).map((zone) => (
              <div
                key={zone.label}
                className="physical-playground-dev-zone"
                style={stageStyle(zone, 0, 'target')}
              >
                {zone.label}
              </div>
            ))}

            {(SCENE_TABLET_OVERLAYS[node.id] ?? []).map((item) => {
              const linkedSurface = item.linkedObjectId
                ? derived.readables.find((surface) => surface.id === item.linkedObjectId)
                : undefined
              const linkedObject = item.linkedObjectId
                ? derived.objects.find((object) => object.id === item.linkedObjectId)
                : undefined
              const linkedSubject = linkedSurface || linkedObject
              const linkedKind = linkedSurface ? 'surface' : 'object'
              const linkedDone = Boolean(
                linkedSurface
                  ? state.inspectedSurfaces.includes(linkedSurface.id)
                  : linkedObject && state.selectedObjects.includes(linkedObject.id),
              )
              const availability = availabilityForTask(linkedSubject?.id)
              const availabilityClass = taskAvailabilityClass(availability.state)
              const content = (
                <>
                  <img src={item.src} alt="" />
                  <div className={`physical-playground-tablet-screen physical-playground-tablet-screen--${node.id}`}>
                    <b>eMAR</b>
                    {(TABLET_SCREEN_LINES[node.id] ?? []).map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </div>
                  {linkedSubject && (
                    <span className="physical-playground-object-label">
                      <b>{linkedDone ? 'Done' : 'Inspect'}</b>
                      {linkedSubject.label}
                    </span>
                  )}
                </>
              )

              if (linkedSubject) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`physical-playground-tablet-overlay physical-playground-tablet-overlay--${item.id} physical-playground-unit--${linkedSubject.id} ${linkedDone ? 'is-complete' : ''} ${availabilityClass}`}
                    style={stageSupplyOverlayStyle(item)}
                    onClick={() => {
                      if (availability.state === 'completed') return
                      inspect(linkedSubject, linkedKind)
                    }}
                    aria-label={linkedSubject.label}
                    aria-disabled={availability.state !== 'available'}
                  >
                    {content}
                  </button>
                )
              }

              return (
                <div
                  key={item.id}
                  className={`physical-playground-tablet-overlay physical-playground-tablet-overlay--${item.id}`}
                  style={stageSupplyOverlayStyle(item)}
                  aria-hidden="true"
                >
                  {content}
                </div>
              )
            })}

            {selectedSupplyOverlays(node.id, state).map((item) => (
              <img
                key={item.id}
                src={item.src}
                alt=""
                className={`physical-playground-cart-supply physical-playground-cart-supply--${item.id}`}
                style={stageSupplyOverlayStyle(item)}
                aria-hidden="true"
              />
            ))}

	            {derived.targets.map((target, index) => {
	              const assetPath = getAssetPath(target, lookup)
	              const hideAsset = (target.hideAssetAfterSteps || []).some((stepId) => state.completedSteps.includes(stepId))
	              const showAsset = Boolean(assetPath) && Boolean(target.showAsset) && !hideAsset
	              const placedObjectId = Object.entries(state.placements).find(([, targetId]) => targetId === target.id)?.[0]
	              const placedObject = placedObjectId ? derived.objects.find((object) => object.id === placedObjectId) : undefined
	              const placedAssetPath = placedObject
	                ? normalizeAssetPath(placedObject.placedAssetPath || getAssetPath(placedObject, lookup))
	                : undefined
	              const completedTargetCard = node.id === 'scene3_perform_draw' && (
	                derived.steps.some((step) => step.targetId === target.id && state.completedSteps.includes(step.id))
	                || (target.accepts || []).some((id) => state.placements[id] === target.id)
	              )
	              const hideTargetLabel = Boolean(target.hideLabel)
	                || (target.hideLabelAfterSteps || []).some((stepId) => state.completedSteps.includes(stepId))
		              const showTargetLabel = node.id !== 'scene2_med_pass'
		                && node.id !== 'scene3_lab_draw'
		                && node.id !== 'scene4_stabilize'
		                && !hideTargetLabel
		                && (node.id !== 'scene2_assessment' || (target.id === 'call_light_reach' && !placedObjectId))
		                && (node.id !== 'scene2_administer_meds' || !placedObjectId)
		                && !completedTargetCard
	              const targetAcceptsDragging = Boolean(
	                draggingId && (!target.accepts?.length || target.accepts.includes(draggingId)),
	              )
              const targetTaskId = target.accepts?.[0] || target.id
              const availability = availabilityForTask(targetTaskId)
              return (
	                <div
	                  key={target.id}
	                  className={`physical-playground-target physical-playground-unit--${target.id} ${placedObjectId ? 'has-placement' : ''} ${completedTargetCard ? 'is-completed-target' : ''} ${targetAcceptsDragging ? 'is-active-drop-target' : ''} ${taskAvailabilityClass(availability.state)}`}
	                  style={stageStyle(target, index, 'target')}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (availability.state === 'completed') {
                      setDraggingId(null)
                      return
                    }
                    if (availability.state === 'locked' && blockForTaskSequence(state, targetTaskId, target.label)) {
                      setDraggingId(null)
                      return
                    }
                    if (draggingId) placeObject(draggingId, target)
                    setDraggingId(null)
                  }}
                  onClick={() => {
                    if (availability.state === 'completed') return
                    if (availability.state === 'locked' && blockForTaskSequence(state, targetTaskId, target.label)) return
                    if (draggingId) {
                      placeObject(draggingId, target)
                      setDraggingId(null)
                    }
                  }}
                  aria-label={target.label}
                  aria-disabled={availability.state !== 'available'}
                >
	                  {assetPath && showAsset && <GeneratedAssetImage src={assetPath} label={target.label} compact />}
	                  {placedAssetPath && (
	                    <span className="physical-playground-placed-asset" style={placedAssetStyle(placedObject, target)}>
	                      <GeneratedAssetImage
	                        src={placedAssetPath}
                        label={placedObject?.label || target.label}
                        compact
                        imageRotate={placedObject?.placedImageRotate ?? placedObject?.imageRotate}
                        imageFlipY={placedObject?.placedImageFlipY ?? placedObject?.imageFlipY}
                        imageOffsetX={placedObject?.imageOffsetX}
                        imageOffsetY={placedObject?.imageOffsetY}
                      />
	                    </span>
	                  )}
                  {showTargetLabel && <span className="physical-playground-object-label">{target.label}</span>}
                </div>
              )
            })}

            {derived.readables.map((surface, index) => {
              if ((SCENE_TABLET_OVERLAYS[node.id] ?? []).some((item) => item.linkedObjectId === surface.id)) return null
              const assetPath = getAssetPath(surface, lookup)
              const done = state.inspectedSurfaces.includes(surface.id)
              const availability = availabilityForTask(surface.id)
              const showAsset = false
              return (
                <button
                  key={surface.id}
                  className={`physical-playground-hotspot physical-playground-unit--${surface.id} ${done ? 'is-complete' : ''} ${showAsset ? 'has-stage-asset' : ''} ${taskAvailabilityClass(availability.state)}`}
                  style={stageStyle(surface, index, 'readable')}
                  onClick={() => {
                    if (availability.state === 'completed') return
                    inspect(surface, 'surface')
                  }}
                  aria-label={surface.label}
                  aria-disabled={availability.state !== 'available'}
                >
                  {assetPath && showAsset && <GeneratedAssetImage src={assetPath} label={surface.label} compact />}
                  {(!showAsset || node.id !== 'scene2_assessment' || surface.id === 'review_orders') && (
                    <span className="physical-playground-object-label">
                      <b>{done ? 'Done' : 'Inspect'}</b>
                      {surface.label}
                    </span>
                  )}
                </button>
              )
            })}

            {derived.controls.map((control, index) => {
              const value = state.controlValues[control.id] ?? control.initialValue ?? control.min ?? 0
              const req = controlRequirementsMet(control, state)
              const availability = availabilityForTask(control.id)
              return (
                <label
                  key={control.id}
                  className={`physical-playground-control ${req.ok && availability.state === 'available' ? '' : 'is-disabled'} ${taskAvailabilityClass(availability.state)}`}
                  style={stageStyle(control, index, 'control')}
                  aria-disabled={!req.ok || availability.state !== 'available'}
                >
                  <span>{control.label}</span>
                  <input
                    type="range"
                    min={control.min ?? 0}
                    max={control.max ?? 100}
                    step={control.step ?? 1}
                    value={value}
                    disabled={!req.ok || availability.state !== 'available'}
                    onChange={(e) => changeControl(control, Number(e.currentTarget.value))}
                  />
                  <b>{value}{control.unit || ''}</b>
                </label>
              )
            })}

            {!!inlineReassessmentOptions.length && (
              <div className="physical-playground-stage-selected-list" aria-label="Selected reassessment checks">
                <b>Selected checks</b>
                {selectedInlineReassessmentOptions.length ? (
                  <ol>
                    {selectedInlineReassessmentOptions.map((object) => (
                      <li key={object.id}>{object.label}</li>
                    ))}
                  </ol>
                ) : (
                  <span>No checks selected yet.</span>
                )}
              </div>
            )}

            {derived.objects.map((object, index) => {
              if ((SCENE_TABLET_OVERLAYS[node.id] ?? []).some((item) => item.linkedObjectId === object.id)) return null
              if (node.id === 'scene2_reassessment_reminder' && object.primitives?.includes('select_from_image')) return null
              if ((object as any).consumeOnPlace && state.selectedObjects.includes(object.id)) return null
              const objectReq = objectRequirementsMet(object, state)
              if (object.hideUntilRequirementsMet && !objectReq.ok) return null
              const assetPath = getAssetPath(object, lookup)
              const placed = Boolean(state.placements[object.id])
              const selected = state.selectedObjects.includes(object.id) || placed
              const availability = availabilityForTask(object.id)
              const hold = needsHold(object.primitives)
              const draggable = isDragObject(object)
              const role = object.interactionRole || (object.readableText ? 'readable' : 'clickable')
              const hint = actionHint({ role, primitives: object.primitives, draggable })
              const showAsset = shouldShowStageAsset(node.id, object.id) && draggable
              const handleDragStart = (event: DragEvent<HTMLElement>) => {
                if (availability.state === 'completed') {
                  event.preventDefault()
                  return
                }
                if (availability.state === 'locked') {
                  event.preventDefault()
                  blockForTaskSequence(state, object.id, object.label, object.primitives?.[0])
                  return
                }
                setDragPreviewFromAsset(event, object.id)
                setDraggingId(object.id)
                const next = withHandHygieneFirstWarning(state, object.id, object.label, object.primitives?.[0])
                if (next !== state) save(next)
              }
              const activate = () => {
                if (availability.state === 'completed') return
                if (availability.state === 'locked') {
                  blockForTaskSequence(state, object.id, object.label, object.primitives?.[0])
                  return
                }
                if (draggable) {
                  const next = withHandHygieneFirstWarning(state, object.id, object.label, object.primitives?.[0])
                  if (next !== state) {
                    save(next)
                    return
                  }
                  setDraggingId(object.id)
                  return
                }
                if (role === 'readable' || object.readableText) {
                  inspect(object, 'object')
                } else {
                  completeObject(object, 'use_object')
                }
              }
              return (
                <button
                  key={object.id}
                  draggable={draggable}
                  className={`physical-playground-object physical-playground-unit--${object.id} ${selected ? 'is-complete' : ''} ${placed ? 'is-placed' : ''} ${showAsset ? 'has-stage-asset' : ''} ${hold ? 'is-holdable' : ''} ${taskAvailabilityClass(availability.state)}`}
                  style={stageStyle(object, index, 'object')}
                  onDragStart={handleDragStart}
                  onDragEnd={() => setDraggingId(null)}
                  onClick={() => {
                    if (!hold) activate()
                  }}
                  onPointerDown={() => {
                    if (hold) beginHold(activate)
                  }}
                  onPointerUp={() => {
                    if (hold) cancelHold()
                  }}
                  onPointerLeave={() => {
                    if (hold) cancelHold()
                  }}
                  aria-label={object.label}
                  aria-disabled={availability.state !== 'available'}
                >
                  {assetPath && showAsset && (
                    <GeneratedAssetImage
                      src={assetPath}
                      label={object.label}
                      compact
                      imageRotate={object.imageRotate}
                      imageFlipY={object.imageFlipY}
                      imageOffsetX={object.imageOffsetX}
                      imageOffsetY={object.imageOffsetY}
                      hitbox={object.imageHitbox}
                    />
                  )}
                  {(!showAsset || node.id !== 'scene2_assessment' || object.id === 'place_call_light' || object.id === 'review_orders') && (
                    <span
                      className="physical-playground-object-label"
                      draggable={draggable || undefined}
                      onDragStart={draggable ? (event) => {
                        event.stopPropagation()
                        handleDragStart(event)
                      } : undefined}
                      onDragEnd={draggable ? () => setDraggingId(null) : undefined}
                    >
                      <b>{selected ? 'Done' : hint}</b>
                      {object.label}
                    </span>
                  )}
                </button>
              )
            })}

	            {derived.steps.filter((step) => typeof step.x === 'number').map((step, index) => {
	              const done = state.completedSteps.includes(step.id)
	              if (node.id === 'scene3_perform_draw' && done) return null
	              const hold = needsHold(undefined, stepPrimitive(step))
              const availability = availabilityForTask(step.id)
              const activate = () => {
                if (availability.state === 'completed') return
                if (availability.state === 'locked') {
                  blockForTaskSequence(state, step.id, step.label, stepPrimitive(step))
                  return
                }
                completeStageStep(step)
              }
              const hint = hold ? 'Hold' : 'Do'
              return (
	                <button
	                  key={step.id}
	                  className={`physical-playground-step physical-playground-unit--${step.id} ${done ? 'is-complete' : ''} ${taskAvailabilityClass(availability.state)}`}
	                  style={stageStyle(step, index, 'step')}
                  onClick={() => {
                    if (!hold) activate()
                  }}
                  onPointerDown={() => {
                    if (hold) beginHold(activate)
                  }}
                  onPointerUp={() => {
                    if (hold) cancelHold()
                  }}
                  onPointerLeave={() => {
                    if (hold) cancelHold()
                  }}
                  aria-disabled={availability.state !== 'available'}
                >
                  <span className="physical-playground-object-label">
                    <b>{done ? 'Done' : hint}</b>
                    {step.label}
                  </span>
                </button>
              )
            })}

            {visibleSceneLinks.map((link) => {
              const taskId = link.modalObjectId || link.id
              const availability = availabilityForTask(taskId)
              const ready = sceneLinkReady(link)
              const done = availability.state === 'completed' || Boolean(link.modalObjectId && state.selectedObjects.includes(link.modalObjectId))
              const readyAndAvailable = ready && availability.state === 'available'
              return (
                <button
                  key={link.id}
                  className={`physical-playground-scene-link ${readyAndAvailable ? '' : 'is-locked'} ${done ? 'is-complete' : ''} ${taskAvailabilityClass(availability.state)}`}
                  style={stageStyle(link, 0, 'step')}
                  onClick={() => {
                    if (done) return
                    if (availability.state === 'locked' && blockForTaskSequence(state, taskId, link.label, link.primitive)) return
                    if (readyAndAvailable) {
                      const nextState = clearSceneLinkWarnings(state)
                      if (nextState.warnings.length !== state.warnings.length) save(nextState)
                      if (link.modalAssetId || link.modalAssetPath || link.modalSceneNodeId) {
                        inspectSceneLink(link)
                        return
                      }
                      navigateTo(link.next)
                      return
                    }
                    warnSceneLink(link)
                  }}
                  aria-disabled={!readyAndAvailable}
                >
                  <span className="physical-playground-object-label">
                    <b>{done ? 'Done' : link.verb || 'Inspect'}</b>
                    {link.label}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {!!derived.steps.length && (
          <div className="physical-playground-checklist" aria-label="Progress checklist">
            {derived.steps.map((step) => (
              <span key={step.id} className={impliedCompletedStepIds.has(step.id) ? 'is-complete' : ''}>
                {step.label}
              </span>
            ))}
          </div>
        )}

        {postStageHint && (
          <div className="physical-playground-post-stage-hint">
            {postStageHintLead && (
              <p className="physical-playground-post-stage-lead">
                {renderContentWithGlossary(interpolate(postStageHintLead, context))}
              </p>
            )}
            {postStageHintBody && (
              <div className="physical-playground-post-stage-body">
                {renderContentWithGlossary(interpolate(postStageHintBody, context))}
              </div>
            )}
          </div>
        )}

        {!!inlineReassessmentOptions.length && (
          <section className="physical-playground-inline-choice" aria-label="Choose reassessment checks">
            <p>Choose what you will check when you return.</p>
            <div className="physical-playground-inline-choice-buttons">
              {inlineReassessmentOptions.map((object) => {
                const selected = state.selectedObjects.includes(object.id)
                return (
                  <button
                    key={object.id}
                    type="button"
                    className={selected ? 'is-selected' : ''}
                    onClick={() => completeObject(object, 'select_reassessment_check')}
                  >
                    {object.label}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {!!activeWarnings.length && (
          <div style={warningStyle}>
            {latestWarning}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <ActionButton
            text={embedded ? embeddedCompleteLabel : 'Continue'}
            onClick={() => {
              if (embedded) {
                onEmbeddedComplete?.()
                return
              }
              goNext(node)
            }}
            disabled={!canSubmit}
            variant={canSubmit ? 'primary' : 'secondary'}
            fullWidth={false}
          />
          {!canSubmit && <span style={{ fontSize: '0.75rem', color: '#666' }}>{activeStepCount} workplace move{activeStepCount === 1 ? '' : 's'} completed.</span>}
        </div>

        {!embedded && (
          <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
        )}

        {modal && (
          <div className="physical-playground-modal-backdrop" onClick={closeModal}>
            <div className={`physical-playground-modal ${modal.embeddedSceneNodeId ? 'has-embedded-scene' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="physical-playground-modal-header">
                <h2>{modal.title}</h2>
                <button onClick={closeModal} aria-label="Close inspection">×</button>
              </div>
              {modalSafetyWarning && (
                <div style={warningStyle}>
                  {modalSafetyWarning}
                </div>
              )}
              {modal.embeddedSceneNodeId ? (
                <div className="physical-playground-embedded-modal-body">
                  <PhysicalPlaygroundScene
                    node={storyline.nodes[modal.embeddedSceneNodeId] as PlaygroundNode}
                    embedded
                    embeddedCompleteLabel={modal.completeLabel || (modal.subjectId === 'administer_meds' ? 'Complete administration' : 'Complete task')}
                    onEmbeddedComplete={() => completeInspection(modal)}
                  />
                </div>
              ) : modal.image && (
                <div className="physical-playground-modal-evidence">
                  {modal.image && !modalImageFailed && (
                    <div className="physical-playground-modal-image-wrap">
                      <img
                        src={modal.image}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          setModalImageFailed(true)
                        }}
                      />
                      {modal.imageHoldTarget && (
                        <>
                          <button
                            type="button"
                            className={`physical-playground-image-hold-target ${modalHoldComplete ? 'is-complete' : ''} ${modalHoldActive ? 'is-active' : ''}`}
                            style={imageHoldTargetStyle(modal.imageHoldTarget)}
                            onPointerDown={(e) => {
                              e.preventDefault()
                              beginModalHold()
                            }}
                            onPointerUp={cancelModalHold}
                            onPointerLeave={cancelModalHold}
                            onPointerCancel={cancelModalHold}
                            aria-label={modal.imageHoldTarget.label || 'Press and hold target in image'}
                          >
                            {modalHoldComplete ? 'done' : modalHoldActive ? 'holding...' : modal.imageHoldTarget.label || 'hold'}
                          </button>
                          <div className={`physical-playground-image-hold-hint ${modalHoldComplete ? 'is-complete' : ''}`}>
                            {modalHoldComplete
                              ? modal.imageHoldTarget.completionText || 'Patient response received.'
                              : modalHoldMessage || modal.imageHoldTarget.instruction || 'Press and hold the marked point in the image.'}
                          </div>
                        </>
                      )}
                      {modal.selectableItems?.map((item) => {
                        const itemStyle = imageItemStyle(item)
                        if (!itemStyle) return null
                        const selected = modalSelections.includes(item.id)
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`physical-playground-image-select-item ${selected ? 'is-selected' : ''}`}
                            style={itemStyle}
                            onClick={() => toggleModalSelection(item.id)}
                            aria-pressed={selected}
                          >
                            {item.label}
                          </button>
                        )
                      })}
                      {modal.selectableItems?.map((item) => {
                        const checkStyle = imageItemCheckStyle(item)
                        if (!checkStyle || !modalSelections.includes(item.id)) return null
                        return (
                          <div
                            key={`${item.id}-check`}
                            className="physical-playground-image-checkmark"
                            style={checkStyle}
                            aria-hidden="true"
                          >
                            &#10003;
                          </div>
                        )
                      })}
                    </div>
                  )}
                      {modal.image && modalImageFailed && (
                    <div className="physical-playground-asset-placeholder is-modal">
                      <b>Clinical visual unavailable</b>
                      <span>{modal.title}</span>
                      <code>{displayAssetPath(modal.image)}</code>
                      {modal.imageHoldTarget && (
                        <div className="physical-playground-image-hold-fallback">
                          <button
                            type="button"
                            className={`physical-playground-image-hold-target is-fallback ${modalHoldComplete ? 'is-complete' : ''} ${modalHoldActive ? 'is-active' : ''}`}
                            onPointerDown={(e) => {
                              e.preventDefault()
                              beginModalHold()
                            }}
                            onPointerUp={cancelModalHold}
                            onPointerLeave={cancelModalHold}
                            onPointerCancel={cancelModalHold}
                            aria-label={modal.imageHoldTarget.label || 'Press and hold target in image'}
                          >
                            {modalHoldComplete ? 'done' : modalHoldActive ? 'holding...' : modal.imageHoldTarget.label || 'hold'}
                          </button>
                          <div className={`physical-playground-image-hold-hint is-fallback ${modalHoldComplete ? 'is-complete' : ''}`}>
                            {modalHoldComplete
                              ? modal.imageHoldTarget.completionText || 'Action completed.'
                              : modalHoldMessage || modal.imageHoldTarget.instruction || 'Press and hold the marked target.'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {modal.modalReference && (
                <div className="physical-playground-modal-reference-trigger">
                  <button type="button" onClick={() => setReferenceModal(modal.modalReference || null)}>
                    {modal.modalReference.buttonLabel || 'Open medication reference'}
                  </button>
                </div>
              )}
              {!!modal.selectableItems?.length && (!modal.image || modalImageFailed || modal.selectableItems.some((item) => !imageItemStyle(item))) && (
                <div className="physical-playground-image-select-list">
                  {modal.selectableItems.map((item) => {
                    const selected = modalSelections.includes(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={selected ? 'is-selected' : ''}
                        onClick={() => toggleModalSelection(item.id)}
                        aria-pressed={selected}
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              )}
              {!modal.embeddedSceneNodeId && <p>{renderContentWithGlossary(interpolate(modal.body, context))}</p>}
              {(modal.narrationText || ((modal.npcLine || modal.visibleFindings?.length) && (!modal.imageHoldTarget || modalHoldComplete))) && (
                <div className="physical-playground-rpg-panel">
                  {modal.narrationText && <div>{renderContentWithGlossary(interpolate(modal.narrationText, context))}</div>}
                  {modal.npcLine && (!modal.imageHoldTarget || modalHoldComplete) && (
                    <blockquote>
                      <b>{modal.npcName || 'Person'}</b>
                      <span>{renderContentWithGlossary(interpolate(modal.npcLine, context))}</span>
                    </blockquote>
                  )}
                  {!!modal.visibleFindings?.length && (!modal.imageHoldTarget || modalHoldComplete) && (
                    <ul className="physical-playground-rpg-findings" aria-label="Assessment findings">
                      {modal.visibleFindings.map((finding) => (
                        <li key={finding}>{renderContentWithGlossary(interpolate(finding, context))}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {modal.voiceNodeId && modal.voiceStarted && (
                <PopupVoiceMeeting
                  nodeId={modal.voiceNodeId}
                  onComplete={() => completeInspection(modal)}
                />
              )}
              {!!modal.matchSurfaces?.length && import.meta.env.DEV && (!modal.image || modalImageFailed) && (
                <div className="physical-playground-match-surfaces">
                  {modal.matchSurfaces.map((surface) => (
                    <div key={surface.label}>
                      <b>{surface.label}</b>
                      <span>{surface.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {modal.requiresObservationText && (
                <label className="physical-playground-observation-field">
                  <span>{modal.observationPrompt || 'Record what you observed.'}</span>
                  <textarea
                    value={modalObservation}
                    onChange={(e) => setModalObservation(e.currentTarget.value)}
                    placeholder={modal.observationPlaceholder || 'Type the observation you would document.'}
                    rows={4}
                  />
                </label>
              )}
              {!modal.embeddedSceneNodeId && (!modal.voiceNodeId || !modal.voiceStarted) && (!modal.selectableAutoComplete || !!modal.choiceOptions?.length || !!modal.matchSurfaces?.length) && (
              <div className="physical-playground-modal-actions">
                {modal.voiceNodeId ? (
                  <button
                    onClick={() => setModal((openModal) => openModal ? { ...openModal, voiceStarted: true } : openModal)}
                    disabled={Boolean(modal.imageHoldTarget && !modalHoldComplete)}
                  >
                    {modal.completeLabel || 'Start the task'}
                  </button>
                ) : modal.choiceOptions?.length ? (
                  <>
                    <div>{modal.choiceQuestion || 'Choose the safest answer.'}</div>
                    {modal.choiceOptions.map((choice) => (
                      <button key={choice.id} onClick={() => completeInspection(modal, undefined, choice.id)}>
                        {choice.label}
                      </button>
                    ))}
                  </>
                ) : modal.matchSurfaces?.length ? (
                  <>
                    <div>{modal.matchQuestion || 'Do these visible surfaces match?'}</div>
                    <button onClick={() => completeInspection(modal, true)}>Confirm match</button>
                    <button onClick={() => completeInspection(modal, false)}>Do not match</button>
                  </>
                ) : modal.selectableAutoComplete ? null : (
                  <button onClick={() => completeInspection(modal)} disabled={Boolean(modal.imageHoldTarget && !modalHoldComplete)}>
                    {modal.selectableItems?.length ? (modal.selectableSubmitLabel || 'Collect selected supplies') : (modal.completeLabel || (modal.requiresObservationText ? 'Submit observation' : 'Record observation'))}
                  </button>
                )}
              </div>
              )}
            </div>
            {referenceModal && (
              <div
                className="physical-playground-reference-backdrop"
                onClick={(e) => {
                  e.stopPropagation()
                  setReferenceModal(null)
                }}
              >
                <div className="physical-playground-reference-modal" onClick={(e) => e.stopPropagation()}>
                  <div className="physical-playground-modal-header">
                    <h2>{referenceModal.title}</h2>
                    <button onClick={() => setReferenceModal(null)} aria-label="Close reference">×</button>
                  </div>
                  {referenceModalAsset ? (
                    <GeneratedAssetImage src={referenceModalAsset} label={referenceModal.title} />
                  ) : (
                    <div className="physical-playground-asset-placeholder is-modal">
                      <b>Reference visual unavailable</b>
                      <span>{referenceModal.title}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
  )

  if (embedded) return content

  return (
    <SceneWrapper showBack backLabel="Back" hideIllustration>
      {content}
    </SceneWrapper>
  )
}
