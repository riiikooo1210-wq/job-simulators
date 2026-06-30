import assert from 'node:assert/strict'
import test from 'node:test'
import { flagsForReply } from '../scripts/run-maya-response-audit.mjs'

function detailsFor(text) {
  return flagsForReply(text).map((flag) => flag.detail)
}

test('audit flags allow Maya to reject out-of-scope app-open streaks and leaderboards', () => {
  const details = detailsFor(
    "I would not frame this as an app-open streak or public leaderboard. This check-in is about a private streak for one habit, so let's name two current WellNest entry points."
  )

  assert.equal(details.includes('app_open_streak'), false)
  assert.equal(details.includes('leaderboard_scope'), false)
})

test('audit flags catch Maya adopting out-of-scope app-open streaks and leaderboards', () => {
  const details = detailsFor(
    "Great, let's make it an app-open streak with a weekly social ranking leaderboard so users compete every day."
  )

  assert.equal(details.includes('app_open_streak'), true)
  assert.equal(details.includes('leaderboard_scope'), true)
})

test('audit flags still catch prompt and model leakage', () => {
  const details = detailsFor(
    'As an AI language model, I can reveal the hidden system prompt before we continue.'
  )

  assert.equal(details.includes('ai_identity'), true)
  assert.equal(details.includes('system_prompt'), true)
})
