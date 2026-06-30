// Generic Gemini service: gradeResponses (single batch call at end-of-sim)
// + npcReply (per-NPC chat replies during the simulation).
//
// Per-job content:
//   - simulationDoc (?raw markdown) — the full per-job sim doc with rubric
//   - rubric (JSON) — structured rubric used to fill the response template
import type { AssessmentResult, ChatMessage, GradingResult, Rubric, MultipleChoiceNode } from '../types/game'
import { storyline } from '../data/storyline'
import { npcs } from '../data/npcs'
import {
  ASSESSMENT_SEED,
  ASSESSMENT_VERSION,
  buildAssessmentResult,
  canonicalizeAssessmentState,
  displayTitleForRubricName,
  stableStringifyForAssessment,
  type AssessmentState,
} from './assessment'
// @ts-ignore — Vite ?raw import
import simulationDoc from '../data/job-simulation.md?raw'
import rubricJson from '../data/rubric.json'

const rubric = rubricJson as Rubric

const GRADING_MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash']
const NPC_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash']
const CLASSIFICATION_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash']
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
  responseSchema?: object
  seed?: number
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
            candidateCount: 1,
            temperature: opts.temperature,
            ...(opts.seed != null ? { seed: opts.seed } : {}),
            ...(opts.jsonMode ? {
              responseMimeType: 'application/json',
              ...(opts.responseSchema ? { responseSchema: opts.responseSchema } : {}),
            } : {}),
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
// Short response classification
// ============================================================================

export async function evaluateResponseMatch(args: {
  responseText: string
  targetMeaning: string
}): Promise<{ matches: boolean; confidence: number; rationale?: string }> {
  const prompt = `Classify whether the candidate response substantially expresses the target meaning.

Accept paraphrases and partial wording differences. Do not require exact words.
Return "matches": true only if the response clearly identifies the same main problem, not just a related symptom or possible solution.

TARGET MEANING:
${args.targetMeaning}

CANDIDATE RESPONSE:
${args.responseText || '(empty response)'}

Return ONLY valid JSON in this shape:
{"matches":false,"confidence":0,"rationale":""}`

  const text = await callGemini({
    models: CLASSIFICATION_MODELS,
    prompt,
    temperature: 0.1,
    jsonMode: true,
  })
  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }
  const parsed = JSON.parse(cleaned) as { matches?: unknown; confidence?: unknown; rationale?: unknown }
  return {
    matches: parsed.matches === true,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
    rationale: typeof parsed.rationale === 'string' ? parsed.rationale : undefined,
  }
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

type SerializedState = AssessmentState

export function isGradableConversationId(conversationId: string): boolean {
  return !conversationId.startsWith('companion:')
}

function serializeState(s: SerializedState): string {
  const canonical = canonicalizeAssessmentState(s)
  const parts: string[] = []
  parts.push(`PLAYER: ${canonical.playerName || 'Anonymous'}`)
  parts.push(`PATH: ${canonical.visitedNodes.join(' -> ')}`)
  parts.push(`BRANCH FLAGS: ${stableStringifyForAssessment(canonical.branchFlags)}`)

  parts.push('\n=== MULTIPLE-CHOICE SELECTIONS ===')
  for (const [sceneId, optId] of Object.entries(canonical.mcSelections)) {
    const node = storyline.nodes[sceneId]
    if (!node || node.type !== 'multiple_choice') continue
    const mc = node as MultipleChoiceNode
    const opt = mc.options.find((o) => o.id === optId)
    parts.push(`[${sceneId}] ${node.title}`)
    parts.push(`  CHOICE: ${opt?.label ?? optId}`)
    if (opt?.body) parts.push(`  REASONING SHOWN: ${opt.body}`)
  }

  parts.push('\n=== FREE-TEXT / STRUCTURED RESPONSES ===')
  for (const [k, v] of Object.entries(canonical.freeTextResponses)) {
    if (!v || !v.trim()) continue
    parts.push(`\n[${k}]\n${v}`)
  }

  parts.push('\n=== NPC CONVERSATIONS ===')
  for (const [conversationId, msgs] of Object.entries(canonical.npcConversations)) {
    if (!isGradableConversationId(conversationId)) continue
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

function buildLegacyGradeResponseSchema(): object {
  return {
    type: 'object',
    properties: {
      candidate_id: { type: 'string' },
      simulation: { type: 'string' },
      graded_at: { type: 'string' },
      scenarios: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            scenario_number: { type: 'integer' },
            scenario_title: { type: 'string' },
            criteria: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  criterion: { type: 'string' },
                  score: { type: 'integer' },
                  comment: { type: 'string' },
                },
                required: ['criterion', 'score', 'comment'],
              },
            },
          },
          required: ['scenario_number', 'scenario_title', 'criteria'],
        },
      },
      total_score: { type: 'integer' },
      max_score: { type: 'integer' },
      score_percentage: { type: 'number' },
      recommendation: { type: 'string' },
      overall_assessment: { type: 'string' },
    },
    required: [
      'candidate_id',
      'simulation',
      'graded_at',
      'scenarios',
      'total_score',
      'max_score',
      'score_percentage',
      'recommendation',
      'overall_assessment',
    ],
  }
}

function buildResponseTemplate(): { schema: object; responseSchema: object; criteriaCount: number; maxScore: number } {
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
    graded_at: ASSESSMENT_VERSION,
    scenarios,
    total_score: 0,
    max_score: maxScore,
    score_percentage: 0.0,
    recommendation: 'Hire',
    overall_assessment: '',
  }
  return { schema, responseSchema: buildLegacyGradeResponseSchema(), criteriaCount, maxScore }
}

