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
    "It's 9:30 AM, and you are joining the Core Experience squad's morning kickoff meeting on Google Meet."
  )
  assert.equal(kickoff.coworkerRecap?.npcId, 'ben')
  assert.equal(kickoff.coworkerRecap?.turns?.length, 4)
  assert.equal(
    kickoff.coworkerRecap.turns[0].coworkerLine,
    "I'll give you a quick recap before we jump in. WellNest helps people build healthy routines across hydration, movement, and sleep. On Home, users track habits with circular progress rings and those familiar flame streak counters."
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
  const recapIndex = briefingSceneSource.indexOf('<CoworkerRecap node={node} ctx={ctx} />', contentIndex)

  assert.notEqual(sceneStartIndex, -1)
  assert.notEqual(illustrationIndex, -1)
  assert.notEqual(contentIndex, -1)
  assert.notEqual(recapIndex, -1)
  assert.ok(illustrationIndex < contentIndex && contentIndex < recapIndex)
})

test('Ben request scene is framed as a design-eng thread, not a Ben-only DM', () => {
  const benRequest = nodes.scene_04_complications

  assert.equal(benRequest.windowTitle, '#design-eng · WellNest')
  assert.equal(benRequest.replyTargetLabel, '#design-eng')
  assert.equal(
    benRequest.playerGoal,
    "Reply to the #design-eng thread with one Slack message — acknowledge Ben's engagement goal, raise Leo's feasibility concern honestly, and propose a path forward."
  )
  assert.equal(benRequest.playerGoal.includes('Reply to Ben with one Slack message'), false)
  assert.ok(benRequest.initialMessages.some((message) => message.npcName === 'Leo Chen'))
  assert.ok(liveChatSceneSource.includes('replyTargetLabel={node.replyTargetLabel}'))
  assert.ok(npcChatPanelSource.includes('const composeTarget = replyTargetLabel ?? npc.name'))
  assert.ok(npcChatPanelSource.includes('`Reply to ${composeTarget}...`'))
})
