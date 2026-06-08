// Generic, job-agnostic types for the Job Simulator Workflow.
// Per-job content is injected at scaffold time via storyline.ts / npcs.ts / rubric.json.

export type SceneType =
  | 'intro'
  | 'briefing'
  | 'multiple_choice'
  | 'free_text'
  | 'structured_entry'
  | 'screen_design_studio'
  | 'slack_thread'
  | 'email_thread'
  | 'live_chat'
  | 'voice_meeting'
  | 'interactive_canvas'
  | 'action_simulation'
  | 'physical_playground'
  | 'camera_shoot'
  | 'comment_queue'
  | 'campaign_studio'
  | 'npc_group_canvas'
  | 'section_transition'
  | 'grading'
  | 'final_report'
  | 'flow_diagram'
  | 'kanban_board'
  | 'priority_matrix'

export interface SlackMessageData {
  sender: string
  role: string
  timestamp: string
  content: string
  avatarInitials?: string
  avatarColor?: string
}

export interface EmailData {
  from: string
  to: string
  subject: string
  content: string
  body?: string
  isForwarded?: boolean
}

export interface MetricRow {
  metric: string
  target: string
  actual: string
  status: 'on_track' | 'warning' | 'critical'
}

export interface QuoteData {
  speaker: string
  role: string
  text: string
}

export interface BriefingSubStep {
  illustration?: string
  content?: string
  slackMessages?: SlackMessageData[]
  emails?: EmailData[]
  metrics?: MetricRow[]
  quotes?: QuoteData[]
}

export interface SourceInboxEntryMessage {
  channel: 'email' | 'slack'
  from: string
  to?: string
  subject?: string
  channelName?: string
  timestamp?: string
  category?: string
  lookFor?: string
  body: string
  linkLabel: string
}

export interface SourceInboxFileSection {
  heading: string
  body: string
}

export interface SourceInboxFileRow {
  [key: string]: string | undefined
}

export interface SourceInboxFile {
  id: string
  name: string
  kind: 'pdf' | 'doc' | 'text' | 'spreadsheet' | 'dashboard' | 'ticket' | 'email'
  modified?: string
  owner?: string
  category?: string
  lookFor?: string
  previewTitle: string
  summary?: string
  sections?: SourceInboxFileSection[]
  columns?: string[]
  rows?: SourceInboxFileRow[]
}

export interface SourceInbox {
  entryMessage: SourceInboxEntryMessage
  startOpen?: boolean
  folder: {
    name: string
    path: string
    updatedLabel?: string
    files: SourceInboxFile[]
  }
  requiredFileIds?: string[]
  continueLabel?: string
  desktop?: {
    width?: string
    height?: string
  }
}

export interface SourceWorkspaceMessage {
  id: string
  channel: 'email' | 'slack'
  from: string
  to?: string
  subject?: string
  channelName?: string
  timestamp?: string
  category?: string
  lookFor?: string
  body: string
  linkedFileIds?: string[]
}

export interface SourceWorkspaceApp {
  id: string
  label: string
  kind:
    | 'email'
    | 'slack'
    | 'drive'
    | 'folder'
    | 'dashboard'
    | 'spreadsheet'
    | 'crm'
    | 'ats'
    | 'data_room'
    | 'docs'
    | 'calendar'
    | 'ticket'
    | 'browser'
    | 'notion'
    | 'pos'
    | 'ehr'
    | 'analytics'
    | 'gis'
    | 'build_tracker'
    | 'generic'
  title?: string
  subtitle?: string
  category?: string
  lookFor?: string
  messages?: SourceWorkspaceMessage[]
  files?: SourceInboxFile[]
  sections?: SourceInboxFileSection[]
  columns?: string[]
  rows?: SourceInboxFileRow[]
}

export interface SourceWorkspace {
  introLabel?: string
  apps: SourceWorkspaceApp[]
  requiredSourceIds?: string[]
  continueLabel?: string
  desktop?: {
    width?: string
    height?: string
  }
}

export type NextRule =
  | string
  | null
  | {
      branchOn: string // node id whose branchFlag we read
      cases: Record<string, string>
      default: string
    }

