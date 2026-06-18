import type {
  AssessmentResult,
  CareerProfile,
  CareerProfileItem,
  CareerSignalId,
  GradingResult,
  Rubric,
  TaskFeedbackLevel,
  TaskFeedbackResult,
} from '../types/game'

export const ASSESSMENT_VERSION = 'career-exploration-v1'
export const ASSESSMENT_SEED = 734921

export interface AssessmentState {
  playerName: string
  visitedNodes: string[]
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
  freeTextResponses: Record<string, string>
  npcConversations: Record<string, { role: 'npc' | 'user'; content: string; ts?: string; npcName?: string }[]>
}

export const VOLATILE_KEYS = new Set(['at', 'ts', 'graded_at'])

interface SignalDefinition {
  id: CareerSignalId
  title: string
  strengthTemplate: string
  growthTemplate: string
  transferablePattern: string
  practiceSuggestion: string
}

const SIGNAL_LIBRARY: SignalDefinition[] = [
  {
    id: 'evidence_use',
    title: 'Using evidence',
    strengthTemplate: 'You tended to ground your work in the information available instead of guessing.',
    growthTemplate: 'Your next step is to name the evidence more explicitly before making a recommendation.',
    transferablePattern: 'You may enjoy settings where careful reading, noticing details, and backing up ideas matter.',
    practiceSuggestion: 'When you make a claim, add one sentence that starts with “I know this because...”.',
  },
  {
    id: 'prioritization',
    title: 'Choosing what matters first',
    strengthTemplate: 'You showed a signal for sorting competing needs and deciding what deserves attention first.',
    growthTemplate: 'Your next step is to explain the tradeoff behind your priority, not only the choice itself.',
    transferablePattern: 'You may do well in experiences where people balance urgency, impact, and limited time.',
    practiceSuggestion: 'Before starting a task, write the top two priorities and what you are intentionally leaving for later.',
  },
  {
    id: 'communication',
    title: 'Communicating with people',
    strengthTemplate: 'You showed care for how information lands with another person.',
    growthTemplate: 'Your next step is to make your message a little more specific, especially about next steps.',
    transferablePattern: 'You may like roles or activities where listening, explaining, and aligning people are part of the work.',
    practiceSuggestion: 'After a conversation, summarize what the other person cares about and the next action in one note.',
  },
  {
    id: 'systems_thinking',
    title: 'Seeing how parts connect',
    strengthTemplate: 'You noticed how one decision affects the broader workflow or experience.',
    growthTemplate: 'Your next step is to separate the immediate symptom from the deeper system cause.',
    transferablePattern: 'You may enjoy work where maps, flows, rules, or cause-and-effect relationships shape the answer.',
    practiceSuggestion: 'Draw a quick “because chain” with three links: problem, likely cause, and downstream effect.',
  },
  {
    id: 'craft_iteration',
    title: 'Improving the work product',
    strengthTemplate: 'You showed a signal for revising an artifact toward a clearer or more useful version.',
    growthTemplate: 'Your next step is to connect each revision to the user, player, customer, or audience need it serves.',
    transferablePattern: 'You may enjoy experiences where rough drafts become stronger through feedback and iteration.',
    practiceSuggestion: 'For your next draft, label one thing to keep, one thing to change, and why each choice helps.',
  },
  {
    id: 'procedural_care',
    title: 'Following careful procedures',
    strengthTemplate: 'You showed attention to sequence, safety, and doing steps in a reliable order.',
    growthTemplate: 'Your next step is to slow down at checkpoints where skipping one step can change the outcome.',
    transferablePattern: 'You may be drawn to hands-on or responsibility-heavy settings where process quality matters.',
    practiceSuggestion: 'Use a short checklist before a high-stakes task: verify, act, document, reassess.',
  },
  {
    id: 'adaptability',
    title: 'Adapting when things change',
    strengthTemplate: 'You showed a signal for responding when the situation shifted or new constraints appeared.',
    growthTemplate: 'Your next step is to state what changed and how that changes your plan.',
    transferablePattern: 'You may enjoy environments where the right answer evolves as new information comes in.',
    practiceSuggestion: 'When a plan changes, write “New information / What I will adjust / What stays the same.”',
  },
  {
    id: 'documentation',
    title: 'Making work usable for others',
    strengthTemplate: 'You showed a signal for leaving behind notes or artifacts that another person can use.',
    growthTemplate: 'Your next step is to make your documentation more concrete about decisions, owners, and open questions.',
    transferablePattern: 'You may fit experiences where clarity, handoffs, and organized thinking help a team move forward.',
    practiceSuggestion: 'End written work with three labels: decision, reason, and follow-up.',
  },
  {
    id: 'problem_framing',
    title: 'Framing the real problem',
    strengthTemplate: 'You showed a signal for defining the problem before jumping to an answer.',
    growthTemplate: 'Your next step is to make the problem statement sharper: who is affected, what is happening, and why it matters.',
    transferablePattern: 'You may enjoy work where a good answer starts with naming the right question.',
    practiceSuggestion: 'Before proposing a fix, write one sentence in this shape: “For [person], [problem] matters because [impact].”',
  },
  {
    id: 'user_empathy',
    title: 'Understanding people’s needs',
    strengthTemplate: 'You showed attention to what another person might be experiencing, not only the task itself.',
    growthTemplate: 'Your next step is to connect empathy to action: what changes because you understood the person’s need?',
    transferablePattern: 'You may like roles or activities where understanding people improves the quality of the work.',
    practiceSuggestion: 'Name the person, their concern, and the practical support they need next.',
  },
  {
    id: 'inquiry_listening',
    title: 'Asking useful questions',
    strengthTemplate: 'You showed a signal for learning through questions instead of assuming the answer.',
    growthTemplate: 'Your next step is to ask questions that invite examples, behavior, and context instead of yes/no confirmation.',
    transferablePattern: 'You may do well in settings where listening carefully changes the plan.',
    practiceSuggestion: 'Turn one opinion question into a behavior question that starts with “Tell me about the last time...”.',
  },
  {
    id: 'tradeoff_reasoning',
    title: 'Reasoning through tradeoffs',
    strengthTemplate: 'You showed a signal for weighing benefits, risks, and constraints before choosing a path.',
    growthTemplate: 'Your next step is to say what you are choosing not to do and why that choice protects the goal.',
    transferablePattern: 'You may enjoy work where decisions require balancing impact, effort, risk, and timing.',
    practiceSuggestion: 'For one decision, write “I choose A over B because... The risk is... I will watch...”.',
  },
  {
    id: 'data_reasoning',
    title: 'Interpreting data signals',
    strengthTemplate: 'You showed a signal for using numbers or observed patterns to guide your judgment.',
    growthTemplate: 'Your next step is to explain what the data can and cannot prove before acting on it.',
    transferablePattern: 'You may like experiences where measurements, trends, or patterns help people decide what to do.',
    practiceSuggestion: 'Write one sentence for the signal, one for the likely interpretation, and one for the uncertainty.',
  },
  {
    id: 'safety_mindset',
    title: 'Protecting safety and trust',
    strengthTemplate: 'You showed attention to actions that keep people safe, respected, or protected from avoidable harm.',
    growthTemplate: 'Your next step is to identify the highest-risk checkpoint before you move quickly.',
    transferablePattern: 'You may be drawn to settings where responsibility, trust, and careful safeguards matter.',
    practiceSuggestion: 'Before a high-stakes action, ask: “What is the one mistake I most need to prevent?”',
  },
  {
    id: 'collaboration',
    title: 'Working through others',
    strengthTemplate: 'You showed a signal for helping other people move forward with shared context.',
    growthTemplate: 'Your next step is to make the handoff more mutual: what do they need from you, and what do you need from them?',
    transferablePattern: 'You may enjoy team settings where progress depends on alignment across different roles.',
    practiceSuggestion: 'End a team note with “What I need from you” and “What you can expect from me.”',
  },
  {
    id: 'planning_follow_through',
    title: 'Turning plans into next steps',
    strengthTemplate: 'You showed a signal for converting an idea into a sequence someone can act on.',
    growthTemplate: 'Your next step is to make the next action smaller, clearer, and easier to verify.',
    transferablePattern: 'You may fit work where momentum comes from organized steps, owners, and follow-through.',
    practiceSuggestion: 'Write the next action with an owner, a condition for done, and one follow-up check.',
  },
  {
    id: 'quality_control',
    title: 'Checking work against a standard',
    strengthTemplate: 'You showed a signal for noticing whether work meets a clear standard instead of relying on vibes.',
    growthTemplate: 'Your next step is to define the standard before judging whether the work succeeded.',
    transferablePattern: 'You may enjoy experiences where testing, review, accuracy, or quality gates matter.',
    practiceSuggestion: 'Before reviewing work, list two observable pass/fail checks.',
  },
  {
    id: 'technical_translation',
    title: 'Translating across details and intent',
    strengthTemplate: 'You showed a signal for connecting high-level intent to practical implementation details.',
    growthTemplate: 'Your next step is to separate what must be true from what can be flexible in implementation.',
    transferablePattern: 'You may like work that bridges people, tools, specifications, and real-world constraints.',
    practiceSuggestion: 'Split a request into three lines: goal, must-have behavior, and flexible implementation detail.',
  },
]

