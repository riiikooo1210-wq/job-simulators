import { useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import type { ClinicalActionItem, ClinicalActionNode, ClinicalStep, ClinicalSupply } from '../types/game'

interface Props { node: ClinicalActionNode }

const HAND_HYGIENE_FIRST_WARNING = 'Sanitize your hands before doing anything else in the room.'
const SAFETY_WARNING_RED = '#B87D6B'

interface ActionState {
  actions: string[]
  supplies: string[]
  steps: string[]
  warnings: string[]
  inspections: string[]
  sliders: Record<string, number>
}

type WorkKind = 'action' | 'step'
type Interaction = NonNullable<ClinicalActionItem['interaction']>
type WorkUnit = (ClinicalActionItem | ClinicalStep) & {
  interaction?: Interaction
  primitive?: string
  objectLabel?: string
  targetLabel?: string
  readableText?: string
  assetPath?: string
  completeAtPct?: number
}

interface DetailSubject {
  kind: WorkKind
  unit: WorkUnit
}

interface StagePlacement {
  x: number
  y: number
  w: number
  h: number
  label?: string
}

interface UnitStagePlacement {
  item: StagePlacement
  target?: StagePlacement
}

interface StageFixture extends StagePlacement {
  tone?: 'bed' | 'workstation' | 'wall' | 'tray' | 'danger'
}

interface StageLayout {
  fixtures: StageFixture[]
  supplyTarget?: StagePlacement
}

const emptyState: ActionState = { actions: [], supplies: [], steps: [], warnings: [], inspections: [], sliders: {} }

const ACTION_DEFAULTS: Record<string, Partial<ClinicalActionItem>> = {
  hand_hygiene: {
    interaction: 'press_hold',
    primitive: 'press_and_hold_target',
    objectLabel: 'Wall sanitizer pump',
    targetLabel: 'Dispense gel and rub hands clean',
    assetPath: '/action-assets/scene2_assessment/wall-sanitizer-pump.png',
  },
  confirm_patient: {
    interaction: 'read_match',
    primitive: 'confirm_matching_info',
    objectLabel: 'Wristband and bedside chart card',
    readableText: 'Wristband: Eleanor Vance | DOB 02/18/1938 | Room 512\nChart card: Mrs. Eleanor Vance | DOB 02/18/1938 | Post-op hip-fracture repair',
    assetPath: '/action-assets/scene2_assessment/wristband-readable-closeup.png',
  },
  bed_safety: {
    interaction: 'drag_to_target',
    primitive: 'drag_object_to_target',
    objectLabel: 'Call light cord',
    targetLabel: "Mrs. Vance's reachable hand area",
    assetPath: '/action-assets/scene2_assessment/call-light-cord.png',
  },
  pain_score: {
    interaction: 'inspect',
    primitive: 'read_label_from_image',
    objectLabel: 'Pain scale card',
    readableText: 'Mrs. Vance points to 8/10. She describes sharp right hip pain that worsens with turning.',
    assetPath: '/action-assets/scene2_assessment/pain-scale-card.png',
  },
  surgical_site: {
    interaction: 'inspect',
    primitive: 'zoom_to_inspect',
    objectLabel: 'Hip dressing closeup',
    readableText: 'Dressing dry and intact. Mild expected swelling. No spreading redness or active drainage.',
    assetPath: '/action-assets/scene2_assessment/hip-dressing-closeup.png',
  },
  neurovascular: {
    interaction: 'press_hold',
    primitive: 'press_and_hold_target',
    objectLabel: 'Pedal pulse point',
    targetLabel: 'Hold two fingers over the pulse point',
    readableText: 'Right foot warm. Sensation intact. Pedal pulse palpable.',
    assetPath: '/action-assets/scene2_assessment/pedal-pulse-closeup.png',
  },
  mobility_breathing: {
    interaction: 'inspect',
    primitive: 'inspect_image',
    objectLabel: 'Breathing and repositioning view',
    readableText: 'She splints, takes shallow breaths, and resists turning because of pain.',
    assetPath: '/action-assets/scene2_assessment/breathing-mobility-closeup.png',
  },
  review_orders: {
    interaction: 'read_match',
    primitive: 'read_document_excerpt',
    objectLabel: 'Tablet eMAR medication screen',
    readableText: 'Use the tablet eMAR medication screen.',
    assetPath: '/action-assets/scene2_assessment/mar-card.png',
  },
  review_mar: {
    interaction: 'read_match',
    primitive: 'read_document_excerpt',
    objectLabel: 'Tablet eMAR medication screen',
    readableText: 'Use the tablet eMAR medication screen.',
    assetPath: '/action-assets/scene2_assessment/mar-card.png',
  },
  check_allergies: {
    interaction: 'inspect',
    primitive: 'read_label_from_image',
    objectLabel: 'Tablet allergy banner',
    readableText: 'Tablet allergy banner: Morphine - nausea/vomiting, confusion.',
    assetPath: '/action-assets/scene2_med_pass/allergy-banner.svg',
  },
  scan_wristband: {
    interaction: 'drag_to_target',
    primitive: 'drag_object_to_target',
    objectLabel: 'Barcode scanner',
    targetLabel: 'Wristband barcode',
    assetPath: '/action-assets/scene2_med_pass/barcode-scanner.png',
  },
  assess_swallow: {
    interaction: 'inspect',
    primitive: 'inspect_image',
    objectLabel: 'Swallow readiness view',
    readableText: "Inspect Mrs. Vance's posture, alertness, water sip, and facial expression before deciding whether the oral medication is safe now.",
    assetPath: '/action-assets/scene2_med_pass/swallow-check.png',
  },
  verify_order: {
    interaction: 'read_match',
    primitive: 'read_document_excerpt',
    objectLabel: 'STAT CBC order card',
    readableText: 'Order: STAT CBC. Patient: Eleanor Vance. Room: 512. Tube: lavender top.',
    assetPath: '/action-assets/scene3_lab_draw/stat-cbc-order-card.png',
  },
  two_identifiers: {
    interaction: 'read_match',
    primitive: 'confirm_matching_info',
    objectLabel: 'Wristband and tube label',
    readableText: 'Wristband: Eleanor Vance, DOB 02/18/1938. Printed label: VANCE, ELEANOR, DOB 02/18/1938, CBC STAT.',
    assetPath: '/action-assets/scene3_lab_draw/wristband-label-match.png',
  },
  explain_draw: {
    interaction: 'click_hotspot',
    primitive: 'single_click_target',
    objectLabel: 'Patient explanation moment',
    targetLabel: 'Speak from bedside before starting',
    assetPath: '/action-assets/scene3_lab_draw/patient-explanation-moment.png',
  },
  raise_hob: {
    interaction: 'slider',
    primitive: 'vertical_slider',
    objectLabel: 'Bed head control',
    targetLabel: 'Raise head of bed above 60 degrees',
    completeAtPct: 70,
    assetPath: '/action-assets/scene4_stabilize/bed-head-control.png',
  },
  apply_oxygen: {
    interaction: 'drag_to_target',
    primitive: 'drag_object_to_target',
    objectLabel: 'Nasal cannula tubing',
    targetLabel: "Mr. Jones's face",
    assetPath: '/action-assets/scene4_stabilize/nasal-cannula.png',
  },
  stay_with_patient: {
    interaction: 'press_hold',
    primitive: 'timed_hold',
    objectLabel: 'Bedside presence zone',
    targetLabel: 'Keep eyes on the unstable patient',
    assetPath: '/action-assets/scene4_stabilize/bedside-presence-zone.png',
  },
  call_for_help: {
    interaction: 'click_hotspot',
    primitive: 'click_hotspot_in_image',
    objectLabel: 'Doorway with Marco',
    targetLabel: 'Call Marco into Room 514',
    assetPath: '/action-assets/scene4_stabilize/marco-doorway-hotspot.png',
  },
  full_vitals: {
    interaction: 'inspect',
    primitive: 'read_monitor_value',
    objectLabel: 'Full vital-sign monitor',
    readableText: 'SpO2 88%, RR 28, HR 122, BP 96/58, Temp 38.9 C. New confusion.',
    assetPath: '/action-assets/scene4_stabilize/vitals-monitor-closeup.png',
  },
  rapid_response: {
    interaction: 'press_hold',
    primitive: 'press_and_hold_target',
    objectLabel: 'Rapid response call control',
    targetLabel: 'Hold until the team is paged',
    assetPath: '/action-assets/scene4_stabilize/rapid-response-button.png',
  },
  prepare_sbar: {
    interaction: 'inspect',
    primitive: 'annotate_document',
    objectLabel: 'SBAR scratch card',
    readableText: 'S: acute hypoxia/confusion. B: cellulitis on IV antibiotics. A: SpO2 88%, RR 28, HR 122, BP 96/58, fever. R: rapid response and provider evaluation.',
    assetPath: '/action-assets/scene4_stabilize/sbar-scratch-card.png',
  },
}

const STEP_DEFAULTS: Record<string, Partial<ClinicalStep>> = {
  scan_medications: {
    interaction: 'read_match',
    primitive: 'confirm_matching_info',
    objectLabel: 'Medication barcode scan result',
    readableText: 'Tablet eMAR scanner result: acetaminophen IV and ibuprofen PO both match Eleanor Vance, Room 512, due 09:00.',
    assetPath: '/action-assets/scene2_med_pass/med-scan-result.png',
  },
  explain_meds: {
    interaction: 'click_hotspot',
    primitive: 'single_click_target',
    objectLabel: 'Bedside explanation moment',
    targetLabel: 'Tell Mrs. Vance what each medication is',
    assetPath: '/action-assets/scene2_med_pass/med-explanation-moment.png',
  },
  administer_ordered_meds: {
    interaction: 'press_hold',
    primitive: 'press_and_hold_target',
    objectLabel: 'IV pump and medication cup',
    targetLabel: 'Start IV med and give PO medication',
    assetPath: '/action-assets/scene2_med_pass/administer-medications.png',
  },
  set_reassessment: {
    interaction: 'inspect',
    primitive: 'enter_date_time',
    objectLabel: 'Tablet reassessment reminder',
    readableText: 'Reminder set: reassess pain, sedation, breathing, nausea, and response after medication.',
    assetPath: '/action-assets/scene2_med_pass/reassessment-reminder.png',
  },
  clean_site: {
    interaction: 'press_hold',
    primitive: 'press_and_hold_target',
    objectLabel: 'Alcohol swab on venipuncture site',
    targetLabel: 'Clean and let dry',
    assetPath: '/action-assets/scene3_lab_draw/alcohol-swab-site.png',
  },
  draw_specimen: {
    interaction: 'press_hold',
    primitive: 'timed_hold',
    objectLabel: 'Butterfly needle and lavender tube',
    targetLabel: 'Hold steady until tube fills',
    assetPath: '/action-assets/scene3_lab_draw/butterfly-lavender-tube.png',
  },
  secure_site: {
    interaction: 'press_hold',
    primitive: 'press_and_hold_target',
    objectLabel: 'Gauze over draw site',
    targetLabel: 'Hold pressure after needle removal',
    assetPath: '/action-assets/scene3_lab_draw/gauze-pressure.png',
  },
  label_bedside: {
    interaction: 'read_match',
    primitive: 'confirm_matching_info',
    objectLabel: 'Tube label at bedside',
    readableText: 'Tube label: VANCE, ELEANOR | DOB 02/18/1938 | Room 512 | CBC | collected at bedside.',
    assetPath: '/action-assets/scene3_lab_draw/tube-label-closeup.png',
  },
  dispose_send: {
    interaction: 'drag_to_target',
    primitive: 'drag_object_to_target',
    objectLabel: 'Labeled specimen bag',
    targetLabel: 'Lab transport bin',
    assetPath: '/action-assets/scene3_lab_draw/specimen-bag.PNG',
  },
}

const SUPPLY_ASSETS: Record<string, string> = {
  barcode_scanner: '/action-assets/scene2_med_pass/barcode-scanner.png',
  acetaminophen_bag: '/action-assets/scene2_med_pass/iv-acetaminophen-bag.png',
  ibuprofen: '/action-assets/scene2_med_pass/ibuprofen-tablet.png',
  water_cup: '/action-assets/scene2_med_pass/water-cup.png',
  flush: '/action-assets/scene2_med_pass/saline-flush.png',
  pain_scale: '/action-assets/scene2_med_pass/pain-scale-card.png',
  gloves: '/action-assets/scene3_lab_draw/gloves.PNG',
  tourniquet: '/action-assets/scene3_lab_draw/tourniquet.PNG',
  alcohol_swab: '/action-assets/scene3_lab_draw/alcohol-swap.PNG',
  butterfly: '/action-assets/scene3_lab_draw/butterfly-needle.PNG',
  lavender_tube: '/action-assets/scene3_lab_draw/lavender-tube.PNG',
  labels: '/action-assets/scene3_lab_draw/specimen-labels.PNG',
  gauze: '/action-assets/scene3_lab_draw/gauze-tape.PNG',
  specimen_bag: '/action-assets/scene3_lab_draw/specimen-bag.PNG',
  sharps: '/action-assets/scene3_lab_draw/sharps-container.png',
}

const STAGE_LAYOUTS: Record<string, StageLayout> = {
  scene2_assessment: {
    fixtures: [
      { label: 'sanitizer wall', x: 5, y: 25, w: 15, h: 28, tone: 'wall' },
      { label: 'Mrs. Vance bed', x: 30, y: 28, w: 47, h: 48, tone: 'bed' },
      { label: 'vitals monitor', x: 72, y: 13, w: 18, h: 17, tone: 'workstation' },
      { label: 'bedside table', x: 8, y: 65, w: 20, h: 18, tone: 'tray' },
      { label: 'rolling workstation', x: 75, y: 57, w: 18, h: 28, tone: 'workstation' },
    ],
  },
  scene2_med_pass: {
    fixtures: [
      { label: 'MAR workstation', x: 5, y: 11, w: 25, h: 36, tone: 'workstation' },
      { label: 'Mrs. Vance bed', x: 42, y: 25, w: 42, h: 43, tone: 'bed' },
      { label: 'supply shelf', x: 5, y: 63, w: 31, h: 28, tone: 'tray' },
      { label: 'prep tray', x: 38, y: 68, w: 25, h: 20, tone: 'tray' },
      { label: 'IV pole/pump', x: 79, y: 42, w: 16, h: 28, tone: 'workstation' },
    ],
    supplyTarget: { label: 'prep tray', x: 38, y: 68, w: 25, h: 20 },
  },
  scene3_lab_draw: {
    fixtures: [
      { label: 'EMR order screen', x: 5, y: 12, w: 24, h: 24, tone: 'workstation' },
      { label: 'Mrs. Vance bed', x: 45, y: 18, w: 42, h: 43, tone: 'bed' },
      { label: 'blood draw tray', x: 16, y: 61, w: 48, h: 26, tone: 'tray' },
      { label: 'sharps container', x: 80, y: 62, w: 12, h: 23, tone: 'danger' },
      { label: 'lab transport bin', x: 66, y: 72, w: 14, h: 14, tone: 'workstation' },
    ],
    supplyTarget: { label: 'blood draw tray', x: 16, y: 61, w: 48, h: 26 },
  },
  scene4_stabilize: {
    fixtures: [
      { label: 'oxygen wall', x: 5, y: 16, w: 18, h: 28, tone: 'wall' },
      { label: 'Mr. Jones bed', x: 36, y: 25, w: 43, h: 47, tone: 'bed' },
      { label: 'bed controls', x: 18, y: 64, w: 17, h: 18, tone: 'workstation' },
      { label: 'monitor', x: 72, y: 10, w: 20, h: 20, tone: 'workstation' },
      { label: 'doorway', x: 82, y: 32, w: 13, h: 25, tone: 'wall' },
    ],
  },
}

const UNIT_PLACEMENTS: Record<string, UnitStagePlacement> = {
  hand_hygiene: { item: { x: 8, y: 31, w: 10, h: 15 } },
  confirm_patient: { item: { x: 56, y: 50, w: 14, h: 11 } },
  bed_safety: {
    item: { x: 63, y: 72, w: 11, h: 11 },
    target: { label: "Mrs. Vance's hand", x: 69, y: 52, w: 12, h: 11 },
  },
  pain_score: { item: { x: 13, y: 68, w: 12, h: 12 } },
  surgical_site: { item: { x: 46, y: 49, w: 13, h: 11 } },
  neurovascular: { item: { x: 66, y: 65, w: 11, h: 10 } },
  mobility_breathing: { item: { x: 38, y: 34, w: 16, h: 13 } },
  review_orders: { item: { x: 82, y: 63, w: 14, h: 10 } },
  review_mar: { item: { x: 25, y: 48, w: 17, h: 7 } },
  check_allergies: { item: { x: 25, y: 57, w: 17, h: 7 } },
  scan_wristband: {
    item: { x: 12, y: 70, w: 10, h: 10 },
    target: { label: 'wristband barcode', x: 56, y: 50, w: 13, h: 11 },
  },
  assess_swallow: { item: { x: 60, y: 35, w: 15, h: 13 } },
  scan_medications: { item: { x: 25, y: 66, w: 17, h: 7 } },
  explain_meds: { item: { x: 56, y: 38, w: 16, h: 13 } },
  administer_ordered_meds: { item: { x: 78, y: 47, w: 14, h: 17 } },
  set_reassessment: { item: { x: 25, y: 75, w: 19, h: 7 } },
  verify_order: { item: { x: 9, y: 17, w: 15, h: 12 } },
  two_identifiers: { item: { x: 59, y: 38, w: 15, h: 11 } },
  explain_draw: { item: { x: 50, y: 26, w: 16, h: 12 } },
  clean_site: { item: { x: 54, y: 43, w: 13, h: 11 } },
  draw_specimen: { item: { x: 41, y: 61, w: 14, h: 14 } },
  secure_site: { item: { x: 56, y: 57, w: 13, h: 12 } },
  label_bedside: { item: { x: 61, y: 65, w: 13, h: 11 } },
  dispose_send: {
    item: { x: 56, y: 74, w: 12, h: 11 },
    target: { label: 'lab transport bin', x: 68, y: 73, w: 12, h: 12 },
  },
  raise_hob: { item: { x: 21, y: 66, w: 13, h: 12 } },
  apply_oxygen: {
    item: { x: 9, y: 38, w: 13, h: 11 },
    target: { label: "Mr. Jones's face", x: 54, y: 34, w: 13, h: 12 },
  },
  stay_with_patient: { item: { x: 39, y: 56, w: 16, h: 13 } },
  call_for_help: { item: { x: 84, y: 36, w: 10, h: 13 } },
  full_vitals: { item: { x: 75, y: 13, w: 14, h: 13 } },
  rapid_response: { item: { x: 10, y: 20, w: 12, h: 12 } },
  prepare_sbar: { item: { x: 16, y: 76, w: 15, h: 12 } },
}

const SUPPLY_PLACEMENTS: Record<string, StagePlacement> = {
  barcode_scanner: { x: 8, y: 66, w: 8, h: 8 },
  acetaminophen_bag: { x: 18, y: 66, w: 8, h: 10 },
  ibuprofen: { x: 27, y: 66, w: 7, h: 8 },
  water_cup: { x: 8, y: 78, w: 7, h: 8 },
  flush: { x: 18, y: 78, w: 8, h: 8 },
  pain_scale: { x: 28, y: 78, w: 8, h: 8 },
  gloves: { x: 18, y: 64, w: 7, h: 7 },
  tourniquet: { x: 27, y: 64, w: 7, h: 7 },
  alcohol_swab: { x: 36, y: 64, w: 7, h: 7 },
  butterfly: { x: 45, y: 64, w: 8, h: 7 },
  lavender_tube: { x: 54, y: 64, w: 7, h: 7 },
  labels: { x: 18, y: 76, w: 7, h: 7 },
  gauze: { x: 27, y: 76, w: 7, h: 7 },
  specimen_bag: { x: 36, y: 76, w: 8, h: 7 },
  sharps: { x: 82, y: 67, w: 8, h: 12 },
}

function parseState(raw: string | undefined): ActionState {
  if (!raw) return emptyState
  try {
    const parsed = JSON.parse(raw)
    return {
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      supplies: Array.isArray(parsed.supplies) ? parsed.supplies : [],
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      inspections: Array.isArray(parsed.inspections) ? parsed.inspections : [],
      sliders: parsed.sliders && typeof parsed.sliders === 'object' ? parsed.sliders : {},
    }
  } catch {
    return emptyState
  }
}

function uniq(list: string[]) {
  return Array.from(new Set(list))
}

function statusColor(status?: 'normal' | 'watch' | 'critical') {
  if (status === 'critical') return '#B87D6B'
  if (status === 'watch') return '#D2A39A'
  return '#3A6B5E'
}

function enrichAction(item: ClinicalActionItem): WorkUnit {
  return { ...ACTION_DEFAULTS[item.id], ...item, interaction: item.interaction || ACTION_DEFAULTS[item.id]?.interaction || 'inspect' }
}

function enrichStep(step: ClinicalStep): WorkUnit {
  return { ...STEP_DEFAULTS[step.id], ...step, interaction: step.interaction || STEP_DEFAULTS[step.id]?.interaction || 'click_hotspot' }
}

function enrichSupply(supply: ClinicalSupply): ClinicalSupply {
  return { ...supply, assetPath: supply.assetPath || SUPPLY_ASSETS[supply.id] }
}

function interactionLabel(interaction?: Interaction) {
  if (interaction === 'press_hold') return 'hold'
  if (interaction === 'drag_to_target') return 'drag'
  if (interaction === 'slider') return 'slide'
  if (interaction === 'read_match') return 'match'
  if (interaction === 'inspect') return 'inspect'
  return 'tap'
}

function primitiveLabel(unit: WorkUnit) {
  return unit.primitive || unit.interaction || 'single_click_target'
}

function stageStyle(place: StagePlacement): CSSProperties {
  return {
    left: `${place.x}%`,
    top: `${place.y}%`,
    width: `${place.w}%`,
    height: `${place.h}%`,
  }
}

function fixtureColor(tone?: StageFixture['tone']) {
  if (tone === 'bed') return 'rgba(247,241,227,0.18)'
  if (tone === 'workstation') return 'rgba(107,158,166,0.18)'
  if (tone === 'wall') return 'rgba(239,232,210,0.16)'
  if (tone === 'danger') return 'rgba(184,125,107,0.18)'
  return 'rgba(205,191,148,0.2)'
}

export default function ClinicalActionScene({ node }: Props) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const [draggingSupply, setDraggingSupply] = useState<string | null>(null)
  const [draggingUnit, setDraggingUnit] = useState<DetailSubject | null>(null)
  const [detailSubject, setDetailSubject] = useState<DetailSubject | null>(null)
  const [holdingId, setHoldingId] = useState<string | null>(null)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const state = useMemo(() => parseState(responses[node.id]), [responses, node.id])
  const actions = useMemo(
    () => (node.actionGroups || []).map((group) => ({ ...group, items: group.items.map(enrichAction) })),
    [node.actionGroups]
  )
  const supplies = useMemo(() => (node.supplies || []).map(enrichSupply), [node.supplies])
  const steps = useMemo(() => (node.steps || []).map(enrichStep), [node.steps])
  const context = { playerName, branchFlags, mcSelections }
  const stageUnits = [
    ...actions.flatMap((group) => group.items.map((unit) => ({ kind: 'action' as const, groupLabel: group.label, unit }))),
    ...steps.map((unit, index) => ({ kind: 'step' as const, groupLabel: 'Procedure', unit: { ...unit, label: `${index + 1}. ${unit.label}` } })),
  ]
  const primitives = node.digitalPrimitives || inferPrimitives(stageUnits.map((item) => item.unit))

  const save = (next: ActionState) => {
    setFreeTextResponse(node.id, JSON.stringify({
      mode: node.mode,
      title: node.title,
      simulatedAction: node.simulatedAction || node.objective,
      digitalPrimitives: primitives,
      actions: next.actions,
      supplies: next.supplies,
      steps: next.steps,
      inspections: next.inspections,
      sliders: next.sliders,
      warnings: next.warnings,
    }, null, 2))
  }

  const addWarning = (message: string) => {
    save({ ...state, warnings: uniq([...state.warnings, message]) })
  }

  const missingDependencies = (unit: WorkUnit) => [
    ...(unit.requiresSupplies || []).filter((id) => !state.supplies.includes(id)),
    ...(unit.requiresActions || []).filter((id) => !state.actions.includes(id)),
    ...(unit.requiresSteps || []).filter((id) => !state.steps.includes(id)),
  ]
  const dependencyDone = (id: string) => (
    state.supplies.includes(id)
    || state.actions.includes(id)
    || state.steps.includes(id)
    || state.inspections.includes(id)
  )
  const warningDependencyIds = (warning: string) => {
    const match = warning.match(/^Tried ".+" before completing:\s*(.+)\.$/)
    if (!match) return []
    return match[1].split(',').map((id) => id.trim()).filter(Boolean)
  }
  const warningResolved = (warning: string) => {
    if (warning === HAND_HYGIENE_FIRST_WARNING) return dependencyDone('hand_hygiene')

    const dependencyIds = warningDependencyIds(warning)
    if (dependencyIds.length) return dependencyIds.every(dependencyDone)

    return false
  }
  const activeWarnings = state.warnings.filter((warning) => !warningResolved(warning))

  const completeUnit = (kind: WorkKind, unit: WorkUnit, extra?: Partial<ActionState>) => {
    const doneList = kind === 'action' ? state.actions : state.steps
    if (doneList.includes(unit.id)) return
    const missing = missingDependencies(unit)
    if (missing.length) {
      addWarning(`Tried "${unit.label}" before completing: ${missing.join(', ')}.`)
      return
    }
    save({
      ...state,
      ...extra,
      actions: kind === 'action' ? uniq([...state.actions, unit.id]) : state.actions,
      steps: kind === 'step' ? uniq([...state.steps, unit.id]) : state.steps,
      inspections: unit.interaction === 'inspect' || unit.interaction === 'read_match'
        ? uniq([...state.inspections, unit.id, ...(extra?.inspections || [])])
        : extra?.inspections || state.inspections,
    })
  }

  const addSupply = (id: string) => {
    if (state.supplies.includes(id)) return
    save({ ...state, supplies: uniq([...state.supplies, id]) })
  }

  const startHold = (kind: WorkKind, unit: WorkUnit) => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    setHoldingId(unit.id)
    holdTimerRef.current = setTimeout(() => {
      completeUnit(kind, unit)
      setHoldingId(null)
    }, 750)
  }

  const cancelHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    setHoldingId(null)
  }

  const updateSlider = (kind: WorkKind, unit: WorkUnit, value: number) => {
    const sliders = { ...state.sliders, [unit.id]: value }
    const threshold = unit.completeAtPct ?? 70
    if (value >= threshold && !(kind === 'action' ? state.actions : state.steps).includes(unit.id)) {
      const missing = missingDependencies(unit)
      if (missing.length) {
        save({ ...state, sliders, warnings: uniq([...state.warnings, `Tried "${unit.label}" before completing: ${missing.join(', ')}.`]) })
        return
      }
      save({
        ...state,
        sliders,
        actions: kind === 'action' ? uniq([...state.actions, unit.id]) : state.actions,
        steps: kind === 'step' ? uniq([...state.steps, unit.id]) : state.steps,
      })
      return
    }
    save({ ...state, sliders })
  }

  const handleUnitClick = (kind: WorkKind, unit: WorkUnit) => {
    if (unit.interaction === 'inspect' || unit.interaction === 'read_match') {
      setDetailSubject({ kind, unit })
      return
    }
    if (unit.interaction === 'drag_to_target') {
      addWarning(`Drag "${unit.objectLabel || unit.label}" to "${unit.targetLabel || 'the target'}" in the room image.`)
      return
    }
    if (unit.interaction === 'slider') return
    completeUnit(kind, unit)
  }

  const requiredActions = node.requiredActionIds || []
  const requiredSupplies = node.requiredSupplyIds || []
  const requiredSteps = node.requiredStepIds || node.steps?.map((s) => s.id) || []
  const enoughActions = requiredActions.length
    ? requiredActions.every((id) => state.actions.includes(id))
    : state.actions.length >= (node.minActions || 0)
  const enoughSupplies = requiredSupplies.every((id) => state.supplies.includes(id))
  const enoughSteps = requiredSteps.every((id) => state.steps.includes(id))
  const canSubmit = enoughActions && enoughSupplies && enoughSteps
  const completedLabels = [
    ...actions.flatMap((group) => group.items.filter((item) => state.actions.includes(item.id)).map((item) => item.label)),
    ...supplies.filter((item) => state.supplies.includes(item.id)).map((item) => item.label),
    ...steps.filter((item) => state.steps.includes(item.id)).map((item) => item.label),
  ]

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
          <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', fontWeight: 700, color: '#3A6B5E' }}>
            {renderContentWithGlossary(interpolate(node.objective, context))}
          </div>
        </div>

        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, context))}
          </div>
        )}

        <ClinicalStage
          node={node}
          units={stageUnits}
          supplies={supplies}
          state={state}
          draggingSupply={draggingSupply}
          draggingUnit={draggingUnit}
          holdingId={holdingId}
          onSupplyDragStart={setDraggingSupply}
          onSupplyDragEnd={() => setDraggingSupply(null)}
          onSupplyAdd={addSupply}
          onUnitDragStart={setDraggingUnit}
          onUnitDragEnd={() => setDraggingUnit(null)}
          onUnitComplete={completeUnit}
          onUnitClick={handleUnitClick}
          onHoldStart={startHold}
          onHoldEnd={cancelHold}
          onSlider={updateSlider}
        />

        <section
          style={{
            border: '1px solid #000',
            boxShadow: '4px 4px 0 #000',
            background: '#F7F1E3',
            padding: '0.875rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))',
            gap: '0.75rem',
          }}
        >
          {node.patientCard && <PatientPanel node={node} />}
          {!!node.vitals?.length && <VitalsPanel vitals={node.vitals} />}
          <CompletedPanel labels={completedLabels} />
        </section>

        {!!activeWarnings.length && (
          <div style={{ border: '1px solid #B87D6B', background: '#F2EBD9', padding: '0.75rem' }}>
            <PanelTitle title="Safety Feedback" danger />
            <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: '0.78rem', lineHeight: 1.45 }}>
              {activeWarnings.map((warning) => (
                <li
                  key={warning}
                  style={{
                    color: warning === HAND_HYGIENE_FIRST_WARNING ? SAFETY_WARNING_RED : undefined,
                    fontWeight: warning === HAND_HYGIENE_FIRST_WARNING ? 900 : undefined,
                  }}
                >
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {canSubmit && node.resultContent && (
          <div style={{ background: '#EFE8D2', border: '1px solid #000', padding: '0.875rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
            <strong>{node.resultTitle || 'Result'}: </strong>
            {renderContentWithGlossary(interpolate(node.resultContent, context))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <ActionButton
            text="Complete action"
            onClick={() => goNext(node)}
            disabled={!canSubmit}
            variant={canSubmit ? 'primary' : 'secondary'}
            fullWidth={false}
          />
          {!canSubmit && (
            <span style={{ fontSize: '0.75rem', color: '#666' }}>
              Complete the required bedside interactions in the image before continuing.
            </span>
          )}
        </div>

        {import.meta.env.DEV && (
          <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
        )}
      </motion.div>

      {detailSubject && (
        <InspectionModal
          subject={detailSubject}
          onClose={() => setDetailSubject(null)}
          onConfirm={() => {
            completeUnit(detailSubject.kind, detailSubject.unit, {
              inspections: uniq([...state.inspections, detailSubject.unit.id]),
            })
            setDetailSubject(null)
          }}
        />
      )}
    </SceneWrapper>
  )
}

function inferPrimitives(units: WorkUnit[]) {
  return uniq(units.map(primitiveLabel))
}

function ClinicalStage({
  node,
  units,
  supplies,
  state,
  draggingSupply,
  draggingUnit,
  holdingId,
  onSupplyDragStart,
  onSupplyDragEnd,
  onSupplyAdd,
  onUnitDragStart,
  onUnitDragEnd,
  onUnitComplete,
  onUnitClick,
  onHoldStart,
  onHoldEnd,
  onSlider,
}: {
  node: ClinicalActionNode
  units: { kind: WorkKind; groupLabel: string; unit: WorkUnit }[]
  supplies: ClinicalSupply[]
  state: ActionState
  draggingSupply: string | null
  draggingUnit: DetailSubject | null
  holdingId: string | null
  onSupplyDragStart: (id: string) => void
  onSupplyDragEnd: () => void
  onSupplyAdd: (id: string) => void
  onUnitDragStart: (subject: DetailSubject) => void
  onUnitDragEnd: () => void
  onUnitComplete: (kind: WorkKind, unit: WorkUnit) => void
  onUnitClick: (kind: WorkKind, unit: WorkUnit) => void
  onHoldStart: (kind: WorkKind, unit: WorkUnit) => void
  onHoldEnd: () => void
  onSlider: (kind: WorkKind, unit: WorkUnit, value: number) => void
}) {
  const layout = STAGE_LAYOUTS[node.id] || { fixtures: [] }
  return (
    <section
      style={{
        border: '1px solid #000',
        boxShadow: '5px 5px 0 #000',
        background: '#EFE8D2',
        padding: '0.75rem',
      }}
    >
      <div style={{ marginBottom: '0.55rem' }}>
        <PanelTitle title={node.patientCard?.room ? `Room ${node.patientCard.room}` : 'Bedside'} />
      </div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          border: '1px solid #000',
          background: '#D9CFB9',
          touchAction: 'none',
        }}
      >
        {node.illustration && (
          <img
            src={node.illustration}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(event) => { event.currentTarget.style.display = 'none' }}
          />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(30,30,26,0.08), rgba(30,30,26,0.18))' }} />

        {layout.fixtures.map((fixture) => (
          <div key={fixture.label} style={{ ...stageStyle(fixture), position: 'absolute', border: '1px solid rgba(0,0,0,0.42)', background: fixtureColor(fixture.tone), boxShadow: 'inset 0 0 0 1px rgba(247,241,227,0.25)' }}>
            <span style={{ position: 'absolute', left: 4, top: 3, fontSize: '0.55rem', fontWeight: 900, color: '#F7F1E3', textShadow: '0 1px 2px #000', textTransform: 'uppercase' }}>
              {fixture.label}
            </span>
          </div>
        ))}

        {layout.supplyTarget && (
          <StageDropZone
            placement={layout.supplyTarget}
            active={Boolean(draggingSupply)}
            done={state.supplies.length > 0}
            label={layout.supplyTarget.label || 'prep tray'}
            detail={state.supplies.length ? `${state.supplies.length} selected` : 'drag supplies here'}
            onDrop={() => {
              if (draggingSupply) onSupplyAdd(draggingSupply)
              onSupplyDragEnd()
            }}
          />
        )}

        {supplies.map((supply) => {
          const placement = SUPPLY_PLACEMENTS[supply.id] || { x: 5, y: 80, w: 8, h: 8 }
          const selected = state.supplies.includes(supply.id)
          return (
            <StageSupply
              key={supply.id}
              supply={supply}
              placement={placement}
              selected={selected}
              onDragStart={() => onSupplyDragStart(supply.id)}
              onDragEnd={onSupplyDragEnd}
              onClick={() => onSupplyAdd(supply.id)}
            />
          )
        })}

        {units
          .filter(({ unit }) => unit.interaction === 'drag_to_target')
          .map(({ kind, unit }) => {
            const placement = UNIT_PLACEMENTS[unit.id]
            if (!placement?.target) return null
            const done = kind === 'action' ? state.actions.includes(unit.id) : state.steps.includes(unit.id)
            return (
              <StageDropZone
                key={`target-${kind}-${unit.id}`}
                placement={placement.target}
                active={draggingUnit?.unit.id === unit.id}
                done={done}
                label={placement.target.label || unit.targetLabel || 'target'}
                detail={done ? 'placed' : 'drop here'}
                onDrop={() => {
                  if (draggingUnit?.unit.id === unit.id) onUnitComplete(kind, unit)
                  onUnitDragEnd()
                }}
              />
            )
          })}

        {units.map(({ kind, groupLabel, unit }) => {
          const placement = UNIT_PLACEMENTS[unit.id]?.item || { x: 42, y: 42, w: 12, h: 12 }
          const done = kind === 'action' ? state.actions.includes(unit.id) : state.steps.includes(unit.id)
          return (
            <StageUnit
              key={`${kind}-${unit.id}`}
              groupLabel={groupLabel}
              kind={kind}
              unit={unit}
              placement={placement}
              done={done}
              holding={holdingId === unit.id}
              sliderValue={state.sliders[unit.id] || 0}
              onClick={() => onUnitClick(kind, unit)}
              onHoldStart={() => onHoldStart(kind, unit)}
              onHoldEnd={onHoldEnd}
              onDragStart={() => onUnitDragStart({ kind, unit })}
              onDragEnd={onUnitDragEnd}
              onSlider={(value) => onSlider(kind, unit, value)}
            />
          )
        })}
      </div>
    </section>
  )
}

function StageUnit({
  groupLabel,
  unit,
  placement,
  done,
  holding,
  sliderValue,
  onClick,
  onHoldStart,
  onHoldEnd,
  onDragStart,
  onDragEnd,
  onSlider,
}: {
  groupLabel: string
  kind: WorkKind
  unit: WorkUnit
  placement: StagePlacement
  done: boolean
  holding: boolean
  sliderValue: number
  onClick: () => void
  onHoldStart: () => void
  onHoldEnd: () => void
  onDragStart: () => void
  onDragEnd: () => void
  onSlider: (value: number) => void
}) {
  const draggable = unit.interaction === 'drag_to_target' && !done
  const [imageFailed, setImageFailed] = useState(false)
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      style={{
        ...stageStyle(placement),
        position: 'absolute',
        zIndex: done ? 8 : 12,
        border: `2px solid ${done ? '#3A6B5E' : '#000'}`,
        background: done ? 'rgba(217,207,185,0.92)' : 'rgba(247,241,227,0.94)',
        boxShadow: done ? 'none' : '2px 2px 0 #000',
        padding: '0.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem',
        cursor: draggable ? 'grab' : 'default',
        overflow: 'hidden',
      }}
      title={`${groupLabel}: ${unit.label}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.25rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.52rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>{interactionLabel(unit.interaction)}</span>
        {done && <span style={{ fontSize: '0.62rem', fontWeight: 900, color: '#3A6B5E' }}>done</span>}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {unit.assetPath && !imageFailed ? (
          <img src={unit.assetPath} alt="" onError={() => setImageFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: '0.66rem', lineHeight: 1.12, fontWeight: 900, textAlign: 'center', color: '#1E1E1A' }}>
            {unit.objectLabel || unit.label}
          </span>
        )}
      </div>
      {unit.interaction === 'press_hold' && !done && (
        <button
          onPointerDown={onHoldStart}
          onPointerUp={onHoldEnd}
          onPointerLeave={onHoldEnd}
          style={stageControlStyle(holding)}
        >
          {holding ? 'holding' : 'hold'}
        </button>
      )}
      {unit.interaction === 'slider' && !done && (
        <div style={{ background: '#EFE8D2', border: '1px solid #000', padding: '0.1rem' }}>
          <input
            type="range"
            min={0}
            max={100}
            value={sliderValue}
            onChange={(event) => onSlider(Number(event.target.value))}
            style={{ width: '100%', accentColor: '#3A6B5E', display: 'block' }}
          />
        </div>
      )}
      {unit.interaction !== 'press_hold' && unit.interaction !== 'slider' && unit.interaction !== 'drag_to_target' && !done && (
        <button onClick={onClick} style={stageControlStyle(false)}>
          open
        </button>
      )}
      {unit.interaction === 'drag_to_target' && !done && (
        <button onClick={onClick} style={stageControlStyle(false)}>
          drag
        </button>
      )}
    </div>
  )
}

function StageSupply({
  supply,
  placement,
  selected,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  supply: ClinicalSupply
  placement: StagePlacement
  selected: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onClick: () => void
}) {
  const [imageFailed, setImageFailed] = useState(false)
  return (
    <button
      draggable={!selected}
      disabled={selected}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        ...stageStyle(placement),
        position: 'absolute',
        zIndex: 10,
        border: '2px solid #000',
        background: selected ? 'rgba(217,207,185,0.9)' : 'rgba(242,235,217,0.95)',
        boxShadow: selected ? 'none' : '2px 2px 0 #000',
        padding: '0.2rem',
        cursor: selected ? 'default' : 'grab',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}
      title={supply.label}
    >
      {supply.assetPath && !imageFailed ? (
        <img src={supply.assetPath} alt="" onError={() => setImageFailed(true)} style={{ width: '100%', height: '58%', objectFit: 'contain' }} />
      ) : (
        <div style={{ fontSize: '0.58rem', fontWeight: 900, lineHeight: 1.1, color: '#1E1E1A' }}>{supply.label}</div>
      )}
      <div style={{ fontSize: '0.5rem', fontWeight: 900, color: selected ? '#3A6B5E' : '#1E1E1A', lineHeight: 1.05 }}>
        {selected ? 'on tray' : supply.label}
      </div>
    </button>
  )
}

function StageDropZone({
  placement,
  active,
  done,
  label,
  detail,
  onDrop,
}: {
  placement: StagePlacement
  active: boolean
  done: boolean
  label: string
  detail: string
  onDrop: () => void
}) {
  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      style={{
        ...stageStyle(placement),
        position: 'absolute',
        zIndex: 9,
        border: `2px dashed ${done ? '#3A6B5E' : active ? '#B87D6B' : '#000'}`,
        background: done ? 'rgba(58,107,94,0.18)' : active ? 'rgba(184,125,107,0.24)' : 'rgba(239,232,210,0.18)',
        color: '#F7F1E3',
        textShadow: '0 1px 2px #000',
        padding: '0.25rem',
        fontSize: '0.58rem',
        fontWeight: 900,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        pointerEvents: 'auto',
      }}
    >
      <span>{label}</span>
      <span style={{ opacity: 0.86 }}>{detail}</span>
    </div>
  )
}

function PatientPanel({ node }: { node: ClinicalActionNode }) {
  const patient = node.patientCard
  if (!patient) return null
  return (
    <div style={{ background: '#EFE8D2', border: '1px solid #000', padding: '0.75rem' }}>
      <PanelTitle title="Patient" />
      <div style={{ fontWeight: 900, marginTop: '0.35rem' }}>{patient.patient}</div>
      <div style={{ fontSize: '0.78rem', lineHeight: 1.45, color: '#333' }}>
        {patient.room && <div>Room: {patient.room}</div>}
        {patient.diagnosis && <div>Dx: {patient.diagnosis}</div>}
        {patient.status && <div>Status: {patient.status}</div>}
        {patient.note && <div style={{ marginTop: '0.375rem' }}>{patient.note}</div>}
      </div>
    </div>
  )
}

function VitalsPanel({ vitals }: { vitals: NonNullable<ClinicalActionNode['vitals']> }) {
  return (
    <div style={{ background: '#1E1E1A', border: '1px solid #000', padding: '0.75rem', color: '#F2EBD9' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#D2A39A', marginBottom: '0.5rem' }}>
        Monitor
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
        {vitals.map((vital) => (
          <div key={vital.label} style={{ border: '1px solid rgba(242,235,217,0.25)', padding: '0.45rem' }}>
            <div style={{ fontSize: '0.65rem', opacity: 0.72 }}>{vital.label}</div>
            <div style={{ color: statusColor(vital.status), fontSize: '1rem', fontWeight: 900 }}>
              {vital.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function CompletedPanel({ labels }: { labels: string[] }) {
  return (
    <div style={{ background: '#EFE8D2', border: '1px solid #000', padding: '0.75rem', minHeight: 110 }}>
      <PanelTitle title="Completed" />
      {labels.length ? (
        <ol style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem', fontSize: '0.76rem', lineHeight: 1.45 }}>
          {labels.map((label) => <li key={label}>{label}</li>)}
        </ol>
      ) : (
        <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '0.4rem' }}>Nothing done yet.</div>
      )}
    </div>
  )
}

function InspectionModal({ subject, onClose, onConfirm }: { subject: DetailSubject; onClose: () => void; onConfirm: () => void }) {
  const unit = subject.unit
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,30,26,0.62)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: 'min(720px, 100%)', maxHeight: '90dvh', overflow: 'auto', background: '#F7F1E3', border: '2px solid #000', boxShadow: '8px 8px 0 #000', padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>
              {interactionLabel(unit.interaction)}
            </div>
            <h2 style={{ margin: '0.25rem 0 0', fontSize: '1.1rem', lineHeight: 1.25 }}>{unit.objectLabel || unit.label}</h2>
          </div>
          <button onClick={onClose} style={{ border: '1px solid #000', background: '#EFE8D2', padding: '0.3rem 0.55rem', fontWeight: 900, cursor: 'pointer' }}>
            Close
          </button>
        </div>
        <div style={{ marginTop: '0.875rem', display: 'grid', gridTemplateColumns: 'minmax(min(100%, 220px), 0.85fr) 1fr', gap: '0.875rem' }}>
          <InspectionVisual assetPath={unit.assetPath} label={unit.objectLabel || unit.label} />
          <div style={{ border: '1px solid #CDBF94', background: '#FFF8E8', padding: '0.875rem', whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: 1.55 }}>
            {unit.readableText || unit.detail || 'Inspect the closeup and confirm what you observe.'}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.625rem', marginTop: '1rem' }}>
          <button onClick={onClose} style={{ border: '1px solid #000', background: '#EFE8D2', padding: '0.55rem 0.8rem', fontWeight: 900, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ border: '1px solid #000', background: '#3A6B5E', color: '#F7F1E3', padding: '0.55rem 0.8rem', fontWeight: 900, cursor: 'pointer' }}>
            Confirm observation
          </button>
        </div>
      </div>
    </div>
  )
}

function InspectionVisual({ assetPath, label }: { assetPath?: string; label: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div style={{ border: '1px solid #CDBF94', background: '#FFF8E8', minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0.5rem', textAlign: 'center' }}>
      {assetPath && !failed ? (
        <img src={assetPath} alt="" onError={() => setFailed(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      ) : (
        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#3A6B5E' }}>{label}</span>
      )}
    </div>
  )
}

function PanelTitle({ title, danger }: { title: string; danger?: boolean }) {
  return (
    <div style={{ fontSize: '0.75rem', fontWeight: 900, color: danger ? '#9b2d20' : '#3A6B5E', textTransform: 'uppercase' }}>
      {title}
    </div>
  )
}

function stageControlStyle(active: boolean): CSSProperties {
  return {
    width: '100%',
    border: '1px solid #000',
    background: active ? '#3A6B5E' : '#EFE8D2',
    color: active ? '#F7F1E3' : '#1E1E1A',
    padding: '0.16rem 0.2rem',
    fontSize: '0.58rem',
    fontWeight: 900,
    cursor: 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
  }
}
