// Generic, job-agnostic types for the Job Simulator Workflow.
// Per-job content is injected at scaffold time via storyline.ts / npcs.ts / rubric.json.

export type SceneType =
  | 'intro'
  | 'briefing'
  | 'multiple_choice'
  | 'free_text'
  | 'structured_entry'
  | 'slack_thread'
  | 'email_thread'
  | 'live_chat'
  | 'voice_meeting'
  | 'interactive_canvas'
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
}

export interface EmailData {
  from: string
  to: string
  subject: string
  content: string
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

export interface AppTab {
  id: string
  label: string
  content: string
}

export interface BriefingSubStep {
  illustration?: string
  content?: string
  slackMessages?: SlackMessageData[]
  emails?: EmailData[]
  metrics?: MetricRow[]
  quotes?: QuoteData[]
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

export interface StructuredEntryDefinition {
  itemLabel: string
  fields: StructuredEntryField[]
  initialCount?: number
  minItems?: number
  maxItems?: number
  bindingKey: string // where the array lives in freeTextResponses (JSON.stringify'd)
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
  appTabs?: AppTab[]
  supportDocTitle?: string
  supportDocResponseKey?: string
  supportDocResponseTitle?: string
  supportDocResponseFallback?: string
  supportDocContent?: string
}

export interface IntroNode extends BaseNode {
  type: 'intro'
}

export interface BriefingNode extends BaseNode {
  type: 'briefing'
  briefingMode: 'simple' | 'sequential' | 'paginated'
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
}

export interface StructuredEntryNode extends BaseNode {
  type: 'structured_entry'
  prompt: string
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
  meetingContext?: string
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

export interface SectionTransitionNode extends BaseNode {
  type: 'section_transition'
  ctaLabel?: string
  actionLabel?: string
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
  rationalePrompt?: string
  rationaleBindingKey?: string
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
  rationalePrompt?: string
  rationaleBindingKey?: string
}

export type SceneNode =
  | IntroNode
  | BriefingNode
  | MultipleChoiceNode
  | FreeTextNode
  | StructuredEntryNode
  | ChatNode
  | VoiceMeetingNode
  | InteractiveCanvasNode
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
