import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { basename, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { buildMayaPromptBundle } from './mayaPrompt.js'

const MODELS = (process.env.GEMINI_AUDIT_MODELS || process.env.GEMINI_AUDIT_MODEL || 'gemini-2.5-flash,gemini-2.0-flash')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean)
const API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

const strictBannedPatterns = [
  { id: 'ai_identity', pattern: /as an ai|language model/i },
  { id: 'system_prompt', pattern: /system prompt|hidden prompt/i },
  { id: 'full_flow', pattern: /full user flow|finalize the full flow/i },
  { id: 'grading_language', pattern: /\b(score|grade|passing|pass)\b/i },
]

const scopeAdoptionPatterns = [
  { id: 'leaderboard_scope', pattern: /leaderboard|weekly social ranking/i },
  { id: 'app_open_streak', pattern: /app-open streak/i },
]

const sequenceChecks = [
  { id: 'starting_places', pattern: /starting place|start|Home|Habit Detail|entry/i },
  { id: 'why_places_fit', pattern: /why|make sense|fit|because|rationale/i },
  { id: 'shared_screen', pattern: /Shared Streak screen|screen|both people|completion|completed/i },
  { id: 'return_motivation', pattern: /come back|return|motivat|continue|counting on|habit/i },
]

function parseArgs(argv) {
  const opts = {
    runs: 3,
    maxReplies: 5,
    playerName: 'Liwen',
    cases: null,
    delayMs: 500,
    requestTimeoutMs: 45000,
    maxAttempts: 3,
  }

  for (const arg of argv) {
    if (arg.startsWith('--runs=')) opts.runs = Number(arg.slice('--runs='.length))
    if (arg.startsWith('--max-replies=')) opts.maxReplies = Number(arg.slice('--max-replies='.length))
    if (arg.startsWith('--player-name=')) opts.playerName = arg.slice('--player-name='.length)
    if (arg.startsWith('--cases=')) opts.cases = new Set(arg.slice('--cases='.length).split(',').map((v) => v.trim()).filter(Boolean))
    if (arg.startsWith('--delay-ms=')) opts.delayMs = Number(arg.slice('--delay-ms='.length))
    if (arg.startsWith('--request-timeout-ms=')) opts.requestTimeoutMs = Number(arg.slice('--request-timeout-ms='.length))
    if (arg.startsWith('--max-attempts=')) opts.maxAttempts = Number(arg.slice('--max-attempts='.length))
  }

  if (!Number.isInteger(opts.runs) || opts.runs < 1 || opts.runs > 5) {
    throw new Error('--runs must be an integer from 1 to 5')
  }
  if (!Number.isInteger(opts.maxReplies) || opts.maxReplies < 1 || opts.maxReplies > 5) {
    throw new Error('--max-replies must be an integer from 1 to 5')
  }
  if (!Number.isInteger(opts.delayMs) || opts.delayMs < 0 || opts.delayMs > 10000) {
    throw new Error('--delay-ms must be an integer from 0 to 10000')
  }
  if (!Number.isInteger(opts.requestTimeoutMs) || opts.requestTimeoutMs < 5000 || opts.requestTimeoutMs > 120000) {
    throw new Error('--request-timeout-ms must be an integer from 5000 to 120000')
  }
  if (!Number.isInteger(opts.maxAttempts) || opts.maxAttempts < 1 || opts.maxAttempts > 6) {
    throw new Error('--max-attempts must be an integer from 1 to 6')
  }
  return opts
}

function parseEnvFile(path) {
  try {
    const text = readFileSync(path, 'utf8')
    const values = {}
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match) continue
      const [, key, rawValue] = match
      values[key] = rawValue.trim().replace(/^['"]|['"]$/g, '')
    }
    return values
  } catch {
    return {}
  }
}

function loadGeminiApiKey() {
  const candidates = [
    process.env.VITE_GEMINI_API_KEY,
    process.env.GEMINI_API_KEY,
    parseEnvFile('.env.local').VITE_GEMINI_API_KEY,
    parseEnvFile('.env').VITE_GEMINI_API_KEY,
    parseEnvFile('.env.local').GEMINI_API_KEY,
    parseEnvFile('.env').GEMINI_API_KEY,
  ]

  const key = candidates.find((value) => value && value !== 'your_gemini_api_key_here')
  if (!key) {
    throw new Error('Gemini API key not found. Expected VITE_GEMINI_API_KEY in .env.local, .env, or process env.')
  }
  return key
}

function loadCases(opts) {
  const allCases = JSON.parse(readFileSync(new URL('./maya-response-cases.json', import.meta.url), 'utf8'))
  return opts.cases ? allCases.filter((item) => opts.cases.has(item.id)) : allCases
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function isScopeRejection(text, termPattern) {
  const sentences = text.split(/(?<=[.!?])\s+/)
  return sentences.some((sentence) =>
    termPattern.test(sentence) &&
    /\b(not|isn't|is not|isn['’]t|rather than|instead of|avoid|outside|scope|focus|private|one habit)\b/i.test(sentence)
  )
}

