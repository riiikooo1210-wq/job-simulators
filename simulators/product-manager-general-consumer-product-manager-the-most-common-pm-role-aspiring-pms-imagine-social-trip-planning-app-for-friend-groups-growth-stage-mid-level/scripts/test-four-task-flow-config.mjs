import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const config = JSON.parse(await readFile(new URL('../src/data/scene-config.json', import.meta.url), 'utf8'))
const rubric = JSON.parse(await readFile(new URL('../src/data/rubric.json', import.meta.url), 'utf8'))

const nodes = config.storyline.nodes
const expectedPath = [
  'intro',
  'briefing_kickoff',
  'scene_02_app_audit',
  'scene_03_research_prep',
  'scene_04_user_call',
  'scene_07_prd_slice',
  'assessment_gate',
  'grading',
  'final_report',
]

assert.deepEqual(
  config.storyline.sections.map((section) => section.label),
  ['Audit', 'Prep', 'Interview', 'Product Plan'],
  'progress labels should match the four learner tasks',
)

assert.deepEqual(
  config.storyline.devSkips.map((skip) => skip.targetNodeId),
  ['scene_02_app_audit', 'scene_03_research_prep', 'scene_04_user_call', 'scene_07_prd_slice', 'assessment_gate'],
  'dev skips should not include removed intermediate tasks',
)
assert.deepEqual(
  config.storyline.devSkips.map((skip) => skip.label),
  ['App Audit', 'Prep', 'Interview', 'Product Plan', 'Assessment'],
  'dev skip labels should stay aligned with current learner-facing task names',
)

let current = config.storyline.startNode
const actualPath = [current]
while (nodes[current]?.next) {
  current = nodes[current].next
  actualPath.push(current)
  assert.ok(actualPath.length <= expectedPath.length, 'storyline should not contain an unexpected extra step')
}

assert.deepEqual(actualPath, expectedPath, 'normal storyline should follow the four-task flow')
assert.equal(nodes.scene_02_app_audit.next, 'scene_03_research_prep', 'app audit should lead straight to interview prep')
assert.equal(nodes.scene_03_research_prep.next, 'scene_04_user_call', 'interview prep should lead to the user interview')
assert.equal(nodes.scene_04_user_call.next, 'scene_07_prd_slice', 'user interview should lead to Product Plan writing')
assert.equal(nodes.scene_07_prd_slice.next, 'assessment_gate', 'Product Plan writing should lead to assessment')
assert.equal(nodes.scene_02_problem_brief, undefined, 'removed intermediate task should not exist as an active node')
assert.equal(nodes.transition_research, undefined, 'removed transition should not exist as an active node')

const prep = nodes.scene_03_research_prep
assert.equal(prep.title, 'Prepare the User Call', 'second task should be interview prep')
assert.match(prep.prompt, /exactly 5 user interview questions/i, 'prep prompt should require five questions')
assert.match(prep.prompt, /learning goal/i, 'prep prompt should require a learning goal')
assert.equal(
  prep.appTabs.find((tab) => tab.id === 'app_audit_notes')?.label,
  'Your App Audit Notes',
  'prep should reference app audit notes instead of an intermediate task',
)

const sample = config.sample_answers.career_report_sample
assert.deepEqual(
  sample.visitedNodes,
  expectedPath.slice(0, -1),
  'sample report replay should follow the same task order through grading',
)
assert.equal(sample.freeTextResponses.problemBrief, undefined, 'sample answers should not prefill removed intermediate output')

const criteria = rubric.sections.flatMap((section) => section.criteria)
assert.deepEqual(
  criteria.map((criterion) => criterion.evidenceSceneIds[0]),
  ['scene_02_app_audit', 'scene_03_research_prep', 'scene_04_user_call', 'scene_07_prd_slice'],
  'rubric should grade the four learner tasks in order',
)
assert.ok(
  criteria.some((criterion) => criterion.name === '面談準備' && criterion.evidenceSceneIds.includes('scene_03_research_prep')),
  'rubric should grade interview prep instead of the removed intermediate task',
)

const visibleConfigText = JSON.stringify({
  storyline: config.storyline,
  intro: config.intro,
  sample_answers: config.sample_answers,
  rubric,
})
assert.doesNotMatch(visibleConfigText, /Problem Notes|problem notes|problemBrief|scene_02_problem_brief|transition_research|問題要約/i)

console.log('four-task product-manager flow config ok')
