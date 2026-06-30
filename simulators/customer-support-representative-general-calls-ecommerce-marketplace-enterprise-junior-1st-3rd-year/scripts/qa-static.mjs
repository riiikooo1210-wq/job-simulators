import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

const failures = []

function check(condition, message) {
  if (!condition) failures.push(message)
}

const config = readJson('src/data/scene-config.json')
const rubric = readJson('src/data/rubric.json')
const voiceMeetingSource = readText('src/scenes/VoiceMeetingScene.tsx')
const supportConsoleSource = readText('src/components/ui/SupportConsole.tsx')
const supportConsoleDataSource = readText('src/data/supportConsole.ts')

const nodes = config.storyline?.nodes || {}
const expectedRoute = [
  'intro',
  'prep_order_status',
  'call_order_status',
  'prep_late_delivery',
  'call_late_delivery',
  'prep_risk_refund',
  'call_risk_refund',
  'assessment_gate',
  'grading',
  'final_report',
]
const expectedCalls = ['call_order_status', 'call_late_delivery', 'call_risk_refund']
const expectedPrepScenes = ['prep_order_status', 'prep_late_delivery', 'prep_risk_refund']
const expectedConsoleScenarios = {
  prep_order_status: { scenarioId: 'order_status', mode: 'prep', requiredFiles: ['shared_call_flow', 'order_status_manual'] },
  call_order_status: { scenarioId: 'order_status', mode: 'call' },
  prep_late_delivery: { scenarioId: 'late_delivery', mode: 'prep', requiredFiles: ['shared_call_flow', 'late_delivery_manual'] },
  call_late_delivery: { scenarioId: 'late_delivery', mode: 'call' },
  prep_risk_refund: { scenarioId: 'risk_refund', mode: 'prep', requiredFiles: ['shared_call_flow', 'risk_manual'] },
  call_risk_refund: { scenarioId: 'risk_refund', mode: 'call' },
}
const expectedEvidence = {
  'Order-Status Call': ['call_order_status'],
  'Late-Delivery Call': ['call_late_delivery'],
  'High-Value Refund Call': ['call_risk_refund'],
}

check(config.storyline?.startNode === expectedRoute[0], 'storyline.startNode should be intro')

for (let i = 0; i < expectedRoute.length; i++) {
  const sceneId = expectedRoute[i]
  const node = nodes[sceneId]
  check(Boolean(node), `Missing route node: ${sceneId}`)
  if (!node) continue
  const expectedNext = expectedRoute[i + 1] || null
  check(node.next === expectedNext, `${sceneId}.next should be ${expectedNext}`)
}

for (const [sceneId, node] of Object.entries(nodes)) {
  if (typeof node.next === 'string') {
    check(Boolean(nodes[node.next]), `${sceneId}.next points to missing node ${node.next}`)
  }
}

for (const sceneId of expectedCalls) {
  const node = nodes[sceneId]
  check(node?.type === 'voice_meeting', `${sceneId} should be a voice_meeting`)
  check(typeof node?.npcId === 'string' && node.npcId.length > 0, `${sceneId} needs npcId`)
  check(typeof node?.playerGoal === 'string' && node.playerGoal.trim().length > 0, `${sceneId} needs playerGoal`)
  check(typeof node?.endpoint === 'string' && node.endpoint.trim().length > 0, `${sceneId} needs endpoint`)
  check(typeof node?.successCriteria === 'string' && node.successCriteria.trim().length > 0, `${sceneId} needs successCriteria`)
  check(typeof node?.prepReferenceContent === 'string' && node.prepReferenceContent.length >= 500, `${sceneId} needs substantial visible reference content`)
  check(Number.isInteger(node?.minTurns) && node.minTurns >= 3, `${sceneId} needs minTurns >= 3`)
  check(Number.isInteger(node?.maxTurns) && node.maxTurns >= node.minTurns, `${sceneId} needs maxTurns >= minTurns`)
}

for (const sceneId of [...expectedPrepScenes, ...expectedCalls]) {
  const node = nodes[sceneId]
  const expected = expectedConsoleScenarios[sceneId]
  check(Boolean(node?.supportConsole), `${sceneId} needs supportConsole metadata`)
  check(node?.supportConsole?.scenarioId === expected.scenarioId, `${sceneId}.supportConsole.scenarioId should be ${expected.scenarioId}`)
  check(node?.supportConsole?.mode === expected.mode, `${sceneId}.supportConsole.mode should be ${expected.mode}`)
}

for (const sceneId of expectedPrepScenes) {
  const node = nodes[sceneId]
  const expected = expectedConsoleScenarios[sceneId]
  const required = node?.sourceInbox?.requiredFileIds || []
  check(deepEqual(required, expected.requiredFiles), `${sceneId} required policy files changed`)
}

check(deepEqual(config.rubric, rubric), 'scene-config embedded rubric should match src/data/rubric.json')
check(rubric.sections?.length === 1, 'rubric should have one task-scoring section')
const criteria = rubric.sections?.flatMap((section) => section.criteria || []) || []
check(criteria.length === 3, 'rubric should have exactly three criteria')
for (const criterion of criteria) {
  const expected = expectedEvidence[criterion.name]
  check(Boolean(expected), `Unexpected rubric criterion: ${criterion.name}`)
  if (expected) {
    check(deepEqual(criterion.evidenceSceneIds, expected), `${criterion.name} evidence scenes are stale`)
  }
}

const promptInitializer = voiceMeetingSource.match(/const initial =[\s\S]*?return `You are/)
check(Boolean(promptInitializer), 'buildSystemPrompt initial-message block should be detectable')
if (promptInitializer) {
  check(promptInitializer[0].includes('textForPrompt(m.content)'), 'initial prompt messages should use textForPrompt')
  check(!promptInitializer[0].includes('renderContentWithGlossary(m.content)'), 'initial prompt messages must not render React glossary nodes')
}
check(voiceMeetingSource.includes('function textForPrompt'), 'VoiceMeetingScene should expose textForPrompt helper')
check(voiceMeetingSource.includes('/CRM lookup result/i'), 'VoiceMeetingScene should derive CRM unlock from CRM lookup result text')
check(voiceMeetingSource.includes('<SupportConsoleCall'), 'VoiceMeetingScene should render SupportConsoleCall for configured call scenes')
check(supportConsoleSource.includes('Caller not verified') === false, 'SupportConsole component should read locked copy from data, not hard-code one scenario')
check(supportConsoleSource.includes('crmUnlocked'), 'SupportConsole component should support locked/unlocked CRM states')
check(supportConsoleSource.includes('support-console__locked-box'), 'SupportConsole should render locked CRM state before lookup')
for (const scenarioId of ['order_status', 'late_delivery', 'risk_refund']) {
  check(supportConsoleDataSource.includes(`${scenarioId}:`), `supportConsole data missing ${scenarioId}`)
}
for (const forbiddenEarlyFact of ['MM-18472', 'MM-73918', 'MM-88019']) {
  check(!supportConsoleSource.includes(forbiddenEarlyFact), `SupportConsole renderer must not hard-code order fact ${forbiddenEarlyFact}`)
}

if (failures.length) {
  console.error('Static QA failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Static QA passed: ${expectedRoute.length} route nodes, ${expectedCalls.length} typed-call scenes, ${criteria.length} rubric criteria, ${expectedPrepScenes.length + expectedCalls.length} support-console scenes.`)
