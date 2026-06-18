import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const slug = 'registered-nurse-med-surg-hospital-floor-general-large-urban-hospital-academic-medical-center-enterprise-large-health-system-entry-new-grad-0-1-yr'

async function readConfig(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function getBedLowLockedObject(config) {
  const node = config.storyline.nodes.scene2_assessment
  assert.equal(node.type, 'physical_playground')
  const object = node.interactiveObjects.find((item) => item.id === 'bed_low_locked')
  assert.ok(object, 'scene2_assessment should include the bed_low_locked interactive object')
  return object
}

async function assertBedLowLockedChoice(configPath) {
  const config = await readConfig(configPath)
  const object = getBedLowLockedObject(config)

  assert.match(
    object.detail,
    /scissor|lift arms/i,
    'bed low description should name the under-bed lift mechanism, not just say "low"',
  )
  assert.match(
    object.playerInstruction,
    /scissor|lift arms/i,
    'player instruction should explain how to visually check bed low',
  )
  assert.match(object.playerInstruction, /height indicator is at lowest/)
  assert.doesNotMatch(object.playerInstruction, /LOWEST/)
  assert.equal(object.choiceQuestion, 'Is Mrs. Vance\'s bed low and locked?')
  assert.deepEqual(
    object.choiceOptions.map(({ id, label, correct }) => ({ id, label, correct })),
    [
      { id: 'bed_low_and_locked', label: 'Yes, bed is low and locked', correct: true },
      { id: 'bed_not_low_or_unlocked', label: 'No, bed is too high or unlocked', correct: false },
    ],
  )
}

test('Room 512 bed safety check asks the player to decide whether the bed is low and locked', async () => {
  await assertBedLowLockedChoice('./src/data/scene-config.json')
})

test('source synthesis keeps the Room 512 bed safety choice in sync', async () => {
  await assertBedLowLockedChoice(`../../data/${slug}/synthesis/scene-config.json`)
})
