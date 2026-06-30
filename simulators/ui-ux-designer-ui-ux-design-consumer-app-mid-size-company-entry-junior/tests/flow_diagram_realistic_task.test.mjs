import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const config = JSON.parse(
  readFileSync(new URL('../src/data/scene-config.json', import.meta.url), 'utf8')
)
const rubric = JSON.parse(
  readFileSync(new URL('../src/data/rubric.json', import.meta.url), 'utf8')
)
const flowDiagramSceneSource = readFileSync(
  new URL('../src/scenes/FlowDiagramScene.tsx', import.meta.url),
  'utf8'
)
const freeTextSceneSource = readFileSync(
  new URL('../src/scenes/FreeTextScene.tsx', import.meta.url),
  'utf8'
)
const wellNestExistingAppMockSource = readFileSync(
  new URL('../src/components/ui/WellNestExistingAppMock.tsx', import.meta.url),
  'utf8'
)
const screenDesignStudioSceneSource = readFileSync(
  new URL('../src/scenes/ScreenDesignStudioScene.tsx', import.meta.url),
  'utf8'
)
const progressBarSource = readFileSync(
  new URL('../src/components/layout/ProgressBar.tsx', import.meta.url),
  'utf8'
)
const laptopFrameSource = readFileSync(
  new URL('../src/components/ui/LaptopFrame.tsx', import.meta.url),
  'utf8'
)
const geminiServiceSource = readFileSync(
  new URL('../src/services/gemini.ts', import.meta.url),
  'utf8'
)
const jobSimulationDoc = readFileSync(
  new URL('../src/data/job-simulation.md', import.meta.url),
  'utf8'
)

const flowScene = config.storyline.nodes.scene_05_flow_diagram
const ideationScene = config.storyline.nodes.scene_02_ideation
const mayaScene = config.storyline.nodes.scene_03_checkin
const screenDesignScene = config.storyline.nodes.scene_06_screen_design
const glossary = config.glossary || {}
const visibleFlowText = [
  flowScene.content,
  flowScene.prompt,
  flowScene.rationalePrompt,
  flowScene.rationalePlaceholder,
  JSON.stringify(flowScene.legendItems),
  JSON.stringify(flowScene.exampleFlow),
  flowScene.exampleBranch,
].join(' ')
const ideationRubric = rubric.sections[0].criteria.find((criterion) => criterion.name === '発想と下書き')
const flowRubric = rubric.sections[0].criteria.find((criterion) => criterion.name === '利用者の流れ図')
const ideationDocText = [
  jobSimulationDoc.slice(
    jobSimulationDoc.indexOf('### Scene 1: Ideation & Sketching'),
    jobSimulationDoc.indexOf('### Scene 2: Design Check-in with Maya')
  ),
  jobSimulationDoc.split('\n').find((line) => line.includes('| 発想と下書き |')) || '',
].join('\n')

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

test('progress bar shows only the five work tasks, not the broad sprint section', () => {
  const progressTasks = config.storyline.progressTasks

  assert.deepEqual(progressTasks.map((task) => task.label), [
    'Ideation',
    'Maya Check-in',
    'Ben Reply',
    'User Flow',
    'Screen Design',
  ])
  assert.deepEqual(progressTasks.flatMap((task) => task.nodeIds), [
    'scene_02_ideation',
    'scene_03_checkin',
    'scene_04_complications',
    'scene_05_flow_diagram',
    'scene_06_screen_design',
  ])
  assert.equal(progressTasks.some((task) => task.nodeIds.includes('briefing_1')), false)
  assert.equal(progressTasks.some((task) => task.nodeIds.includes('assessment_gate')), false)
  assert.equal(progressTasks.some((task) => task.nodeIds.includes('grading')), false)
  assert.equal(progressTasks.every((task) => task.nodeIds.every((nodeId) => Boolean(config.storyline.nodes[nodeId]))), true)

  assert.match(progressBarSource, /currentNodeId/)
  assert.match(progressBarSource, /storyline\.progressTasks/)
  assert.match(progressBarSource, /activeTaskIndex/)
  assert.match(progressBarSource, /latestVisitedTaskIndex/)
  assert.match(progressBarSource, /storyline\.sections/)
  assert.match(progressBarSource, /ProgressSegment/)
})

