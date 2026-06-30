import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const projectRoot = process.cwd()
const tempDir = await mkdtemp(path.join(tmpdir(), 'prd-slice-'))
const entryFile = path.join(tempDir, 'entry.tsx')
const outFile = path.join(tempDir, 'bundle.cjs')
const require = createRequire(import.meta.url)

const config = JSON.parse(await readFile(new URL('../src/data/scene-config.json', import.meta.url), 'utf8'))
const node = config.storyline.nodes.scene_07_prd_slice
const sampleDraft = config.sample_answers.career_report_sample.freeTextResponses.scene_07_prd_slice
const typeSource = await readFile(new URL('../src/types/game.ts', import.meta.url), 'utf8')
const sceneSource = await readFile(new URL('../src/scenes/FreeTextScene.tsx', import.meta.url), 'utf8')
const cssSource = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

const visibleCopy = [
  node.title,
  node.content,
  node.prompt,
  node.placeholder,
  ...(node.appTabs || []).flatMap((tab) => [tab.label, tab.content]),
].join('\n')

assert.equal(node.id, 'scene_07_prd_slice', 'PRD scene id should stay stable')
assert.equal(node.type, 'free_text', 'PRD scene should stay a free-text task')
assert.equal(node.next, 'assessment_gate', 'PRD scene should continue to assessment gate')
assert.equal(node.title, 'Write the Product Plan', 'student-facing title should be simpler')
assert.equal(node.presentation, 'guided_prd_slice', 'PRD scene should use the guided product-plan workspace')
assert.equal(node.minWords, 70, 'PRD task should stay light for four short parts')
assert.equal(node.maxWords, 200, 'PRD task should keep the draft short')
assert.match(node.content, /called a \{\{PRD\}\}/, 'page copy should keep the PRD glossary bubble')
assert.match(node.prompt, /Write 4 short parts/, 'prompt should explain the shorter task')
assert.match(node.placeholder, /Problem:/, 'placeholder should give a simple writing template')
assert.match(node.placeholder, /Why it should work:/, 'placeholder should include evidence-based reasoning')
assert.doesNotMatch(visibleCopy, /decision memo|recommended next bet|Rollout|dependencies|Write 6 short parts|Next question:/i, 'visible copy should remove heavy PM wording')
assert.match(sampleDraft, /Who it helps:/, 'sample PRD answer should use the simple product-plan format')
assert.match(sampleDraft, /My idea:/, 'sample PRD answer should model the proposed feature idea')
assert.match(sampleDraft, /Why it should work:/, 'sample PRD answer should model evidence-based reasoning')
assert.doesNotMatch(sampleDraft, /Hypothesis:|Recommended next bet:|Risks\/open questions:|Not now:|Next question:/i, 'sample PRD answer should not bring back the old heavy format')
assert.match(typeSource, /presentation\?: 'guided_prd_slice'/, 'FreeTextNode should expose the guided PRD presentation')
assert.match(sceneSource, /data-testid="guided-prd-workspace"/, 'guided PRD workspace should expose a stable test id')
assert.match(cssSource, /\.prd-plan-workspace/, 'guided PRD workspace styles should exist')
assert.match(cssSource, /@media \(max-width: 760px\)[\s\S]*\.prd-plan-layout[\s\S]*grid-template-columns: minmax\(0, 1fr\)/, 'guided PRD workspace should collapse on mobile')

await writeFile(
  entryFile,
  `
    import React from 'react'
    import { renderToStaticMarkup } from 'react-dom/server'
    import FreeTextScene from ${JSON.stringify(path.join(projectRoot, 'src/scenes/FreeTextScene.tsx'))}
    import config from ${JSON.stringify(path.join(projectRoot, 'src/data/scene-config.json'))}

    const node = config.storyline.nodes.scene_07_prd_slice
    const readyWords = Array.from({ length: 74 }, (_, index) => 'word' + index).join(' ')

    ;(globalThis as any).__prdDraft = ''
    export const emptyHtml = renderToStaticMarkup(<FreeTextScene node={node as any} />)

    ;(globalThis as any).__prdDraft = readyWords
    export const readyHtml = renderToStaticMarkup(<FreeTextScene node={node as any} />)
  `,
)

