import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const config = JSON.parse(await readFile(new URL('../src/data/scene-config.json', import.meta.url), 'utf8'))
const freeTextSource = await readFile(new URL('../src/scenes/FreeTextScene.tsx', import.meta.url), 'utf8')
const sourceTabsSource = await readFile(new URL('../src/scenes/sourceTabs.tsx', import.meta.url), 'utf8')
const typeSource = await readFile(new URL('../src/types/game.ts', import.meta.url), 'utf8')

const prep = config.storyline.nodes.scene_03_research_prep
const prd = config.storyline.nodes.scene_07_prd_slice
const prepAuditTab = prep.appTabs.find((tab) => tab.id === 'app_audit_notes')
const prdAuditTab = prd.appTabs.find((tab) => tab.id === 'app_audit_evidence')
const prdInterviewTab = prd.appTabs.find((tab) => tab.id === 'prioritization')

assert.equal(prepAuditTab.sourceBindingKey, 'appAuditNotes', 'research prep should render saved app-audit notes')
assert.equal(prdAuditTab.sourceBindingKey, 'appAuditNotes', 'product plan should render saved app-audit notes')
assert.equal(prdInterviewTab.conversationBindingKey, 'voice:scene_04_user_call:nina', 'product plan should render Nina transcript')

for (const key of ['trip_setup_clarity', 'invite_followthrough', 'budget_pressure', 'decision_overload', 'next_decision']) {
  assert.ok(prepAuditTab.sourceBindingLabels[key], `prep should label app-audit note key ${key}`)
  assert.ok(prdAuditTab.sourceBindingLabels[key], `product plan should label app-audit note key ${key}`)
}

assert.match(freeTextSource, /renderSourceTab/, 'FreeTextScene should use the shared source-tab renderer')
assert.match(freeTextSource, /npcConversations/, 'FreeTextScene should pass conversations into source-tab context')
assert.match(sourceTabsSource, /conversationBindingKey/, 'source tabs should support conversation bindings')
assert.match(sourceTabsSource, /No interview notes saved yet/, 'conversation tab should have a safe empty state')
assert.match(sourceTabsSource, /normalizeBoundNotes/, 'source tabs should normalize older saved-note shapes before rendering')
assert.match(sourceTabsSource, /typeof item === 'number' \|\| typeof item === 'boolean'/, 'source tabs should safely coerce primitive old note values')
assert.match(typeSource, /conversationBindingKey\?: string/, 'WorkSurfaceTab should type conversation binding keys')
assert.doesNotMatch(prd.appTabs.map((tab) => tab.content).join('\n'), /only 3 of 7 friends voted, and final choices moved to group text\. She needed help/, 'product plan should not rely only on static Nina summary')
