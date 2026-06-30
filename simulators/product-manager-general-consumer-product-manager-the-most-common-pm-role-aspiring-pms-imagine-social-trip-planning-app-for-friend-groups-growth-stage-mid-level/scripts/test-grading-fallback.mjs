import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const projectRoot = process.cwd()
const tempDir = await mkdtemp(path.join(tmpdir(), 'grading-fallback-'))
const entryFile = path.join(tempDir, 'entry.ts')
const outFile = path.join(tempDir, 'bundle.cjs')
const require = createRequire(import.meta.url)

const geminiSource = await readFile(new URL('../src/services/gemini.ts', import.meta.url), 'utf8')
assert.match(geminiSource, /buildFallbackGradeResult/, 'grading service should have a deterministic fallback result')
assert.match(geminiSource, /catch \{\s*return buildAssessmentResult\(buildFallbackGradeResult/, 'gradeResponses should fall back instead of throwing')

await writeFile(
  entryFile,
  `
    import { gradeResponses } from ${JSON.stringify(path.join(projectRoot, 'src/services/gemini.ts'))}

    export async function runFallback() {
      return gradeResponses({
        playerName: 'Riko',
        visitedNodes: ['intro', 'briefing_kickoff', 'scene_02_app_audit', 'scene_03_research_prep', 'scene_04_user_call', 'scene_07_prd_slice', 'assessment_gate', 'grading'],
        branchFlags: {},
        mcSelections: {},
        freeTextResponses: {
          appAuditNotes: JSON.stringify({
            trip_setup_clarity: 'The setup starts cleanly, but important choices are still blank before friends join.',
            invite_followthrough: 'The friend list shows activity, but it does not tell Nina the next shared decision.',
            budget_pressure: 'Budget asks for sensitive information without enough context.',
            decision_overload: 'Saved places have votes, but no clear first choice.',
            next_decision: 'The AI plan looks final while group decisions are unresolved.'
          }),
          scene_03_research_prep: 'Questions: 1. Walk me through when planning slowed down. 2. What decision were you trying to get? 3. How did budget feel? 4. What happened outside Roamly? 5. What would have helped? Learning goal: find the one small decision that stalled.',
          scene_07_prd_slice: 'Problem: Groups look active but still do not make one shared decision. Who it helps: Trip organizers with several friends. My idea: Add a small decision prompt. Why it should work: Nina said 18 places were saved, only 3 of 7 voted, and budget pressure made people quiet.'
        },
        npcConversations: {
          'voice:scene_04_user_call:nina': [
            { role: 'user', content: 'What happened when planning slowed down?' },
            { role: 'npc', content: 'We saved 18 places, but only 3 of 7 friends voted.' },
            { role: 'user', content: 'How did budget feel?' },
            { role: 'npc', content: 'Budget felt awkward and made people quiet.' },
            { role: 'user', content: 'What would have helped?' },
            { role: 'npc', content: 'I needed help getting everyone to make one small decision.' },
            { role: 'user', content: 'Where did planning finish?' },
            { role: 'npc', content: 'Final decisions happened in group text.' },
            { role: 'user', content: 'Was a full itinerary helpful?' }
          ]
        }
      })
    }
  `,
)

const rawPlugin = {
  name: 'raw-md-loader',
  setup(api) {
    api.onResolve({ filter: /\.md\?raw$/ }, (args) => ({
      path: path.resolve(args.resolveDir, args.path.replace('?raw', '')),
      namespace: 'raw-md',
    }))
    api.onLoad({ filter: /.*/, namespace: 'raw-md' }, async (args) => ({
      loader: 'text',
      contents: await readFile(args.path, 'utf8'),
    }))
  },
}

try {
  await build({
    entryPoints: [entryFile],
    outfile: outFile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    absWorkingDir: projectRoot,
    nodePaths: [path.join(projectRoot, 'node_modules')],
    plugins: [rawPlugin],
    logLevel: 'silent',
    loader: { '.json': 'json' },
  })

  const { runFallback } = require(outFile)
  const result = await runFallback()

  assert.equal(result.assessment_version, 'career-exploration-v1', 'fallback should return normal assessment shape')
  assert.equal(result.task_feedback.length, 4, 'fallback should produce feedback for the four active rubric criteria')
  assert.ok(result.task_feedback.some((item) => item.task === 'Product Plan'), 'fallback should use learner-facing Product Plan label')
  assert.match(result.legacy_grade_archive.overall_assessment, /backup assessment/i, 'fallback should explain that backup assessment was used')
  assert.doesNotMatch(JSON.stringify(result), /Gemini|API key|quota|429|All Gemini/i, 'fallback assessment should not expose provider internals')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
