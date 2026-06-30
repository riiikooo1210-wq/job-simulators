import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025'
const WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'
const TURN_TIMEOUT_MS = 20000
const SETUP_TIMEOUT_MS = 12000

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const config = JSON.parse(await readFile(join(rootDir, 'src/data/scene-config.json'), 'utf8'))
const coachScene = config.storyline.nodes.coach_availability
const coachNpc = Array.isArray(config.npcs)
  ? config.npcs.find((npc) => npc.id === coachScene.npcId)
  : config.npcs?.[coachScene.npcId]

assert.equal(coachScene.type, 'voice_meeting')
assert.ok(coachNpc, `Missing NPC '${coachScene.npcId}'`)

function parseEnv(text) {
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=')
        const key = line.slice(0, index).trim()
        const rawValue = line.slice(index + 1).trim()
        return [key, rawValue.replace(/^['"]|['"]$/g, '')]
      }),
  )
}

async function readApiKey() {
  if (process.argv.includes('--stdin-key')) {
    const keyFromStdin = await new Promise((resolve) => {
      process.stdin.setEncoding('utf8')
      process.stdin.once('data', (chunk) => resolve(String(chunk).trim()))
      process.stdin.resume()
    })
    if (keyFromStdin) return keyFromStdin
  }
  if (process.env.VITE_GEMINI_API_KEY) return process.env.VITE_GEMINI_API_KEY
  try {
    const env = parseEnv(await readFile(join(rootDir, '.env.local'), 'utf8'))
    return env.VITE_GEMINI_API_KEY
  } catch {
    return ''
  }
}

function buildSystemPrompt() {
  const meetingPhrase = 'in an in-person workplace conversation'
  const speechStyle = 'Speak naturally, like a real colleague or client sitting or standing with the student in the same workplace.'

  return `You are ${coachNpc.name}, ${coachNpc.role}, ${meetingPhrase} with the student.

PERSONA:
${coachNpc.persona}
${coachNpc.voice ? `\nVOICE: ${coachNpc.voice}` : ''}

MEETING GOAL:
${coachScene.goalPrompt}

MEETING CONTEXT:
${coachScene.meetingContext || coachScene.content}

RULES:
- ${speechStyle}
- Keep each turn under 90 words unless the student asks for detail.
- Ask follow-up questions, push back, clarify ambiguity, and react to the student's actual words.
- Do not mention being an AI, a model, or a simulator.
- Do not grade the student during the meeting.
- Stay focused on the meeting goal and the workplace stakes.`
}

const cases = [
  {
    id: 'bad',
    label: 'Bad input: rumor and overclaiming',
    input: 'Coach, is Reed closing tonight because the team is showcasing him for a trade, and can we say he is fully healed now?',
    checks: [
      {
        label: 'does not endorse the trade rumor or full-health claim',
        test: (reply) => !/(fully healed|back to normal|fully cleared|medically cleared|cleared by the medical staff|trade is true|showcasing him|showcase him|permanent closing group|guaranteed to close)/i.test(reply),
      },
      {
        label: 'redirects to game/basketball usage instead of rumor',
        test: (reply) => /(game|basketball|available|flow|situational|tonight)/i.test(reply),
      },
    ],
  },
  {
    id: 'normal',
    label: 'Normal input: broad but fair usage question',
    input: 'How are you thinking about Reed’s role late tonight now that he is available?',
    checks: [
      {
        label: 'mentions Reed availability or tonight context',
        test: (reply) => /(available|tonight|Reed|Malik)/i.test(reply),
      },
      {
        label: 'keeps the decision conditional',
        test: (reply) => /(flow|situational|watch|earn|matchup|group|close|closing)/i.test(reply),
      },
      {
        label: 'does not declare a lasting lineup change',
        test: (reply) => !/(permanent|locked in|guaranteed|new closing lineup from now on)/i.test(reply),
      },
    ],
  },
  {
    id: 'excellent',
    label: 'Excellent input: concise sourced closing question',
    input: 'Coach, with Malik listed available and no minutes limit listed, what will determine whether he can close tonight?',
    checks: [
      {
        label: 'gives a closing-group answer',
        test: (reply) => /(closing|close).*(situational|earn|group)|situational.*(closing|group|earn)/i.test(reply),
      },
      {
        label: 'includes the planned usable quote idea',
        test: (reply) => /if (that|the) group earns it|we'?ll ride it|we will ride it/i.test(reply),
      },
      {
        label: 'does not overstate Reed health or a permanent rotation',
        test: (reply) => !/(fully healed|back to normal|fully cleared|medically cleared|permanent|guaranteed)/i.test(reply),
      },
    ],
  },
]

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function waitForSocket(socket, eventName, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error(`Timed out waiting for WebSocket ${eventName}`))
    }, timeoutMs)

    const cleanup = () => {
      clearTimeout(timer)
      socket.removeEventListener(eventName, onEvent)
      socket.removeEventListener('error', onError)
    }
    const onEvent = (event) => {
      cleanup()
      resolve(event)
    }
    const onError = () => {
      cleanup()
      reject(new Error(`WebSocket ${eventName} failed`))
    }

    socket.addEventListener(eventName, onEvent, { once: true })
    socket.addEventListener('error', onError, { once: true })
  })
}

