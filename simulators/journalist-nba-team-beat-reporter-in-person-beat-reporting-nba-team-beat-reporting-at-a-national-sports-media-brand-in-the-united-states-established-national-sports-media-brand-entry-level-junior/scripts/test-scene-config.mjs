import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const configPath = join(rootDir, 'src/data/scene-config.json')
const config = JSON.parse(await readFile(configPath, 'utf8'))
const rubric = JSON.parse(await readFile(join(rootDir, 'src/data/rubric.json'), 'utf8'))
const voiceMeetingSource = await readFile(join(rootDir, 'src/scenes/VoiceMeetingScene.tsx'), 'utf8')
const freeTextSource = await readFile(join(rootDir, 'src/scenes/FreeTextScene.tsx'), 'utf8')
const articleAssemblySource = await readFile(join(rootDir, 'src/scenes/ArticleAssemblyScene.tsx'), 'utf8')
const multipleChoiceSource = await readFile(join(rootDir, 'src/scenes/MultipleChoiceScene.tsx'), 'utf8')
const possessionTimelineSource = await readFile(join(rootDir, 'src/scenes/PossessionTimelineScene.tsx'), 'utf8')
const progressBarSource = await readFile(join(rootDir, 'src/components/layout/ProgressBar.tsx'), 'utf8')
const appSource = await readFile(join(rootDir, 'src/App.tsx'), 'utf8')
const storeSource = await readFile(join(rootDir, 'src/store/gameStore.ts'), 'utf8')
const geminiLiveSource = await readFile(join(rootDir, 'src/services/geminiLive.ts'), 'utf8')
const cssSource = await readFile(join(rootDir, 'src/index.css'), 'utf8')
const coachQaSource = await readFile(join(rootDir, 'scripts/qa-coach-availability-live.mjs'), 'utf8')
const mediaQaSource = await readFile(join(rootDir, 'scripts/qa-media-scrum-live.mjs'), 'utf8')

const scenes = config?.storyline?.nodes
assert.ok(scenes, 'scene-config.json exposes storyline.nodes')

assert.deepEqual(
  config.storyline.progressTasks.map((task) => task.label),
  ['Story Angle', 'Reporting Plan', 'Warmup Notes', 'Coach Interview', 'Possession Notes', 'Reed Scrum', 'Deadline Article'],
  'progress should show real learner work tasks only',
)
assert.match(progressBarSource, /progressTasks/, 'progress bar should use task-level metadata when available')
assert.match(progressBarSource, /visitedNodes/, 'progress bar should complete tasks from visited route state')
assert.match(appSource, /paddingTop:\s*'34px'/, 'app shell should reserve the full task progress bar height')
assert.match(storeSource, /final_story:\s*'assessment_gate'/, 'removed final_story saved states should redirect to assessment')
assert.match(storeSource, /editor_slack:\s*'assessment_gate'/, 'removed editor_slack saved states should redirect to assessment')

assert.equal(rubric.sections[0].section_title, 'Task-by-task scoring')
assert.deepEqual(
  rubric.sections[0].criteria.map((criterion) => criterion.name),
  [
    'Story Angle Selection',
    'Reporting Plan',
    'Warmup Observation',
    'Coach Harris Questioning',
    'Player Scrum Questioning',
    'Game Observation Notes',
    'Deadline Game Article',
  ],
  'student final report criteria should render English task labels',
)
assert.doesNotMatch(JSON.stringify(rubric), /[\u3040-\u30ff\u3400-\u9fff]/, 'rubric should not contain Japanese text')
assert.doesNotMatch(JSON.stringify(config.rubric), /[\u3040-\u30ff\u3400-\u9fff]/, 'embedded config rubric should not contain Japanese text')

function rectsOverlap(a, b) {
  return a.x < b.x + b.w
    && a.x + a.w > b.x
    && a.y < b.y + b.h
    && a.y + a.h > b.y
}

const warmup = scenes.warmup_observation
assert.equal(warmup.type, 'physical_playground')

const warmupAssets = Object.fromEntries(
  warmup.visualAssetsRequired.readableSurfaces.map((asset) => [asset.id, asset])
)
const closingAsset = warmupAssets.closing_group_drill_closeup
assert.ok(closingAsset, 'closing-group drill should have a configured closeup asset')
assert.equal(closingAsset.filename, 'public/action-assets/warmup_observation/closing-group-drill-closeup.png')
await access(join(rootDir, closingAsset.filename))

const warmupSurfaces = Object.fromEntries(
  warmup.readableSurfaces.map((surface) => [surface.id, surface])
)
const reedMovement = warmupSurfaces.reed_movement
const closingGroup = warmupSurfaces.closing_group_drill
assert.equal(closingGroup.assetId, 'closing_group_drill_closeup')
assert.ok(!rectsOverlap(reedMovement, closingGroup), 'Reed movement and closing-group hotspots should not overlap')

