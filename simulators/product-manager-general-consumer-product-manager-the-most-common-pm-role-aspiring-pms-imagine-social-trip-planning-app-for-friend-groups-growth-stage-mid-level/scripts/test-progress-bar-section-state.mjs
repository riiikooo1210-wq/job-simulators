import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const projectRoot = process.cwd()
const tempDir = await mkdtemp(path.join(tmpdir(), 'progress-bar-'))
const entryFile = path.join(tempDir, 'entry.tsx')
const outFile = path.join(tempDir, 'bundle.cjs')
const require = createRequire(import.meta.url)

const source = await readFile(new URL('../src/components/layout/ProgressBar.tsx', import.meta.url), 'utf8')
const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const storeSource = await readFile(new URL('../src/store/gameStore.ts', import.meta.url), 'utf8')
assert.match(source, /data-progress-state/, 'progress segments should expose stable progress state attributes')
assert.match(source, /aria-current=\{isCurrent \? 'step' : undefined\}/, 'current progress segment should expose aria-current')
assert.match(storeSource, /newSection > prev\.section/, 'section completion should only be marked when moving forward')
assert.match(appSource, /navigateTo\(targetNodeId, \{ markSectionSubmitted: false \}\)/, 'dev shortcuts should not fake section completion')

await writeFile(
  entryFile,
  `
    import React from 'react'
    import { renderToStaticMarkup } from 'react-dom/server'
    import ProgressBar from ${JSON.stringify(path.join(projectRoot, 'src/components/layout/ProgressBar.tsx'))}

    ;(globalThis as any).__progressState = { currentSection: 3, sectionsSubmitted: [3, 4] }
    export const staleCompletionHtml = renderToStaticMarkup(<ProgressBar />)

    ;(globalThis as any).__progressState = { currentSection: 4, sectionsSubmitted: [1, 2, 3] }
    export const prdHtml = renderToStaticMarkup(<ProgressBar />)

    ;(globalThis as any).__progressState = { currentSection: 3, sectionsSubmitted: [] }
    export const devSkipHtml = renderToStaticMarkup(<ProgressBar />)
  `,
)

const mockPlugin = {
  name: 'progress-bar-render-mocks',
  setup(api) {
    api.onResolve({ filter: new RegExp('\\.\\.\\/\\.\\.\\/store\\/gameStore$') }, () => ({ path: 'game-store', namespace: 'mock' }))

    api.onLoad({ filter: /^game-store$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: `
        export function useGameStore(selector) {
          const state = globalThis.__progressState || { currentSection: 0, sectionsSubmitted: [] }
          return selector ? selector(state) : state
        }
      `,
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
    jsx: 'automatic',
    plugins: [mockPlugin],
    logLevel: 'silent',
    loader: { '.json': 'json' },
  })

  const { staleCompletionHtml, prdHtml, devSkipHtml } = require(outFile)

  assert.match(
    staleCompletionHtml,
    /data-progress-state="current" aria-current="step"[^>]*>Interview/,
    'Nina interview should keep Interview as current even if stale saved state says later sections were submitted',
  )
  assert.match(
    staleCompletionHtml,
    /data-progress-state="future"[^>]*>Product Plan/,
    'Product Plan should stay future while the current page is still the interview',
  )
  assert.doesNotMatch(
    staleCompletionHtml,
    /data-progress-state="complete"[^>]*>Product Plan/,
    'Future sections should never show as complete on an earlier section',
  )

  assert.match(
    prdHtml,
    /data-progress-state="current" aria-current="step"[^>]*>Product Plan/,
    'Product Plan section should show Product Plan as current',
  )
  assert.match(
    prdHtml,
    /data-progress-state="complete"[^>]*>Interview/,
    'Interview should show complete after reaching Product Plan through normal flow',
  )

  assert.match(
    devSkipHtml,
    /data-progress-state="current" aria-current="step"[^>]*>Interview/,
    'Dev skip directly to Nina should still show Interview as current',
  )
  assert.doesNotMatch(
    devSkipHtml,
    /data-progress-state="complete"/,
    'Dev skip state should not fake completed sections',
  )
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
