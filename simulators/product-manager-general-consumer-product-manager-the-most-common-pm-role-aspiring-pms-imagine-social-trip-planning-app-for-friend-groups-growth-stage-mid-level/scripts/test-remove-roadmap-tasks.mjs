import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const removedSceneIds = ['scene_05_priority_matrix', 'scene_06_roadmap_kanban']
const removedTitles = ['Place the Candidate Bets', 'Triage the Roadmap Board']

const simulatorConfigUrl = new URL('../src/data/scene-config.json', import.meta.url)
const simulatorRubricUrl = new URL('../src/data/rubric.json', import.meta.url)
const simulatorBlueprintUrl = new URL('../SCENE_BLUEPRINT.md', import.meta.url)
const simulatorImagePromptsUrl = new URL('../IMAGE_PROMPTS.md', import.meta.url)
const synthesisConfigUrl = new URL(
  '../../../data/product-manager-general-consumer-product-manager-the-most-common-pm-role-aspiring-pms-imagine-social-trip-planning-app-for-friend-groups-growth-stage-mid-level/synthesis/scene-config.json',
  import.meta.url,
)
const synthesisBlueprintUrl = new URL(
  '../../../data/product-manager-general-consumer-product-manager-the-most-common-pm-role-aspiring-pms-imagine-social-trip-planning-app-for-friend-groups-growth-stage-mid-level/synthesis/SCENE_BLUEPRINT.md',
  import.meta.url,
)

const readJson = async (url) => JSON.parse(await readFile(url, 'utf8'))
const readText = async (url) => readFile(url, 'utf8')

const simulatorConfig = await readJson(simulatorConfigUrl)
const synthesisConfig = await readJson(synthesisConfigUrl)
const simulatorRubric = await readJson(simulatorRubricUrl)
const simulatorBlueprint = await readText(simulatorBlueprintUrl)
const synthesisBlueprint = await readText(synthesisBlueprintUrl)
const simulatorImagePrompts = await readText(simulatorImagePromptsUrl)

const assertRemovedFromConfig = (config, label) => {
  const nodes = config.storyline.nodes
  for (const sceneId of removedSceneIds) {
    assert.equal(nodes[sceneId], undefined, `${label} should not include removed scene ${sceneId}`)
  }

  assert.equal(
    nodes.scene_04_user_call.next,
    'scene_07_prd_slice',
    `${label} should route from the user interview directly to the PRD slice`,
  )

  const serialized = JSON.stringify(config)
  for (const sceneId of removedSceneIds) {
    assert.doesNotMatch(serialized, new RegExp(sceneId), `${label} should not reference removed scene ${sceneId}`)
  }
  for (const title of removedTitles) {
    assert.doesNotMatch(serialized, new RegExp(title), `${label} should not reference removed task "${title}"`)
  }
}

assertRemovedFromConfig(simulatorConfig, 'simulator scene config')
assertRemovedFromConfig(synthesisConfig, 'synthesis scene config')

const rubricText = JSON.stringify(simulatorRubric)
for (const sceneId of removedSceneIds) {
  assert.doesNotMatch(rubricText, new RegExp(sceneId), `rubric should not grade removed scene ${sceneId}`)
}
for (const title of removedTitles) {
  assert.doesNotMatch(simulatorBlueprint, new RegExp(title), `simulator blueprint should not list "${title}"`)
  assert.doesNotMatch(synthesisBlueprint, new RegExp(title), `synthesis blueprint should not list "${title}"`)
  assert.doesNotMatch(simulatorImagePrompts, new RegExp(title), `image prompts should not list "${title}"`)
}