const timeline = scenes.possession_timeline_watch
assert.equal(timeline.type, 'possession_timeline')
assert.equal(timeline.events.length, 7, 'possession timeline should show the final result as a seventh possession')
assert.match(timeline.summaryPrompt, /read the Reed question advice/i)
assert.match(timeline.summaryPrompt, /at least 3 completed notes/i)
assert.match(timeline.content, /save completed notes for at least 3 different moments/i)
assert.match(timeline.content, /pick one note label and write note text/i)
assert.match(timeline.referenceContent, /Each one needs one label plus note text/i)
assert.match(possessionTimelineSource, /completed notes saved \(label \+ text\)/)
assert.match(possessionTimelineSource, /You still need/)
assert.deepEqual(
  timeline.categories.map((category) => category.label),
  ['Fact I can use', 'Ask Reed', 'Ask Coach', 'Scene detail', 'Hold/check later'],
)
assert.match(timeline.questionGuidance, /Do not sound like you already know the answer/)

const finalEvent = timeline.events.at(-1)
assert.equal(finalEvent.id, 'final_score_board')
assert.match(finalEvent.headline, /final score/i)
assert.match(`${finalEvent.score}\n${finalEvent.description}`, /112.*107|107.*112/)
assert.match(finalEvent.description, /24 points, 6 assists, and 2 steals/)
assert.equal(finalEvent.image, '/action-assets/final-score-board.png')
await access(join(rootDir, 'public/action-assets/final-score-board.png'))

const coachAvailability = scenes.coach_availability
assert.equal(coachAvailability.type, 'voice_meeting')
assert.equal(coachAvailability.typedFallback, true, 'coach availability should allow typed interview turns')
assert.match(coachAvailability.goalPrompt, /Do not say Reed is fully cleared, fully healed, back to normal, or medically cleared/)
assert.match(coachAvailability.goalPrompt, /Team PR owns official status language/)
assert.match(coachAvailability.content, /Support Notes panel/)
assert.match(coachAvailability.preStartPrompt, /Support Notes panel/)
assert.doesNotMatch(coachAvailability.content, /support notes on the right/i)
assert.equal(coachAvailability.prepReferenceTitle, 'Quick facts and risks')
assert.deepEqual(
  coachAvailability.prepNoteKeys.map((entry) => entry.key),
  ['pregame_plan', 'warmup_observation'],
)
const coachArtifactIds = coachAvailability.deskWorkDesign.inputArtifacts.map((artifact) => artifact.id)
assert.ok(coachArtifactIds.includes('warmup_observation'), 'coach support panel should reference the actual warmup note key')
assert.ok(!coachArtifactIds.includes('warmup_game_memo'), 'coach support panel should not reference stale warmup_game_memo metadata')

const mediaScrum = scenes.media_scrum
assert.equal(mediaScrum.type, 'voice_meeting')
assert.equal(mediaScrum.typedFallback, true, 'media scrum should allow typed interview turns')
assert.doesNotMatch(mediaScrum.content, /Before you step into the scrum/i)
assert.doesNotMatch(mediaScrum.content, /Final: Harbor City Cyclones 112, Denver Altitude 107/i)
assert.doesNotMatch(mediaScrum.content, /Official box score/i)
assert.doesNotMatch(mediaScrum.content, /After the win/i)
assert.doesNotMatch(mediaScrum.content, /Ask those questions clearly/i)
assert.doesNotMatch(mediaScrum.content, /deadline article from your own interview notes/i)
assert.doesNotMatch(mediaScrum.endpoint, /^End once/i)
assert.match(mediaScrum.content, /standing near the \{\{baseline\}\}/i)
assert.match(mediaScrum.content, /short in-person \{\{scrum\}\}/i)
assert.match(mediaScrum.content, /two Reed questions/i)
assert.doesNotMatch(mediaScrum.content, /\{\{possession timeline\}\}.*\{\{deadline article\}\}|\{\{deadline article\}\}.*\{\{conversation record\}\}/is)
assert.match(mediaScrum.noteHelper, /\{\{deadline article\}\}/i)
assert.match(mediaScrum.noteHelper, /\{\{conversation record\}\}/i)
assert.match(mediaScrum.preStartPrompt, /read Question 1 and Question 2/i)
assert.match(mediaScrum.preStartPrompt, /Ask one question at a time/i)
assert.match(mediaScrum.endpoint, /Finish after you ask both prepared questions/i)
assert.match(mediaScrum.successCriteria, /A good interview has two clear Reed questions/i)
assert.match(mediaScrum.goalPrompt, /greets you/i)
assert.match(mediaScrum.goalPrompt, /vague/i)
assert.match(mediaScrum.goalPrompt, /multiple questions at once/i)
assert.match(mediaScrum.goalPrompt, /repeat a question/i)
assert.match(mediaScrum.goalPrompt, /confusing or speech-to-text seems garbled/i)
assert.match(mediaScrum.goalPrompt, /off topic/i)
assert.match(mediaScrum.goalPrompt, /rumors, trades, full health/i)
assert.match(mediaScrum.goalPrompt, /rude or inappropriate/i)

