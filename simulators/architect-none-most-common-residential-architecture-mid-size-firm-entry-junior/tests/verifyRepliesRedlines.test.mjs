import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import ts from 'typescript'

const projectRoot = path.resolve(import.meta.dirname, '..')

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(projectRoot, relativePath), 'utf8'))
}

function loadTsModule(relativePath) {
  const source = readFileSync(path.join(projectRoot, relativePath), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  })
  const module = { exports: {} }
  const fn = new Function('exports', 'module', outputText)
  fn(module.exports, module)
  return module.exports
}

function verifyReplyCards() {
  const config = readJson('src/data/scene-config.json')
  return config.storyline.nodes.review_verify_replies.appTabs
    .find((tab) => tab.id === 'verify_replies')
    .cards
}

function verifyResolutionSummaryField() {
  const config = readJson('src/data/scene-config.json')
  return config.storyline.nodes.review_verify_replies.definition.fields
    .find((field) => field.key === 'summary')
}

test('review verify replies keep the original redline beside each reply', () => {
  const cards = verifyReplyCards()

  assert.equal(cards.length, 4)
  for (const card of cards) {
    assert.ok(card.originalRedline, `${card.title} is missing originalRedline context`)
    assert.equal(typeof card.originalRedline.ref, 'string')
    assert.equal(typeof card.originalRedline.title, 'string')
    assert.equal(typeof card.originalRedline.body, 'string')
    assert.ok(card.originalRedline.body.length > 40)
  }
})

test('structured entry cards expose a redline-and-reply thread contract', () => {
  const { buildStructuredEntryCardThread } = loadTsModule('src/scenes/structuredEntryCards.ts')
  const [firstCard] = verifyReplyCards()

  const thread = buildStructuredEntryCardThread(firstCard)

  assert.deepEqual(thread.map((entry) => entry.kind), ['redline', 'reply'])
  assert.equal(thread[0].label, 'Original redline')
  assert.equal(thread[0].ref, firstCard.originalRedline.ref)
  assert.equal(thread[0].title, firstCard.originalRedline.title)
  assert.equal(thread[0].body, firstCard.originalRedline.body)
  assert.equal(thread[1].label, 'Reply')
  assert.equal(thread[1].ref, firstCard.ref)
  assert.equal(thread[1].title, firstCard.title)
  assert.equal(thread[1].body, firstCard.body)
})

test('verify reply thread cards use only the cream card palette', () => {
  const { VERIFY_REPLY_THREAD_COLORS } = loadTsModule('src/scenes/structuredEntryCards.ts')

  assert.deepEqual(
    Object.keys(VERIFY_REPLY_THREAD_COLORS).sort(),
    [
      'connector',
      'largeBackground',
      'largeBorder',
      'redlineBackground',
      'redlineBorder',
      'replyBackground',
      'replyBorder',
    ]
  )

  for (const color of Object.values(VERIFY_REPLY_THREAD_COLORS)) {
    assert.match(color, /^#(F8F3E6|FBF7EA|F7F1E3|F2EBD9|EFE8D2|E8DCC8|D7CDBA|CDBF94)$/)
  }
})

test('schematic option summary placeholder gives concise drafting guidance', () => {
  const field = verifyResolutionSummaryField()

  assert.equal(
    field.placeholder,
    'Create a concise note: capture the constraints to carry into the schematic option, not permit approval.'
  )
  assert.doesNotMatch(field.placeholder, /^Owen confirmed/)
  assert.doesNotMatch(field.placeholder, /\.\.\.$/)
})
