import { useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import type {
  ActionDropTarget,
  ActionInteractiveObject,
  ActionSimulationNode,
  ActionSimulationStep,
  PhysicalPlaygroundNode,
  PlaygroundControl,
  ProcedurePopup,
  ProcedurePopupAction,
  SelectionSurface,
  SelectionSurfaceHotspot,
  StateChangeRule,
  VisualAssetsRequired,
} from '../types/game'

type PlaygroundNode = ActionSimulationNode | PhysicalPlaygroundNode
type StageKind = 'object' | 'target' | 'readable' | 'control' | 'step'

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
  selectedSurfaces: string[]
  completedProcedurePopups: string[]
  completedProcedureActions: string[]
  consumedObjects: string[]
  visibleStateVariants: string[]
  controlValues: Record<string, number>
  observations: Record<string, string>
  warnings: string[]
  actionLog: ActionLogEntry[]
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
  observationPrompt?: string
  observationPlaceholder?: string
  requiresObservationText?: boolean
  observationMinWords?: number
  expectedObservation?: string
  narrationText?: string
  npcName?: string
  npcLine?: string
}

interface SelectionModal {
  surface: SelectionSurface
  selectedIds: string[]
}

interface ProcedureModal {
  popup: ProcedurePopup
  draggingToolId?: string | null
}