export interface MCOption {
  id: string
  label: string
  body?: string
  branchFlag?: string
}

export interface ChatMessage {
  role: 'npc' | 'user'
  content: string
  ts?: string
  /** Override the display name for this NPC message (e.g. a third party chiming in on a thread) */
  npcName?: string
}

export interface CanvasZoneAction {
  type: 'open_chat' | 'open_email' | 'open_slack' | 'open_editor' | 'complete_scene'
  payload?: {
    npcId?: string
    goalPrompt?: string
    maxTurns?: number
    presetReplies?: PresetReply[]
    presetsOnly?: boolean
    thread?: ChatMessage[]
    from?: string
    subject?: string
    channel?: string
    bindingKey?: string
    prompt?: string
    minWords?: number
    maxWords?: number
  }
}

export interface CanvasZone {
  id: string
  xPct: number
  yPct: number
  wPct: number
  hPct: number
  label?: string
  action: CanvasZoneAction
}

export interface StructuredEntryField {
  key: string
  label: string
  placeholder?: string
  multiline?: boolean
  rows?: number
  maxWords?: number
}

export type WorkSurfaceKind =
  | 'slack_reply'
  | 'email_compose'
  | 'document_editor'
  | 'notion_doc'
  | 'spreadsheet_workbook'
  | 'figma_canvas'
  | 'screen_design_studio'
  | 'ats_screening'
  | 'canvas_inbox'
  | 'comment_queue'
  | 'camera_shoot'
  | 'campaign_builder'
  | 'kanban_board'
  | 'priority_matrix'
  | 'physical_action'
  | 'ticket_triage'
  | 'code_review'
  | 'generic_tool'

export type WorkSurfaceDevice = 'desktop' | 'laptop' | 'phone' | 'meeting' | 'document' | 'none'

export interface WorkSurfaceTab {
  id: string
  label: string
  content: string
}

export interface WorkSurfaceSpec {
  kind: WorkSurfaceKind
  device?: WorkSurfaceDevice
  appWindow?: BaseNode['appWindow'] | 'meeting'
  title?: string
  sourceTabs?: WorkSurfaceTab[]
  workTabs?: WorkSurfaceTab[]
  requiredFields?: string[]
  uiAppearance?: string
  playerExperience?: string
  goodExample?: string
  antiPattern?: string
}

export interface StructuredEntryDefinition {
  itemLabel: string
  fields: StructuredEntryField[]
  initialItems?: Record<string, string>[]
  initialCount?: number
  minItems?: number
  maxItems?: number
  bindingKey: string // where the array lives in freeTextResponses (JSON.stringify'd)
  presentation?:
    | 'cards'
    | 'table'
    | 'checklist'
    | 'screening_sheet'
    | 'issue_list'
    | 'comment_queue'
    | 'spreadsheet'
    | 'timeline_review'
}

export interface BaseNode {
  id: string
  type: SceneType
  section: number
  title: string
  content?: string
  illustration?: string
  imageBrief?: string
  isPivot?: boolean
  next?: NextRule
  appWindow?: 'doc' | 'slack' | 'email' | 'figma' | 'notion' | 'spreadsheet' | 'code' | 'miro' | 'kanban'
  windowTitle?: string
  workSurface?: WorkSurfaceSpec
  deskWorkDesign?: DeskWorkDesign
  sourceRealismException?: {
    approvedByUser: true
    reason: string
    reviewedAlternatives: string
  }
}

export interface DeskWorkDesign {
  roleFamily?: string
  workSurface?: string
  inputArtifacts?: {
    id: string
    label: string
    whereVisible?: string
    summary?: string
  }[]
  studentAction?: string
  outputArtifact?: string | {
    id?: string
    label?: string
    format?: string
  }
  rubricEvidence?: string[]
  continuity?: string[]
  authenticityCheck?: string
}

export interface IntroNode extends BaseNode {
  type: 'intro'
}

export interface BriefingNode extends BaseNode {
  type: 'briefing'
  briefingMode: 'simple' | 'sequential' | 'paginated'
  actionLabel?: string
  referenceTitle?: string
  referenceContent?: string
  sourceInbox?: SourceInbox
  sourceWorkspace?: SourceWorkspace
  subSteps?: BriefingSubStep[]
  pages?: BriefingSubStep[]
  slackMessages?: SlackMessageData[]
  emails?: EmailData[]
  metrics?: MetricRow[]
  quotes?: QuoteData[]
}

