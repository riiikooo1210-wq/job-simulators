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
    if (k.endsWith('_hint_usage')) continue
    parts.push(`\n[${k}]\n${v}`)
  }

  parts.push('\n=== HINT USAGE ===')
  let hintUsageFound = false
  for (const [k, v] of Object.entries(s.freeTextResponses)) {
    if (!k.endsWith('_hint_usage') || !v || !v.trim()) continue
    hintUsageFound = true
    let readable = v
    try {
      const parsed = JSON.parse(v)
      if (Array.isArray(parsed)) readable = parsed.join(', ')
    } catch {
      // keep raw value
    }
    parts.push(`[${k}] Candidate opened hints for: ${readable}`)
  }
  if (!hintUsageFound) parts.push('No hints opened.')

  parts.push('\n=== NPC CONVERSATIONS ===')
  for (const [conversationId, msgs] of Object.entries(s.npcConversations)) {
    const keyParts = conversationId.split(':')
    const npcId = keyParts[keyParts.length - 1] || conversationId
    const npc = npcs[conversationId] || npcs[npcId]
    if (!msgs.length) continue
    parts.push(`\n--- with ${npc?.name ?? conversationId} (${npc?.role ?? ''}) [${conversationId}] ---`)
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
5. Write a 2–4 sentence overall_assessment grounded in the candidate's actual path and decisions.
6. Hint usage is recorded and should be considered when evaluating independence. Do not automatically penalize a candidate for opening a hint, but if their answer merely repeats hint language without source-backed analysis, reflect that in the relevant criterion score/comment.

Return ONLY valid JSON matching this exact shape (no markdown, no preamble):

${JSON.stringify(schema, null, 2)}`
}

export async function gradeResponses(state: SerializedState): Promise<GradingResult> {
  const prompt = buildGradingPrompt(state)
  const text = await callGemini({
    models: GRADING_MODELS,
    prompt,
    temperature: 0.3,
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