const SIGNAL_BY_ID = SIGNAL_LIBRARY.reduce((acc, signal) => {
  acc[signal.id] = signal
  return acc
}, {} as Record<CareerSignalId, SignalDefinition>)

const DEFAULT_SIGNAL_IDS: CareerSignalId[] = ['evidence_use']

const DISPLAY_TITLE_BY_RUBRIC_NAME: Record<string, string> = {
  'タスク別採点': 'Task Feedback',
  '現行画面調査': 'Current Flow Audit',
  '問題要約': 'Problem Brief',
  '利用者面談': 'User Interview',
  '要件文書': 'PRD Slice',
  '最初の判断': 'Initial Product Judgment',
  '仕組みの問題整理': 'Mechanic Problem Framing',
  '試遊観察リスト': 'Playtest Watchlist',
  '試遊実行': 'Playtest Observation',
  '仕様更新': 'Spec Update',
  '設計説明通話': 'Engineering Handoff',
  '朝の優先判断': 'Morning Prioritization',
  '部屋512観察': 'Room 512 Assessment',
  '家族対応': 'Family Conversation',
  '薬の安全確認・投与・再評価': 'Medication Safety Workflow',
  '医師への連絡': 'Physician Communication',
  '採血ワークフロー': 'Lab Draw Workflow',
  '申し送り': 'SBAR Handoff',
}

