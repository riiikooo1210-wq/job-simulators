import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const config = JSON.parse(
  readFileSync(new URL('../src/data/scene-config.json', import.meta.url), 'utf8')
)
const rubric = JSON.parse(
  readFileSync(new URL('../src/data/rubric.json', import.meta.url), 'utf8')
)
const flowDiagramSceneSource = readFileSync(
  new URL('../src/scenes/FlowDiagramScene.tsx', import.meta.url),
  'utf8'
)
const screenDesignStudioSceneSource = readFileSync(
  new URL('../src/scenes/ScreenDesignStudioScene.tsx', import.meta.url),
  'utf8'
)
const geminiServiceSource = readFileSync(
  new URL('../src/services/gemini.ts', import.meta.url),
  'utf8'
)

const flowScene = config.storyline.nodes.scene_05_flow_diagram
const screenDesignScene = config.storyline.nodes.scene_06_screen_design
const visibleFlowText = [
  flowScene.content,
  flowScene.prompt,
  flowScene.rationalePrompt,
  JSON.stringify(flowScene.legendItems),
  JSON.stringify(flowScene.exampleFlow),
].join(' ')
const companionText = JSON.stringify(flowScene.companion)
const flowRubric = rubric.sections[0].criteria.find((criterion) => criterion.name === '利用者の流れ図')

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

test('user flow task keeps UX terms and gives concrete Friend Streaks examples', () => {
  assert.match(visibleFlowText, /Entry point/)
  assert.match(visibleFlowText, /Decision branch/)
  assert.match(visibleFlowText, /Edge case/)
  assert.match(visibleFlowText, /Final interaction/)

  assert.match(visibleFlowText, /Home habit card/)
  assert.match(visibleFlowText, /Hydration Detail/)
  assert.match(visibleFlowText, /Does the friend already have WellNest\?/)
  assert.match(visibleFlowText, /friend does not have the app/)
  assert.match(visibleFlowText, /invite ignored/)
  assert.match(visibleFlowText, /invite declined/)
  assert.match(visibleFlowText, /one person misses a day/)
  assert.match(visibleFlowText, /Shared Streak screen is created and visible/)
  assert.match(visibleFlowText, /Label arrows only when the path needs clarification/)
  assert.match(visibleFlowText, /Yes, No, Invite ignored, Invite declined, or Missed day/)
  assert.equal(visibleFlowText.includes('CTA or result'), false)
  assert.equal(visibleFlowText.includes('Send Invite, Accept Invite'), false)
})

test('flow diagram config requires the intended node kinds and includes an example flow', () => {
  assert.deepEqual(flowScene.requiredNodeKinds, [
    'entry_point',
    'screen',
    'action',
    'decision_branch',
    'final_interaction',
  ])
  assert.equal(flowScene.startNode, undefined)
  assert.equal(flowScene.nodeKinds.every((kind) => kind.defaultLabel === undefined), true)
  assert.ok(flowScene.exampleFlow.length >= 5)
  assert.ok(flowScene.legendItems.length >= 4)
  assert.match(flowScene.prompt, /Choose an Entry point/)
  assert.equal(countWords(flowScene.prompt) <= 105, true)
  assert.match(flowDiagramSceneSource, /Path label:/)
  assert.match(flowDiagramSceneSource, /Type label/)
  assert.match(flowDiagramSceneSource, /unlabeledNodeCount === 0/)
  assert.match(flowDiagramSceneSource, /label arrows only when the path needs clarification/)
  assert.equal(flowDiagramSceneSource.includes('Button/link label:'), false)
  assert.equal(flowDiagramSceneSource.includes('button/link/result'), false)
})