test('ideation workspace is taller and uses plain student instructions', () => {
  assert.equal(
    ideationScene.content,
    'First, explore the current WellNest app. Tap the habit cards, open the detail screens, and check Profile. Friend Streaks is not in the app yet. Your job is to write early notes for two things: where Friend Streaks could start and what the final Shared Streak screen should show.'
  )
  assert.equal(
    ideationScene.noteSections[0].guidance,
    '1. Choose two places in the current app where Friend Streaks could start. For each place, write why it makes sense.'
  )
  assert.equal(
    ideationScene.noteSections[0].exampleAnswer,
    'Example: Hydration Detail could work because the user is already looking at one habit and may want a friend to help them stay on track.'
  )
  assert.equal(
    ideationScene.noteSections[1].guidance,
    '2. List at least two things the final Shared Streak screen should show after the friend accepts.'
  )
  assert.equal(
    ideationScene.noteSections[1].exampleAnswer,
    'Example: It should show the shared habit and both people in the streak, so users know what they are doing together.'
  )
  assert.equal(ideationScene.noteSections[0].placeholder.includes('Why it makes sense'), true)
  assert.equal(ideationScene.noteSections[1].placeholder, '1. ...\n2. ...')
  assert.equal(ideationScene.noteSections.every((section) => section.minRows === 6), true)
  assert.equal(ideationScene.noteSections.every((section) => section.minNonEmptyLines === 2), true)
  assert.deepEqual(ideationScene.noteSections.map((section) => section.minChars), [40, 30])
  assert.match(wellNestExistingAppMockSource, /export const wellNestWorkspaceMaxHeight = 720/)
  assert.match(freeTextSceneSource, /const wellNestScreenBounds = \{ left: '12\.5%', top: '8%', width: '75%', height: '76%' \}/)
  assert.match(wellNestExistingAppMockSource, /Explore first, then write: tap habit cards, compare Home with detail screens, check Profile, then fill both note boxes/)
  assert.match(freeTextSceneSource, /data-ui-surface="docs-inspired-editor"/)
  assert.match(freeTextSceneSource, /DocsNoteTextArea/)
  assert.match(freeTextSceneSource, /countNonEmptyLines/)
  assert.match(freeTextSceneSource, /missingSectionMessages/)
  assert.match(freeTextSceneSource, /sectionsReady/)
  assert.match(freeTextSceneSource, /Add notes for \$\{section\.label\}/)
  assert.match(freeTextSceneSource, /import WellNestExistingAppMock/)
  assert.match(freeTextSceneSource, /<WellNestExistingAppMock onHintChange=\{setWellNestHint\} \/>/)
  assert.match(wellNestExistingAppMockSource, /aria-label="Existing WellNest app screens"/)
  assert.match(wellNestExistingAppMockSource, /type WellNestProfileDetailId = 'profile_goals' \| 'profile_streaks' \| 'profile_privacy'/)
  assert.match(wellNestExistingAppMockSource, /function HabitDetailScreen/)
  assert.match(wellNestExistingAppMockSource, /function ProfileScreen/)
  assert.match(wellNestExistingAppMockSource, /function ProfileDetailScreen/)
  assert.match(wellNestExistingAppMockSource, /profileSections\.map/)
  assert.match(wellNestExistingAppMockSource, /onClick=\{\(\) => onNavigate\(item\.id\)\}/)
  assert.match(wellNestExistingAppMockSource, /Back to Profile/)
  assert.match(wellNestExistingAppMockSource, /completedHabits/)
  assert.match(wellNestExistingAppMockSource, /onMarkComplete/)
  assert.match(wellNestExistingAppMockSource, /6 of 8 glasses/)
  assert.match(wellNestExistingAppMockSource, /22 min today/)
  assert.match(wellNestExistingAppMockSource, /7 hr 20 min/)
  assert.match(wellNestExistingAppMockSource, /7-day streak/)
  assert.match(wellNestExistingAppMockSource, /Hydration already has habit details/)
  assert.match(wellNestExistingAppMockSource, /Profile shows personal settings/)
  assert.match(wellNestExistingAppMockSource, /\$\{profileSection\.title\} shows profile context/)
  assert.match(wellNestExistingAppMockSource, /Use it as background, not as an extra required answer/)
  assert.match(wellNestExistingAppMockSource, /Back to Home/)
  assert.match(wellNestExistingAppMockSource, /Mark Complete/)
  assert.equal(wellNestExistingAppMockSource.includes('onInactive'), false)
  assert.equal(wellNestExistingAppMockSource.includes('Profile is not needed'), false)
  assert.equal(wellNestExistingAppMockSource.includes('use Hydration for this task'), false)
  assert.match(freeTextSceneSource, /<DesktopOverlay contentBounds=\{wellNestScreenBounds\}>/)
  assert.equal(freeTextSceneSource.includes('backgroundScale={1.16}'), false)
})