export function displayTitleForRubricName(name: string): string {
  return DISPLAY_TITLE_BY_RUBRIC_NAME[name] ?? name
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function sortRecord<T>(record: Record<string, T>, normalizeValue: (value: T) => unknown): Record<string, unknown> {
  return Object.keys(record)
    .sort()
    .reduce((acc, key) => {
      acc[key] = normalizeValue(record[key])
      return acc
    }, {} as Record<string, unknown>)
}

function canonicalizeUnknown(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeUnknown)
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? normalizeText(value) : value
  }

  return Object.keys(value as Record<string, unknown>)
    .filter((key) => !VOLATILE_KEYS.has(key))
    .sort()
    .reduce((acc, key) => {
      acc[key] = canonicalizeUnknown((value as Record<string, unknown>)[key])
      return acc
    }, {} as Record<string, unknown>)
}

function normalizeResponseValue(value: string): string {
  try {
    return JSON.stringify(canonicalizeUnknown(JSON.parse(value)))
  } catch {
    return normalizeText(value)
  }
}

export function canonicalizeAssessmentState(state: AssessmentState): AssessmentState {
  const normalizedConversations = sortRecord(state.npcConversations, (messages) =>
    messages.map((message) => ({
      role: message.role,
      content: normalizeText(message.content),
      ...(message.npcName ? { npcName: normalizeText(message.npcName) } : {}),
    }))
  ) as AssessmentState['npcConversations']

  return {
    playerName: normalizeText(state.playerName || 'Anonymous'),
    visitedNodes: [...state.visitedNodes],
    branchFlags: sortRecord(state.branchFlags, normalizeText) as Record<string, string>,
    mcSelections: sortRecord(state.mcSelections, normalizeText) as Record<string, string>,
    freeTextResponses: sortRecord(state.freeTextResponses, normalizeResponseValue) as Record<string, string>,
    npcConversations: normalizedConversations,
  }
}