test('flow diagram is gradable without a separate rationale text response', () => {
  assert.equal(flowScene.rationalePrompt, undefined)
  assert.equal(flowScene.rationaleBindingKey, undefined)
  assert.equal(flowDiagramSceneSource.includes('Briefly explain your key design decisions for this flow'), false)
  assert.equal(flowDiagramSceneSource.includes('Please add a bit more detail'), false)
  assert.equal(flowDiagramSceneSource.includes('rationale.trim().length >= 20'), false)
  assert.match(geminiServiceSource, /USER FLOW DIAGRAM \(\$\{data\.nodes\.length\} nodes/)
  assert.match(geminiServiceSource, /n\.kind/)
  assert.match(geminiServiceSource, /path label/)
  assert.equal(geminiServiceSource.includes('button/link label'), false)
})

test('flow diagram uses Leo as a bottom discussion companion, not a side hint panel', () => {
  assert.equal(flowScene.companion.npcId, 'leo')
  assert.equal(flowScene.companion.title, 'Talk with Leo')
  assert.equal(flowScene.companion.voiceName, 'Charon')
  assert.match(flowScene.companion.fallbackPrompt, /Voice unavailable/)
  assert.match(flowScene.companion.systemGuidance, /build handoff/)
  assert.match(flowScene.companion.systemGuidance, /consistent lens/)
  assert.match(flowScene.companion.systemGuidance, /same project room/)
  assert.match(flowDiagramSceneSource, /data-testid="flow-diagram-companion"/)
  assert.match(flowDiagramSceneSource, /Stuck on the flow\? Talk it through with Leo/)
  assert.match(flowDiagramSceneSource, /Use UX terms lightly/)
  assert.match(flowDiagramSceneSource, /Ask at most one implementation-minded clarification question at a time/)
  assert.equal(flowDiagramSceneSource.includes('Ask him what needs to be clearer before engineering starts'), false)
  assert.match(flowDiagramSceneSource, /<DesktopOverlay>/)
})

test('friend streaks mockup window uses the same desktop overlay size as the user flow window', () => {
  assert.match(flowDiagramSceneSource, /<DesktopOverlay>\s*<LaptopFrame/)
  assert.match(screenDesignStudioSceneSource, /<DesktopOverlay>\s*<LaptopFrame variant="figma"/)
  assert.equal(screenDesignStudioSceneSource.includes('<DesktopOverlay width="88%" height="86%">'), false)
})

test('friend streaks mockup studio content adapts to the shared overlay width', () => {
  assert.match(screenDesignStudioSceneSource, /const studioGridColumns = /)
  assert.match(screenDesignStudioSceneSource, /minmax\(0, 1fr\)/)
  assert.match(screenDesignStudioSceneSource, /ResizeObserver/)
  assert.match(screenDesignStudioSceneSource, /phoneCanvasWidth/)
  assert.equal(screenDesignStudioSceneSource.includes("176px minmax(280px, 1fr) 232px"), false)
  assert.equal(screenDesignStudioSceneSource.includes('width: 220,\n                          height: 458,'), false)
})

test('design one screen task targets the final shared streak screen', () => {
  const visibleScreenText = [
    screenDesignScene.content,
    screenDesignScene.prompt,
    screenDesignScene.notesPlaceholder,
  ].join(' ')

  assert.match(visibleScreenText, /final Shared Streak screen/)
  assert.match(visibleScreenText, /after the friend accepts/)
  assert.match(visibleScreenText, /current shared streak count/)
  assert.match(visibleScreenText, /today's completion state/)
  assert.match(visibleScreenText, /change the text on any default button or component/)
  assert.doesNotMatch(screenDesignScene.notesPlaceholder, /^e\.g\./)
  assert.equal(
    screenDesignScene.notesPlaceholder,
    'Name one design choice you made and why it helps users understand the shared streak.'
  )
  assert.doesNotMatch(screenDesignScene.notesPlaceholder, /what changes after the user marks today's habit/)
  assert.doesNotMatch(screenDesignScene.notesPlaceholder, /behavior Leo needs to build/)
  assert.equal(visibleScreenText.includes('first page'), false)
  assert.equal(visibleScreenText.includes('invitation flow'), false)
  assert.equal(visibleScreenText.includes('invite page'), false)

  assert.match(screenDesignStudioSceneSource, /shared_streak_screen/)
  assert.match(screenDesignStudioSceneSource, /Shared Streak Screen/)
  assert.match(screenDesignStudioSceneSource, /Both friends and completion state/)
  assert.match(screenDesignStudioSceneSource, /Accepted shared streak state/)
  assert.match(screenDesignStudioSceneSource, /freeform_rectangle/)
  assert.match(screenDesignStudioSceneSource, /Horizontal Rect/)
  assert.match(screenDesignStudioSceneSource, /freeform_vertical/)
  assert.match(screenDesignStudioSceneSource, /Vertical Rect/)
  assert.equal(screenDesignStudioSceneSource.includes('Friend Streaks Home'), false)
  assert.equal(screenDesignStudioSceneSource.includes('Friend identity and invite state'), false)
})

test('Leo companion uses the same voice-first controls as the PM audit companion', () => {
  assert.match(flowDiagramSceneSource, /GeminiLiveSession/)
  assert.match(flowDiagramSceneSource, /LiveStatus/)
  assert.match(flowDiagramSceneSource, /Start voice/)
  assert.match(flowDiagramSceneSource, /Unmute/)
  assert.match(flowDiagramSceneSource, /Mute/)
  assert.match(flowDiagramSceneSource, /Stop/)
  assert.match(flowDiagramSceneSource, /Flow context changed/)
  assert.match(flowDiagramSceneSource, /same-room workplace conversation/)
  assert.equal(flowDiagramSceneSource.includes('Talk through a flow question with Leo...'), false)
})

test('Leo companion has hidden WellNest context and a guided-question response policy', () => {
  assert.match(companionText, /WellNest is a consumer mobile app/)
  assert.match(companionText, /Home habit cards/)
  assert.match(companionText, /Hydration Detail/)
  assert.match(companionText, /Friend Streaks has not been added yet/)
  assert.match(companionText, /same habit on the same day/)
  assert.match(companionText, /Entry point connects to an existing WellNest surface/)
  assert.match(companionText, /Decision branch reads like a question/)
  assert.match(companionText, /At least one Edge case is handled/)
  assert.match(companionText, /Final interaction makes the task feel complete/)
  assert.match(companionText, /Do not force one canonical answer/)
  assert.match(companionText, /Do not provide the player's full answer/)
  assert.match(companionText, /guided question/)
  assert.match(flowDiagramSceneSource, /WELLNEST FACTS/)
  assert.match(flowDiagramSceneSource, /GOOD USER FLOW CRITERIA/)
  assert.match(flowDiagramSceneSource, /FRIEND STREAKS DIRECTION/)
  assert.match(flowDiagramSceneSource, /LEO RESPONSE POLICY/)
})

test('flow rubric uses the same concrete criteria as the task', () => {
  assert.ok(flowRubric)
  assert.match(flowRubric.rubric_text, /Entry point/)
  assert.match(flowRubric.rubric_text, /Decision branch/)
  assert.match(flowRubric.rubric_text, /Edge case/)
  assert.match(flowRubric.rubric_text, /Final interaction/)
  assert.match(flowRubric.rubric_text, /Does the friend already have WellNest\?/)
  assert.match(flowRubric.rubric_text, /Shared Streak screen is created and visible/)
})
