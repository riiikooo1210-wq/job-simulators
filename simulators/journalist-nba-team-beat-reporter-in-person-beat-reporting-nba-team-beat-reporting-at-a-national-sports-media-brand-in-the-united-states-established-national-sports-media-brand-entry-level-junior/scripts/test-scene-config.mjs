import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const configPath = join(rootDir, 'src/data/scene-config.json')
const config = JSON.parse(await readFile(configPath, 'utf8'))

const scenes = config?.storyline?.nodes
assert.ok(scenes, 'scene-config.json exposes storyline.nodes')

const timeline = scenes.possession_timeline_watch
assert.equal(timeline.type, 'possession_timeline')
assert.equal(timeline.events.length, 7, 'possession timeline should show the final result as a seventh possession')
assert.match(timeline.summaryPrompt, /read the Reed question advice/i)

const finalEvent = timeline.events.at(-1)
assert.equal(finalEvent.id, 'final_score_board')
assert.match(finalEvent.headline, /final score/i)
assert.match(`${finalEvent.score}\n${finalEvent.description}`, /112.*107|107.*112/)
assert.match(finalEvent.description, /24 points, 6 assists, and 2 steals/)
assert.equal(finalEvent.image, '/action-assets/final-score-board.png')
await access(join(rootDir, 'public/action-assets/final-score-board.png'))

const mediaScrum = scenes.media_scrum
assert.equal(mediaScrum.type, 'voice_meeting')
assert.doesNotMatch(mediaScrum.content, /Before you step into the scrum/i)
assert.doesNotMatch(mediaScrum.content, /Final: Harbor City Cyclones 112, Denver Altitude 107/i)
assert.doesNotMatch(mediaScrum.content, /Official box score/i)
assert.doesNotMatch(mediaScrum.content, /After the win/i)

const scrumArtifactIds = mediaScrum.deskWorkDesign.inputArtifacts.map((artifact) => artifact.id)
assert.ok(!scrumArtifactIds.includes('postgame_reference'), 'scrum should no longer expose a postgame final-score reference')

const fastGamerTabs = scenes.fast_gamer.appTabs
const finalStoryTabs = scenes.final_story.appTabs
assert.deepEqual(fastGamerTabs.map((tab) => tab.id), ['all_player_notes', 'results'])
assert.deepEqual(finalStoryTabs.map((tab) => tab.id), ['all_player_notes', 'results', 'fast_gamer_draft', 'tessa_slack_history'])
assert.deepEqual(fastGamerTabs[0], finalStoryTabs[0], 'draft and final story should show the same Player Notes tab')
assert.deepEqual(fastGamerTabs[1], finalStoryTabs[1], 'draft and final story should show the same Results tab')

const resultsContent = fastGamerTabs[1].content
assert.equal(fastGamerTabs[1].label, 'Results')
assert.match(resultsContent, /Final: Harbor City Cyclones 112, Denver Altitude 107/)
assert.match(resultsContent, /Malik Reed finished with 24 points, 6 assists, and 2 steals/)
