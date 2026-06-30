import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const config = JSON.parse(
  readFileSync(new URL('../src/data/scene-config.json', import.meta.url), 'utf8')
)
const briefingSceneSource = readFileSync(
  new URL('../src/scenes/BriefingScene.tsx', import.meta.url),
  'utf8'
)
const liveChatSceneSource = readFileSync(
  new URL('../src/scenes/LiveChatScene.tsx', import.meta.url),
  'utf8'
)
const npcChatPanelSource = readFileSync(
  new URL('../src/components/ui/NPCChatPanel.tsx', import.meta.url),
  'utf8'
)

const nodes = config.storyline.nodes
const introSteps = config.intro.steps

test('project kickoff uses Ben coworker recap instead of document-style goal and ask copy', () => {
  const kickoff = nodes.briefing_1

  assert.equal(kickoff.title, 'The Project Kickoff')
  assert.equal(
    kickoff.content,
    "It's 9:30 AM. You're joining the Core Experience team's morning kickoff meeting on Google Meet."
  )
  assert.equal(kickoff.coworkerRecap?.npcId, 'ben')
  assert.equal(kickoff.coworkerRecap?.turns?.length, 4)
  assert.equal(
    kickoff.coworkerRecap.turns[0].coworkerLine,
    "Before we start, here's the short version. WellNest helps people build healthy routines for hydration, movement, and sleep. On Home, people track habits with circular progress rings and flame streak counters."
  )

  const kickoffJson = JSON.stringify(kickoff)
  assert.equal(kickoffJson.includes('**The Goal:**'), false)
  assert.equal(kickoffJson.includes('**The Ask:**'), false)
})

test('intro and kickoff no longer duplicate details or route through standup mcq', () => {
  const companyStep = introSteps.find((step) => step.label === 'The Company')
  const challengeStep = introSteps.find((step) => step.label === 'Your Challenge')

  assert.equal(companyStep?.content.includes('circular progress rings'), false)
  assert.equal(companyStep?.content.includes('flame'), false)
  assert.equal(challengeStep?.content.includes('Friend Streaks'), false)
  assert.equal(nodes.briefing_1.next, 'scene_02_ideation')
  assert.equal(nodes.scene_01_standup, undefined)
  assert.equal(nodes.scene_01b_hifi_redirect, undefined)
  assert.equal(nodes.scene_01b_meeting_redirect, undefined)
  assert.equal(nodes.scene_01b_wait_redirect, undefined)
})

test('simple briefing renders situational content before coworker recap', () => {
  const sceneStartIndex = briefingSceneSource.indexOf('export default function BriefingScene')
  const illustrationIndex = briefingSceneSource.indexOf('<InlineIllustration src={node.illustration} />', sceneStartIndex)
  const contentIndex = briefingSceneSource.indexOf('{node.content && (', illustrationIndex)
  const recapIndex = briefingSceneSource.indexOf('<CoworkerRecap', contentIndex)

  assert.notEqual(sceneStartIndex, -1)
  assert.notEqual(illustrationIndex, -1)
  assert.notEqual(contentIndex, -1)
  assert.notEqual(recapIndex, -1)
  assert.ok(illustrationIndex < contentIndex && contentIndex < recapIndex)
})

test('kickoff start stays disabled until the coworker recap is complete', () => {
  const kickoff = nodes.briefing_1

  assert.equal(kickoff.coworkerRecap?.turns?.length, 4)
  assert.ok(briefingSceneSource.includes('const [recapComplete, setRecapComplete] = useState(false)'))
  assert.ok(briefingSceneSource.includes('onCompleteChange?: (complete: boolean) => void'))
  assert.ok(briefingSceneSource.includes('onCompleteChange?.(false)'))
  assert.ok(briefingSceneSource.includes('onCompleteChange?.(true)'))
  assert.ok(briefingSceneSource.includes('const recapTurnCount = node.coworkerRecap?.turns?.length ?? 0'))
  assert.ok(briefingSceneSource.includes("const requiresRecapCompletion = mode === 'simple' && recapTurnCount > 0"))
  assert.ok(briefingSceneSource.includes('const startDisabled = requiresRecapCompletion && !recapComplete'))
  assert.ok(briefingSceneSource.includes('onCompleteChange={setRecapComplete}'))
  assert.ok(briefingSceneSource.includes('Finish all {recapTurnCount} context updates to start the task.'))
  assert.ok(briefingSceneSource.includes('<ActionButton text={actionLabel} onClick={onAdvance} disabled={startDisabled} />'))
})

test('Ben request scene is framed as a design-eng thread, not a Ben-only DM', () => {
  const benRequest = nodes.scene_04_complications

  assert.equal(benRequest.windowTitle, '#design-eng · WellNest')
  assert.equal(benRequest.replyTargetLabel, '#design-eng')
  assert.equal(
    benRequest.playerGoal,
    "Do not choose only Ben or only Leo. Reply to the #design-eng thread with one balanced Slack message: show you understand Ben wants users excited, clearly share Leo's build concern, and suggest what the team should do next."
  )
  assert.deepEqual(benRequest.taskChecklist, [
    "Name Ben's goal: make Friend Streaks feel exciting when a streak updates.",
    "Name Leo's concern: custom animation could take a lot of work and delay launch.",
    'Suggest the next step: use existing motion for now or align as a team before promising custom work.',
  ])
  assert.equal(benRequest.slackWorkspace.workspaceName, 'WellNest')
  assert.equal(benRequest.slackWorkspace.channelName, 'design-eng')
  assert.equal(benRequest.slackWorkspace.threadLabel, 'Friend Streaks motion request')
  assert.deepEqual(
    benRequest.slackWorkspace.sidebarChannels.filter((item) => item.active).map((item) => item.name),
    ['design-eng']
  )
  assert.deepEqual(
    benRequest.slackWorkspace.directMessages.map((item) => item.name),
    ['Maya Singh', 'Ben Carter', 'Leo Chen']
  )
  assert.equal(benRequest.initialMessages[0].ts, '2:08 PM')
  assert.equal(benRequest.initialMessages[1].ts, '2:10 PM')
  assert.equal(benRequest.playerGoal.includes('Reply to Ben with one Slack message'), false)
  assert.ok(benRequest.initialMessages.some((message) => message.npcName === 'Leo Chen'))
  assert.ok(liveChatSceneSource.includes('replyTargetLabel={node.replyTargetLabel}'))
  assert.ok(liveChatSceneSource.includes('slackWorkspace={node.slackWorkspace}'))
  assert.ok(liveChatSceneSource.includes('node.taskChecklist'))
  assert.ok(liveChatSceneSource.includes('Before you send, include all three:'))
  assert.ok(npcChatPanelSource.includes('const composeTarget = replyTargetLabel ?? npc.name'))
  assert.ok(npcChatPanelSource.includes('`Reply to ${composeTarget}...`'))
  assert.ok(npcChatPanelSource.includes('data-ui-surface="slack-workspace"'))
  assert.ok(npcChatPanelSource.includes('workspace.sidebarChannels.map'))
  assert.ok(npcChatPanelSource.includes('workspace.directMessages.map'))
  assert.ok(npcChatPanelSource.includes('Ben goal + Leo concern + next step'))
})