const initialState: PlaygroundState = {
  selectedObjects: [],
  placements: {},
  completedSteps: [],
  inspectedSurfaces: [],
  completedControls: [],
  selectedSurfaces: [],
  completedProcedurePopups: [],
  completedProcedureActions: [],
  consumedObjects: [],
  visibleStateVariants: [],
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
      selectedSurfaces: Array.isArray(parsed.selectedSurfaces) ? parsed.selectedSurfaces : [],
      completedProcedurePopups: Array.isArray(parsed.completedProcedurePopups) ? parsed.completedProcedurePopups : [],
      completedProcedureActions: Array.isArray(parsed.completedProcedureActions) ? parsed.completedProcedureActions : [],
      consumedObjects: Array.isArray(parsed.consumedObjects) ? parsed.consumedObjects : [],
      visibleStateVariants: Array.isArray(parsed.visibleStateVariants) ? parsed.visibleStateVariants : [],
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

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function normalizeAssetPath(path: string | undefined): string | undefined {
  if (!path) return undefined
  if (import.meta.env.DEV && path.startsWith('public/action-assets/')) return `/${path}`
  if (import.meta.env.DEV && path.startsWith('/public/action-assets/')) return path
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

function GeneratedAssetImage({ src, label, compact = false }: { src: string; label: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <div className={`physical-playground-asset-placeholder ${compact ? 'is-compact' : ''}`}>
        <b>Image pending</b>
        <span>{label}</span>
        <code>{displayAssetPath(src)}</code>
      </div>
    )
  }
  return <img src={src} alt="" onError={() => setFailed(true)} />
}

function WarningCallout({ message }: { message: string }) {
  return (
    <div className="physical-playground-warning" role="alert">
      <span className="physical-playground-warning-icon" aria-hidden="true">!</span>
      <span>{message}</span>
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

function isDragObject(object: ActionInteractiveObject) {
  return object.interactionRole === 'draggable' || (object.primitives || []).some((p) => DRAG_PRIMITIVES.has(p))
}

function isAdjustableControl(control: PlaygroundControl) {
  const primitive = control.digitalPrimitive || control.primitive || ''
  return /slider|dial|knob|gauge|numeric|toggle|switch|value/.test(primitive)
}

function needsHold(primitives: string[] | undefined, stepPrimitive?: string) {
  return [...(primitives || []), stepPrimitive || ''].some((p) => HOLD_PRIMITIVES.has(p))
}

function actionHint(args: { role?: string; primitives?: string[]; draggable?: boolean }) {
  if (args.draggable) return 'Drag'
  if (needsHold(args.primitives)) return 'Press and hold'
  if (args.role === 'readable') return 'Inspect'
  if (args.role === 'control') return 'Adjust'
  return 'Press'
}

function stepPrimitive(step: ActionSimulationStep) {
  return step.digitalPrimitive || (step as any).primitive || ''
}

function actionPrimitive(action: ProcedurePopupAction) {
  return action.digitalPrimitive || ''
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

export default function PhysicalPlaygroundScene({ node }: { node: PlaygroundNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
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
  const [modalImageFailed, setModalImageFailed] = useState(false)
  const [selectionModal, setSelectionModal] = useState<SelectionModal | null>(null)
  const [procedureModal, setProcedureModal] = useState<ProcedureModal | null>(null)
  const [procedureImageFailed, setProcedureImageFailed] = useState(false)
  const holdTimer = useRef<number | null>(null)
  const selectionSurfaces = useMemo(() => asArray(node.selectionSurface), [node.selectionSurface])
  const procedurePopups = useMemo(() => asArray(node.procedurePopup), [node.procedurePopup])

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
      selectedSurfaces: next.selectedSurfaces,
      completedProcedurePopups: next.completedProcedurePopups,
      completedProcedureActions: next.completedProcedureActions,
      consumedObjects: next.consumedObjects,
      visibleStateVariants: next.visibleStateVariants,
      controlValues: next.controlValues,
      observations: next.observations,
      actionLog: next.actionLog,
      warnings: next.warnings,
    }, null, 2))
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

  const warn = (message: string) => {
    save({ ...state, warnings: [...state.warnings.filter((warning) => warning !== message), message] })
  }

  const restartTask = () => {
    setModal(null)
    setModalObservation('')
    setModalImageFailed(false)
    setSelectionModal(null)
    setProcedureModal(null)
    setProcedureImageFailed(false)
    setDraggingId(null)
    setFreeTextResponse(node.id, '')
  }

  const requirementsMet = (step: ActionSimulationStep, nextState: PlaygroundState) => {
    const requiredSteps = step.requiresSteps || []
    const requiredObjects = [
      ...(step.requiresObjects || []),
      ...((step as any).requiresSupplies || []),
      ...((step as any).requiresActions || []),
    ]
    const missingSteps = requiredSteps.filter((id) => !nextState.completedSteps.includes(id))
    const missingObjects = requiredObjects.filter((id) => !nextState.selectedObjects.includes(id) && !nextState.placements[id])
    return { ok: missingSteps.length === 0 && missingObjects.length === 0, missingSteps, missingObjects }
  }

  const stateHasSubject = (id: string, nextState: PlaygroundState = state) => (
    nextState.selectedObjects.includes(id)
    || Boolean(nextState.placements[id])
    || nextState.consumedObjects.includes(id)
    || nextState.completedSteps.includes(id)
    || nextState.inspectedSurfaces.includes(id)
    || nextState.completedControls.includes(id)
    || nextState.selectedSurfaces.includes(id)
    || nextState.completedProcedurePopups.includes(id)
    || nextState.completedProcedureActions.includes(id)
  )

  const readableRequirementsMet = (
    surface: { requiresSteps?: string[]; requiresObjects?: string[] },
    nextState: PlaygroundState = state,
  ) => {
    const missingSteps = (surface.requiresSteps || []).filter((id) => !nextState.completedSteps.includes(id))
    const missingObjects = (surface.requiresObjects || []).filter((id) => !nextState.selectedObjects.includes(id) && !nextState.placements[id])
    return { ok: missingSteps.length === 0 && missingObjects.length === 0, missingSteps, missingObjects }
  }

  const blockedStepForAction = (objectId: string, targetId: string | undefined, primitive: string | undefined) => {
    for (const step of derived.steps) {
      if (state.completedSteps.includes(step.id)) continue
      const matchesObject = !step.objectIds?.length || step.objectIds.includes(objectId)
      const matchesTarget = !step.targetId || step.targetId === targetId
      const matchesPrimitive = !primitive || !stepPrimitive(step) || stepPrimitive(step) === primitive
      if (!matchesObject || !matchesTarget || !matchesPrimitive) continue
      const req = requirementsMet(step, state)
      if (!req.ok) return { step, req }
    }
    return null
  }

  const warnForBlockedStep = (block: NonNullable<ReturnType<typeof blockedStepForAction>>) => {
    warn(block.step.failureHint || `Finish the needed prior move first: ${[...block.req.missingSteps, ...block.req.missingObjects].join(', ')}.`)
  }

  const actionRequirementsMet = (objectId: string, targetId: string | undefined, primitive: string | undefined) => {
    const block = blockedStepForAction(objectId, targetId, primitive)
    if (!block) return true
    warnForBlockedStep(block)
    return false
  }

  const objectStateRule = (objectId: string) => (node.objectState || []).find((rule) => rule.objectId === objectId)

  const objectStateRuleVisible = (rule: NonNullable<PlaygroundNode['objectState']>[number], nextState: PlaygroundState = state) => {
    const appears = rule.appearsWhen?.length
      ? rule.appearsWhen.every((id) => stateHasSubject(id, nextState))
      : stateHasSubject(rule.objectId, nextState)
    const disappears = (rule.disappearsWhen || []).some((id) => stateHasSubject(id, nextState))
    return appears && !disappears
  }

  const addVisibleVariant = (current: PlaygroundState, variantId: string | undefined) => {
    if (!variantId) return current
    return { ...current, visibleStateVariants: unique([...current.visibleStateVariants, variantId]) }
  }

  const isObjectConsumed = (objectId: string, current: PlaygroundState = state) => current.consumedObjects.includes(objectId)

  const shouldConsumeObject = (objectId: string) => Boolean(objectStateRule(objectId)?.consumesOnUse)

  const stateChangeVisible = (change: StateChangeRule) => {
    if (change.whenObject && !state.selectedObjects.includes(change.whenObject) && !state.placements[change.whenObject]) return false
    if (change.whenStep && !state.completedSteps.includes(change.whenStep)) return false
    if (change.whenControl && !state.completedControls.includes(change.whenControl)) return false
    return Boolean(change.assetId || change.assetPath)
  }

  const controlRequirementsMet = (control: PlaygroundControl) => {
    const missingSteps = (control.requiresSteps || []).filter((id) => !state.completedSteps.includes(id))
    const missingObjects = (control.requiresObjects || []).filter((id) => !state.selectedObjects.includes(id) && !state.placements[id])
    const missingControls = (control.requiresControls || []).filter((id) => !state.completedControls.includes(id))
    return { ok: missingSteps.length === 0 && missingObjects.length === 0 && missingControls.length === 0, missingSteps, missingObjects, missingControls }
  }

  const procedureForStep = (stepId: string) => procedurePopups.find((popup) => popup.triggerStepId === stepId)
  const procedureForObject = (objectId: string) => procedurePopups.find((popup) => popup.triggerObjectId === objectId)

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
    const popup = procedureForObject(object.id)
    if (popup) {
      setProcedureImageFailed(false)
      setProcedureModal({ popup, draggingToolId: null })
      return
    }
    const primitive = object.primitives?.[0]
    let next = record(
      {
        ...state,
        selectedObjects: unique([...state.selectedObjects, object.id]),
        consumedObjects: shouldConsumeObject(object.id) ? unique([...state.consumedObjects, object.id]) : state.consumedObjects,
      },
      action,
      object.label,
      { objectId: object.id, primitive },
    )
    next = addVisibleVariant(next, objectStateRule(object.id)?.stateVariantAssetId)
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
    modalAssetPath?: string
    modalAssetId?: string
    primitives?: string[]
    matchSurfaces?: { label: string; value: string }[]
    matchQuestion?: string
    correctMatch?: boolean
    playerInstruction?: string
    observationPrompt?: string
    observationPlaceholder?: string
    requiresObservationText?: boolean
    observationMinWords?: number
    expectedObservation?: string
    narrationText?: string
    npcName?: string
    npcLine?: string
  }, kind: 'object' | 'surface') => {
    const image = getAssetPath({
      assetPath: subject.modalAssetPath || subject.assetPath,
      assetId: subject.modalAssetId || subject.assetId,
    }, lookup)
    const body = subject.playerInstruction || subject.readableText || subject.detail || 'Inspect the visible details, then record what you observed.'
    setModalObservation(state.observations[subject.id] || '')
    setModalImageFailed(false)
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
      observationPrompt: subject.observationPrompt,
      observationPlaceholder: subject.observationPlaceholder,
      requiresObservationText: subject.requiresObservationText,
      observationMinWords: subject.observationMinWords,
      expectedObservation: subject.expectedObservation,
      narrationText: subject.narrationText,
      npcName: subject.npcName,
      npcLine: subject.npcLine,
    })
  }

  const completeInspection = (current: ModalContent, answer?: boolean) => {
    if (current.matchSurfaces?.length) {
      const expected = current.correctMatch ?? true
      if (answer !== expected) {
        warn(expected
          ? `Compare the visible identifiers for ${current.title} again. The name and DOB need to match before you proceed.`
          : `Compare the visible identifiers for ${current.title} again. This is not a safe match.`)
        return
      }
    }

    const observation = modalObservation.trim()
    const observationMinWords = current.observationMinWords ?? 3
    if (current.requiresObservationText && observationMinWords > 0 && observation.split(/\s+/).filter(Boolean).length < observationMinWords) {
      warn(`Write the observation for ${current.title} before submitting it.`)
      return
    }

    let next: PlaygroundState = state
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
  }

  const placeObject = (objectId: string, target: ActionDropTarget) => {
    const targetAllowsObject = !target.accepts?.length || target.accepts.includes(objectId)
    if (!targetAllowsObject) {
      warn(`${derived.objects.find((o) => o.id === objectId)?.label || objectId} does not belong on ${target.label}.`)
      return
    }
    const object = derived.objects.find((o) => o.id === objectId)
    const primitive = object?.primitives?.find((p) => DRAG_PRIMITIVES.has(p)) || 'drag_object_to_target'
    if (!actionRequirementsMet(objectId, target.id, primitive)) return
    let next = record(
      {
        ...state,
        selectedObjects: unique([...state.selectedObjects, objectId]),
        placements: { ...state.placements, [objectId]: target.id },
        consumedObjects: shouldConsumeObject(objectId) ? unique([...state.consumedObjects, objectId]) : state.consumedObjects,
      },
      'place_object',
      `${object?.label || objectId} -> ${target.label}`,
      { objectId, targetId: target.id, primitive },
    )
    next = addVisibleVariant(next, objectStateRule(objectId)?.stateVariantAssetId)
    next = autoCompleteSteps(next, objectId, target.id, primitive)
    save(next)
  }

  const completeStageStep = (step: ActionSimulationStep) => {
    const popup = procedureForStep(step.id)
    if (popup && !state.completedProcedurePopups.includes(popup.id)) {
      const req = requirementsMet(step, state)
      if (!req.ok) {
        warn(step.failureHint || `Finish the needed prior move first: ${[...req.missingSteps, ...req.missingObjects].join(', ')}.`)
        return
      }
      setProcedureImageFailed(false)
      setProcedureModal({ popup, draggingToolId: null })
      return
    }
    const req = requirementsMet(step, state)
    if (!req.ok) {
      warn(step.failureHint || `Finish the needed prior move first: ${[...req.missingSteps, ...req.missingObjects].join(', ')}.`)
      return
    }
    let next = record(
      { ...state, completedSteps: unique([...state.completedSteps, step.id]) },
      'complete_stage_step',
      step.label,
      { primitive: stepPrimitive(step) },
    )
    next = addVisibleVariant(next, (node.objectState || []).find((rule) => rule.objectId === step.id)?.stateVariantAssetId)
    save(next)
  }

  const changeControl = (control: PlaygroundControl, value: number) => {
    const req = controlRequirementsMet(control)
    if (!req.ok) {
      warn(control.disabledHint || `Finish the needed setup first: ${[...req.missingSteps, ...req.missingObjects, ...req.missingControls].join(', ')}.`)
      return
    }
    const min = control.successMin ?? control.requiredValue
    const max = control.successMax ?? control.requiredValue
    const complete = typeof min === 'number' && typeof max === 'number'
      ? value >= min && value <= max
      : true
    const primitive = control.digitalPrimitive || control.primitive || 'set_numeric_value'
    let next = record(
      {
        ...state,
        controlValues: { ...state.controlValues, [control.id]: value },
        completedControls: complete ? unique([...state.completedControls, control.id]) : state.completedControls,
      },
      'adjust_control',
      control.label,
      { objectId: control.id, value, primitive },
    )
    next = autoCompleteSteps(next, control.id, undefined, primitive)
    next = addVisibleVariant(next, (node.objectState || []).find((rule) => rule.objectId === control.id)?.stateVariantAssetId)
    save(next)
  }

  const beginHold = (done: () => void) => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current)
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null
      done()
    }, 650)
  }

  const cancelHold = (label?: string) => {
    if (!holdTimer.current) return
    window.clearTimeout(holdTimer.current)
    holdTimer.current = null
    warn(label ? `Hold a little longer to complete ${label}.` : 'Hold a little longer to complete that step.')
  }

  const openSelectionSurface = (surface: SelectionSurface) => {
    setSelectionModal({
      surface,
      selectedIds: state.selectedObjects.filter((id) => [
        ...(surface.correctObjectIds || []),
        ...(surface.distractorObjectIds || []),
        ...surface.hotspots.map((hotspot) => hotspot.objectId),
      ].includes(id)),
    })
  }

  const toggleSurfaceHotspot = (hotspot: SelectionSurfaceHotspot) => {
    if (!selectionModal) return
    const allowMultiple = selectionModal.surface.allowMultiple ?? true
    const selected = selectionModal.selectedIds.includes(hotspot.objectId)
      ? selectionModal.selectedIds.filter((id) => id !== hotspot.objectId)
      : allowMultiple
        ? [...selectionModal.selectedIds, hotspot.objectId]
        : [hotspot.objectId]
    setSelectionModal({ ...selectionModal, selectedIds: selected })
  }

  const confirmSelectionSurface = () => {
    if (!selectionModal) return
    const { surface, selectedIds } = selectionModal
    const correctIds = surface.correctObjectIds?.length
      ? surface.correctObjectIds
      : surface.hotspots.filter((hotspot) => hotspot.isCorrect).map((hotspot) => hotspot.objectId)
    const distractorIds = surface.distractorObjectIds?.length
      ? surface.distractorObjectIds
      : surface.hotspots.filter((hotspot) => hotspot.isDistractor).map((hotspot) => hotspot.objectId)
    const missingCorrect = correctIds.filter((id) => !selectedIds.includes(id))
    const chosenDistractors = selectedIds.filter((id) => distractorIds.includes(id))
    if (missingCorrect.length || chosenDistractors.length) {
      const chosenDistractorLabels = chosenDistractors
        .map((id) => surface.hotspots.find((hotspot) => hotspot.objectId === id)?.label || id)
        .join(', ')
      const missingLabels = missingCorrect
        .map((id) => surface.hotspots.find((hotspot) => hotspot.objectId === id)?.label || id)
        .join(', ')
      warn([
        chosenDistractorLabels ? `Recheck the reference before selecting: ${chosenDistractorLabels}.` : '',
        missingLabels ? `Still needed: ${missingLabels}.` : '',
      ].filter(Boolean).join(' '))
      return
    }
    let next = record(
      {
        ...state,
        selectedObjects: unique([...state.selectedObjects, ...selectedIds]),
        selectedSurfaces: unique([...state.selectedSurfaces, surface.id]),
      },
      'select_from_surface',
      surface.label,
      { primitive: 'click_hotspot_in_image' },
    )
    for (const objectId of selectedIds) {
      next = autoCompleteSteps(next, objectId, undefined, 'click_hotspot_in_image')
    }
    save(next)
    setSelectionModal(null)
  }

  const procedureActionRequirementsMet = (action: ProcedurePopupAction) => {
    const missingSteps = (action.requiresSteps || []).filter((id) => !state.completedSteps.includes(id))
    const missingObjects = (action.requiresObjects || []).filter((id) => !state.selectedObjects.includes(id) && !state.placements[id])
    return { ok: missingSteps.length === 0 && missingObjects.length === 0, missingSteps, missingObjects }
  }

  const completeProcedureAction = (action: ProcedurePopupAction, toolId?: string | null) => {
    if (state.completedProcedureActions.includes(action.id)) return
    const req = procedureActionRequirementsMet(action)
    if (!req.ok) {
      warn(`Finish the needed setup first: ${[...req.missingSteps, ...req.missingObjects].join(', ')}.`)
      return
    }
    if (action.toolObjectId && toolId && action.toolObjectId !== toolId) {
      warn(`${derived.objects.find((object) => object.id === toolId)?.label || toolId} is not the right item for ${action.label}.`)
      return
    }
    const consumed = action.consumesObjectIds || (action.toolObjectId && shouldConsumeObject(action.toolObjectId) ? [action.toolObjectId] : [])
    let next = record(
      {
        ...state,
        selectedObjects: unique([...state.selectedObjects, action.toolObjectId].filter(Boolean) as string[]),
        completedProcedureActions: unique([...state.completedProcedureActions, action.id]),
        consumedObjects: unique([...state.consumedObjects, ...consumed]),
      },
      'complete_procedure_action',
      action.label,
      { objectId: action.toolObjectId, targetId: action.targetId, primitive: actionPrimitive(action) },
    )
    next = addVisibleVariant(next, action.stateVariantAssetId)
    save(next)
  }

  const completeProcedurePopup = (popup: ProcedurePopup) => {
    const requiredActions = popup.requiredSequence?.length
      ? popup.requiredSequence
      : (popup.actions || []).map((action) => action.id)
    const missingActions = requiredActions.filter((id) => !state.completedProcedureActions.includes(id))
    if (missingActions.length) {
      warn(`Complete the closeup work first: ${missingActions.join(', ')}.`)
      return
    }
    const completedSteps = popup.triggerStepId
      ? unique([...state.completedSteps, popup.triggerStepId])
      : state.completedSteps
    const selectedObjects = popup.triggerObjectId
      ? unique([...state.selectedObjects, popup.triggerObjectId])
      : state.selectedObjects
    save(record(
      {
        ...state,
        completedSteps,
        selectedObjects,
        completedProcedurePopups: unique([...state.completedProcedurePopups, popup.id]),
      },
      'complete_procedure_popup',
      popup.label,
      { primitive: 'confirm_modal' },
    ))
    setProcedureModal(null)
  }

  const background = normalizeAssetPath(node.background?.filename) || node.illustration || `/scenes/${node.id}.png`
  const requiredObjects = derived.requiredObjects.length
    ? derived.requiredObjects
    : derived.objects.filter((o) => o.required).map((o) => o.id)
  const requiredSteps = node.requiredStepIds || derived.steps.map((s) => s.id)
  const requiredReadables = node.requiredReadableSurfaceIds || derived.readables.filter((s) => s.required).map((s) => s.id)
  const requiredControls = node.requiredControlIds || derived.controls.filter((c) => c.required).map((c) => c.id)
  const requiredSelectionSurfaces = selectionSurfaces.filter((surface) => surface.required).map((surface) => surface.id)
  const objectsDone = requiredObjects.every((id) => {
    const object = derived.objects.find((candidate) => candidate.id === id)
    const hasDropTarget = derived.targets.some((target) => !target.accepts?.length || target.accepts.includes(id))
    if (object && isDragObject(object) && hasDropTarget) return Boolean(state.placements[id])
    return state.selectedObjects.includes(id) || Boolean(state.placements[id])
  })
  const stepsDone = requiredSteps.every((id) => state.completedSteps.includes(id))
  const readablesDone = requiredReadables.every((id) => state.inspectedSurfaces.includes(id))
  const controlsDone = requiredControls.every((id) => state.completedControls.includes(id))
  const selectionSurfacesDone = requiredSelectionSurfaces.every((id) => state.selectedSurfaces.includes(id))
  const canSubmit = objectsDone && stepsDone && readablesDone && controlsDone && selectionSurfacesDone
  const activeStepCount = state.completedSteps.length + Object.keys(state.placements).length + state.inspectedSurfaces.length + state.completedControls.length + state.selectedSurfaces.length + state.completedProcedureActions.length
  const footerLabel = node.completionBehavior?.footerLabel || (node.completionBehavior?.actionAlreadyPerformedInPopup ? 'Complete' : 'Continue')
  const positionedObjectStateRules = (node.objectState || []).filter((rule) => (
    !rule.stateVariantAssetId
    && typeof rule.x === 'number'
    && typeof rule.y === 'number'
    && typeof rule.w === 'number'
    && typeof rule.h === 'number'
    && objectStateRuleVisible(rule)
  ))
  const positionedObjectIds = new Set(positionedObjectStateRules.map((rule) => rule.objectId))

  const hasObjectState = (id: string) => (
    state.selectedObjects.includes(id)
    || Boolean(state.placements[id])
    || state.consumedObjects.includes(id)
  )

  const subjectDone = (id: string) => (
    hasObjectState(id)
    || state.completedSteps.includes(id)
    || state.inspectedSurfaces.includes(id)
    || state.completedControls.includes(id)
    || state.selectedSurfaces.includes(id)
    || state.completedProcedurePopups.includes(id)
    || state.completedProcedureActions.includes(id)
  )

  const warningDependencyIds = (warning: string) => {
    const match = warning.match(/^(?:Finish the needed (?:prior move|setup) first|Complete the closeup work first):\s*(.+)\.$/)
    if (!match) return []
    return match[1].split(',').map((id) => id.trim()).filter(Boolean)
  }

  const dependencyWarningResolved = (warning: string) => {
    const dependencyIds = warningDependencyIds(warning)
    return dependencyIds.length > 0 && dependencyIds.every((id) => subjectDone(id))
  }

  const objectPlacementWarningResolved = (warning: string) => {
    const object = derived.objects.find((candidate) => warning.startsWith(`${candidate.label} does not belong on `))
    return Boolean(object && (state.placements[object.id] || state.consumedObjects.includes(object.id)))
  }

  const dragWarningResolved = (warning: string) => {
    const object = derived.objects.find((candidate) => warning === `Drag ${candidate.label} to the correct place in the scene.`)
    if (!object) return false
    const hasDropTarget = derived.targets.some((target) => !target.accepts?.length || target.accepts.includes(object.id))
    return hasDropTarget ? Boolean(state.placements[object.id]) : hasObjectState(object.id)
  }

  const stepWarningResolved = (warning: string) => derived.steps.some((step) => {
    if (warning !== step.failureHint) return false
    return state.completedSteps.includes(step.id) || requirementsMet(step, state).ok
  })

  const controlWarningResolved = (warning: string) => derived.controls.some((control) => {
    if (warning !== control.disabledHint) return false
    return state.completedControls.includes(control.id) || controlRequirementsMet(control).ok
  })

  const selectionWarningResolved = (warning: string) => {
    const selectionWarning = warning.startsWith('Recheck the reference before selecting:') || warning.includes('Still needed:')
    if (!selectionWarning) return false
    const matchingSurface = selectionSurfaces.find((surface) => (
      surface.hotspots.some((hotspot) => warning.includes(hotspot.label) || warning.includes(hotspot.objectId))
    ))
    if (matchingSurface) return state.selectedSurfaces.includes(matchingSurface.id)
    return requiredSelectionSurfaces.length
      ? requiredSelectionSurfaces.every((id) => state.selectedSurfaces.includes(id))
      : state.selectedSurfaces.length > 0
  }

  const matchWarningResolved = (warning: string) => {
    if (!warning.startsWith('Compare the visible identifiers')) return false
    const matchSubjects = [...derived.objects, ...derived.readables].filter((subject) => Boolean(subject.matchSurfaces?.length))
    const labelledSubject = matchSubjects.find((subject) => warning.includes(subject.label))
    if (labelledSubject) return subjectDone(labelledSubject.id)
    return matchSubjects.some((subject) => subjectDone(subject.id))
  }

  const observationWarningResolved = (warning: string) => {
    if (!warning.startsWith('Write the observation') || !warning.endsWith('before submitting it.')) return false
    const observationSubjects = [...derived.objects, ...derived.readables].filter((subject) => Boolean(subject.requiresObservationText))
    const labelledSubject = observationSubjects.find((subject) => warning.includes(subject.label))
    if (labelledSubject) return Boolean(state.observations[labelledSubject.id]?.trim()) && subjectDone(labelledSubject.id)
    return observationSubjects.some((subject) => (
      Boolean(state.observations[subject.id]?.trim()) && subjectDone(subject.id)
    ))
  }

  const holdSubjects = [
    ...derived.objects
      .filter((object) => needsHold(object.primitives))
      .map((object) => ({ id: object.id, label: object.label })),
    ...derived.steps
      .filter((step) => needsHold(undefined, stepPrimitive(step)))
      .map((step) => ({ id: step.id, label: step.label })),
    ...procedurePopups.flatMap((popup) => (popup.actions || [])
      .filter((action) => needsHold(undefined, actionPrimitive(action)))
      .map((action) => ({ id: action.id, label: action.label }))),
  ]

  const holdWarningResolved = (warning: string) => {
    if (!warning.startsWith('Hold a little longer to complete')) return false
    const labelledSubject = holdSubjects.find((subject) => warning.includes(subject.label))
    if (labelledSubject) return subjectDone(labelledSubject.id)
    return holdSubjects.some((subject) => subjectDone(subject.id))
  }

  const procedureToolWarningResolved = (warning: string) => procedurePopups.some((popup) => (
    (popup.actions || []).some((action) => (
      warning.endsWith(` is not the right item for ${action.label}.`)
      && state.completedProcedureActions.includes(action.id)
    ))
  ))

  const warningResolved = (warning: string) => (
    canSubmit
    || dependencyWarningResolved(warning)
    || objectPlacementWarningResolved(warning)
    || dragWarningResolved(warning)
    || stepWarningResolved(warning)
    || controlWarningResolved(warning)
    || selectionWarningResolved(warning)
    || matchWarningResolved(warning)
    || observationWarningResolved(warning)
    || holdWarningResolved(warning)
    || procedureToolWarningResolved(warning)
  )

  const activeWarnings = state.warnings.filter((warning) => !warningResolved(warning))
  const latestWarning = activeWarnings[activeWarnings.length - 1]

  return (
    <SceneWrapper showBack backLabel="Back" hideIllustration>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
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

        <section className="physical-playground">
          <div className="physical-playground-stage" aria-label={`${node.title} workplace stage`}>
            <img
              src={background}
              alt=""
              className="physical-playground-bg"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />

            {import.meta.env.DEV && (node.background?.coordinateMap || []).map((zone) => (
              <div
                key={zone.label}
                className="physical-playground-dev-zone"
                style={stageStyle(zone, 0, 'target')}
              >
                {zone.label}
              </div>
            ))}

            {(node.objectState || [])
              .filter((rule) => rule.stateVariantAssetId && state.visibleStateVariants.includes(rule.stateVariantAssetId))
              .map((rule, index) => {
                const assetPath = getAssetPath({ assetId: rule.stateVariantAssetId }, lookup)
                if (!assetPath) return null
                return (
                  <div
                    key={`${rule.objectId}-${rule.stateVariantAssetId}`}
                    className="physical-playground-state-variant"
                    style={stageStyle(rule, index, 'target')}
                    aria-hidden="true"
                  >
                    <GeneratedAssetImage src={assetPath} label={rule.objectId} compact />
                  </div>
                )
              })}

            {(node.stateChange || [])
              .filter(stateChangeVisible)
              .map((change, index) => {
                const assetPath = getAssetPath(change, lookup)
                if (!assetPath) return null
                return (
                  <div
                    key={change.id}
                    className="physical-playground-state-variant"
                    style={stageStyle(change, index, 'target')}
                    aria-label={change.label || change.id}
                  >
                    <GeneratedAssetImage src={assetPath} label={change.label || change.id} compact />
                  </div>
                )
              })}

            {positionedObjectStateRules.map((rule, index) => {
              const object = derived.objects.find((candidate) => candidate.id === rule.objectId)
              const assetPath = object ? getAssetPath(object, lookup) : undefined
              if (!object || !assetPath) return null
              return (
                <div
                  key={`${rule.objectId}-positioned`}
                  className="physical-playground-state-variant"
                  style={stageStyle(rule, index, 'target')}
                  aria-label={object.label}
                >
                  <GeneratedAssetImage src={assetPath} label={object.label} compact />
                </div>
              )
            })}

            {derived.targets.map((target, index) => {
              const assetPath = getAssetPath(target, lookup)
              const placedObjects = Object.entries(state.placements)
                .filter(([, targetId]) => targetId === target.id)
                .map(([objectId]) => derived.objects.find((object) => object.id === objectId))
                .filter(Boolean)
                .filter((object) => !positionedObjectIds.has((object as ActionInteractiveObject).id)) as ActionInteractiveObject[]
              return (
                <div
                  key={target.id}
                  className="physical-playground-target"
                  style={stageStyle(target, index, 'target')}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggingId) placeObject(draggingId, target)
                    setDraggingId(null)
                  }}
                  aria-label={target.label}
                >
                  {assetPath && <GeneratedAssetImage src={assetPath} label={target.label} compact />}
                  {!!placedObjects.length && (
                    <div className="physical-playground-placed-items">
                      {placedObjects.map((object) => {
                        const objectAssetPath = getAssetPath(object, lookup)
                        return (
                          <span key={object.id} className="physical-playground-placed-item">
                            {objectAssetPath && !isObjectConsumed(object.id) && <GeneratedAssetImage src={objectAssetPath} label={object.label} compact />}
                            <b>{object.label}</b>
                          </span>
                        )
                      })}
                    </div>
                  )}
                  <span className="physical-playground-object-label">{target.label}</span>
                </div>
              )
            })}

            {selectionSurfaces.map((surface, index) => {
              const done = state.selectedSurfaces.includes(surface.id)
              return (
                <button
                  key={surface.id}
                  className={`physical-playground-hotspot ${done ? 'is-complete' : ''}`}
                  style={stageStyle(surface, index, 'readable')}
                  onClick={() => openSelectionSurface(surface)}
                  aria-label={surface.label}
                >
                  <span className="physical-playground-object-label">
                    <b>Select</b>
                    {surface.label}
                  </span>
                </button>
              )
            })}

            {procedurePopups
              .filter((popup) => !popup.triggerStepId && !popup.triggerObjectId)
              .map((popup, index) => {
                const done = state.completedProcedurePopups.includes(popup.id)
                return (
                  <button
                    key={popup.id}
                    className={`physical-playground-step ${done ? 'is-complete' : ''}`}
                    style={stageStyle(popup, index, 'step')}
                    onClick={() => {
                      setProcedureImageFailed(false)
                      setProcedureModal({ popup, draggingToolId: null })
                    }}
                  >
                    {popup.label}
                  </button>
                )
              })}

            {derived.readables.map((surface, index) => {
              const assetPath = getAssetPath(surface, lookup)
              const done = state.inspectedSurfaces.includes(surface.id)
              return (
                <button
                  key={surface.id}
                  className={`physical-playground-hotspot ${done ? 'is-complete' : ''}`}
                  style={stageStyle(surface, index, 'readable')}
                  onClick={() => {
                    const req = readableRequirementsMet(surface)
                    if (!req.ok) {
                      warn(surface.disabledHint || `Finish the needed setup first: ${[...req.missingSteps, ...req.missingObjects].join(', ')}.`)
                      return
                    }
                    inspect(surface, 'surface')
                  }}
                  aria-label={surface.label}
                >
                  {assetPath && <GeneratedAssetImage src={assetPath} label={surface.label} compact />}
                  <span className="physical-playground-object-label">
                    <b>Inspect</b>
                    {surface.label}
                  </span>
                </button>
              )
            })}

            {derived.controls.map((control, index) => {
              const value = state.controlValues[control.id] ?? control.initialValue ?? control.min ?? 0
              const req = controlRequirementsMet(control)
              const disabled = !req.ok
              return (
                <label
                  key={control.id}
                  className={`physical-playground-control ${disabled ? 'is-disabled' : ''}`}
                  style={stageStyle(control, index, 'control')}
                >
                  <span>{control.label}</span>
                  <input
                    type="range"
                    min={control.min ?? 0}
                    max={control.max ?? 100}
                    step={control.step ?? 1}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => changeControl(control, Number(e.currentTarget.value))}
                  />
                  <b>{value}{control.unit || ''}</b>
                  {disabled && <em>{control.disabledHint || 'Complete setup first'}</em>}
                  {!disabled && isAdjustableControl(control) && control.targetDisclosure && (
                    <em>{control.targetDisclosure === 'instruction_reveals_target' ? 'Target shown in task' : 'Use reference/evidence'}</em>
                  )}
                </label>
              )
            })}

            {derived.objects.filter((object) => !isObjectConsumed(object.id)).map((object, index) => {
              const assetPath = getAssetPath(object, lookup)
              const placed = Boolean(state.placements[object.id])
              const selected = state.selectedObjects.includes(object.id) || placed
              const hold = needsHold(object.primitives)
              const draggable = isDragObject(object)
              const role = object.interactionRole || (object.readableText ? 'readable' : 'clickable')
              const hint = actionHint({ role, primitives: object.primitives, draggable })
              const activate = () => {
                if (draggable) {
                  warn(`Drag ${object.label} to the correct place in the scene.`)
                  return
                }
                if (!actionRequirementsMet(object.id, undefined, object.primitives?.[0])) return
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
                  className={`physical-playground-object ${selected ? 'is-complete' : ''} ${placed ? 'is-placed' : ''}`}
                  style={stageStyle(object, index, 'object')}
                  onDragStart={() => setDraggingId(object.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onClick={() => {
                    if (!hold) activate()
                  }}
                  onPointerDown={() => {
                    if (hold) beginHold(activate)
                  }}
                  onPointerUp={() => {
                    if (hold) cancelHold(object.label)
                  }}
                  onPointerLeave={() => {
                    if (hold) cancelHold(object.label)
                  }}
                  aria-label={object.label}
                >
                  {assetPath && <GeneratedAssetImage src={assetPath} label={object.label} compact />}
                  <span className="physical-playground-object-label">
                    <b>{hint}</b>
                    {object.label}
                  </span>
                </button>
              )
            })}

            {derived.steps.filter((step) => typeof step.x === 'number').map((step, index) => {
              const done = state.completedSteps.includes(step.id)
              const hold = needsHold(undefined, stepPrimitive(step))
              const activate = () => completeStageStep(step)
              return (
                <button
                  key={step.id}
                  className={`physical-playground-step ${done ? 'is-complete' : ''}`}
                  style={stageStyle(step, index, 'step')}
                  onClick={() => {
                    if (!hold) activate()
                  }}
                  onPointerDown={() => {
                    if (hold) beginHold(activate)
                  }}
                  onPointerUp={() => {
                    if (hold) cancelHold(step.label)
                  }}
                  onPointerLeave={() => {
                    if (hold) cancelHold(step.label)
                  }}
                >
                  {step.label}
                </button>
              )
            })}
          </div>
        </section>

        {!!derived.steps.length && (
          <div className="physical-playground-checklist" aria-label="Progress checklist">
            {derived.steps.map((step) => (
              <span key={step.id} className={state.completedSteps.includes(step.id) ? 'is-complete' : ''}>
                {step.label}
              </span>
            ))}
          </div>
        )}

        {!!latestWarning && <WarningCallout message={latestWarning} />}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <ActionButton text={footerLabel} onClick={() => goNext(node)} disabled={!canSubmit} variant={canSubmit ? 'primary' : 'secondary'} fullWidth={false} />
          {!canSubmit && <span style={{ fontSize: '0.75rem', color: '#666' }}>{activeStepCount} workplace move{activeStepCount === 1 ? '' : 's'} completed.</span>}
        </div>

        {import.meta.env.DEV && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <ActionButton text="Restart Task (dev)" onClick={restartTask} variant="secondary" fullWidth={false} />
            <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
          </div>
        )}

        {modal && (
          <div className="physical-playground-modal-backdrop" onClick={() => setModal(null)}>
            <div className="physical-playground-modal" onClick={(e) => e.stopPropagation()}>
              <div className="physical-playground-modal-header">
                <h2>{modal.title}</h2>
                <button onClick={() => setModal(null)} aria-label="Close inspection">×</button>
              </div>
              {!!latestWarning && <WarningCallout message={latestWarning} />}
              {modal.image && !modalImageFailed && (
                <img
                  src={modal.image}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    setModalImageFailed(true)
                  }}
                />
              )}
              {modal.image && modalImageFailed && (
                <div className="physical-playground-asset-placeholder is-modal">
                  <b>Image pending</b>
                  <span>{modal.title}</span>
                  <code>{displayAssetPath(modal.image)}</code>
                </div>
              )}
              <p>{renderContentWithGlossary(interpolate(modal.body, context))}</p>
              {(modal.narrationText || modal.npcLine) && (
                <div className="physical-playground-rpg-panel">
                  {modal.narrationText && <div>{renderContentWithGlossary(interpolate(modal.narrationText, context))}</div>}
                  {modal.npcLine && (
                    <blockquote>
                      <b>{modal.npcName || 'Person'}</b>
                      <span>{renderContentWithGlossary(interpolate(modal.npcLine, context))}</span>
                    </blockquote>
                  )}
                </div>
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
              <div className="physical-playground-modal-actions">
                {modal.matchSurfaces?.length ? (
                  <>
                    <div>{modal.matchQuestion || 'Do these visible surfaces match?'}</div>
                    <button onClick={() => completeInspection(modal, true)}>Confirm match</button>
                    <button onClick={() => completeInspection(modal, false)}>Do not match</button>
                  </>
                ) : (
                  <button onClick={() => completeInspection(modal)}>
                    {modal.requiresObservationText ? 'Submit observation' : 'Record observation'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {selectionModal && (
          <div className="physical-playground-modal-backdrop" onClick={() => setSelectionModal(null)}>
            <div className="physical-playground-modal is-wide" onClick={(e) => e.stopPropagation()}>
              <div className="physical-playground-modal-header">
                <h2>{selectionModal.surface.label}</h2>
                <button onClick={() => setSelectionModal(null)} aria-label="Close selection">×</button>
              </div>
              {!!latestWarning && <WarningCallout message={latestWarning} />}
              {(selectionModal.surface.reference || node.selectionReference) && (
                <div className="physical-playground-reference-panel">
                  <b>{(selectionModal.surface.reference || node.selectionReference)?.title || 'Reference'}</b>
                  <span>{renderContentWithGlossary(interpolate((selectionModal.surface.reference || node.selectionReference)?.content || selectionModal.surface.noviceAdequacy || '', context))}</span>
                </div>
              )}
              {selectionModal.surface.instruction && (
                <p>{renderContentWithGlossary(interpolate(selectionModal.surface.instruction, context))}</p>
              )}
              <div className="physical-playground-selection-stage">
                {getAssetPath(selectionModal.surface, lookup) && (
                  <img
                    src={getAssetPath(selectionModal.surface, lookup)}
                    alt=""
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                )}
                {!getAssetPath(selectionModal.surface, lookup) && (
                  <div className="physical-playground-asset-placeholder is-selection">
                    <b>Image pending</b>
                    <span>{selectionModal.surface.label}</span>
                  </div>
                )}
                {selectionModal.surface.hotspots.map((hotspot) => {
                  const selected = selectionModal.selectedIds.includes(hotspot.objectId)
                  return (
                    <button
                      key={hotspot.objectId}
                      className={`physical-playground-selection-hotspot ${selected ? 'is-selected' : ''}`}
                      style={stageStyle(hotspot, 0, 'object')}
                      onClick={() => toggleSurfaceHotspot(hotspot)}
                    >
                      {hotspot.label}
                    </button>
                  )
                })}
              </div>
              <div className="physical-playground-modal-actions">
                <button onClick={confirmSelectionSurface}>
                  {selectionModal.surface.confirmLabel || 'Select items'}
                </button>
              </div>
            </div>
          </div>
        )}

        {procedureModal && (
          <div className="physical-playground-modal-backdrop" onClick={() => setProcedureModal(null)}>
            <div className="physical-playground-modal is-wide" onClick={(e) => e.stopPropagation()}>
              <div className="physical-playground-modal-header">
                <h2>{procedureModal.popup.label}</h2>
                <button onClick={() => setProcedureModal(null)} aria-label="Close procedure">×</button>
              </div>
              {!!latestWarning && <WarningCallout message={latestWarning} />}
              {procedureModal.popup.instruction && (
                <p>{renderContentWithGlossary(interpolate(procedureModal.popup.instruction, context))}</p>
              )}
              {!!procedureModal.popup.toolObjectIds?.length && (
                <div className="physical-playground-tool-row">
                  {procedureModal.popup.toolObjectIds.map((toolId) => {
                    const tool = derived.objects.find((object) => object.id === toolId)
                    const assetPath = tool ? getAssetPath(tool, lookup) : undefined
                    const consumed = isObjectConsumed(toolId)
                    return (
                      <button
                        key={toolId}
                        draggable={!consumed}
                        disabled={consumed}
                        onDragStart={() => setProcedureModal({ ...procedureModal, draggingToolId: toolId })}
                        onDragEnd={() => setProcedureModal({ ...procedureModal, draggingToolId: null })}
                      >
                        {assetPath && !consumed && <GeneratedAssetImage src={assetPath} label={tool?.label || toolId} compact />}
                        <span>{tool?.label || toolId}</span>
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="physical-playground-procedure-stage">
                {getAssetPath({ assetId: procedureModal.popup.closeupAssetId, assetPath: procedureModal.popup.closeupAssetPath }, lookup) && !procedureImageFailed && (
                  <img
                    src={getAssetPath({ assetId: procedureModal.popup.closeupAssetId, assetPath: procedureModal.popup.closeupAssetPath }, lookup)}
                    alt=""
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      setProcedureImageFailed(true)
                    }}
                  />
                )}
                {(!getAssetPath({ assetId: procedureModal.popup.closeupAssetId, assetPath: procedureModal.popup.closeupAssetPath }, lookup) || procedureImageFailed) && (
                  <div className="physical-playground-asset-placeholder is-selection">
                    <b>Image pending</b>
                    <span>{procedureModal.popup.label}</span>
                  </div>
                )}
                {(procedureModal.popup.actions || []).map((action) => {
                  const done = state.completedProcedureActions.includes(action.id)
                  const hold = needsHold(undefined, actionPrimitive(action))
                  const drag = DRAG_PRIMITIVES.has(actionPrimitive(action))
                  const activate = (toolId?: string | null) => completeProcedureAction(action, toolId)
                  return (
                    <button
                      key={action.id}
                      className={`physical-playground-procedure-target ${done ? 'is-complete' : ''}`}
                      style={stageStyle(action, 0, 'target')}
                      onDragOver={(e) => {
                        if (drag) e.preventDefault()
                      }}
                      onDrop={() => {
                        if (drag) activate(procedureModal.draggingToolId)
                      }}
                      onClick={() => {
                        if (!hold && !drag) activate(action.toolObjectId)
                      }}
                      onPointerDown={() => {
                        if (hold) beginHold(() => activate(action.toolObjectId))
                      }}
                      onPointerUp={() => {
                        if (hold) cancelHold(action.label)
                      }}
                      onPointerLeave={() => {
                        if (hold) cancelHold(action.label)
                      }}
                    >
                      <b>{done ? 'Done' : drag ? 'Drop here' : hold ? 'Hold' : 'Use'}</b>
                      <span>{action.label}</span>
                    </button>
                  )
                })}
              </div>
              <div className="physical-playground-modal-actions">
                <button onClick={() => completeProcedurePopup(procedureModal.popup)}>
                  {procedureModal.popup.completionLabel || 'Complete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </SceneWrapper>
  )
}
