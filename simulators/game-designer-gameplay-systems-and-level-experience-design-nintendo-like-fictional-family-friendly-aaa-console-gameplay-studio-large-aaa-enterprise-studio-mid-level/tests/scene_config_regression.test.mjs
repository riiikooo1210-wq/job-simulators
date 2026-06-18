import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const config = JSON.parse(
  readFileSync(new URL('../src/data/scene-config.json', import.meta.url), 'utf8')
)
const voiceMeetingSource = readFileSync(
  new URL('../src/scenes/VoiceMeetingScene.tsx', import.meta.url),
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
  assert.equal(
    Boolean(morning.subSteps?.some((step) => step.slackMessages?.length || step.metrics?.length)),
    false
  )
})

test('Wind Bud Teaching Note desktop has separate debugging and playtest data tabs', () => {
  const tabs = teachingNote.workSurface?.sourceTabs ?? []
  const debuggingTab = tabs.find((tab) => tab.id === 'debugging_notes')
  const statsTab = tabs.find((tab) => tab.id === 'playtest_data')

  assert.ok(debuggingTab, 'expected a debugging notes tab')
  assert.ok(statsTab, 'expected a playtest data tab')
  assert.notEqual(debuggingTab.id, statsTab.id)
  assert.equal(statsTab.label, 'Playtest Data')
  assert.equal(JSON.stringify(statsTab).includes('Morning'), false)
  assert.equal(JSON.stringify(statsTab).includes('morning'), false)
  assert.ok(Array.isArray(statsTab.metrics), 'expected stats tab metrics')
  assert.ok(statsTab.metrics.length >= 6, 'expected briefing and telemetry metrics to move here')
  assert.ok(statsTab.metrics.some((row) => row.metric === 'Players who noticed first Wind Bud without hint'))
  assert.ok(statsTab.metrics.some((row) => row.metric === 'Wind Bud cue noticed'))
})

test('engineering handoff prep owns the spec email and implementation gap checklist', () => {
  const prepText = JSON.stringify(designReviewPrep)

  assert.ok(
    prepText.includes('{{response.spec_update}}'),
    'expected prep scene to show the submitted spec update email'
  )
  assert.ok(
    prepText.includes('Possible gap checks Priya may adapt'),
    'expected prep scene to contain the implementation gap checklist'
  )
  assert.ok(
    prepText.includes('Team need: keep the patch small, tunable, and QA-verifiable.'),
    'expected prep scene to contain the team need reminder'
  )
})

test('engineering handoff call reference only shows priority note and email', () => {
  const callReference = designReview.prepReferenceContent
  const priorityIndex = callReference.indexOf('{{response.playtest_fix_priority}}')
  const emailIndex = callReference.indexOf('{{response.spec_update}}')

  assert.equal(designReview.prepNoteKey, 'design_review_prep')
  assert.ok(priorityIndex !== -1, 'expected call reference to show the priority note')
  assert.ok(emailIndex !== -1, 'expected call reference to show the spec update email')
  assert.ok(priorityIndex < emailIndex, 'expected priority note to appear before the email')
  assert.equal(callReference.includes('Possible gap checks Priya may adapt'), false)
  assert.equal(callReference.includes('Which edge cases or retries could break that behavior?'), false)
  assert.equal(callReference.includes('Team need: keep the patch small, tunable, and QA-verifiable.'), false)
})

test('voice meeting reference panel renders the prep note before the reference content', () => {
  const prepNoteBlock = voiceMeetingSource.indexOf('{prepNote && (')
  const prepReferenceBlock = voiceMeetingSource.indexOf('{prepReference && (')

  assert.notEqual(prepNoteBlock, -1, 'expected prep note block in voice meeting reference panel')
  assert.notEqual(prepReferenceBlock, -1, 'expected prep reference block in voice meeting reference panel')
  assert.ok(
    prepNoteBlock < prepReferenceBlock,
    'expected the prep note to render at the top of the call reference panel'
  )
})
