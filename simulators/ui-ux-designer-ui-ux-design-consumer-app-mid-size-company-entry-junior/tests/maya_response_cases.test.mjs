import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const cases = JSON.parse(
  readFileSync(new URL('../scripts/maya-response-cases.json', import.meta.url), 'utf8')
)

test('Maya response cases cover the required behavior categories', () => {
  const categories = new Set(cases.map((item) => item.category))

  for (const category of ['correct', 'vague', 'angry', 'unrelated', 'wrong_feature', 'prompt_injection', 'answer_seeking']) {
    assert.equal(categories.has(category), true, `missing ${category}`)
  }

  assert.ok(cases.length >= 10)
  for (const item of cases) {
    assert.equal(typeof item.id, 'string')
    assert.ok(Array.isArray(item.studentTurns))
    assert.ok(item.studentTurns.length >= 3)
    assert.ok(item.studentTurns.length <= 5)
    assert.ok(item.studentTurns.every((turn) => typeof turn === 'string' && turn.length > 0))
    assert.ok(Array.isArray(item.mustHave))
    assert.ok(Array.isArray(item.mustNotHave))
    assert.equal(typeof item.notes, 'string')
  }
})