test('ideation follow-up, rubric, and docs require at least two final-screen items', () => {
  assert.ok(ideationRubric)
  assert.match(mayaScene.playerGoal, /at least two Shared Streak screen elements/)
  assert.match(mayaScene.goalPrompt, /What are at least two things users must see once the friend accepts\?/)
  assert.match(mayaScene.meetingContext, /at least two Shared Streak screen elements/)
  assert.match(ideationRubric.rubric_text, /要素2つ以上/)
  assert.match(config.rubric.sections[0].criteria[0].rubric_text, /要素2つ以上/)
  assert.match(ideationDocText, /list at least two things the final Shared Streak screen should show/)
  assert.match(ideationDocText, /要素2つ以上/)
  assert.equal(
    [
      ideationScene.content,
      ideationScene.noteSections.map((section) => `${section.guidance} ${section.exampleAnswer}`).join(' '),
      mayaScene.playerGoal,
      mayaScene.goalPrompt,
      mayaScene.meetingContext,
      ideationRubric.rubric_text,
      config.rubric.sections[0].criteria[0].rubric_text,
      ideationDocText,
    ].some((text) => /at least three|three things|three elements|list three|要素3つ/.test(text)),
    false
  )
})

test('user flow task keeps UX terms and gives concrete Friend Streaks examples', () => {
  assert.match(visibleFlowText, /Build a flow map Leo can use/)
  assert.match(visibleFlowText, /Entry point/)
  assert.match(visibleFlowText, /Step/)
  assert.match(visibleFlowText, /Decision branch/)
  assert.match(visibleFlowText, /Final screen/)

  assert.match(visibleFlowText, /Home habit card/)
  assert.match(visibleFlowText, /Hydration Detail/)
  assert.match(visibleFlowText, /Add 2 or more Step blocks/)
  assert.match(visibleFlowText, /Does the friend already have WellNest\?/)
  assert.match(visibleFlowText, /problem path from the branch/)
  assert.match(visibleFlowText, /friend does not have the app/)
  assert.match(visibleFlowText, /invite ignored/)
  assert.match(visibleFlowText, /invite declined/)
  assert.match(visibleFlowText, /one person misses a day/)
  assert.match(visibleFlowText, /Shared Streak screen/)
  assert.match(visibleFlowText, /Problem path example: If the Decision branch answer is No/)
  assert.match(visibleFlowText, /friend does not have WellNest/)
  assert.match(visibleFlowText, /Step: Send the friend a WellNest app download link/)
  assert.match(visibleFlowText, /Label arrows only when needed/)
  assert.match(visibleFlowText, /Yes, No, Invite ignored, Invite declined, or Missed day/)
  assert.match(visibleFlowText, /Note for Leo/)
  assert.equal(visibleFlowText.includes('Final interaction'), false)
  assert.equal(visibleFlowText.includes('CTA or result'), false)
  assert.equal(visibleFlowText.includes('Send Invite, Accept Invite'), false)
  assert.equal(visibleFlowText.includes('Edge case'), false)
  assert.equal(visibleFlowText.includes('"label":"Screen"'), false)
  assert.equal(visibleFlowText.includes('"label":"Action"'), false)
})

