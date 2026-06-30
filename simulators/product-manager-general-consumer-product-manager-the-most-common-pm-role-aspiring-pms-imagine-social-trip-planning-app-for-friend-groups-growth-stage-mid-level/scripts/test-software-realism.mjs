import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const files = Object.fromEntries(await Promise.all([
  'src/scenes/BriefingScene.tsx',
  'src/scenes/AppAuditScene.tsx',
  'src/scenes/FreeTextScene.tsx',
  'src/scenes/VoiceMeetingScene.tsx',
  'src/index.css',
  'CHECK_REPORT.md',
  'VALIDATION.md',
  'SCENE_BLUEPRINT.md',
  'src/data/job-simulation.md',
].map(async (file) => [file, await readFile(file, 'utf8')])))

const briefing = files['src/scenes/BriefingScene.tsx']
const appAudit = files['src/scenes/AppAuditScene.tsx']
const freeText = files['src/scenes/FreeTextScene.tsx']
const voice = files['src/scenes/VoiceMeetingScene.tsx']
const css = files['src/index.css']
const docs = [
  files['CHECK_REPORT.md'],
  files['VALIDATION.md'],
  files['SCENE_BLUEPRINT.md'],
  files['src/data/job-simulation.md'],
].join('\n')

assert.match(briefing, /data-testid="pm-source-workspace-shell"/, 'source review should render a realistic PM workspace shell')
assert.match(briefing, /Roamly Product Workspace/, 'source workspace should use workplace software framing')
assert.match(briefing, /Evidence checked \{openedRequiredCount\}\/\{requiredSourceIds\.length\}/, 'source workspace should show source-review progress')
assert.match(css, /\.pm-source-topbar/, 'source workspace should have an app topbar')
assert.match(css, /\.pm-source-app-rail/, 'source workspace should have a realistic app rail')

assert.match(appAudit, /data-testid="app-audit-review-console"/, 'app audit should include a review console beside the phone')
assert.match(appAudit, /Roamly QA review/, 'app audit notes should be framed as product review software')
assert.match(css, /\.app-audit-metric-strip/, 'app audit should include contextual metrics, not only a generic text box')

assert.match(freeText, /data-testid="research-prep-workspace"/, 'research prep should use a dedicated research workspace')
assert.match(freeText, /Roamly Research Hub/, 'research prep should look like a real research-prep tool')
assert.match(freeText, /data-testid="research-prep-saved-audit-notes"/, 'research prep should visibly carry forward saved app-audit notes')
assert.match(css, /\.research-prep-question-list/, 'research prep should expose structured question rows')
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.research-prep-layout[\s\S]*grid-template-columns: minmax\(0, 1fr\)/, 'research prep should collapse cleanly on mobile')

assert.match(freeText, /prd-plan-doc-header/, 'product plan should render a document header, not just a textarea')
assert.match(freeText, /prd-plan-section-strip/, 'product plan should show section structure inside the editor')
assert.match(css, /\.prd-plan-evidence-source/, 'product plan evidence rail should show source framing')

assert.match(voice, /data-testid="voice-meeting-prep-tray"/, 'user interview should include a realistic interview prep tray')
assert.match(voice, /voice-meeting-transcript-header/, 'user interview should have transcript software chrome')
assert.match(css, /\.voice-meeting-prep-tray/, 'user interview prep tray should be styled')
assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.voice-meeting-prep-tray[\s\S]*grid-template-columns: minmax\(0, 1fr\)/, 'interview prep tray should collapse on mobile')

assert.match(docs, /realistic software/i, 'docs should record the realistic-software quality gate')
assert.match(docs, /PM source workspace shell/i, 'docs should mention the upgraded source workspace surface')
assert.match(docs, /Roamly Research Hub/i, 'docs should mention the upgraded research-prep surface')
assert.match(docs, /interview console/i, 'docs should mention the upgraded interview console')
