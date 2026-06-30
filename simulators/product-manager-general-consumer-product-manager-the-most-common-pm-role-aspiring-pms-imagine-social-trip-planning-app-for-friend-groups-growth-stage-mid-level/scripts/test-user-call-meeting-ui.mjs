import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const projectRoot = process.cwd()
const tempDir = await mkdtemp(path.join(tmpdir(), 'user-call-'))
const entryFile = path.join(tempDir, 'entry.tsx')
const outFile = path.join(tempDir, 'bundle.cjs')
const require = createRequire(import.meta.url)

const config = JSON.parse(await readFile(new URL('../src/data/scene-config.json', import.meta.url), 'utf8'))
const node = config.storyline.nodes.scene_04_user_call
const typeSource = await readFile(new URL('../src/types/game.ts', import.meta.url), 'utf8')
const cssSource = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

assert.equal(node.title, 'Remote User Interview with Nina', 'Nina scene title should stay stable')
assert.equal(node.minTurns, 5, 'Nina interview should require at least 5 student questions')
assert.equal(node.maxTurns, 15, 'Nina interview should stop at 15 student questions')
assert.equal(node.typedFallback, true, 'Nina interview should support typed fallback')
assert.equal(node.illustration, undefined, 'Nina interview should not render a top generated illustration')
assert.equal(node.imageBrief, undefined, 'Nina interview should not keep an unused generated image brief')
assert.match(node.content, /target customer/i, 'page copy should explain Nina is the target customer')
assert.match(node.content, /at least 5/i, 'page copy should show the 5-question minimum')
assert.match(node.content, /stop by 15/i, 'page copy should show the 15-question maximum')
assert.match(node.playerGoal, /do not pitch/i, 'student goal should warn students not to pitch a feature')
assert.match(node.goalPrompt, /one question at a time/i, 'Nina prompt should answer one interview question at a time')
assert.match(typeSource, /typedFallback\?: boolean/, 'VoiceMeetingNode should expose optional typed fallback')
assert.match(cssSource, /\.voice-meeting-call-toolbar/, 'meeting UI should expose a call toolbar')
assert.match(cssSource, /#0E71EB/i, 'meeting UI should include a Zoom-like blue primary color')
assert.match(cssSource, /\.voice-meeting-reference-file[\s\S]*#1E1E1A/, 'reference file should stay on the existing Roamly work-file theme')

await writeFile(
  entryFile,
  `
    import React from 'react'
    import { renderToStaticMarkup } from 'react-dom/server'
    import VoiceMeetingScene from ${JSON.stringify(path.join(projectRoot, 'src/scenes/VoiceMeetingScene.tsx'))}
    import config from ${JSON.stringify(path.join(projectRoot, 'src/data/scene-config.json'))}

    const node = config.storyline.nodes.scene_04_user_call
    const key = 'voice:scene_04_user_call:nina'
    const makeTurns = (count: number) => Array.from({ length: count }).flatMap((_, index) => [
      { role: 'user', content: 'Question ' + (index + 1), ts: '2026-06-24T00:00:00.000Z' },
      { role: 'npc', content: 'Nina answer ' + (index + 1), ts: '2026-06-24T00:00:01.000Z' },
    ])

    ;(globalThis as any).__voiceMessages = makeTurns(4)
    export const underLimitHtml = renderToStaticMarkup(<VoiceMeetingScene node={node as any} />)

    ;(globalThis as any).__voiceMessages = makeTurns(5)
    export const typedMinimumHtml = renderToStaticMarkup(<VoiceMeetingScene node={node as any} />)

    ;(globalThis as any).__voiceMessages = makeTurns(15)
    export const atLimitHtml = renderToStaticMarkup(<VoiceMeetingScene node={node as any} />)
  `,
)

const mockPlugin = {
  name: 'user-call-render-mocks',
  setup(api) {
    api.onResolve({ filter: new RegExp('\\.\\./store/gameStore$') }, () => ({ path: 'game-store', namespace: 'mock' }))
    api.onResolve({ filter: new RegExp('\\.\\./engine/resolveNext$') }, () => ({ path: 'resolve-next', namespace: 'mock' }))
    api.onResolve({ filter: new RegExp('\\.\\./components/layout/SceneWrapper$') }, () => ({ path: 'scene-wrapper', namespace: 'mock' }))
    api.onResolve({ filter: new RegExp('\\.\\./components/ui/LaptopFrame$') }, () => ({ path: 'laptop-frame', namespace: 'mock' }))
    api.onResolve({ filter: new RegExp('\\.\\./components/layout/DesktopOverlay$') }, () => ({ path: 'desktop-overlay', namespace: 'mock' }))
    api.onResolve({ filter: new RegExp('\\.\\./services/gemini$') }, () => ({ path: 'gemini-service', namespace: 'mock' }))
    api.onResolve({ filter: new RegExp('\\.\\./services/geminiLive$') }, () => ({ path: 'gemini-live-service', namespace: 'mock' }))
    api.onResolve({ filter: /^framer-motion$/ }, () => ({ path: 'framer-motion', namespace: 'mock' }))

    api.onLoad({ filter: /^game-store$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: `
        const key = 'voice:scene_04_user_call:nina'
        const state = {
          playerName: 'Riko',
          branchFlags: {},
          mcSelections: {},
          freeTextResponses: {
            scene_03_research_prep: 'Questions:\\n1. Walk me through the last moment when planning slowed down.\\n2. What decision were you trying to get friends to make?'
          },
          appendNpcMessage: () => {},
          npcConversations: {}
        }
        export function useGameStore(selector) {
          state.npcConversations = { [key]: globalThis.__voiceMessages || [] }
          return selector ? selector(state) : state
        }
      `,
    }))

    api.onLoad({ filter: /^resolve-next$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: 'export function useGoNext() { return () => {} }',
    }))

    api.onLoad({ filter: /^scene-wrapper$/, namespace: 'mock' }, () => ({
      loader: 'tsx',
      resolveDir: projectRoot,
      contents: `
        import React from 'react'
        export default function SceneWrapper({ children }: { children: React.ReactNode }) {
          return <div data-testid="scene-wrapper">{children}</div>
        }
      `,
    }))

    api.onLoad({ filter: /^laptop-frame$/, namespace: 'mock' }, () => ({
      loader: 'tsx',
      resolveDir: projectRoot,
      contents: `
        import React from 'react'
        export default function LaptopFrame({ title, children }: { title?: string; children: React.ReactNode }) {
          return <section data-testid="mock-laptop-frame"><h2>{title}</h2>{children}</section>
        }
      `,
    }))

    api.onLoad({ filter: /^desktop-overlay$/, namespace: 'mock' }, () => ({
      loader: 'tsx',
      resolveDir: projectRoot,
      contents: `
        import React from 'react'
        export default function DesktopOverlay({ children }: { children: React.ReactNode }) {
          return <div data-testid="mock-desktop-overlay">{children}</div>
        }
      `,
    }))

    api.onLoad({ filter: /^gemini-service$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: 'export async function npcReply() { return "Mock Nina reply" }',
    }))

    api.onLoad({ filter: /^gemini-live-service$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: 'export class GeminiLiveSession { async start() {} stop() {} setMuted() {} }',
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

  const { underLimitHtml, typedMinimumHtml, atLimitHtml } = require(outFile)

  assert.match(underLimitHtml, /data-testid="voice-meeting-shell"/, 'meeting shell should render')
  assert.match(underLimitHtml, /data-testid="voice-meeting-reference-file"/, 'reference note file should render')
  assert.match(underLimitHtml, /data-testid="voice-meeting-turn-counter"/, 'turn counter should render')
  assert.match(underLimitHtml, /data-testid="voice-meeting-call-toolbar"/, 'meeting call toolbar should render')
  assert.match(underLimitHtml, /Question 4\/15/, 'turn counter should count student questions')
  assert.match(underLimitHtml, /data-testid="voice-meeting-typed-fallback"/, 'typed fallback should render')
  assert.match(underLimitHtml, /Type a question to Nina/, 'typed fallback should use student-friendly placeholder copy')
  assert.match(underLimitHtml, /Roamly Video/, 'meeting software should use a video-call app label')
  assert.match(underLimitHtml, /Transcript on/, 'meeting toolbar should show transcript state')
  assert.match(underLimitHtml, /Speak or type at least 5 questions/, 'disabled submit helper should explain the minimum')
  assert.doesNotMatch(underLimitHtml, />End meeting</, 'typed-only end control should wait for the minimum question count')
  assert.doesNotMatch(underLimitHtml, /15-question limit reached/, 'limit warning should not show before max')

  assert.match(typedMinimumHtml, /Question 5\/15/, 'turn counter should show typed minimum state')
  assert.match(typedMinimumHtml, />End meeting</, 'typed-only users should be able to end after the minimum question count')
  assert.doesNotMatch(typedMinimumHtml, />Join meeting</, 'typed-ready state should not ask students to join the voice meeting')

  assert.match(atLimitHtml, /Question 15\/15/, 'turn counter should show maxed-out state')
  assert.match(atLimitHtml, /15-question limit reached/, 'limit warning should show at max turns')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