export interface MultipleChoiceNode extends BaseNode {
  type: 'multiple_choice'
  options: MCOption[]
  prompt?: string
  slackMessages?: SlackMessageData[]
}

export interface FreeTextNode extends BaseNode {
  type: 'free_text'
  prompt: string
  minWords?: number
  maxWords?: number
  placeholder?: string
  emailHeaders?: {
    from: string
    to: string
    subject: string
  }
  appTabs?: {
    id: string
    label: string
    content: string
  }[]
}

export interface StructuredEntryNode extends BaseNode {
  type: 'structured_entry'
  prompt: string
  referenceTitle?: string
  referenceContent?: string
  sourceWorkspace?: SourceWorkspace
  definition: StructuredEntryDefinition
}

export interface PresetReply {
  /** Optional id used to track which presets the user has clicked */
  id?: string
  /** Text submitted as the user message when clicked */
  text: string
  /** Optional short label for the chip; falls back to truncated `text` */
  label?: string
  /** If set, the chip writes this branchFlag (key = node id) when clicked */
  branchFlag?: string
}

export interface ChatNode extends BaseNode {
  type: 'slack_thread' | 'email_thread' | 'live_chat'
  npcId: string
  goalPrompt: string
  playerGoal?: string
  maxTurns?: number
  initialMessages?: ChatMessage[]
  /**
   * Optional canned replies the user can pick instead of typing.
   * Use when the realistic move is to choose between 2–4 stock responses
   * (e.g., a customer-service script) — typing is still available as a fallback.
   * If all replies have a `branchFlag`, this scene effectively gates a structural branch.
   */
  presetReplies?: PresetReply[]
  /** If true, hide the free-text input; user MUST pick a preset. Default false. */
  presetsOnly?: boolean
}

export interface VoiceMeetingNode extends BaseNode {
  type: 'voice_meeting'
  npcId: string
  goalPrompt: string
  playerGoal?: string
  endpoint?: string
  successCriteria?: string
  meetingContext?: string
  /** Use in_person for colocated workplace conversations; omit/remote for video or phone calls. */
  meetingMode?: 'in_person' | 'remote'
  /** Legacy alias used by older generated simulators; prefer meetingMode in new configs. */
  presentation?: 'in_person' | 'remote'
  prepReferenceTitle?: string
  prepReferenceContent?: string
  prepNoteKey?: string
  prepNoteTitle?: string
  minTurns?: number
  maxTurns?: number
  voiceName?: string
  initialMessages?: ChatMessage[]
}

export interface InteractiveCanvasNode extends BaseNode {
  type: 'interactive_canvas' | 'npc_group_canvas'
  zones: CanvasZone[]
  requireAllZones?: boolean
  requireMin?: number
  headerPrompt?: string
}

export interface ActionAssetSpec {
  id: string
  displayName: string
  assetType: 'background' | 'transparent_png' | 'readable_closeup' | 'state_variant' | 'overlay' | 'character'
  filename?: string
  prompt: string
  requiredStates?: string[]
}

export interface VisualAssetsRequired {
  backgrounds?: ActionAssetSpec[]
  characters?: ActionAssetSpec[]
  interactiveObjects?: ActionAssetSpec[]
  readableSurfaces?: ActionAssetSpec[]
  dropTargets?: ActionAssetSpec[]
  stateVariants?: ActionAssetSpec[]
  overlays?: ActionAssetSpec[]
}

export interface ActionInteractiveObject {
  id: string
  label: string
  x?: number
  y?: number
  w?: number
  h?: number
  assetId?: string
  assetPath?: string
  modalAssetId?: string
  modalAssetPath?: string
  interactionRole?: 'clickable' | 'draggable' | 'readable' | 'tool' | 'control'
  primitives?: string[]
  detail?: string
  readableText?: string
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
  required?: boolean
}

export interface ActionDropTarget {
  id: string
  label: string
  x?: number
  y?: number
  w?: number
  h?: number
  assetId?: string
  assetPath?: string
  accepts?: string[]
  detail?: string
}

