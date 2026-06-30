// Generic Gemini service: gradeResponses (single batch call at end-of-sim)
// + npcReply (per-NPC chat replies during the simulation).
//
// Per-job content:
//   - simulationDoc (?raw markdown) — the full per-job sim doc with rubric
//   - rubric (JSON) — structured rubric used to fill the response template
import type { ChatMessage, GradingResult, Rubric, MultipleChoiceNode } from '../types/game'
import { storyline } from '../data/storyline'
import { npcs } from '../data/npcs'
// @ts-ignore — Vite ?raw import
import simulationDoc from '../data/job-simulation.md?raw'
import rubricJson from '../data/rubric.json'

const rubric = rubricJson as Rubric

const GRADING_MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash']
const NPC_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash']
const API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY
  if (!key || key === 'your_gemini_api_key_here') {
    throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env file.')
  }
  return key
}

interface GeminiCallOpts {
  models: string[]
  prompt: string
  temperature: number
  jsonMode: boolean
  systemInstruction?: string
}

async function callGemini(opts: GeminiCallOpts): Promise<string> {
  const apiKey = getApiKey()
  let lastError: unknown = null
  for (const model of opts.models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const body: Record<string, unknown> = {
          contents: [{ parts: [{ text: opts.prompt }] }],
          generationConfig: {
            temperature: opts.temperature,
            ...(opts.jsonMode ? { responseMimeType: 'application/json' } : {}),
          },
        }
        if (opts.systemInstruction) {
          body.systemInstruction = { parts: [{ text: opts.systemInstruction }] }
        }
        const res = await fetch(`${API_URL_BASE}/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.text()
          // 4xx (auth/permission/not-found) won't recover with retries — try next model
          if (res.status >= 400 && res.status < 500) {
            lastError = new Error(`${model} HTTP ${res.status}: ${err.slice(0, 200)}`)
            break
          }
          throw new Error(`${model} HTTP ${res.status}: ${err.slice(0, 200)}`)
        }
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) throw new Error(`${model}: empty response`)
        return text
      } catch (e) {
        lastError = e
        // small backoff between retries
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
      }
    }
  }
  throw new Error(`All Gemini models failed. Last error: ${lastError instanceof Error ? lastError.message : lastError}`)
}

// ============================================================================
// NPC reply
// ============================================================================

export async function npcReply(args: {
  npcId: string
  history: ChatMessage[]
  goalPrompt: string
  channel?: 'slack' | 'email' | 'chat'
}): Promise<string> {
  const npc = npcs[args.npcId]
  if (!npc) throw new Error(`Unknown NPC '${args.npcId}'`)

  const channelInstruction = {
    slack: 'Respond as a Slack message: short, conversational, occasional emoji acceptable.',
    email: 'Respond as an email: greeting, 2–4 short paragraphs, sign-off with your first name.',
    chat: 'Respond as a live chat / spoken reply: natural dialogue, ≤120 words.',
  }[args.channel ?? 'chat']

  const system = `You are ${npc.name}, ${npc.role}.

PERSONA:
${npc.persona}
${npc.voice ? `\nVOICE: ${npc.voice}` : ''}

YOUR CURRENT GOAL IN THIS CONVERSATION:
${args.goalPrompt}

RULES:
- Stay in character. Do not break frame, do not mention being an AI.
- ${channelInstruction}
- Be specific. Reference details from the conversation. Don't be generic.
- If the user asks a question outside your role's expertise, deflect realistically.`

  const transcript = args.history
    .map((m) => (m.role === 'user' ? `USER: ${m.content}` : `${npc.name}: ${m.content}`))
    .join('\n\n')

  const prompt = `Conversation so far:\n\n${transcript || '(no messages yet — you may speak first if the goal requires it)'}\n\nReply as ${npc.name}.`

  return callGemini({
    models: NPC_MODELS,
    prompt,
    temperature: 0.7,
    jsonMode: false,
    systemInstruction: system,
  })
}

export async function coworkerRecapReply(args: {
  speakerName: string
  speakerRole?: string
  topic: string
  question: string
  facts: string[]
  fallback: string
}): Promise<string> {
  if (!args.facts.length) return args.fallback

  const system = `You are ${args.speakerName}${args.speakerRole ? `, ${args.speakerRole}` : ''}, giving a short onboarding recap for a workplace simulator.

RULES:
- Answer only from the provided facts.
- If the student's question cannot be answered from the facts, reply exactly with the fallback.
- Keep the reply under 55 words.
- Do not invent names, numbers, documents, deadlines, risks, or decisions.
- Do not mention being an AI, a model, or a simulator.`

  const prompt = `TOPIC:
${args.topic}

FACTS YOU MAY USE:
${args.facts.map((fact) => `- ${fact}`).join('\n')}

FALLBACK:
${args.fallback}

STUDENT QUESTION:
${args.question}

Reply as ${args.speakerName}.`

  return callGemini({
    models: NPC_MODELS,
    prompt,
    temperature: 0.2,
    jsonMode: false,
    systemInstruction: system,
  })
}

// ============================================================================
// Grading
// ============================================================================

interface SerializedState {
  playerName: string
  visitedNodes: string[]
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
  freeTextResponses: Record<string, string>
  npcConversations: Record<string, ChatMessage[]>
}

function tryFormatFlowDiagram(v: string): string | null {
  try {
    const data = JSON.parse(v) as {
      nodes?: Array<{ id?: string; label?: string; kind?: string }>
      edges?: Array<{ source?: string; target?: string; label?: string }>
    }
    if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) return null
    const nodeMap = new Map(data.nodes.map((n) => [n.id, n.label as string]))
    const lines = [`USER FLOW DIAGRAM (${data.nodes.length} nodes, ${data.edges.length} transitions):`]
    lines.push('Nodes:')
    for (const n of data.nodes) {
      const kind = n.kind === 'screen' || n.kind === 'action' ? 'step' : n.kind ?? 'step'
      lines.push(`  ${kind}: "${n.label ?? ''}"`)
    }
    lines.push('Transitions:')
    for (const e of data.edges) {
      const from = nodeMap.get(e.source) ?? e.source
      const to = nodeMap.get(e.target) ?? e.target
      lines.push(`  "${from}" → "${to}" [path label: "${e.label || 'unlabeled'}"]`)
    }
    return lines.join('\n')
  } catch {
    return null
  }
}

type ScreenMockupElementForGrading = {
  kind?: string
  label?: string
  detail?: string
  variant?: string
  x?: number
  y?: number
  w?: number
  h?: number
}

const BUTTON_OVERLAP_RATIO_THRESHOLD = 0.02
const explicitButtonKinds = new Set(['primary_button', 'secondary_button'])
const customButtonKinds = new Set(['shape_square', 'shape_horizontal', 'shape_vertical', 'freeform_rectangle', 'freeform_vertical'])
const actionLabelPattern = /(button|cta|tap|mark|message|send|invite|accept|view|complete|continue|start|share|remind|nudge|check|log|open|ボタン|記録|完了|送信|招待|承認|見る|表示|続ける|開始|共有|リマインド|メッセージ|チェック|開く)/i

function hasElementBounds(item: ScreenMockupElementForGrading): item is ScreenMockupElementForGrading & { x: number; y: number; w: number; h: number } {
  return [item.x, item.y, item.w, item.h].every((value) => typeof value === 'number' && Number.isFinite(value))
}

function isButtonLikeElement(item: ScreenMockupElementForGrading): boolean {
  const kind = item.kind ?? ''
  if (explicitButtonKinds.has(kind)) return true
  if (!customButtonKinds.has(kind)) return false
  return actionLabelPattern.test(`${item.label ?? ''} ${item.detail ?? ''}`)
}

function formatPercentNumber(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${Math.round(value * 10) / 10}%` : 'n/a'
}

function describeElement(item: ScreenMockupElementForGrading): string {
  return `${item.kind ?? 'element'} "${item.label ?? ''}"`
}

function getOverlapRatio(
  a: ScreenMockupElementForGrading & { x: number; y: number; w: number; h: number },
  b: ScreenMockupElementForGrading & { x: number; y: number; w: number; h: number }
): number {
  const overlapW = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x))
  const overlapH = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y))
  const overlapArea = overlapW * overlapH
  if (overlapArea <= 0) return 0
  const smallerArea = Math.min(a.w * a.h, b.w * b.h)
  return smallerArea > 0 ? overlapArea / smallerArea : 0
}

function findButtonOverlaps(elements: ScreenMockupElementForGrading[]): string[] {
  const candidates = elements.filter(isButtonLikeElement).filter(hasElementBounds)
  const overlaps: string[] = []
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const ratio = getOverlapRatio(candidates[i], candidates[j])
      if (ratio > BUTTON_OVERLAP_RATIO_THRESHOLD) {
        overlaps.push(`${describeElement(candidates[i])} overlaps ${describeElement(candidates[j])} by ${Math.round(ratio * 100)}% of the smaller control`)
      }
    }
  }
  return overlaps
}

function tryFormatScreenMockup(v: string): string | null {
  try {
    const data = JSON.parse(v) as {
      screenLabel?: string
      elements?: ScreenMockupElementForGrading[]
      notes?: string
      summary?: {
        selectedScreen?: string
        elementCount?: number
        implementationNote?: string
        buttonsAndShapes?: Array<{ type?: string; text?: string; notes?: string }>
      }
    }
    const selectedScreen = data.summary?.selectedScreen ?? data.screenLabel
    const elements = Array.isArray(data.elements) ? data.elements : []
    if (!selectedScreen || elements.length === 0) return null

    const buttonsAndShapes = data.summary?.buttonsAndShapes ?? elements
      .filter((item) => ['primary_button', 'secondary_button', 'shape_square', 'shape_horizontal', 'shape_vertical'].includes(item.kind ?? ''))
      .map((item) => ({ type: item.kind, text: item.label, notes: item.detail }))
    const buttonCandidates = elements.filter(isButtonLikeElement)
    const buttonOverlaps = findButtonOverlaps(elements)

    const lines = [`SCREEN MOCKUP (${data.summary?.elementCount ?? elements.length} layers):`]
    lines.push(`Fixed screen: "${selectedScreen}"`)
    if (buttonsAndShapes.length > 0) {
      lines.push('Buttons/shapes created:')
      for (const item of buttonsAndShapes) {
        lines.push(`  ${item.type ?? 'element'}: "${item.text ?? ''}" (${item.notes ?? ''})`)
      }
    } else {
      lines.push('Buttons/shapes created: none')
    }
    lines.push('Button/CTA candidates considered for deterministic overlap check:')
    if (buttonCandidates.length > 0) {
      for (const item of buttonCandidates) {
        lines.push(`  ${describeElement(item)} at x=${formatPercentNumber(item.x)} y=${formatPercentNumber(item.y)} w=${formatPercentNumber(item.w)} h=${formatPercentNumber(item.h)}`)
      }
    } else {
      lines.push('  none')
    }
    if (buttonOverlaps.length > 0) {
      lines.push(`DETERMINISTIC BUTTON/CTA OVERLAP CHECK: FAIL (threshold > ${Math.round(BUTTON_OVERLAP_RATIO_THRESHOLD * 100)}% of smaller control)`)
      for (const overlap of buttonOverlaps) lines.push(`  ${overlap}`)
    } else {
      lines.push(`DETERMINISTIC BUTTON/CTA OVERLAP CHECK: PASS (no button/CTA candidates overlap above ${Math.round(BUTTON_OVERLAP_RATIO_THRESHOLD * 100)}% of smaller control)`)
    }
    lines.push('All layers:')
    for (const item of elements) {
      lines.push(`  ${item.kind ?? 'element'}: "${item.label ?? ''}" (${item.detail ?? ''}; variant: ${item.variant ?? 'n/a'}; x=${formatPercentNumber(item.x)} y=${formatPercentNumber(item.y)} w=${formatPercentNumber(item.w)} h=${formatPercentNumber(item.h)})`)
    }
    lines.push(`Implementation note: ${data.summary?.implementationNote ?? data.notes ?? '(missing)'}`)
    return lines.join('\n')
  } catch {
    return null
  }
}

function tryFormatKanban(v: string): string | null {
  // Kanban state: { cardId: columnId, ... }
  try {
    const data = JSON.parse(v) as Record<string, string>
    if (typeof data !== 'object' || Array.isArray(data)) return null
    const entries = Object.entries(data)
    if (entries.length === 0) return null
    // Heuristic: values should look like column IDs (strings, not objects)
    if (!entries.every(([, v]) => typeof v === 'string')) return null
    const lines = [`KANBAN BOARD STATE (${entries.length} cards placed):`]
    for (const [cardId, colId] of entries) {
      lines.push(`  Card "${cardId}" → column "${colId}"`)
    }
    return lines.join('\n')
  } catch {
    return null
  }
}

function tryFormatPriorityMatrix(v: string): string | null {
  // Matrix state: { itemId: { quadrant, xPct, yPct }, ... }
  try {
    const data = JSON.parse(v) as Record<string, { quadrant: string; xPct: number; yPct: number }>
    if (typeof data !== 'object' || Array.isArray(data)) return null
    const entries = Object.entries(data)
    if (entries.length === 0) return null
    if (!entries.every(([, v]) => typeof v === 'object' && 'quadrant' in v)) return null
    const lines = [`PRIORITY MATRIX PLACEMENT (${entries.length} items placed):`]
    for (const [itemId, placement] of entries) {
      lines.push(`  "${itemId}" → quadrant: ${placement.quadrant}`)
    }
    return lines.join('\n')
  } catch {
    return null
  }
}

function responseSourceLabel(key: string): string {
  const directNode = storyline.nodes[key]
  if (directNode) return `[${key}] ${directNode.title}`

  for (const node of Object.values(storyline.nodes)) {
    const n = node as { id?: string; title?: string; bindingKey?: string; rationaleBindingKey?: string }
    const rationaleKey = n.rationaleBindingKey ?? (n.bindingKey ? `${n.bindingKey}_rationale` : undefined)
    if (n.bindingKey === key || rationaleKey === key) {
      return `[${n.id ?? key} / ${key}] ${n.title ?? ''}`.trim()
    }
  }

  return `[${key}]`
}

function conversationSourceLabel(conversationId: string): string {
  const keyParts = conversationId.split(':')
  const embeddedSceneId = keyParts.find((part) => Boolean(storyline.nodes[part]))
  if (embeddedSceneId) {
    const scene = storyline.nodes[embeddedSceneId]
    return `${conversationId} | source scene: ${embeddedSceneId} (${scene.title})`
  }

  const matchingScenes = Object.values(storyline.nodes)
    .map((node) => node as { id?: string; title?: string; npcId?: string })
    .filter((node) => node.npcId === conversationId)

  if (matchingScenes.length === 1) {
    const scene = matchingScenes[0]
    return `${conversationId} | source scene: ${scene.id} (${scene.title ?? ''})`
  }

  return conversationId
}

function serializeState(s: SerializedState): string {
  const parts: string[] = []
  parts.push(`PLAYER: ${s.playerName || 'Anonymous'}`)
  parts.push(`PATH: ${s.visitedNodes.join(' -> ')}`)
  parts.push(`BRANCH FLAGS: ${JSON.stringify(s.branchFlags)}`)

  parts.push('\n=== MULTIPLE-CHOICE SELECTIONS ===')
  for (const [sceneId, optId] of Object.entries(s.mcSelections)) {
    const node = storyline.nodes[sceneId]
    if (!node || node.type !== 'multiple_choice') continue
    const mc = node as MultipleChoiceNode
    const opt = mc.options.find((o) => o.id === optId)
    parts.push(`[${sceneId}] ${node.title}`)
    parts.push(`  CHOICE: ${opt?.label ?? optId}`)
    if (opt?.body) parts.push(`  REASONING SHOWN: ${opt.body}`)
  }

  parts.push('\n=== FREE-TEXT / STRUCTURED RESPONSES ===')
  for (const [k, v] of Object.entries(s.freeTextResponses)) {
    if (!v || !v.trim()) continue
    const formatted =
      tryFormatFlowDiagram(v) ??
      tryFormatScreenMockup(v) ??
      tryFormatKanban(v) ??
      tryFormatPriorityMatrix(v)
    const source = responseSourceLabel(k)
    parts.push(formatted ? `\n${source}\n${formatted}` : `\n${source}\n${v}`)
  }

  parts.push('\n=== NPC CONVERSATIONS ===')
  for (const [conversationId, msgs] of Object.entries(s.npcConversations)) {
    const keyParts = conversationId.split(':')
    const npcId = keyParts[keyParts.length - 1] || conversationId
    const npc = npcs[conversationId] || npcs[npcId]
    if (!msgs.length) continue
    parts.push(`\n--- with ${npc?.name ?? conversationId} (${npc?.role ?? ''}) [${conversationSourceLabel(conversationId)}] ---`)
    for (const m of msgs) {
      const speaker = m.role === 'user' ? 'CANDIDATE' : npc?.name ?? 'NPC'
      parts.push(`${speaker}: ${m.content}`)
    }
  }

  return parts.join('\n')
}

function buildResponseTemplate(): { schema: object; criteriaCount: number; maxScore: number } {
  const scenarios = rubric.sections.map((sec) => ({
    scenario_number: sec.section_number,
    scenario_title: sec.section_title,
    criteria: sec.criteria.map((c) => ({ criterion: c.name, score: 0, comment: '' })),
  }))
  const criteriaCount = scenarios.reduce((acc, sec) => acc + sec.criteria.length, 0)
  const maxScore = criteriaCount * rubric.max_score_per_criterion
  const schema = {
    candidate_id: 'candidate_001',
    simulation: rubric.simulation_id,
    graded_at: '<current ISO 8601 timestamp>',
    scenarios,
    total_score: 0,
    max_score: maxScore,
    score_percentage: 0.0,
    recommendation: 'Hire',
    overall_assessment: '',
  }
  return { schema, criteriaCount, maxScore }
}

function buildGradingPrompt(state: SerializedState): string {
  const { schema, criteriaCount, maxScore } = buildResponseTemplate()
  return `You are an expert hiring evaluator for the role described below. Grade a candidate's responses to a 30-minute simulation.

---BEGIN SIMULATION DOCUMENT---
${simulationDoc}
---END SIMULATION DOCUMENT---

---BEGIN STRUCTURED RUBRIC JSON---
${JSON.stringify(rubric, null, 2)}
---END STRUCTURED RUBRIC JSON---

---BEGIN CANDIDATE RESPONSES---
${serializeState(state)}
---END CANDIDATE RESPONSES---

INSTRUCTIONS:
1. Grade each of the ${criteriaCount} criteria according to the STRUCTURED RUBRIC JSON above. Use the criterion NAMES exactly as listed. Use only the scene IDs listed in each criterion's evidenceSceneIds as evidence for that criterion; do not mix in preparation tasks, earlier/later tasks, or later deliverables. If a criterion lists multiple evidenceSceneIds, treat them as one approved playground/workflow score set and assign one score for the whole set. If the simulation document contains older or conflicting grading wording, ignore that conflicting grading wording.
2. For EVERY criterion, provide a score (0-${rubric.max_score_per_criterion}) AND a one-sentence evidence-based comment that cites SPECIFIC details from the candidate's responses (their actual words, choices made, NPC interactions). Do NOT write generic comments.
3. Calculate total_score (sum of all criteria), max_score (${maxScore}), and score_percentage (total / max, rounded to 2 decimals).
4. Recommendation thresholds: 80–100% = "Strong Hire", 65–79% = "Hire", 45–64% = "Lean No Hire", 0–44% = "No Hire".
5. For the "画面案" criterion, use the SCREEN MOCKUP section and apply this stable Shared Streak functional contract:
   A. It is the accepted/final Shared Streak screen for this feature.
   B. It communicates a habit-specific two-person shared accountability relationship.
   C. It communicates shared streak progress and/or today's same-day completion state.
   D. It gives a clear main next action or next state.
Layer labels, supporting details, layout, and the implementation note all count as evidence. Do not require every detail to appear as a separate visual layer if the accepted Shared Streak behavior is unambiguous. Score 9-10 when all four categories are clear and the hierarchy is coherent; 7-8 when at least three categories are clear and the remaining category is explicitly inferable from notes/context; 4-6 when at least two categories are clear but the screen would need clarification; 0-3 when it is not a Shared Streak screen or lacks a usable shared-streak action/state.
6. For the "画面案" criterion, apply the DETERMINISTIC BUTTON/CTA OVERLAP CHECK exactly. If it is FAIL, cap the score at 6 even if the content is otherwise strong. If the overlap obscures the only clear main action, cap the score at 4.
7. Write a 2–4 sentence overall_assessment grounded in the candidate's actual path and decisions.

Return ONLY valid JSON matching this exact shape (no markdown, no preamble):

${JSON.stringify(schema, null, 2)}`
}

export async function gradeResponses(state: SerializedState): Promise<GradingResult> {
  const prompt = buildGradingPrompt(state)
  const text = await callGemini({
    models: GRADING_MODELS,
    prompt,
    temperature: 0.1,
    jsonMode: true,
  })
  // Strip code fences if a model leaks them
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }
  const parsed = JSON.parse(cleaned) as GradingResult
  return parsed
}
