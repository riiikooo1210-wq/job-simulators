import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const files = {
  checkReport: await readFile(new URL('../CHECK_REPORT.md', import.meta.url), 'utf8'),
  blueprint: await readFile(new URL('../SCENE_BLUEPRINT.md', import.meta.url), 'utf8'),
  validation: await readFile(new URL('../VALIDATION.md', import.meta.url), 'utf8'),
  imagePrompts: await readFile(new URL('../IMAGE_PROMPTS.md', import.meta.url), 'utf8'),
  config: await readFile(new URL('../src/data/scene-config.json', import.meta.url), 'utf8'),
  jobSimulation: await readFile(new URL('../src/data/job-simulation.md', import.meta.url), 'utf8'),
  assessment: await readFile(new URL('../src/services/assessment.ts', import.meta.url), 'utf8'),
  finalReport: await readFile(new URL('../src/scenes/FinalReportScene.tsx', import.meta.url), 'utf8'),
  intro: await readFile(new URL('../src/scenes/IntroScene.tsx', import.meta.url), 'utf8'),
  companion: await readFile(new URL('../src/components/ui/AppAuditCompanionPanel.tsx', import.meta.url), 'utf8'),
  css: await readFile(new URL('../src/index.css', import.meta.url), 'utf8'),
}

assert.match(files.blueprint, /App Audit, Interview Prep, User Interview, Product Plan|Product Plan/, 'blueprint should describe the current four-task arc')
assert.doesNotMatch(files.blueprint, /Draft the PRD Slice|Your Problem Brief|stakeholder Slack response/, 'blueprint should not describe old student-facing tasks')
assert.doesNotMatch(files.checkReport, /scene_05_priority_matrix|scene_06_roadmap_kanban|Draft a concise PRD slice/, 'check report should not audit removed route scenes')
assert.doesNotMatch(files.validation, /Constructed-response work present \(5 scenes\)|scene_02_problem_brief, scene_03_research_prep/, 'validation report should not list removed nodes as active')
assert.doesNotMatch(files.imagePrompts, /## transition_research|problem notes, user interview notes, and PRD slice/, 'image prompt inventory should not list removed active prompts')
assert.match(files.imagePrompts, /Obsolete Generated Assets/, 'image prompt inventory should explicitly mark old assets obsolete')

const config = JSON.parse(files.config)
assert.deepEqual(
  config.storyline.sections.map((section) => section.label),
  ['Audit', 'Prep', 'Interview', 'Product Plan'],
  'student progress labels should use Product Plan, not PRD',
)
assert.deepEqual(
  config.storyline.devSkips.map((skip) => skip.label),
  ['App Audit', 'Prep', 'Interview', 'Product Plan', 'Assessment'],
  'dev skip labels should mirror the current task names',
)
assert.doesNotMatch(files.jobSimulation, /### Task 4 .+Write the PRD/, 'active scenario docs should label Task 4 as Product Plan')
assert.match(files.jobSimulation, /### Task 4 .+Write the Product Plan/, 'active scenario docs should label Task 4 as Product Plan')

assert.match(files.assessment, /'要件文書': 'Product Plan'/, 'final report task label should use Product Plan')
assert.doesNotMatch(files.assessment, /'要件文書': 'PRD Slice'/, 'final report task label should not leak PRD Slice')
assert.match(files.finalReport, /studentFacingCopy/, 'final report should sanitize generated candidate language')
assert.match(files.intro, /htmlFor="player-name-input"/, 'intro name field should have a real label')
assert.doesNotMatch(files.intro, /AnimatePresence/, 'intro carousel should not keep old content visible after the step changes')
assert.doesNotMatch(files.companion, /Gemini API key not configured|err\.message/, 'Jordan helper should not expose provider errors')
assert.match(files.css, /\.problem-notes-nav[\s\S]*position: sticky;[\s\S]*bottom: 0;/, 'mobile guided prep controls should stay reachable')