export function stableStringifyForAssessment(value: unknown): string {
  return JSON.stringify(canonicalizeUnknown(value))
}

export function createStateFingerprint(state: AssessmentState): string {
  const input = stableStringifyForAssessment(canonicalizeAssessmentState(state))
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function getCareerSignalTitle(signalId: CareerSignalId): string {
  return SIGNAL_BY_ID[signalId]?.title ?? signalId
}

function clampScore(score: number, maxScore: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(maxScore, Math.round(score)))
}

function levelFromScore(score: number): TaskFeedbackLevel {
  if (score >= 9) return 'Strong signal'
  if (score >= 7) return 'Solid signal'
  if (score >= 4) return 'Developing signal'
  return 'Early signal'
}

function archivedRecommendation(scorePercentage: number): GradingResult['recommendation'] {
  if (scorePercentage >= 0.8) return 'Strong Hire'
  if (scorePercentage >= 0.65) return 'Hire'
  if (scorePercentage >= 0.45) return 'Lean No Hire'
  return 'No Hire'
}

export function normalizeLegacyGradeArchive(result: GradingResult, rubric: Rubric, stateFingerprint: string): GradingResult {
  const maxPerCriterion = rubric.max_score_per_criterion || 10
  const scenarios = result.scenarios.map((scenario) => ({
    ...scenario,
    criteria: scenario.criteria.map((criterion) => ({
      ...criterion,
      score: clampScore(criterion.score, maxPerCriterion),
      comment: normalizeText(criterion.comment || 'This task gives useful evidence for your next practice step.'),
    })),
  }))
  const totalScore = scenarios.reduce((sum, scenario) => (
    sum + scenario.criteria.reduce((inner, criterion) => inner + criterion.score, 0)
  ), 0)
  const criteriaCount = scenarios.reduce((sum, scenario) => sum + scenario.criteria.length, 0)
  const maxScore = criteriaCount * maxPerCriterion
  const scorePercentage = maxScore > 0 ? Number((totalScore / maxScore).toFixed(2)) : 0

  return {
    ...result,
    graded_at: `${ASSESSMENT_VERSION}:${stateFingerprint}`,
    scenarios,
    total_score: totalScore,
    max_score: maxScore,
    score_percentage: scorePercentage,
    recommendation: archivedRecommendation(scorePercentage),
    overall_assessment: normalizeText(result.overall_assessment || 'This simulation shows several useful career signals.'),
  }
}

function signalIdsForCriterion(rubric: Rubric, criterionName: string): CareerSignalId[] {
  for (const section of rubric.sections) {
    const criterion = section.criteria.find((item) => item.name === criterionName)
    if (criterion?.careerSignalIds?.length) return criterion.careerSignalIds
  }
  return DEFAULT_SIGNAL_IDS
}

function sectionTitleForCriterion(rubric: Rubric, criterionName: string, fallback: string): string {
  for (const section of rubric.sections) {
    if (section.criteria.some((item) => item.name === criterionName)) {
      return displayTitleForRubricName(section.section_title)
    }
  }
  return displayTitleForRubricName(fallback)
}

function buildTaskFeedback(legacy: GradingResult, rubric: Rubric): TaskFeedbackResult[] {
  return legacy.scenarios.flatMap((scenario) =>
    scenario.criteria.map((criterion) => ({
      task: displayTitleForRubricName(criterion.criterion),
      section_title: sectionTitleForCriterion(rubric, criterion.criterion, scenario.scenario_title),
      level: levelFromScore(criterion.score),
      evidence: criterion.comment,
      career_signal_ids: signalIdsForCriterion(rubric, criterion.criterion),
    }))
  )
}