export interface ActionSimulationStep {
  id: string
  label: string
  instruction: string
  digitalPrimitive: string
  x?: number
  y?: number
  w?: number
  h?: number
  objectIds?: string[]
  targetId?: string
  requiresSteps?: string[]
  requiresObjects?: string[]
  successFeedback?: string
  failureHint?: string
}

export interface PercentRect {
  x: number
  y: number
  w: number
  h: number
}

export interface CoordinateMapZone extends PercentRect {
  label: string
  role?: 'fixture' | 'person' | 'workspace' | 'target' | 'control' | 'empty_space'
}

export interface PlaygroundBackground {
  filename?: string
  prompt?: string
  coordinateMap?: CoordinateMapZone[]
}

export interface PlaygroundReadableSurface extends PercentRect {
  id: string
  label: string
  assetId?: string
  assetPath?: string
  modalAssetId?: string
  modalAssetPath?: string
  readableText?: string
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
  requiresSteps?: string[]
  requiresObjects?: string[]
  disabledHint?: string
  prompt?: string
  required?: boolean
}

export interface PlaygroundControl extends PercentRect {
  id: string
  label: string
  primitive?: string
  digitalPrimitive?: string
  assetId?: string
  assetPath?: string
  min?: number
  max?: number
  step?: number
  initialValue?: number
  successMin?: number
  successMax?: number
  requiredValue?: number
  requiresSteps?: string[]
  requiresObjects?: string[]
  requiresControls?: string[]
  disabledHint?: string
  targetDisclosure?: 'instruction_reveals_target' | 'infer_from_reference' | 'infer_from_visible_evidence' | 'prior_teaching'
  instructionRevealsTarget?: boolean
  unit?: string
  required?: boolean
}

export type PhysicalActionClassification =
  | 'inspect'
  | 'select'
  | 'move'
  | 'attach'
  | 'connect'
  | 'place'
  | 'hold'
  | 'type'
  | 'speak'
  | 'adjust'
  | 'dispose'

export interface PhysicalWorkDesign {
  realWorkflowScript?: string
  decomposition?: {
    evidence?: string[]
    objects?: string[]
    targets?: string[]
    procedure?: string[]
    stateChanges?: string[]
  }
  actionClassification?: {
    action?: string
    classification?: PhysicalActionClassification
    primitive?: string
    mappingRationale?: string
  }[]
  mainSceneRole?: string
  popupSceneRoles?: string[]
  statePersistence?: string
  antiButtonAudit?: string
}

export interface SelectionReference {
  type:
    | 'visible_document'
    | 'readable_item_labels'
    | 'prior_briefing_scene'
    | 'reference_panel'
    | 'work_order/spec/order/list'
    | 'professional_judgment_after_prior_teaching'
  title?: string
  content?: string
  sourceSceneId?: string
  surfaceId?: string
  noviceAdequacy?: string
}

export interface SelectionSurfaceHotspot extends PercentRect {
  objectId: string
  label: string
  assetId?: string
  assetPath?: string
  isCorrect?: boolean
  isDistractor?: boolean
  feedback?: string
}

export interface SelectionSurface {
  id: string
  label: string
  surfaceKind?: string
  x?: number
  y?: number
  w?: number
  h?: number
  assetId?: string
  assetPath?: string
  instruction?: string
  reference?: SelectionReference
  correctObjectIds?: string[]
  distractorObjectIds?: string[]
  allowMultiple?: boolean
  confirmLabel?: string
  noviceAdequacy?: string
  required?: boolean
  hotspots: SelectionSurfaceHotspot[]
}

export interface ProcedurePopupAction extends PercentRect {
  id: string
  label: string
  instruction?: string
  digitalPrimitive: string
  toolObjectId?: string
  targetId?: string
  requiresSteps?: string[]
  requiresObjects?: string[]
  consumesObjectIds?: string[]
  stateVariantAssetId?: string
}

