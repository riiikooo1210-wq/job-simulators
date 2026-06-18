import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const config = JSON.parse(await readFile(new URL('../src/data/scene-config.json', import.meta.url), 'utf8'))
const rubric = JSON.parse(await readFile(new URL('../src/data/rubric.json', import.meta.url), 'utf8'))
const node = config.storyline.nodes.scene_02_problem_brief

assert.equal(node.title, 'Refine the App Audit Notes', 'problem synthesis scene should refine the four audit notes')
assert.match(node.content, /turn each observation into a clearer PM problem note/i, 'scene content should frame the task as refining observations')
assert.doesNotMatch(node.content, /main product problem|one main problem|main\/largest/i, 'scene content should not ask for one main problem')
assert.equal(node.windowTitle, 'Roamly - App Audit Problem Notes', 'window title should match the problem-note task')
assert.equal(node.workSurface.title, 'Roamly - App Audit Problem Notes', 'work surface title should match the problem-note task')
assert.equal(node.prompt, 'Refine each app-audit observation into a PM problem note for the user call.', 'prompt should point toward user-call prep')

assert.deepEqual(
  node.workSurface.sourceTabs.map((tab) => tab.id),
  ['amplitude_funnel', 'current_app_audit'],
  'problem synthesis should expose only analytics and current app audit evidence tabs',
)
assert.equal(
  node.workSurface.sourceTabs.find((tab) => tab.id === 'amplitude_funnel')?.label,
  'Analytics',
  'funnel evidence tab should be labeled Analytics',
)
assert.doesNotMatch(
  JSON.stringify(node.workSurface.sourceTabs),
  /Workspace|Product Context|Customer Feedback|Constraints|Candidate Tickets/i,
  'problem synthesis should not expose the old grouped workspace/document tabs',
)

assert.equal(node.definition.itemLabel, 'Problem note', 'structured entry item label should be problem note')
assert.equal(node.definition.bindingKey, 'problemBrief', 'binding key should stay stable for downstream scenes')
assert.equal(node.definition.initialCount, 4, 'scene should render four fixed notes')
assert.equal(node.definition.minItems, 4, 'scene should require all four notes')
assert.equal(node.definition.maxItems, 4, 'scene should not allow extra unrelated notes')
assert.deepEqual(
  node.definition.itemTitles,
  ['Invite follow-through', 'Budget and date pressure', 'Saved-place priority ambiguity', 'AI full-plan jump'],
  'scene should name each audit note explicitly',
)
assert.deepEqual(
  node.definition.fields.map((field) => field.key),
  ['observedFriction', 'whyItMayMatter', 'causeHypothesis', 'questionForNina'],
  'each note should capture friction, impact, hypothesis, and validation question',
)
assert.doesNotMatch(JSON.stringify(node.definition.fields), /Main problem statement|problem"|Evidence"|Initial hypothesis|Next step/i, 'old one-brief fields should be removed')

const currentAuditTab = node.workSurface.sourceTabs.find((tab) => tab.id === 'current_app_audit')
assert.equal(currentAuditTab.sourceBindingLabels.decision_overload, 'Saved-place priority ambiguity', 'audit tab should use the updated voting note label')
assert.equal(currentAuditTab.sourceBindingLabels.next_decision, 'AI full-plan jump', 'audit tab should use the updated itinerary note label')

const transition = config.storyline.nodes.transition_research
assert.match(transition.content, /problem notes/i, 'research transition should review problem notes, not a single problem brief')
assert.match(transition.aiResponseCheck?.matchedContent || '', /problem notes/i, 'AI transition copy should build on problem notes')

const prep = config.storyline.nodes.scene_03_research_prep
const problemTab = prep.appTabs.find((tab) => tab.id === 'problem_notes')
assert.equal(problemTab.label, 'Your Problem Notes', 'research prep should expose the refined notes as notes')
assert.match(problemTab.content, /problem notes and current app audit/i, 'research prep tab should refer to problem notes')

const problemCriterion = rubric.sections
  .flatMap((section) => section.criteria)
  .find((criterion) => criterion.evidenceSceneIds?.includes('scene_02_problem_brief'))
assert.ok(problemCriterion, 'rubric should include the problem synthesis criterion')
assert.match(
  problemCriterion.rubric_text,
  /Analytics[\s\S]*Current App Audit|Current App Audit[\s\S]*Analytics/,
  'problem synthesis grading should name Analytics and Current App Audit as the evidence basis',
)
assert.doesNotMatch(
  problemCriterion.rubric_text,
  /Product Context|Customer Feedback|Candidate Tickets|Constraints/i,
  'problem synthesis grading should not ask for removed workspace documents',
)