function buildGradingPrompt(state: SerializedState): string {
  const { schema, criteriaCount, maxScore } = buildResponseTemplate()
  return `You are an expert career-simulation evaluator for the role described below. Evaluate a student's responses to a 30-minute career exploration simulation.

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
3. Write all free-text fields in English, especially comment and overall_assessment, even when the rubric text or candidate responses include another language. Do not copy non-English words into student-facing comments; translate or paraphrase them in English instead.
4. Calculate total_score (sum of all criteria), max_score (${maxScore}), and score_percentage (total / max, rounded to 2 decimals).
5. The recommendation field is legacy internal data and is not shown to students. Use these legacy thresholds: 80–100% = "Strong Hire", 65–79% = "Hire", 45–64% = "Lean No Hire", 0–44% = "No Hire".
6. Set graded_at to "${ASSESSMENT_VERSION}". Do not use the current time or any timestamp.
7. Write a 2–4 sentence overall_assessment grounded in the candidate's actual path and decisions.

Return ONLY valid JSON matching this exact shape (no markdown, no preamble):

${JSON.stringify(schema, null, 2)}`
}

function responseTextForEvidence(state: SerializedState, sceneId: string): string {
  if (sceneId === 'scene_04_user_call') {
    return Object.entries(state.npcConversations)
      .filter(([conversationId]) => conversationId.includes('scene_04_user_call'))
      .flatMap(([, messages]) => messages.map((message) => message.content))
      .join(' ')
  }
  if (sceneId === 'scene_02_app_audit') {
    return state.freeTextResponses.appAuditNotes || ''
  }
  return state.freeTextResponses[sceneId] || ''
}

function countMeaningfulArtifactParts(sceneId: string, raw: string): number {
  if (!raw.trim()) return 0
  if (sceneId === 'scene_02_app_audit') {
    try {
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 1
      return Object.values(parsed).filter((value) => typeof value === 'string' && value.trim().length >= 12).length
    } catch {
      return 1
    }
  }
  return raw.trim().split(/\s+/).length >= 50 ? 2 : 1
}

function fallbackScoreForCriterion(state: SerializedState, evidenceSceneIds: string[] = []): number {
  if (evidenceSceneIds.includes('scene_04_user_call')) {
    const userTurns = Object.entries(state.npcConversations)
      .filter(([conversationId]) => conversationId.includes('scene_04_user_call'))
      .flatMap(([, messages]) => messages)
      .filter((message) => message.role === 'user' && message.content.trim().length > 0).length
    if (userTurns >= 5) return 8
    if (userTurns >= 2) return 5
    return 2
  }

  const partCount = evidenceSceneIds.reduce((sum, sceneId) => (
    sum + countMeaningfulArtifactParts(sceneId, responseTextForEvidence(state, sceneId))
  ), 0)

  if (partCount >= 5) return 8
  if (partCount >= 2) return 6
  if (partCount >= 1) return 4
  return 2
}

function fallbackCommentForCriterion(state: SerializedState, criterionName: string, evidenceSceneIds: string[] = []): string {
  const evidenceText = evidenceSceneIds
    .map((sceneId) => responseTextForEvidence(state, sceneId))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  const preview = evidenceText.length > 140 ? `${evidenceText.slice(0, 137)}...` : evidenceText

  if (!preview) {
    return `Backup assessment found little saved work for ${displayTitleForRubricName(criterionName)}, so this is an early practice signal.`
  }
  return `Backup assessment used your saved work for ${displayTitleForRubricName(criterionName)}: "${preview}".`
}

function buildFallbackGradeResult(state: SerializedState): GradingResult {
  const scenarios = rubric.sections.map((section) => ({
    scenario_number: section.section_number,
    scenario_title: section.section_title,
    criteria: section.criteria.map((criterion) => {
      const evidenceSceneIds = criterion.evidenceSceneIds || []
      return {
        criterion: criterion.name,
        score: fallbackScoreForCriterion(state, evidenceSceneIds),
        comment: fallbackCommentForCriterion(state, criterion.name, evidenceSceneIds),
      }
    }),
  }))
  const totalScore = scenarios.reduce((sum, scenario) => (
    sum + scenario.criteria.reduce((inner, criterion) => inner + criterion.score, 0)
  ), 0)
  const criteriaCount = scenarios.reduce((sum, scenario) => sum + scenario.criteria.length, 0)
  const maxScore = criteriaCount * rubric.max_score_per_criterion
  const scorePercentage = maxScore ? Number((totalScore / maxScore).toFixed(2)) : 0

  return {
    candidate_id: 'student_backup_assessment',
    simulation: rubric.simulation_id,
    graded_at: ASSESSMENT_VERSION,
    scenarios,
    total_score: totalScore,
    max_score: maxScore,
    score_percentage: scorePercentage,
    recommendation: scorePercentage >= 0.8 ? 'Strong Hire' : scorePercentage >= 0.65 ? 'Hire' : scorePercentage >= 0.45 ? 'Lean No Hire' : 'No Hire',
    overall_assessment: 'A backup assessment was used because the live reviewer was unavailable. The report is based on the saved notes, interview transcript, and Product Plan draft from this run.',
  }
}

export async function gradeResponses(state: SerializedState): Promise<AssessmentResult> {
  try {
    const prompt = buildGradingPrompt(state)
    const { responseSchema } = buildResponseTemplate()
    const text = await callGemini({
      models: GRADING_MODELS,
      prompt,
      temperature: 0,
      jsonMode: true,
      responseSchema,
      seed: ASSESSMENT_SEED,
    })
    // Strip code fences if a model leaks them
    let cleaned = text.trim()
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
    }
    const parsed = JSON.parse(cleaned) as GradingResult
    return buildAssessmentResult(parsed, rubric, state)
  } catch {
    return buildAssessmentResult(buildFallbackGradeResult(state), rubric, state)
  }
}