export interface ProcedurePopup {
  id: string
  label: string
  x?: number
  y?: number
  w?: number
  h?: number
  triggerStepId?: string
  triggerObjectId?: string
  closeupAssetId?: string
  closeupAssetPath?: string
  instruction?: string
  toolObjectIds?: string[]
  targetIds?: string[]
  requiredSequence?: string[]
  holdTargets?: string[]
  completionLabel?: string
  actions?: ProcedurePopupAction[]
}

export interface ObjectStateRule {
  objectId: string
  x?: number
  y?: number
  w?: number
  h?: number
  persistsAfterUse?: boolean
  consumesOnUse?: boolean
  appearsWhen?: string[]
  disappearsWhen?: string[]
  stateVariantAssetId?: string
}

export interface StateChangeRule {
  id: string
  label?: string
  x?: number
  y?: number
  w?: number
  h?: number
  whenObject?: string
  whenStep?: string
  whenControl?: string
  assetId?: string
  assetPath?: string
}

export interface CompletionBehavior {
  footerLabel?: string
  actionAlreadyPerformedInPopup?: boolean
  forbiddenActionVerbs?: string[]
}

export interface VerificationFamily {
  family: string
  method: string
  visibleSurfaces?: string[]
  successRule?: string
}

export interface PhysicalPlaygroundFields {
  simulatedAction: string
  learningGoal: string
  digitalPrimitives: string[]
  physicalWorkDesign?: PhysicalWorkDesign
  selectionReference?: SelectionReference
  selectionSurface?: SelectionSurface | SelectionSurface[]
  procedurePopup?: ProcedurePopup | ProcedurePopup[]
  objectState?: ObjectStateRule[]
  stateChange?: StateChangeRule[]
  completionBehavior?: CompletionBehavior
  verificationFamily?: VerificationFamily | string
  background?: PlaygroundBackground
  visualAssetsRequired?: VisualAssetsRequired
  interactiveObjects?: ActionInteractiveObject[]
  dropTargets?: ActionDropTarget[]
  readableSurfaces?: PlaygroundReadableSurface[]
  controls?: PlaygroundControl[]
  steps?: ActionSimulationStep[]
  requiredObjectIds?: string[]
  requiredStepIds?: string[]
  requiredReadableSurfaceIds?: string[]
  requiredControlIds?: string[]
  successConditions?: string[]
  failureModes?: string[]
  gradingEvidence?: string[]
}

export interface ActionSimulationNode extends BaseNode, PhysicalPlaygroundFields {
  type: 'action_simulation'
}

export interface PhysicalPlaygroundNode extends BaseNode, PhysicalPlaygroundFields {
  type: 'physical_playground'
}

export interface SectionTransitionNode extends BaseNode {
  type: 'section_transition'
  actionLabel?: string
  ctaLabel?: string
}

export interface GradingNode extends BaseNode {
  type: 'grading'
}

export interface FinalReportNode extends BaseNode {
  type: 'final_report'
}

export interface FlowDiagramSceneNode extends BaseNode {
  type: 'flow_diagram'
  prompt: string
  bindingKey: string
  rationalePrompt?: string
  rationaleBindingKey?: string
  minNodes?: number
  minEdges?: number
}

export interface KanbanColumn {
  id: string
  label: string
}

export interface KanbanCard {
  id: string
  text: string
  initialColumn: string
}

export interface KanbanBoardNode extends BaseNode {
  type: 'kanban_board'
  columns: KanbanColumn[]
  cards: KanbanCard[]
  bindingKey: string
  referenceTitle?: string
  referenceContent?: string
  rationalePrompt?: string
  rationalePlaceholder?: string
  rationaleBindingKey?: string
  requireAllCardsMoved?: boolean
}

export interface MatrixAxis {
  label: string
  lowLabel: string
  highLabel: string
}

export interface MatrixItem {
  id: string
  label: string
}

export interface PriorityMatrixNode extends BaseNode {
  type: 'priority_matrix'
  xAxis: MatrixAxis
  yAxis: MatrixAxis
  items: MatrixItem[]
  bindingKey: string
  referenceTitle?: string
  referenceContent?: string
  rationalePrompt?: string
  rationalePlaceholder?: string
  rationaleBindingKey?: string
  requireAllItemsPlaced?: boolean
}

