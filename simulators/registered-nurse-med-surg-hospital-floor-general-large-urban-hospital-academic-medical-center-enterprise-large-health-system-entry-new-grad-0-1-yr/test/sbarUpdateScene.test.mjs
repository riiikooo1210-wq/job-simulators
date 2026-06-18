import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const slug = 'registered-nurse-med-surg-hospital-floor-general-large-urban-hospital-academic-medical-center-enterprise-large-health-system-entry-new-grad-0-1-yr'

async function readConfig(path) {
  return JSON.parse(await readFile(path, 'utf8'))
}

function getSbarUpdateNode(config) {
  const node = config.storyline.nodes.scene6_handoff
  assert.equal(node.type, 'structured_entry')
  assert.equal(node.title, 'Mrs. Vance SBAR Update')
  return node
}

async function assertSbarUpdateCopy(configPath) {
  const config = await readConfig(configPath)
  const node = getSbarUpdateNode(config)

  assert.ok(
    node.content.startsWith('Capture a concise {{SBAR}} update for Mrs. Vance'),
    'Mrs. Vance SBAR update should start directly with the capture instruction',
  )
  assert.doesNotMatch(node.content, /Before the next patient need pulls you away/i)
}

test('Mrs. Vance SBAR update starts directly with the capture instruction', async () => {
  await assertSbarUpdateCopy('./src/data/scene-config.json')
})

test('source synthesis keeps the Mrs. Vance SBAR update copy in sync', async () => {
  await assertSbarUpdateCopy(`../../data/${slug}/synthesis/scene-config.json`)
})

test('tabbed structured-entry input windows keep scene instructions above the desktop overlay', async () => {
  const source = await readFile('./src/scenes/StructuredEntryScene.tsx', 'utf8')
  const inputTabBranch = source.match(/activeTab === 'input' \? \([\s\S]*?\) : sourceTab \?/)

  assert.ok(inputTabBranch, 'StructuredEntryScene should render an input-tab branch')
  assert.doesNotMatch(
    inputTabBranch[0],
    /node\.content|instructionBlock/,
    'input tabs should only render the previous-response reference, not the scene instruction',
  )
  assert.match(source, /const instructionBlock = node\.content/)
  assert.ok(
    source.indexOf('{instructionBlock}') < source.indexOf('{inputOutputWindow ||'),
    'scene instruction should render immediately above the desktop overlay',
  )
})