function responseTextFromGemini(data) {
  const parts = data.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''
  return parts.map((part) => part.text || '').join('').trim()
}

function retryDelayMsForError(error, attempt) {
  const message = error instanceof Error ? error.message : String(error)
  const retryMatch = message.match(/retry in ([\d.]+)s/i)
  if (retryMatch) return Math.ceil(Number(retryMatch[1]) * 1000) + 1000
  return 1000 * attempt
}

async function callGeminiWithModel({ apiKey, systemPrompt, contents, model, requestTimeoutMs }) {
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: { temperature: 0.4 },
  }

  const startedAt = performance.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)
  let res
  try {
    res = await fetch(`${API_URL_BASE}/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
  const elapsedMs = Math.round(performance.now() - startedAt)

  if (!res.ok) {
    const err = await res.text()
    const error = new Error(`${model} HTTP ${res.status}: ${err.slice(0, 500)}`)
    error.status = res.status
    throw error
  }

  const data = await res.json()
  const text = responseTextFromGemini(data)
  if (!text) throw new Error(`${model}: empty response`)
  return { text, elapsedMs, finishReason: data.candidates?.[0]?.finishReason || null, model }
}

async function callGemini({ apiKey, systemPrompt, contents, requestTimeoutMs, maxAttempts }) {
  let lastError = null
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await callGeminiWithModel({ apiKey, systemPrompt, contents, model, requestTimeoutMs })
      } catch (error) {
        lastError = error
        const status = error && typeof error === 'object' ? error.status : null
        if (status && status >= 400 && status < 500 && status !== 429) break
        await new Promise((resolve) => setTimeout(resolve, retryDelayMsForError(error, attempt)))
      }
    }
  }
  throw lastError || new Error('Gemini call failed')
}

export function flagsForReply(text) {
  const flags = []
  const count = wordCount(text)
  if (count > 120) flags.push({ type: 'too_long', detail: `${count} words` })
  for (const item of strictBannedPatterns) {
    if (item.pattern.test(text)) flags.push({ type: 'banned_pattern', detail: item.id })
  }
  for (const item of scopeAdoptionPatterns) {
    if (item.pattern.test(text) && !isScopeRejection(text, item.pattern)) {
      flags.push({ type: 'banned_pattern', detail: item.id })
    }
  }
  return flags
}

function sequenceFlags(replies) {
  const combined = replies.map((reply) => reply.text).join('\n')
  return sequenceChecks
    .filter((check) => !check.pattern.test(combined))
    .map((check) => ({ type: 'sequence_missing', detail: check.id }))
}

function summarizeRun(run) {
  const hardFlags = run.flags.filter((flag) => flag.type === 'banned_pattern')
  const errorFlags = run.flags.filter((flag) => flag.type === 'api_error')
  if (errorFlags.length) return 'ERROR'
  const watchFlags = run.flags.filter((flag) => flag.type !== 'banned_pattern')
  if (hardFlags.length) return 'FAIL'
  if (watchFlags.length) return 'WATCH'
  return 'PASS'
}

async function runCase({ apiKey, systemPrompt, item, runIndex, maxReplies, delayMs, requestTimeoutMs, maxAttempts }) {
  const contents = []
  const replies = []
  const apiErrors = []
  const limit = Math.min(maxReplies, item.studentTurns.length)

  for (let turnIndex = 0; turnIndex < limit; turnIndex++) {
    const studentText = item.studentTurns[turnIndex]
    contents.push({
      role: 'user',
      parts: [{ text: `Student says: ${studentText}\n\nReply as Maya Singh. Continue the check-in from the previous turns.` }],
    })

    let reply
    try {
      reply = await callGemini({ apiKey, systemPrompt, contents, requestTimeoutMs, maxAttempts })
    } catch (error) {
      apiErrors.push({
        type: 'api_error',
        detail: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
        replyIndex: turnIndex + 1,
      })
      break
    }
    const replyRecord = {
      replyIndex: turnIndex + 1,
      text: reply.text,
      wordCount: wordCount(reply.text),
      elapsedMs: reply.elapsedMs,
      model: reply.model,
      finishReason: reply.finishReason,
      flags: flagsForReply(reply.text),
    }
    replies.push(replyRecord)
    contents.push({ role: 'model', parts: [{ text: reply.text }] })
    if (delayMs > 0 && turnIndex < limit - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  const flags = [
    ...replies.flatMap((reply) => reply.flags.map((flag) => ({ ...flag, replyIndex: reply.replyIndex }))),
    ...apiErrors,
    ...(apiErrors.length || limit < 5 ? [] : sequenceFlags(replies)),
  ]

  const run = {
    runIndex,
    maxReplies: limit,
    status: null,
    studentTurns: item.studentTurns.slice(0, limit),
    replies,
    flags,
  }
  run.status = summarizeRun(run)
  return run
}

function makeReport({ opts, promptBundle, cases, outputDir, startedAt, completedAt }) {
  const lines = []
  lines.push('# Maya Response Audit')
  lines.push('')
  lines.push(`- Started: ${startedAt}`)
  lines.push(`- Completed: ${completedAt}`)
  lines.push(`- Models: ${MODELS.join(', ')}`)
  lines.push(`- Player name: ${opts.playerName}`)
  lines.push(`- Runs per case: ${opts.runs}`)
  lines.push(`- Max Maya replies per run: ${opts.maxReplies}`)
  lines.push(`- Delay between replies: ${opts.delayMs}ms`)
  lines.push(`- Request timeout: ${opts.requestTimeoutMs}ms`)
  lines.push(`- Max attempts per reply: ${opts.maxAttempts}`)
  lines.push(`- Scene: ${promptBundle.sceneId}`)
  lines.push(`- NPC: ${promptBundle.npcName} (${promptBundle.npcRole})`)
  lines.push(`- Prompt SHA256: ${createHash('sha256').update(promptBundle.systemPrompt).digest('hex')}`)
  lines.push('')

  const flatRuns = cases.flatMap((item) => item.runs)
  const statusCounts = flatRuns.reduce((acc, run) => {
    acc[run.status] = (acc[run.status] || 0) + 1
    return acc
  }, {})
  lines.push('## Summary')
  lines.push('')
  lines.push(`- PASS: ${statusCounts.PASS || 0}`)
  lines.push(`- WATCH: ${statusCounts.WATCH || 0}`)
  lines.push(`- FAIL: ${statusCounts.FAIL || 0}`)
  lines.push(`- ERROR: ${statusCounts.ERROR || 0}`)
  lines.push(`- Raw JSON: ${join(outputDir, 'raw.json')}`)
  lines.push('')

  for (const item of cases) {
    lines.push(`## ${item.id}`)
    lines.push('')
    lines.push(`- Category: ${item.category}`)
    lines.push(`- Notes: ${item.notes}`)
    lines.push('')
    for (const run of item.runs) {
      lines.push(`### Run ${run.runIndex}: ${run.status}`)
      lines.push('')
      if (run.flags.length) {
        lines.push(`Flags: ${run.flags.map((flag) => `${flag.type}:${flag.detail}${flag.replyIndex ? `@${flag.replyIndex}` : ''}`).join(', ')}`)
        lines.push('')
      } else {
        lines.push('Flags: none')
        lines.push('')
      }
      for (const reply of run.replies) {
        const student = run.studentTurns[reply.replyIndex - 1]
        lines.push(`**Student ${reply.replyIndex}:** ${student}`)
        lines.push('')
        lines.push(`**Maya ${reply.replyIndex} (${reply.wordCount} words):** ${reply.text}`)
        lines.push('')
      }
    }
  }

  return lines.join('\n')
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const apiKey = loadGeminiApiKey()
  const promptBundle = buildMayaPromptBundle({ playerName: opts.playerName })
  const selectedCases = loadCases(opts)
  if (selectedCases.length === 0) throw new Error('No cases selected.')

  const startedAt = new Date().toISOString()
  const stamp = startedAt.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  const outputDir = join('outputs', 'maya-response-audit', stamp)
  mkdirSync(outputDir, { recursive: true })

  console.log(`Gemini API key found: yes (${basename('.env.local')} or process env; value hidden)`)
  console.log(`Running Maya audit: ${selectedCases.length} cases, ${opts.runs} runs/case, max ${opts.maxReplies} replies/run`)

  const auditedCases = []
  for (const item of selectedCases) {
    console.log(`Case ${item.id}`)
    const runs = []
    for (let runIndex = 1; runIndex <= opts.runs; runIndex++) {
      const run = await runCase({
        apiKey,
        systemPrompt: promptBundle.systemPrompt,
        item,
        runIndex,
        maxReplies: opts.maxReplies,
        delayMs: opts.delayMs,
        requestTimeoutMs: opts.requestTimeoutMs,
        maxAttempts: opts.maxAttempts,
      })
      console.log(`  run ${runIndex}: ${run.status} (${run.replies.length} replies)`)
      runs.push(run)
    }
    auditedCases.push({ ...item, runs })
  }

  const completedAt = new Date().toISOString()
  const raw = {
    startedAt,
    completedAt,
    models: MODELS,
    options: opts,
    prompt: {
      sceneId: promptBundle.sceneId,
      npcId: promptBundle.npcId,
      npcName: promptBundle.npcName,
      npcRole: promptBundle.npcRole,
      systemPromptSha256: createHash('sha256').update(promptBundle.systemPrompt).digest('hex'),
      systemPromptLength: promptBundle.systemPrompt.length,
    },
    cases: auditedCases,
  }
  writeFileSync(join(outputDir, 'raw.json'), JSON.stringify(raw, null, 2))
  writeFileSync(join(outputDir, 'report.md'), makeReport({
    opts,
    promptBundle,
    cases: auditedCases,
    outputDir,
    startedAt,
    completedAt,
  }))

  console.log(`Audit complete: ${join(outputDir, 'report.md')}`)
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