export interface ScreenDesignStudioNode extends BaseNode {
  type: 'screen_design_studio'
  prompt: string
  bindingKey: string
  minElements?: number
  minNotesChars?: number
  notesPlaceholder?: string
  referenceTitle?: string
  referenceContent?: string
}

export interface CommentQueueItem {
  id: string
  username: string
  text: string
}

export interface CommentQueueNode extends BaseNode {
  type: 'comment_queue'
  bindingKey: string
  contextTitle?: string
  contextNotes?: string[]
  comments: CommentQueueItem[]
}

export interface CameraShootBeat {
  id: string
  label: string
  prompt: string
  sourceField?: string
}

export interface CameraShootNode extends BaseNode {
  type: 'camera_shoot'
  bindingKey: string
  sourceBindingKey?: string
  maxSeconds?: number
  beatSeconds?: number
  minSelectedBeats?: number
  beats: CameraShootBeat[]
  captionPrompt: string
}

export interface CampaignStudioBackground {
  id: string
  label: string
  assetPath?: string
  prompt?: string
  thumbnailColor?: string
  accentColor?: string
  tone?: 'light' | 'dark' | 'medium'
  strategicFit?: 'strong' | 'weak'
  warning?: string
}

export interface CampaignStudioSticker {
  id: string
  label: string
  assetPath?: string
  prompt?: string
  relevance: 'aligned' | 'irrelevant'
  category?: string
  warning?: string
}

export interface CampaignStudioTextOption {
  id: string
  label: string
  text: string
  strategicFit?: 'strong' | 'weak'
  warning?: string
}

export interface CampaignStudioColorOption {
  id: string
  label: string
  value: string
  riskyOn?: string[]
}

export interface CampaignStudioNode extends BaseNode {
  type: 'campaign_studio'
  prompt: string
  referenceTitle?: string
  referenceContent?: string
  backgroundOptions: CampaignStudioBackground[]
  stickerOptions: CampaignStudioSticker[]
  headlineOptions: CampaignStudioTextOption[]
  proofTextOptions: CampaignStudioTextOption[]
  textColorOptions: CampaignStudioColorOption[]
  minHeadlineSize?: number
  minProofSize?: number
  maxStickers?: number
  rationalePrompt?: string
  rationalePlaceholder?: string
}

export type SceneNode =
  | IntroNode
  | BriefingNode
  | MultipleChoiceNode
  | FreeTextNode
  | StructuredEntryNode
  | ScreenDesignStudioNode
  | ChatNode
  | VoiceMeetingNode
  | InteractiveCanvasNode
  | ActionSimulationNode
  | PhysicalPlaygroundNode
  | CameraShootNode
  | CommentQueueNode
  | CampaignStudioNode
  | SectionTransitionNode
  | GradingNode
  | FinalReportNode
  | FlowDiagramSceneNode
  | KanbanBoardNode
  | PriorityMatrixNode

export interface Section {
  num: number
  label: string
}

export interface NPC {
  id: string
  name: string
  role: string
  persona: string
  voice?: string
  avatar?: string
}

export interface DevSkip {
  label: string
  targetNodeId: string
  prefillKey?: string
}

export interface Storyline {
  gameTitle: string
  startNode: string
  sections: Section[]
  nodes: Record<string, SceneNode>
  devSkips?: DevSkip[]
}

// Grading shapes (kept identical to reference so FinalReportScene + GradingCard work unchanged)
export interface CriterionResult {
  criterion: string
  score: number
  comment: string
}

export interface ScenarioResult {
  scenario_number: number
  scenario_title: string
  criteria: CriterionResult[]
}

export interface GradingResult {
  candidate_id: string
  simulation: string
  graded_at: string
  scenarios: ScenarioResult[]
  total_score: number
  max_score: number
  score_percentage: number
  recommendation: 'Strong Hire' | 'Hire' | 'Lean No Hire' | 'No Hire'
  overall_assessment: string
}

export interface RubricCriterion {
  name: string
  rubric_text: string
  evidenceSceneIds?: string[]
}

export interface RubricSection {
  section_number: number
  section_title: string
  criteria: RubricCriterion[]
}

export interface Rubric {
  simulation_id: string
  max_score_per_criterion: number
  sections: RubricSection[]
}
