import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const playtestTimelineSource = readFileSync(
  new URL('../src/scenes/PlaytestTimelineScene.tsx', import.meta.url),
  'utf8'
)

test('playtest moment explanation is overlaid inside the image stage', () => {
  const stageUsageIndex = playtestTimelineSource.indexOf('<PlaytestMomentStage event={currentEvent}>')
  const stageCloseIndex = playtestTimelineSource.indexOf('</PlaytestMomentStage>', stageUsageIndex)
  const dialogueIndex = playtestTimelineSource.indexOf('className="playtest-moment-dialogue"', stageUsageIndex)
  const absoluteIndex = playtestTimelineSource.indexOf("position: 'absolute'", dialogueIndex)
  const bottomIndex = playtestTimelineSource.indexOf("bottom: 'clamp(0.75rem, 2vw, 1.25rem)'", dialogueIndex)

  assert.notEqual(stageUsageIndex, -1, 'expected the timeline scene to render PlaytestMomentStage with children')
  assert.notEqual(stageCloseIndex, -1, 'expected the timeline scene to close PlaytestMomentStage after overlay content')
  assert.ok(
    stageUsageIndex < dialogueIndex && dialogueIndex < stageCloseIndex,
    'expected the current moment explanation to be nested inside the image stage'
  )
  assert.ok(
    dialogueIndex < absoluteIndex && absoluteIndex < stageCloseIndex,
    'expected the explanation box to be absolutely positioned over the stage'
  )
  assert.ok(
    dialogueIndex < bottomIndex && bottomIndex < stageCloseIndex,
    'expected the explanation box to sit near the lower edge of the stage'
  )
})

test('playtest timeline does not render separate moment number picker buttons', () => {
  assert.equal(
    playtestTimelineSource.includes('Choose any {currentEvent.testerLabel} moment to revisit.'),
    false,
    'expected no separate moment picker helper text'
  )
  assert.equal(
    playtestTimelineSource.includes('testerEvents.map((event, index)'),
    false,
    'expected no mapped number buttons for individual moments'
  )
})
