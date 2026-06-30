import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const config = JSON.parse(
  readFileSync(new URL('../src/data/scene-config.json', import.meta.url), 'utf8')
)
const rubric = JSON.parse(
  readFileSync(new URL('../src/data/rubric.json', import.meta.url), 'utf8')
)
const voiceMeetingSource = readFileSync(
  new URL('../src/scenes/VoiceMeetingScene.tsx', import.meta.url),
  'utf8'
)
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const sceneTransitionSource = readFileSync(
  new URL('../src/engine/SceneTransition.tsx', import.meta.url),
  'utf8'
)
const sceneEngineSource = readFileSync(
  new URL('../src/engine/SceneEngine.tsx', import.meta.url),
  'utf8'
)
const gameStoreSource = readFileSync(new URL('../src/store/gameStore.ts', import.meta.url), 'utf8')
const sectionTransitionSource = readFileSync(
  new URL('../src/scenes/ScenarioTransitionScene.tsx', import.meta.url),
  'utf8'
)

const morning = config.storyline.nodes.morning_briefing
const teachingNote = config.storyline.nodes.mechanic_hook_sheet
const designReviewPrep = config.storyline.nodes.design_review_prep
const designReview = config.storyline.nodes.design_review

test('morning recap uses its own scene image and omits the redundant Niko Slack source', () => {
  assert.equal(morning.title, 'Morning Recap')
  assert.equal(morning.briefingMode, 'simple')
  assert.equal(morning.illustration, '/scenes/morning_briefing.png')
  assert.equal(
    existsSync(new URL('../public/scenes/morning_briefing.png', import.meta.url)),
    true
  )
  assert.equal(morning.subSteps, undefined)
  assert.equal(morning.sourceWorkspace, undefined)
  assert.equal(JSON.stringify(morning).includes('Niko Tan'), false)
  assert.equal(JSON.stringify(morning).includes("Maya's morning recap"), false)
  assert.equal(JSON.stringify(morning).includes("Owen's quick notes"), false)
  assert.equal(JSON.stringify(morning).includes('Playtester A'), false)
  assert.equal(JSON.stringify(morning).includes('Playtester C'), false)
})

test('Wind Bud Teaching Note desktop keeps playtest numbers inside the debugging tab', () => {
  const tabs = teachingNote.workSurface?.sourceTabs ?? []
  const debuggingTab = tabs.find((tab) => tab.id === 'debugging_notes')
  const statsTab = tabs.find((tab) => tab.id === 'playtest_data')

  assert.ok(debuggingTab, 'expected a debugging notes tab')
  assert.equal(statsTab, undefined, 'expected no separate playtest data tab')
  assert.equal(debuggingTab.label, 'Debugging Notes')
  assert.ok(debuggingTab.content.includes('Player test results'))
  assert.ok(Array.isArray(debuggingTab.metrics), 'expected debugging tab metrics')
  assert.equal(debuggingTab.metrics.length, 2)
  assert.deepEqual(
    debuggingTab.metrics.map((row) => row.areaLabel),
    ['Wind path', 'Landing platform']
  )
})

test('Teaching Note input is bounded to playtest-compatible signals', () => {
  const fields = teachingNote.definition.fields
  const byKey = Object.fromEntries(fields.map((field) => [field.key, field]))

  assert.deepEqual(
    fields.map((field) => field.key),
    ['stage_focus', 'attention_effect', 'success_feedback', 'confusion_signal']
  )
  for (const key of ['stage_focus', 'attention_effect', 'success_feedback', 'confusion_signal']) {
    assert.equal(byKey[key].inputType, 'select', `expected ${key} to be a fixed select`)
    assert.ok(Array.isArray(byKey[key].options), `expected ${key} to define options`)
    assert.ok(byKey[key].options.length >= 4, `expected ${key} to offer enough bounded choices`)
    assert.equal(byKey[key].multiline, undefined, `expected ${key} not to be broad free text`)
  }
  assert.ok(JSON.stringify(byKey.confusion_signal.options).includes('backs away from the active wind path and falls'))
})

test('Playtest Watchlist uses fixed choices that match the authored playtest timeline', () => {
  const watchlist = config.storyline.nodes.playtest_watchlist
  const playtest = config.storyline.nodes.playtest_workspace
  const fields = watchlist.definition.fields
  const byKey = Object.fromEntries(fields.map((field) => [field.key, field]))

  assert.deepEqual(
    fields.map((field) => field.key),
    ['observed_behavior', 'success_signal', 'failure_signal', 'ignore_noise']
  )
  for (const key of ['observed_behavior', 'success_signal', 'failure_signal', 'ignore_noise']) {
    assert.equal(byKey[key].inputType, 'select', `expected ${key} to be a fixed select`)
    assert.ok(Array.isArray(byKey[key].options), `expected ${key} to define options`)
    assert.ok(byKey[key].options.every((option) => typeof option === 'string'), `expected ${key} options to display as readable saved text`)
    assert.equal(byKey[key].multiline, undefined, `expected ${key} not to be broad free text`)
  }

  const optionText = JSON.stringify(fields.map((field) => field.options))
  const eventText = JSON.stringify(playtest.events)
  for (const phrase of ['Wind Bud', 'wind path', 'landing', 'coins']) {
    assert.ok(optionText.includes(phrase), `expected watchlist choices to include ${phrase}`)
    assert.ok(eventText.includes(phrase), `expected playtest timeline to include ${phrase}`)
  }
})