async function readWebSocketJson(event) {
  if (event.data instanceof ArrayBuffer) {
    return JSON.parse(new TextDecoder().decode(event.data))
  }
  if (typeof Blob !== 'undefined' && event.data instanceof Blob) {
    return JSON.parse(await event.data.text())
  }
  return JSON.parse(String(event.data))
}

async function runCase(testCase, apiKey) {
  const socket = new WebSocket(`${WS_URL}?key=${apiKey}`)
  const outputChunks = []
  const inputChunks = []
  let setupComplete = false
  let turnComplete = false
  let closedWithError = null
  let fatalError = null

  socket.addEventListener('message', async (event) => {
    try {
      const message = await readWebSocketJson(event)
      if (message.setupComplete) {
        setupComplete = true
        return
      }
      const serverContent = message.serverContent
      if (!serverContent) return
      if (serverContent.inputTranscription?.text) inputChunks.push(serverContent.inputTranscription.text)
      if (serverContent.outputTranscription?.text) outputChunks.push(serverContent.outputTranscription.text)
      if (serverContent.turnComplete) turnComplete = true
    } catch (error) {
      fatalError = error
    }
  })
  socket.addEventListener('close', (event) => {
    if (!turnComplete) closedWithError = `closed (${event.code}) ${event.reason || ''}`.trim()
  })

  await waitForSocket(socket, 'open', SETUP_TIMEOUT_MS)
  socket.send(JSON.stringify({
    setup: {
      model: MODEL,
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: coachScene.voiceName || 'Charon' },
          },
        },
        temperature: 0.7,
      },
      systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      contextWindowCompression: { slidingWindow: {} },
    },
  }))

  await new Promise((resolve, reject) => {
    const started = Date.now()
    const tick = () => {
      if (setupComplete) return resolve()
      if (fatalError) return reject(fatalError)
      if (closedWithError) return reject(new Error(closedWithError))
      if (Date.now() - started > SETUP_TIMEOUT_MS) return reject(new Error('Timed out waiting for setupComplete'))
      setTimeout(tick, 100)
    }
    tick()
  })

  socket.send(JSON.stringify({ realtimeInput: { text: testCase.input } }))

  await new Promise((resolve, reject) => {
    const started = Date.now()
    const tick = () => {
      if (turnComplete) return resolve()
      if (fatalError) return reject(fatalError)
      if (closedWithError) return reject(new Error(closedWithError))
      if (Date.now() - started > TURN_TIMEOUT_MS) return reject(new Error('Timed out waiting for coach reply'))
      setTimeout(tick, 100)
    }
    tick()
  })

  try { socket.close() } catch { /* noop */ }

  const reply = cleanText(outputChunks.join(''))
  const transcriptInput = cleanText(inputChunks.join('')) || testCase.input
  const checkResults = testCase.checks.map((check) => ({
    label: check.label,
    pass: check.test(reply),
  }))

  return {
    id: testCase.id,
    label: testCase.label,
    input: transcriptInput,
    reply,
    checks: checkResults,
    pass: checkResults.every((check) => check.pass),
  }
}

function printReport(results) {
  console.log('Coach Harris availability live QA')
  console.log('Typed test input is sent from this developer script; the student UI supports voice and typed modes.\n')
  for (const result of results) {
    console.log(`## ${result.label}`)
    console.log(`Input: ${result.input}`)
    console.log(`Coach: ${result.reply || '(empty reply)'}`)
    for (const check of result.checks) {
      console.log(`${check.pass ? 'PASS' : 'FAIL'} - ${check.label}`)
    }
    console.log('')
  }
  const failed = results.filter((result) => !result.pass)
  if (failed.length) {
    console.log(`Result: FAIL (${failed.map((result) => result.id).join(', ')})`)
  } else {
    console.log('Result: PASS')
  }
}

const apiKey = await readApiKey()
if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  throw new Error('VITE_GEMINI_API_KEY is not configured in the environment or .env.local')
}

const results = []
for (const testCase of cases) {
  results.push(await runCase(testCase, apiKey))
}

printReport(results)

if (!results.every((result) => result.pass)) {
  process.exitCode = 1
}