assert.match(voiceMeetingSource, /media-scrum-guide/, 'media scrum should render the compact interview guide')
assert.match(voiceMeetingSource, /setInputMode/, 'voice meetings should expose a voice or typed input choice')
assert.match(voiceMeetingSource, /submitTypedTurn/, 'voice meetings should append typed turns to the shared transcript path')
assert.match(voiceMeetingSource, /Speak or type at least/, 'completion helper should describe voice and typed turns')
assert.match(voiceMeetingSource, /Voice or typed conversation/, 'media scrum should not call the required interview voice-only')
assert.match(geminiLiveSource, /LiveInputMode/, 'Gemini Live transport should know voice versus text input mode')
assert.match(geminiLiveSource, /inputMode === 'text'/, 'text mode should avoid microphone startup')
assert.match(geminiLiveSource, /clientContent/, 'typed turns should be sent into the live model session')
assert.match(coachQaSource, /fully cleared\|medically cleared/, 'coach live QA should catch medical-clearance overclaims')
assert.match(coachQaSource, /student UI supports voice and typed modes/, 'coach live QA description should match current UI')
assert.match(mediaQaSource, /student UI supports voice and typed modes/, 'media live QA description should match current UI')
assert.match(voiceMeetingSource, /media-scrum-workspace/, 'media scrum should render one combined work surface')
assert.match(voiceMeetingSource, /Your 2 Reed Questions/, 'prepared Reed questions should be visible inside the workspace')
assert.match(voiceMeetingSource, /getMediaScrumQuestionItems/, 'media scrum should read saved Reed questions from summary or timeline JSON')
assert.match(voiceMeetingSource, /No saved Reed questions found/, 'missing Reed questions should be explicit')
assert.doesNotMatch(voiceMeetingSource, /Ask one question about a specific late-game movement, then one question about Reed's role in the closing group/, 'generic guidance should not pretend to be saved Reed questions')
assert.match(voiceMeetingSource, /<p>\{question\}<\/p>/, 'saved Reed questions should render as plain text without glossary badges')
assert.doesNotMatch(voiceMeetingSource, /renderContentWithGlossary\(question\)/, 'saved Reed questions should not auto-render glossary help')
assert.doesNotMatch(voiceMeetingSource, /Need a reminder\?/, 'media scrum should not show a separate reminder panel')
assert.doesNotMatch(voiceMeetingSource, /media-scrum-reminder/, 'media scrum reminder markup should be removed')
assert.match(voiceMeetingSource, /Reporter Notes/, 'notes should be visibly labeled inside the workspace')
assert.match(voiceMeetingSource, /\{\{possession timeline\}\}/, 'timeline glossary help should appear in the compact guide')
assert.ok(
  voiceMeetingSource.indexOf('{isMediaScrum && inPersonSceneImage}') !== -1
    && voiceMeetingSource.indexOf('{isMediaScrum && inPersonSceneImage}') < voiceMeetingSource.indexOf('{mediaScrumGuide}'),
  'media scrum image should render before the guide and workspace'
)
assert.doesNotMatch(voiceMeetingSource, /voice-meeting-task-grid/, 'media scrum should not use the old four-cell task grid')
assert.match(cssSource, /\.media-scrum-guide/, 'compact guide styles should exist')
assert.match(cssSource, /\.media-scrum-workspace-grid/, 'combined workspace layout styles should exist')
assert.match(cssSource, /\.media-scrum-note-textarea/, 'reporter notes should have workspace-specific textarea styling')
assert.match(cssSource, /voice-meeting-inperson-scene-image--static[\s\S]*aspect-ratio: 16 \/ 6\.25/, 'media scrum top image should have a desktop banner crop')

for (const key of ['scrum', 'baseline', 'possession timeline', 'deadline article', 'conversation record']) {
  assert.ok(config.glossary?.[key], `glossary should define ${key}`)
}

const scrumArtifactIds = mediaScrum.deskWorkDesign.inputArtifacts.map((artifact) => artifact.id)
assert.ok(!scrumArtifactIds.includes('postgame_reference'), 'scrum should no longer expose a postgame final-score reference')

const fastGamerTabs = scenes.fast_gamer.appTabs
assert.equal(scenes.fast_gamer.type, 'article_assembly')
assert.equal(scenes.fast_gamer.metadataKey, 'fast_gamer_assembly')
assert.ok(Array.isArray(scenes.fast_gamer.articleSections), 'game article should use four article sections')
assert.deepEqual(
  scenes.fast_gamer.articleSections.map((section) => section.label),
  ['News Lead', 'Proof', 'Angle', 'Close'],
  'game article should use the agreed four-part structure',
)
assert.ok(
  scenes.fast_gamer.articleSections.every((section) => section.choices.length === 2),
  'each article section should have exactly two paragraph choices',
)
const fastGamerChoices = scenes.fast_gamer.articleSections.flatMap((section) => section.choices)
assert.equal(fastGamerChoices.length, 8, 'four sections should create eight total choices')
assert.ok(fastGamerChoices.every((choice) => typeof choice.isCorrect === 'boolean'), 'each choice should expose hidden grading correctness')
assert.ok(fastGamerChoices.some((choice) => choice.quality === 'unsafe'), 'section choices should include unsafe distractors')
assert.ok(fastGamerChoices.some((choice) => choice.quality === 'weak'), 'section choices should include weak distractors')
assert.ok(!('articleCards' in scenes.fast_gamer), 'old flat paragraph bank should be removed')
assert.ok(!scenes.final_story, 'final story page should be removed so game article is the only article-writing task')
assert.ok(!scenes.editor_slack, 'editor Slack page should be removed so game article is the final student task')
assert.equal(scenes.fast_gamer.next, 'assessment_gate', 'game article should route straight to assessment')
assert.deepEqual(fastGamerTabs.map((tab) => tab.id), ['all_player_notes', 'results'])
assert.match(articleAssemblySource, /selectedChoiceIds/, 'article assembly should persist selected choices by section')
assert.match(articleAssemblySource, /article-choice-card-choose/, 'article assembly should offer a direct Choose button for non-drag selection')
assert.match(cssSource, /\.article-choice-card-choose/, 'direct article selection should have visible button styling')
assert.doesNotMatch(articleAssemblySource, /badgeLabel|Possible fit|article-choice-card--unsafe|article-choice-card--weak/, 'article assembly UI should not reveal quality labels')
assert.doesNotMatch(cssSource, /article-paragraph-card--strong|article-paragraph-card--weak|article-paragraph-card--unsafe/, 'article assembly should not color-code correctness')
assert.match(multipleChoiceSource, /role="button"/, 'multiple-choice options should be accessible containers')
assert.doesNotMatch(multipleChoiceSource, /<button\s+key=\{opt\.id\}/, 'multiple-choice options should not be native buttons that contain glossary buttons')

const fastTimelineSource = fastGamerTabs[0].responseSources.find((source) => source.key === 'possession_timeline_notes')
assert.equal(fastTimelineSource.responseFormat, 'possessionTimelineArticleNotes')
assert.match(fastTimelineSource.safeUse, /Use Results for the final score and stat line/)
assert.match(fastTimelineSource.caution, /Leave out rumors/)
assert.match(fastTimelineSource.caution, /medical claim/)
assert.equal(
  mediaScrum.prepNoteKeys.find((entry) => entry.key === 'possession_timeline_notes')?.title,
  'Your possession timeline notes',
  'media scrum should still read the full possession timeline notes'
)
assert.match(freeTextSource, /formatPossessionTimelineArticleNotes/, 'article-only timeline formatter should exist')
assert.match(freeTextSource, /id === 'final_score_board'/, 'article-only formatter should leave score and stat line to Results')
assert.match(freeTextSource, /categoryId !== 'confirmed_fact' && categoryId !== 'scene_color'/, 'article-only formatter should exclude process-only labels')
assert.match(freeTextSource, /Leave out rumors and any medical claim/, 'article-only formatter should show a general accuracy warning')

const resultsContent = fastGamerTabs[1].content
assert.equal(fastGamerTabs[1].label, 'Results')
assert.match(resultsContent, /Final: Harbor City Cyclones 112, Denver Altitude 107/)
assert.match(resultsContent, /Malik Reed finished with 24 points, 6 assists, and 2 steals/)

const mediaScrumPrefillRaw = config.sample_answers.media_scrum_dev_prefill.freeTextResponses.possession_timeline_notes
const mediaScrumPrefill = JSON.parse(mediaScrumPrefillRaw)
assert.ok(mediaScrumPrefill.viewedEventIds.includes('reed_corner_three_assist'), 'media scrum prefill should include the corner-assist event')
assert.equal(
  mediaScrumPrefill.notes.reed_corner_three_assist?.note,
  'Reed drew help and assisted the corner three during a tied late possession.'
)