test('user flow task uses glossary-backed help for unavoidable UX terms', () => {
  assert.match(flowScene.content, /\{\{user flow\}\}/)
  assert.match(flowScene.prompt, /\{\{Entry point\}\}/)
  assert.match(flowScene.prompt, /\{\{Decision branch\}\}/)
  assert.doesNotMatch(flowScene.prompt, /\{\{Final interaction\}\}/)
  assert.doesNotMatch(flowScene.prompt, /\{\{Edge case\}\}/)
  assert.match(glossary['Entry point'], /feature starts/)
  assert.match(glossary['Decision branch'], /different paths/)
  assert.match(glossary['Decision branch'], /problem path/)
  assert.equal(glossary['Edge case'], undefined)
  assert.equal(glossary['Final interaction'], undefined)
  assert.match(flowDiagramSceneSource, /data-ui-surface="flow-task-guide"/)
  assert.match(flowDiagramSceneSource, /data-ui-surface="flow-compact-checklist"/)
  assert.match(flowDiagramSceneSource, /compactChecklistItems/)
  assert.match(flowDiagramSceneSource, /Decision branch.*Yes\/No question/)
  assert.match(flowDiagramSceneSource, /One possible example, not the only answer/)
  assert.match(flowDiagramSceneSource, /data-ui-surface="flow-example-details"/)
  assert.match(flowDiagramSceneSource, /data-ui-surface="flow-board-help-details"/)
  assert.equal(flowDiagramSceneSource.includes('Prompt box'), false)
})

test('flow diagram exposes only four student moves and includes a matching example flow', () => {
  assert.deepEqual(flowScene.nodeKinds.map((kind) => kind.label), [
    'Entry point',
    'Step',
    'Decision branch',
    'Final screen',
  ])
  assert.deepEqual(flowScene.nodeKinds.map((kind) => kind.kind), [
    'entry_point',
    'step',
    'decision_branch',
    'final_interaction',
  ])
  assert.deepEqual(flowScene.nodeKinds.map((kind) => kind.defaultLabel), [
    'Hydration Detail',
    'Tap Invite Friend',
    'Does friend have WellNest?',
    'Shared Streak screen',
  ])
  assert.deepEqual(flowScene.requiredNodeKinds, [
    'entry_point',
    'step',
    'decision_branch',
    'final_interaction',
  ])
  assert.deepEqual(flowScene.requiredKindCounts, [
    { kind: 'step', min: 2, hint: 'Add one more Step for the No or problem path.' },
  ])
  assert.equal(flowScene.startNode, undefined)
  assert.ok(flowScene.exampleFlow.length >= 5)
  assert.deepEqual(
    [...new Set(flowScene.exampleFlow.map((step) => step.kind))].sort(),
    ['decision_branch', 'entry_point', 'final_interaction', 'step'].sort()
  )
  assert.equal(flowScene.exampleFlow.some((step) => step.kind === 'screen' || step.kind === 'action'), false)
  assert.equal(flowScene.legendItems, undefined)
  assert.match(flowScene.prompt, /Add 1 \{\{Entry point\}\}/)
  assert.equal(countWords(flowScene.prompt) <= 115, true)
  assert.match(flowDiagramSceneSource, /Path label:/)
  assert.match(flowDiagramSceneSource, /Connect blocks/)
  assert.match(flowDiagramSceneSource, /onNodeClick=\{onNodeClick\}/)
  assert.match(flowDiagramSceneSource, /createArrowBetweenBlocks/)
  assert.match(flowDiagramSceneSource, /Add at least \{minEdges\} arrow/)
  assert.match(flowDiagramSceneSource, /fallbackKindPlaceholder/)
  assert.match(flowDiagramSceneSource, /missingKindCounts/)
  assert.match(flowDiagramSceneSource, /showFigmaToolbar=\{false\}/)
  assert.match(laptopFrameSource, /showFigmaToolbar = true/)
  assert.match(laptopFrameSource, /variant === 'figma' && showFigmaToolbar/)
  assert.match(flowDiagramSceneSource, /unlabeledNodeCount === 0/)
  assert.match(flowDiagramSceneSource, /rationaleReady/)
  assert.match(flowDiagramSceneSource, /Use the four block buttons/)
  assert.match(flowDiagramSceneSource, /choose the block the arrow should point to/)
  assert.equal(flowDiagramSceneSource.includes('+ Screen'), false)
  assert.equal(flowDiagramSceneSource.includes('+ Action'), false)
  assert.match(laptopFrameSource, /\['Move', 'Frame', 'Shape', 'Text', 'Component'\]/)
  assert.equal(flowDiagramSceneSource.includes('Button/link label:'), false)
  assert.equal(flowDiagramSceneSource.includes('button/link/result'), false)
})

