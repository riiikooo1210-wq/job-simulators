import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const briefingSceneSource = readFileSync(
  new URL('../src/scenes/BriefingScene.tsx', import.meta.url),
  'utf8'
)

test('simple briefing image renders before build memory and coworker recap', () => {
  const sceneStartIndex = briefingSceneSource.indexOf('export default function BriefingScene')
  const titleIndex = briefingSceneSource.indexOf('{node.title}', sceneStartIndex)
  const illustrationIndex = briefingSceneSource.indexOf('<InlineIllustration src={node.illustration} />', titleIndex)
  const leadInIndex = briefingSceneSource.indexOf('<BriefingLeadIn node={node}', titleIndex)

  assert.notEqual(sceneStartIndex, -1, 'expected BriefingScene rendering')
  assert.notEqual(titleIndex, -1, 'expected scene title rendering')
  assert.notEqual(illustrationIndex, -1, 'expected inline scene illustration rendering')
  assert.notEqual(leadInIndex, -1, 'expected briefing lead-in rendering')
  assert.ok(
    titleIndex < illustrationIndex && illustrationIndex < leadInIndex,
    'expected the inline scene image directly after the title and before build memory/coworker recap'
  )
})