function average(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function rankingScoreFromLevel(level: TaskFeedbackLevel): number {
  if (level === 'Strong signal') return 10
  if (level === 'Solid signal') return 8
  if (level === 'Developing signal') return 5
  return 2
}

function firstEvidenceForSignal(tasks: TaskFeedbackResult[], signalId: CareerSignalId): string {
  return tasks.find((task) => task.career_signal_ids.includes(signalId))?.evidence
    ?? 'Several task choices contributed to this pattern.'
}

function buildCareerProfile(tasks: TaskFeedbackResult[]): CareerProfile {
  const signalScores = new Map<CareerSignalId, number[]>()
  for (const task of tasks) {
    for (const signalId of task.career_signal_ids) {
      signalScores.set(signalId, [...(signalScores.get(signalId) || []), rankingScoreFromLevel(task.level)])
    }
  }

  const rankedSignals = SIGNAL_LIBRARY
    .map((signal, index) => ({
      signal,
      index,
      avg: average(signalScores.get(signal.id) || []),
      count: signalScores.get(signal.id)?.length || 0,
    }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.avg - a.avg || b.count - a.count || a.index - b.index)

  const strengthSignals = rankedSignals.filter((entry) => entry.avg >= 7).slice(0, 3)
  const selectedStrengths = strengthSignals.length ? strengthSignals : rankedSignals.slice(0, 2)
  const selectedStrengthIds = new Set(selectedStrengths.map((entry) => entry.signal.id))
  const growthSignals = [...rankedSignals]
    .filter((entry) => !selectedStrengthIds.has(entry.signal.id))
    .sort((a, b) => a.avg - b.avg || b.count - a.count || a.index - b.index)
    .slice(0, 2)

  const strengths: CareerProfileItem[] = selectedStrengths.map(({ signal }) => ({
    signal_id: signal.id,
    title: signal.title,
    body: signal.strengthTemplate,
    evidence: firstEvidenceForSignal(tasks, signal.id),
  }))

  const growth_edges: CareerProfileItem[] = growthSignals.map(({ signal }) => ({
    signal_id: signal.id,
    title: signal.title,
    body: signal.growthTemplate,
    evidence: firstEvidenceForSignal(tasks, signal.id),
  }))

  const headline = strengths.length
    ? `Your strongest career signals showed up in ${strengths.map((item) => item.title.toLowerCase()).join(', ')}.`
    : 'This simulation gives you a first set of career signals to reflect on.'

  const patternSignals = strengths.length ? strengths : tasks.slice(0, 2).flatMap((task) =>
    task.career_signal_ids.map((signalId) => ({
      signal_id: signalId,
      title: getCareerSignalTitle(signalId),
      body: SIGNAL_BY_ID[signalId]?.strengthTemplate ?? '',
      evidence: task.evidence,
    }))
  )

  return {
    headline,
    strengths,
    growth_edges,
    transferable_patterns: patternSignals
      .map((item) => SIGNAL_BY_ID[item.signal_id]?.transferablePattern)
      .filter(Boolean)
      .slice(0, 3),
    practice_suggestions: [...strengths, ...growth_edges]
      .map((item) => SIGNAL_BY_ID[item.signal_id]?.practiceSuggestion)
      .filter(Boolean)
      .slice(0, 4),
  }
}

export function buildAssessmentResult(rawLegacy: GradingResult, rubric: Rubric, state: AssessmentState): AssessmentResult {
  const state_fingerprint = createStateFingerprint(state)
  const legacy_grade_archive = normalizeLegacyGradeArchive(rawLegacy, rubric, state_fingerprint)
  const task_feedback = buildTaskFeedback(legacy_grade_archive, rubric)

  return {
    candidate_id: legacy_grade_archive.candidate_id,
    simulation: legacy_grade_archive.simulation,
    assessment_version: ASSESSMENT_VERSION,
    state_fingerprint,
    task_feedback,
    career_profile: buildCareerProfile(task_feedback),
    legacy_grade_archive,
  }
}