test('engineering handoff prep owns the spec email and current implementation checklist', () => {
  const prepText = JSON.stringify(designReviewPrep)

  assert.ok(prepText.includes('{{response.spec_update}}'))
  assert.ok(prepText.includes('Possible questions Priya may ask'))
  assert.ok(prepText.includes('Team need: keep the fix small, adjustable, and easy for QA to check.'))
  assert.equal(prepText.includes('Possible gap checks Priya may adapt'), false)
  assert.equal(prepText.includes('Team need: keep the patch small, tunable, and QA-verifiable.'), false)
})

test('engineering handoff call reference only shows priority note and email', () => {
  const callReference = designReview.prepReferenceContent
  const priorityIndex = callReference.indexOf('{{response.playtest_fix_priority}}')
  const emailIndex = callReference.indexOf('{{response.spec_update}}')

  assert.equal(designReview.npcId, 'priya')
  assert.equal(designReview.prepNoteKey, 'design_review_prep')
  assert.ok(priorityIndex !== -1, 'expected call reference to show the priority note')
  assert.ok(emailIndex !== -1, 'expected call reference to show the spec update email')
  assert.ok(priorityIndex < emailIndex, 'expected priority note to appear before the email')
  assert.equal(callReference.includes('Possible questions Priya may ask'), false)
  assert.equal(callReference.includes('Which edge cases or retries could break that behavior?'), false)
})

test('voice meeting supports typed fallback and renders prep note before reference content', () => {
  const prepNoteBlock = voiceMeetingSource.indexOf('{prepNote && (')
  const prepReferenceBlock = voiceMeetingSource.indexOf('{prepReference && (')

  assert.equal(designReview.typedFallback.enabled, true)
  assert.equal(designReview.typedFallback.startLabel, 'Use typing instead')
  assert.equal(designReview.typedFallback.sendLabel, 'Send typed turn')
  assert.equal(designReview.typedFallback.endLabel, 'End typed handoff')
  assert.equal(designReview.typedFallback.npcPrompts.length, 3)
  assert.ok(voiceMeetingSource.includes('startTypedConversation'))
  assert.ok(voiceMeetingSource.includes('sendTypedTurn'))
  assert.notEqual(prepNoteBlock, -1, 'expected prep note block in voice meeting reference panel')
  assert.notEqual(prepReferenceBlock, -1, 'expected prep reference block in voice meeting reference panel')
  assert.ok(prepNoteBlock < prepReferenceBlock)
})

test('removed-scene saved states redirect to current route targets', () => {
  assert.deepEqual(config.storyline.staleNodeRedirects, {
    issue_priority_matrix: 'spec_update',
    final_handoff_email: 'assessment_gate',
  })
  assert.ok(sceneEngineSource.includes('staleNodeRedirects'))
  assert.ok(sceneEngineSource.includes('Redirecting to the current task'))
})

test('rubric labels and docs are English-facing', () => {
  const rubricText = JSON.stringify(rubric)
  const embeddedRubricText = JSON.stringify(config.rubric)
  const japanesePattern = /[\u3040-\u30ff\u3400-\u9fff]/

  assert.equal(rubric.sections[0].section_title, 'Task Scoring')
  assert.deepEqual(
    rubric.sections[0].criteria.map((criterion) => criterion.name),
    [
      'Mechanic Problem Framing',
      'Playtest Watchlist',
      'Playtest Observation',
      'Spec Update',
      'Engineering Handoff',
    ]
  )
  assert.equal(japanesePattern.test(rubricText), false)
  assert.equal(japanesePattern.test(embeddedRubricText), false)
  assert.deepEqual(config.rubric, rubric)
})

test('normal route transitions and dev controls are guarded in source', () => {
  assert.ok(appSource.includes('isDevtoolsEnabled'))
  assert.ok(appSource.includes('showDevSkips = showDevtools'))
  assert.ok(sectionTransitionSource.includes('isDevtoolsEnabled'))
  assert.equal(sceneTransitionSource.includes('AnimatePresence'), false)
  assert.equal(sceneTransitionSource.includes('exit={{'), false)
})

test('persist fallback key is simulator-specific when global injection is not ready yet', () => {
  assert.ok(gameStoreSource.includes(`${rubric.simulation_id}-simulator-storage`))
  assert.equal(gameStoreSource.includes(": 'job-simulator-storage'"), false)
})
