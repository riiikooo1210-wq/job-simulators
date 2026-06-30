import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const config = JSON.parse(
  readFileSync(new URL('../src/data/scene-config.json', import.meta.url), 'utf8')
)
const voiceMeetingSource = readFileSync(
  new URL('../src/scenes/VoiceMeetingScene.tsx', import.meta.url),
  'utf8'
)
const gameStoreSource = readFileSync(
  new URL('../src/store/gameStore.ts', import.meta.url),
  'utf8'
)
const typeSource = readFileSync(
  new URL('../src/types/game.ts', import.meta.url),
  'utf8'
)
const imagePrompts = readFileSync(
  new URL('../IMAGE_PROMPTS.md', import.meta.url),
  'utf8'
)
const validationDoc = readFileSync(
  new URL('../VALIDATION.md', import.meta.url),
  'utf8'
)

test('Maya check-in has a Gemini typed fallback that uses the same transcript key', () => {
  const mayaScene = config.storyline.nodes.scene_03_checkin

  assert.equal(mayaScene.typedFallback, true)
  assert.match(typeSource, /typedFallback\?: boolean/)
  assert.match(voiceMeetingSource, /import \{ npcReply \} from '\.\.\/services\/gemini'/)
  assert.match(voiceMeetingSource, /data-testid="maya-typed-fallback"/)
  assert.match(voiceMeetingSource, /Type to \$\{npc\.name\}/)
  assert.match(voiceMeetingSource, /Gemini API key not configured/)
  assert.match(voiceMeetingSource, /historyWithQuestion/)
  assert.match(voiceMeetingSource, /const reply = await npcReply/)
  assert.match(voiceMeetingSource, /appendNpcMessage\(conversationKey, userMessage\)/)
  assert.match(voiceMeetingSource, /appendNpcMessage\(conversationKey, \{ role: 'npc', content: reply/)
  assert.ok(
    voiceMeetingSource.indexOf('const reply = await npcReply') <
      voiceMeetingSource.indexOf('appendNpcMessage(conversationKey, userMessage)'),
    'typed fallback should not commit the learner turn until Gemini replies'
  )
  assert.match(voiceMeetingSource, /setTypedInput\(question\)/)
  assert.match(voiceMeetingSource, /Typed fallback rules/)
  assert.match(voiceMeetingSource, /Learner's earlier design notes/)
  assert.match(voiceMeetingSource, /Speak or type at least/)
})

test('removed old scene ids reset persisted state to intro', () => {
  for (const removedId of [
    'scene_01_standup',
    'scene_01b_hifi_redirect',
    'scene_01b_meeting_redirect',
    'scene_01b_wait_redirect',
  ]) {
    assert.equal(config.storyline.nodes[removedId], undefined)
    assert.match(gameStoreSource, new RegExp(`'${removedId}'`))
  }

  assert.match(gameStoreSource, /removedSceneIds/)
  assert.match(gameStoreSource, /sanitizeHydratedState/)
  assert.match(gameStoreSource, /freshInitialState/)
  assert.match(gameStoreSource, /merge: \(persistedState, currentState\)/)
  assert.match(gameStoreSource, /if \(!next\) return freshInitialState\(\)/)
  assert.match(gameStoreSource, /currentNodeId: storyline\.startNode/)
  assert.match(gameStoreSource, /visitedNodes: \[storyline\.startNode\]/)
})

test('active image docs and validation point to the current flow-diagram asset', () => {
  assert.match(config.storyline.nodes.scene_05_flow_diagram.illustration, /scene_05_flow_diagram\.png/)
  assert.match(imagePrompts, /\*\*Filename:\*\* `public\/scenes\/scene_05_flow_diagram\.png`/)
  assert.doesNotMatch(imagePrompts, /\*\*Filename:\*\* `public\/scenes\/scene_05_handoff\.png`/)
  assert.match(validationDoc, /public\/scenes\/scene_05_flow_diagram\.png/)
  assert.doesNotMatch(validationDoc, /Missing scene image/)
})
