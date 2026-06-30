import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const projectRoot = process.cwd()
const tempDir = await mkdtemp(path.join(tmpdir(), 'pm-persist-'))
const entryFile = path.join(tempDir, 'entry.ts')
const outFile = path.join(tempDir, 'bundle.cjs')
const require = createRequire(import.meta.url)

const storeSource = await readFile(new URL('../src/store/gameStore.ts', import.meta.url), 'utf8')
const sceneEngineSource = await readFile(new URL('../src/engine/SceneEngine.tsx', import.meta.url), 'utf8')

assert.match(storeSource, /SIMULATOR_STORAGE_KEY/, 'store should use the simulator-specific storage key')
assert.doesNotMatch(storeSource, /job-simulator-storage/, 'store should not fall back to the generic storage key')
assert.doesNotMatch(storeSource, /STORE_PERSIST_KEY/, 'store should not depend on global initialization timing')
assert.match(storeSource, /migrate:/, 'persisted state should run through a migration/repair path')
assert.match(storeSource, /merge:/, 'persisted state should be repaired during merge')
assert.match(sceneEngineSource, /recoverInvalidRoute/, 'scene engine should recover invalid route ids')
assert.doesNotMatch(sceneEngineSource, /Error: Node/, 'missing nodes should not show a raw error to students')

await writeFile(
  entryFile,
  `
    import { GAME_STORE_VERSION, repairPersistedGameState } from ${JSON.stringify(path.join(projectRoot, 'src/store/gameStore.ts'))}
    import { SIMULATOR_STORAGE_KEY } from ${JSON.stringify(path.join(projectRoot, 'src/data/simulatorIdentity.ts'))}

    export const version = GAME_STORE_VERSION
    export const storageKey = SIMULATOR_STORAGE_KEY
    export const repairedStale = repairPersistedGameState({
      currentNodeId: 'prep_risk_refund',
      visitedNodes: ['intro', 'prep_risk_refund'],
      playerName: 'Ari',
      freeTextResponses: { appAuditNotes: '{"next_decision":"AI made it look final."}' },
      npcConversations: {
        'voice:scene_04_user_call:nina': [
          { role: 'user', content: 'What happened?', ts: '2026-06-29T00:00:00.000Z' },
          { role: 'invalid', content: 'drop me' }
        ]
      }
    })
    export const repairedValid = repairPersistedGameState({
      currentNodeId: 'scene_03_research_prep',
      visitedNodes: ['intro', 'briefing_kickoff', 'scene_02_app_audit'],
      sectionsSubmitted: [1, 1, 2],
      freeTextResponses: { scene_03_research_prep: 'Questions...' }
    })
  `,
)

const mockPlugin = {
  name: 'persistence-repair-mocks',
  setup(api) {
    api.onResolve({ filter: /^zustand$/ }, () => ({ path: 'zustand', namespace: 'mock' }))
    api.onResolve({ filter: /^zustand\/middleware$/ }, () => ({ path: 'zustand-middleware', namespace: 'mock' }))

    api.onLoad({ filter: /^zustand$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: `
        export function create() {
          return (initializer) => {
            const state = typeof initializer === 'function' ? initializer(() => {}, () => ({})) : {}
            const hook = (selector) => selector ? selector(state) : state
            hook.getState = () => state
            hook.setState = () => {}
            return hook
          }
        }
      `,
    }))

    api.onLoad({ filter: /^zustand-middleware$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: 'export function persist(initializer) { return initializer }',
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
    plugins: [mockPlugin],
    logLevel: 'silent',
    loader: { '.json': 'json' },
  })

  const { repairedStale, repairedValid, storageKey, version } = require(outFile)

  assert.equal(version, 2, 'store version should advance for repaired persisted shape')
  assert.equal(
    storageKey,
    'product-manager-general-consumer-product-manager-the-most-common-pm-role-aspiring-pms-imagine-social-trip-planning-app-for-friend-groups-growth-stage-mid-level-simulator-storage',
    'storage key should be stable and simulator-specific',
  )
  assert.equal(repairedStale.currentNodeId, 'intro', 'unknown saved nodes should restart from intro')
  assert.deepEqual(repairedStale.visitedNodes, ['intro'], 'unknown saved route history should be discarded')
  assert.equal(repairedStale.playerName, 'Ari', 'safe identity fields should be preserved')
  assert.match(repairedStale.freeTextResponses.appAuditNotes, /AI made it look final/, 'safe saved artifacts should be preserved')
  assert.equal(repairedStale.npcConversations['voice:scene_04_user_call:nina'].length, 1, 'invalid conversation messages should be dropped')

  assert.equal(repairedValid.currentNodeId, 'scene_03_research_prep', 'valid saved node should survive repair')
  assert.deepEqual(
    repairedValid.visitedNodes,
    ['intro', 'briefing_kickoff', 'scene_02_app_audit', 'scene_03_research_prep'],
    'valid route history should include the current node',
  )
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