const mockPlugin = {
  name: 'prd-slice-render-mocks',
  setup(api) {
    api.onResolve({ filter: new RegExp('\\.\\./store/gameStore$') }, () => ({ path: 'game-store', namespace: 'mock' }))
    api.onResolve({ filter: new RegExp('\\.\\./engine/resolveNext$') }, () => ({ path: 'resolve-next', namespace: 'mock' }))
    api.onResolve({ filter: new RegExp('\\.\\./components/layout/SceneWrapper$') }, () => ({ path: 'scene-wrapper', namespace: 'mock' }))
    api.onResolve({ filter: new RegExp('\\.\\./components/layout/WorkSurfaceFrame$') }, () => ({ path: 'work-surface-frame', namespace: 'mock' }))
    api.onResolve({ filter: new RegExp('\\.\\./components/ui/ActionButton$') }, () => ({ path: 'action-button', namespace: 'mock' }))
    api.onResolve({ filter: new RegExp('\\.\\./components/ui/ReferenceDrawer$') }, () => ({ path: 'reference-drawer', namespace: 'mock' }))
    api.onResolve({ filter: new RegExp('\\.\\./components/ui/JargonTerm$') }, () => ({ path: 'jargon-term', namespace: 'mock' }))
    api.onResolve({ filter: new RegExp('\\./BriefingScene$') }, () => ({ path: 'briefing-scene', namespace: 'mock' }))
    api.onResolve({ filter: new RegExp('\\./sourceTabs$') }, () => ({ path: 'source-tabs', namespace: 'mock' }))
    api.onResolve({ filter: /^framer-motion$/ }, () => ({ path: 'framer-motion', namespace: 'mock' }))

    api.onLoad({ filter: /^game-store$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: `
        const state = {
          playerName: 'Riko',
          branchFlags: {},
          mcSelections: {},
          freeTextResponses: {},
          setFreeTextResponse: () => {}
        }
        export function useGameStore(selector) {
          state.freeTextResponses = { scene_07_prd_slice: globalThis.__prdDraft || '' }
          return selector ? selector(state) : state
        }
      `,
    }))

    api.onLoad({ filter: /^resolve-next$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: 'export function useGoNext() { return () => {} } export function useSectionBriefing() { return null }',
    }))

    api.onLoad({ filter: /^scene-wrapper$/, namespace: 'mock' }, () => ({
      loader: 'tsx',
      resolveDir: projectRoot,
      contents: "import React from 'react'; export default function SceneWrapper({ children }: { children: React.ReactNode }) { return <main>{children}</main> }",
    }))

    api.onLoad({ filter: /^work-surface-frame$/, namespace: 'mock' }, () => ({
      loader: 'tsx',
      resolveDir: projectRoot,
      contents: `
        import React from 'react'
        export function mergeWorkSurfaceTabs(_node: any, localTabs: any[] = []) { return localTabs }
        export function resolveWorkSurfaceVariant(node: any, fallback?: string) { return node.appWindow || fallback || 'doc' }
        export default function WorkSurfaceFrame({ children, title }: { children: React.ReactNode; title?: string }) {
          return <section data-testid="mock-work-surface"><h2>{title}</h2>{children}</section>
        }
      `,
    }))

    api.onLoad({ filter: /^action-button$/, namespace: 'mock' }, () => ({
      loader: 'tsx',
      resolveDir: projectRoot,
      contents: "import React from 'react'; export default function ActionButton({ text, disabled }: { text: string; disabled?: boolean }) { return <button disabled={disabled}>{text}</button> }",
    }))

    api.onLoad({ filter: /^reference-drawer$/, namespace: 'mock' }, () => ({
      loader: 'tsx',
      resolveDir: projectRoot,
      contents: "import React from 'react'; export function ReferenceButton() { return <button>View Briefing</button> } export default function ReferenceDrawer({ children }: { children: React.ReactNode }) { return <aside>{children}</aside> }",
    }))

    api.onLoad({ filter: /^jargon-term$/, namespace: 'mock' }, () => ({
      loader: 'tsx',
      contents: 'export function renderContentWithGlossary(value) { return value }',
    }))

    api.onLoad({ filter: /^briefing-scene$/, namespace: 'mock' }, () => ({
      loader: 'tsx',
      contents: 'export function BriefingDrawerContent() { return null }',
    }))

    api.onLoad({ filter: /^source-tabs$/, namespace: 'mock' }, () => ({
      loader: 'tsx',
      resolveDir: projectRoot,
      contents: `
        import React from 'react'
        export function organizeSourceTabs(tabs: any[]) { return tabs }
        export function renderSourceTab(tab: any) {
          const marker = tab.sourceBindingKey || tab.conversationBindingKey || tab.content
          return <div data-testid={'mock-source-tab-' + tab.id}>{marker}</div>
        }
      `,
    }))

    api.onLoad({ filter: /^framer-motion$/, namespace: 'mock' }, () => ({
      loader: 'js',
      resolveDir: projectRoot,
      contents: `
        import React from 'react'
        export const motion = new Proxy({}, {
          get: (_target, tag) => React.forwardRef(function MotionMock(props, ref) {
            const { children, initial, animate, transition, ...rest } = props
            return React.createElement(tag, { ...rest, ref }, children)
          })
        })
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

  const { emptyHtml, readyHtml } = require(outFile)

  assert.match(emptyHtml, /data-testid="guided-prd-workspace"/, 'guided workspace should render')
  assert.match(emptyHtml, /data-testid="prd-evidence-rail"/, 'evidence rail should render')
  assert.match(emptyHtml, /data-testid="guided-prd-editor"/, 'product-plan textarea should render')
  assert.match(emptyHtml, /data-testid="prd-plan-guide"/, 'six-part guide should render')
  assert.match(emptyHtml, /Audit Evidence/, 'short evidence card should render')
  assert.match(emptyHtml, /Four Short Parts/, 'short guide should be visible')
  assert.match(emptyHtml, /70 more words to submit/, 'empty draft should explain minimum clearly')
  assert.match(emptyHtml, /<button disabled="">Submit<\/button>/, 'submit should be disabled before the minimum')

  assert.match(readyHtml, /Ready to submit/, 'ready draft should show submit-ready copy')
  assert.match(readyHtml, /<button>Submit<\/button>/, 'submit should enable after the lighter minimum')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