test('flow diagram requires one short handoff note for Leo', () => {
  assert.equal(flowScene.rationalePrompt, 'Note for Leo')
  assert.match(flowScene.rationalePlaceholder, /Write one sentence/)
  assert.match(flowScene.rationalePlaceholder, /Hydration Detail/)
  assert.equal(flowScene.rationaleBindingKey, undefined)
  assert.match(flowDiagramSceneSource, /MIN_RATIONALE_CHARS = 20/)
  assert.match(flowDiagramSceneSource, /rationaleReady/)
  assert.match(flowDiagramSceneSource, /Add a short Note for Leo/)
  assert.match(flowDiagramSceneSource, /Note saved with your flow/)
  assert.match(flowDiagramSceneSource, /node\.rationalePlaceholder/)
  assert.equal(flowDiagramSceneSource.includes('Briefly explain your key design decisions for this flow'), false)
  assert.match(geminiServiceSource, /USER FLOW DIAGRAM \(\$\{data\.nodes\.length\} nodes/)
  assert.match(geminiServiceSource, /n\.kind/)
  assert.match(geminiServiceSource, /n\.kind === 'screen' \|\| n\.kind === 'action' \? 'step'/)
  assert.match(geminiServiceSource, /path label/)
  assert.equal(geminiServiceSource.includes('button/link label'), false)
})

test('flow diagram removes the bottom Leo companion and keeps the written handoff note', () => {
  assert.equal(flowScene.companion, undefined)
  assert.equal(flowDiagramSceneSource.includes('data-testid="flow-diagram-companion"'), false)
  assert.equal(flowDiagramSceneSource.includes('Stuck on the flow? Talk it through with Leo'), false)
  assert.equal(flowDiagramSceneSource.includes('GeminiLiveSession'), false)
  assert.equal(flowDiagramSceneSource.includes('LiveStatus'), false)
  assert.equal(flowDiagramSceneSource.includes('Start voice'), false)
  assert.equal(flowDiagramSceneSource.includes('Unmute'), false)
  assert.equal(flowDiagramSceneSource.includes('Flow context changed'), false)
  assert.equal(flowDiagramSceneSource.includes('Ask Leo'), false)
  assert.equal(flowDiagramSceneSource.includes('Talk with Leo'), false)
  assert.equal(flowDiagramSceneSource.includes('WELLNEST FACTS'), false)
  assert.equal(flowDiagramSceneSource.includes('GOOD USER FLOW CRITERIA'), false)
  assert.match(flowDiagramSceneSource, /Note for Leo/)
})

test('flow diagram includes the current WellNest app as an inline side reference', () => {
  assert.equal(flowScene.wellNestAppMock, true)
  assert.match(flowDiagramSceneSource, /data-ui-surface="flow-workspace-with-app-reference"/)
  assert.match(flowDiagramSceneSource, /data-ui-surface="current-wellnest-app-reference"/)
  assert.match(flowDiagramSceneSource, /Current WellNest app/)
  assert.match(flowDiagramSceneSource, /Live app reference/)
  assert.match(flowDiagramSceneSource, /Use this app while you build your flow/)
  assert.match(flowDiagramSceneSource, /data-ui-surface="wellnest-reference-try-this"/)
  assert.match(flowDiagramSceneSource, /wellNestFlowReferenceHint/)
  assert.match(flowDiagramSceneSource, /<WellNestExistingAppMock onHintChange=\{setWellNestHint\} showReset maxPhoneWidth=\{isNarrowFlowLayout \? 170 : 190\} \/>/)
  assert.match(flowDiagramSceneSource, /flexWrap: 'nowrap'/)
  assert.match(flowDiagramSceneSource, /data-ui-surface="flow-mobile-app-reference-stack"/)
  assert.match(flowDiagramSceneSource, /data-ui-surface="flow-mobile-board-stack"/)
  assert.match(flowDiagramSceneSource, /\{stackedAppReference\}\s*\{stackedFlowBoard\}/)
  assert.match(wellNestExistingAppMockSource, /export const wellNestFlowReferenceHint/)
  assert.match(wellNestExistingAppMockSource, /Friend Streaks is not in the app yet/)
  assert.match(wellNestExistingAppMockSource, /aria-label="Existing WellNest app screens"/)
  assert.match(wellNestExistingAppMockSource, /showReset/)
  assert.match(wellNestExistingAppMockSource, /maxPhoneWidth/)
  assert.match(wellNestExistingAppMockSource, /data-ui-action="wellnest-reset-app"/)
  assert.match(wellNestExistingAppMockSource, /Reset app/)
  assert.match(wellNestExistingAppMockSource, /Tap to open/)
  assert.match(wellNestExistingAppMockSource, /setScreen\('home'\)/)
  assert.match(wellNestExistingAppMockSource, /setCompletedHabits/)
})

test('user flow window fits the inline current-app reference inside the monitor screen', () => {
  assert.match(flowDiagramSceneSource, /const flowMonitorScreenBounds = \{ left: '11\.8%', top: '7\.4%', width: '76\.4%', height: '78\.4%' \}/)
  assert.match(flowDiagramSceneSource, /<DesktopOverlay contentBounds=\{node\.wellNestAppMock \? flowMonitorScreenBounds : undefined\}>/)
  assert.equal(flowDiagramSceneSource.includes("width={node.wellNestAppMock ? '90%' : undefined}"), false)
  assert.match(flowDiagramSceneSource, /<LaptopFrame variant=\{appWindow\}/)
  assert.match(screenDesignStudioSceneSource, /<DesktopOverlay width=\{isCompactViewport \? '92%' : undefined\}/)
  assert.match(screenDesignStudioSceneSource, /<LaptopFrame variant="figma"/)
  assert.equal(screenDesignStudioSceneSource.includes('<DesktopOverlay width="88%" height="86%">'), false)
})

test('hands-on UI/UX task surfaces use realistic work-software styling hooks', () => {
  assert.match(flowDiagramSceneSource, /data-ui-surface="realistic-flow-diagram-tool"/)
  assert.match(flowDiagramSceneSource, /data-ui-surface="current-wellnest-app-reference"/)
  assert.match(flowDiagramSceneSource, /Friend Streaks flow board/)
  assert.match(flowDiagramSceneSource, /Draft saved/)
  assert.match(screenDesignStudioSceneSource, /data-ui-surface="realistic-screen-design-tool"/)
  assert.match(screenDesignStudioSceneSource, /Design studio/)
  assert.match(screenDesignStudioSceneSource, /linear-gradient\(#CBD5E1 1px, transparent 1px\)/)
  assert.match(screenDesignStudioSceneSource, /background: '#0F172A'/)
  assert.match(screenDesignStudioSceneSource, /borderRight: '1px solid #E5E7EB'/)
  assert.match(screenDesignStudioSceneSource, /borderLeft: '1px solid #E5E7EB'/)
})

test('friend streaks mockup studio content adapts to the shared overlay width', () => {
  assert.match(screenDesignStudioSceneSource, /const studioGridColumns = /)
  assert.match(screenDesignStudioSceneSource, /minmax\(0, 1fr\)/)
  assert.match(screenDesignStudioSceneSource, /ResizeObserver/)
  assert.match(screenDesignStudioSceneSource, /phoneCanvasWidth/)
  assert.equal(screenDesignStudioSceneSource.includes("176px minmax(280px, 1fr) 232px"), false)
  assert.equal(screenDesignStudioSceneSource.includes('width: 220,\n                          height: 458,'), false)
})

test('design one screen task targets the final shared streak screen', () => {
  const visibleScreenText = [
    screenDesignScene.content,
    screenDesignScene.prompt,
    screenDesignScene.notesPlaceholder,
  ].join(' ')

  assert.match(visibleScreenText, /final Shared Streak screen/)
  assert.match(visibleScreenText, /after the friend accepts/)
  assert.match(visibleScreenText, /current shared streak count/)
  assert.match(visibleScreenText, /today's completion state/)
  assert.match(visibleScreenText, /simplified Components list/)
  assert.match(visibleScreenText, /Add only the pieces that help this final screen/)
  assert.doesNotMatch(screenDesignScene.notesPlaceholder, /^e\.g\./)
  assert.match(screenDesignScene.notesPlaceholder, /Active status plus 12 days/)
  assert.doesNotMatch(screenDesignScene.notesPlaceholder, /what changes after the user marks today's habit/)
  assert.doesNotMatch(screenDesignScene.notesPlaceholder, /behavior Leo needs to build/)
  assert.equal(visibleScreenText.includes('first page'), false)
  assert.equal(visibleScreenText.includes('invitation flow'), false)
  assert.equal(visibleScreenText.includes('invite page'), false)

  assert.match(screenDesignStudioSceneSource, /shared_streak_screen/)
  assert.match(screenDesignStudioSceneSource, /Shared Streak Screen/)
  assert.match(screenDesignStudioSceneSource, /paletteComponentKinds/)
  assert.match(screenDesignStudioSceneSource, /paletteComponentDefinitions\.map/)
  assert.equal(screenDesignStudioSceneSource.includes('componentDefinitions.map((item)'), false)
  assert.match(screenDesignStudioSceneSource, /12-day Streak/)
  assert.match(screenDesignStudioSceneSource, /Current shared count/)
  assert.match(screenDesignStudioSceneSource, /Friend accepted/)
  assert.match(screenDesignStudioSceneSource, /ComponentPreview/)
  assert.match(screenDesignStudioSceneSource, /conic-gradient\(#10B981 0 78%/)
  assert.match(screenDesignStudioSceneSource, /'top_bar',\n  'screen_title',\n  'habit_card',\n  'friend_card',\n  'progress_ring',\n  'status_chip',\n  'primary_button'/)
  assert.equal(screenDesignStudioSceneSource.includes('Friend Streaks Home'), false)
  assert.equal(screenDesignStudioSceneSource.includes('Friend identity and invite state'), false)
})

test('screen design studio supports direct resize and keyboard delete', () => {
  assert.match(screenDesignStudioSceneSource, /type ResizeHandle = 'nw' \| 'n' \| 'ne' \| 'e' \| 'se' \| 's' \| 'sw' \| 'w'/)
  assert.match(screenDesignStudioSceneSource, /const resizeHandles: ResizeHandle\[\] = \['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'\]/)
  assert.match(screenDesignStudioSceneSource, /interface ResizeState/)
  assert.match(screenDesignStudioSceneSource, /const onResizePointerDown/)
  assert.match(screenDesignStudioSceneSource, /buildResizePatch/)
  assert.match(screenDesignStudioSceneSource, /resizeHandleButtonStyle/)
  assert.match(screenDesignStudioSceneSource, /resizeHandleVisualStyle/)
  assert.match(screenDesignStudioSceneSource, /minWidth: isCorner \? 26 : 24/)
  assert.match(screenDesignStudioSceneSource, /overflow: selected \? 'visible' : 'hidden'/)
  assert.match(screenDesignStudioSceneSource, /data-ui-action=\{`resize-\$\{handle\}`\}/)
  assert.match(screenDesignStudioSceneSource, /aria-label=\{`Resize \$\{element\.label\} from \$\{resizeHandleLabels\[handle\]\}`\}/)
  assert.match(screenDesignStudioSceneSource, /event\.key === 'Delete' \|\| event\.key === 'Backspace'/)
  assert.match(screenDesignStudioSceneSource, /removeSelected\(\)/)
  assert.match(screenDesignStudioSceneSource, /if \(isTyping\) return/)
})

test('flow rubric uses the same concrete criteria as the task', () => {
  assert.ok(flowRubric)
  assert.match(flowRubric.rubric_text, /Entry point/)
  assert.match(flowRubric.rubric_text, /Step/)
  assert.match(flowRubric.rubric_text, /Decision branch/)
  assert.match(flowRubric.rubric_text, /問題パス/)
  assert.equal(flowRubric.rubric_text.includes('Edge case'), false)
  assert.match(flowRubric.rubric_text, /Final screen/)
  assert.match(flowRubric.rubric_text, /Does the friend already have WellNest\?/)
  assert.match(flowRubric.rubric_text, /Shared Streak screen is created and visible/)
})
