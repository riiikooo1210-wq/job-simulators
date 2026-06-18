import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const projectRoot = process.cwd()
const tempDir = await mkdtemp(path.join(tmpdir(), 'app-audit-layout-'))
const outFile = path.join(tempDir, 'bundle.cjs')
const companionOutFile = path.join(tempDir, 'companion-bundle.cjs')
const require = createRequire(import.meta.url)

const entryFile = path.join(tempDir, 'entry.tsx')
const companionEntryFile = path.join(tempDir, 'companion-entry.tsx')
await writeFile(
  entryFile,
  `
    import React from 'react'
    import { renderToStaticMarkup } from 'react-dom/server'
    import AppAuditScene from ${JSON.stringify(path.join(projectRoot, 'src/scenes/AppAuditScene.tsx'))}
    import { isGradableConversationId } from ${JSON.stringify(path.join(projectRoot, 'src/services/gemini.ts'))}

    const node = {
      id: 'scene_02_app_audit',
      type: 'app_audit',
      section: 1,
      title: 'Audit the Current Roamly Flow',
      content: 'Inspect the current flow.',
      prompt: 'Write one short observation for each point.',
      appName: 'Roamly',
      bindingKey: 'appAuditNotes',
      minCompleted: 1,
      next: 'next_scene',
      companion: {
        npcId: 'jordan',
        title: 'Ask Jordan',
        voiceName: 'Charon',
        fallbackPrompt: 'Type to Jordan if voice is unavailable.'
      },
      screens: [
        { id: 'create_trip', title: 'Create Trip', stepLabel: 'Step 1', subtitle: 'Set up trip.', primaryAction: 'Invite friends' },
        {
          id: 'invite_status',
          title: 'Invite Friends',
          stepLabel: 'Step 2',
          subtitle: 'Review invites.',
          primaryAction: 'Copy invite link',
          footerNote: 'Waiting for invited friends to join.'
        },
        { id: 'date_budget', title: 'Dates and Budget', stepLabel: 'Step 3', subtitle: 'Review preferences.', primaryAction: 'Ask group' },
        {
          id: 'saved_places',
          title: 'Saved Places',
          stepLabel: 'Step 4',
          subtitle: 'Review votes.',
          actions: [
            {
              id: 'view_vote_details',
              label: 'View vote details',
              resultTitle: 'Vote details',
              resultBody: 'Multiple friends selected several places they would be happy to include.'
            }
          ]
        },
        {
          id: 'itinerary_empty',
          title: 'AI Itinerary',
          stepLabel: 'Step 5',
          subtitle: 'Manual planning or one-tap AI planning.',
          textBoxPlaceholder: 'Manual option: write the full day plan here...',
          actions: [
            {
              id: 'generate_ai_itinerary',
              label: 'Generate AI itinerary',
              resultTitle: 'AI itinerary draft',
              resultBody: 'Saturday: 9:00 Old Port walk -> 11:00 Bagel crawl -> 2:00 Museum pass -> 6:30 Rooftop dinner -> 9:00 Jazz bar. Roamly AI made a share-ready plan from saved places, votes, dates, and budget responses without marking what is confirmed or still needs a group decision.'
            }
          ]
        }
      ],
      observations: [
        {
          id: 'invite_followthrough',
          label: 'Invite follow-through',
          screenId: 'invite_status',
          prompt: 'What does this screen help the organizer understand, and what does it leave unresolved?',
          placeholder: 'Observation',
          hint: 'Check the reminder ask.'
        },
        {
          id: 'next_decision',
          label: 'AI full-plan jump',
          screenId: 'itinerary_empty',
          prompt: 'What does the AI itinerary make look decided, and what does it fail to separate from unresolved group choices?',
          placeholder: 'Observation',
          hint: 'Generate the AI itinerary and compare it with the group inputs.'
        }
      ]
    }

    export const html = renderToStaticMarkup(<AppAuditScene node={node as any} />)
    export const gradableVoice = isGradableConversationId('voice:scene_04_user_call:nina')
    export const gradableCompanion = isGradableConversationId('companion:scene_02_app_audit:jordan')
  `,
)

await writeFile(
  companionEntryFile,
  `
    import React from 'react'
    import { renderToStaticMarkup } from 'react-dom/server'
    import AppAuditCompanionPanel from ${JSON.stringify(path.join(projectRoot, 'src/components/ui/AppAuditCompanionPanel.tsx'))}

    const node = {
      id: 'scene_02_app_audit',
      type: 'app_audit',
      section: 1,
      title: 'Audit the Current Roamly Flow',
      content: '',
      prompt: '',
      appName: 'Roamly',
      bindingKey: 'appAuditNotes',
      minCompleted: 1,
      next: 'next_scene',
      screens: [],
      observations: []
    }

    const companion = {
      npcId: 'jordan',
      title: 'Ask Jordan',
      voiceName: 'Charon',
      fallbackPrompt: 'Type to Jordan if voice is unavailable.'
    }

    const screen = {
      id: 'invite_status',
      title: 'Invite Friends',
      stepLabel: 'Step 2',
      subtitle: 'Review invites.',
      primaryAction: 'Copy invite link'
    }

    export const companionHtml = renderToStaticMarkup(
      <AppAuditCompanionPanel
        node={node as any}
        companion={companion as any}
        screen={screen as any}
        note=""
      />
    )
  `,
)

const mockPlugin = {
  name: 'app-audit-layout-mocks',
  setup(api) {
    api.onResolve({ filter: /\.\.\/store\/gameStore$/ }, () => ({ path: 'game-store', namespace: 'mock' }))
    api.onResolve({ filter: /\.\.\/engine\/resolveNext$/ }, () => ({ path: 'resolve-next', namespace: 'mock' }))
    api.onResolve({ filter: /\.\.\/data\/storyline$/ }, () => ({ path: 'storyline', namespace: 'mock' }))
    api.onResolve({ filter: /\.\.\/data\/npcs$/ }, () => ({ path: 'npcs', namespace: 'mock' }))
    api.onResolve({ filter: /\.\.\/\.\.\/services\/gemini$/ }, () => ({ path: 'gemini-service', namespace: 'mock' }))
    api.onResolve({ filter: /\.\.\/\.\.\/services\/geminiLive$/ }, () => ({ path: 'gemini-live-service', namespace: 'mock' }))
    api.onResolve({ filter: /job-simulation\.md\?raw$/ }, () => ({ path: 'simulation-doc', namespace: 'mock' }))
    api.onResolve({ filter: /\.\.\/components\/layout\/SceneWrapper$/ }, () => ({ path: 'scene-wrapper', namespace: 'mock' }))
    api.onResolve({ filter: /\.\.\/components\/ui\/AppAuditCompanionPanel$/ }, () => ({ path: 'app-audit-companion', namespace: 'mock' }))
    api.onResolve({ filter: /^framer-motion$/ }, () => ({ path: 'framer-motion', namespace: 'mock' }))

    api.onLoad({ filter: /^game-store$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: `
        const state = {
          playerName: 'Riko',
          branchFlags: {},
          mcSelections: {},
          freeTextResponses: {},
          npcConversations: {},
          setFreeTextResponse: () => {},
          setSceneCompleted: () => {},
          appendNpcMessage: () => {}
        }
        export function useGameStore(selector) {
          return selector ? selector(state) : state
        }
        useGameStore.getState = () => state
      `,
    }))

    api.onLoad({ filter: /^resolve-next$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: 'export function useGoNext() { return () => {} }',
    }))

    api.onLoad({ filter: /^storyline$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: `
        export const storyline = {
          nodes: {
            briefing_kickoff: {
              id: 'briefing_kickoff',
              type: 'briefing',
              section: 1,
              title: 'Monday Product Source Workspace',
              sourceWorkspace: {
                apps: [
                  {
                    id: 'analytics',
                    label: 'Analytics',
                    kind: 'analytics',
                    title: 'Trip planning funnel',
                    columns: ['metric', 'target', 'actual', 'status'],
                    rows: [
                      { metric: 'Create group trip', target: 'baseline', actual: '100%', status: 'on_track' },
                      { metric: 'Invite at least 2 friends', target: 'new trip activation', actual: '64%', status: 'warning' },
                      { metric: 'First-day itinerary completed', target: '7-day activation goal', actual: '11%', status: 'warning' }
                    ]
                  }
                ]
              }
            }
          }
        }
      `,
    }))

    api.onLoad({ filter: /^npcs$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: `
        export const npcs = {
          jordan: {
            id: 'jordan',
            name: 'Jordan Lee',
            role: 'Peer Product Manager',
            persona: 'A thoughtful PM teammate.',
            voice: 'Warm, concise, practical.'
          }
        }
      `,
    }))

    api.onLoad({ filter: /^gemini-service$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: 'export async function npcReply() { return "Mock Jordan reply" }',
    }))

    api.onLoad({ filter: /^gemini-live-service$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: `
        export class GeminiLiveSession {
          constructor() {}
          setMuted() {}
          async start() {}
          stop() {}
        }
      `,
    }))

    api.onLoad({ filter: /^simulation-doc$/, namespace: 'mock' }, () => ({
      loader: 'js',
      contents: 'export default ""',
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

    api.onLoad({ filter: /^app-audit-companion$/, namespace: 'mock' }, () => ({
      loader: 'tsx',
      resolveDir: projectRoot,
      contents: `
        import React from 'react'
        export default function AppAuditCompanionPanel() {
          return <aside data-testid="app-audit-companion">Ask Jordan</aside>
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
  })

  const { html, gradableVoice, gradableCompanion } = require(outFile)

  await build({
    entryPoints: [companionEntryFile],
    outfile: companionOutFile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    absWorkingDir: projectRoot,
    nodePaths: [path.join(projectRoot, 'node_modules')],
    jsx: 'automatic',
    plugins: [mockPlugin],
    logLevel: 'silent',
  })

  const { companionHtml } = require(companionOutFile)
  const briefingSceneSource = await readFile(path.join(projectRoot, 'src/scenes/BriefingScene.tsx'), 'utf8')
  const sceneConfig = JSON.parse(await readFile(path.join(projectRoot, 'src/data/scene-config.json'), 'utf8'))
  const appAuditNode = sceneConfig.storyline.nodes.scene_02_app_audit
  const screenById = Object.fromEntries(appAuditNode.screens.map((screen) => [screen.id, screen]))
  const observationById = Object.fromEntries(appAuditNode.observations.map((observation) => [observation.id, observation]))

  assert.match(html, /src="\/laptop\.png"/, 'app audit scene should render inside laptop.png')
  assert.match(html, /data-testid="app-audit-laptop"/, 'app audit scene should expose a laptop work area')
  assert.match(html, /data-testid="app-audit-work-window"/, 'steps and audit notes should live in one laptop window')
  assert.match(html, /data-testid="app-audit-phone-window"/, 'phone preview should live in its own sibling laptop window')
  assert.match(html, /height:84%/, 'laptop audit work area should be taller than the default app-audit layout')
  assert.match(html, /gap:0\.35rem/, 'audit work window should sit closer to the phone preview')
  assert.match(html, /grid-template-columns:minmax\(0, 0\.82fr\) minmax\(210px, 0\.8fr\) minmax\(170px, 0\.64fr\)/, 'phone column should be 30px wider while preserving a companion lane')
  assert.match(html, /data-testid="app-audit-work-window"[^>]+translateX\(3\.25rem\)/, 'audit work window should move 0.5rem more right')
  assert.match(html, /data-testid="app-audit-phone-window"[^>]+translateX\(0\.125rem\)/, 'phone preview should move slightly back left')
  assert.match(html, /width:min\(100%, 300px\)/, 'phone frame should be 30px wider')
  assert.match(html, /max-height:590px/, 'phone frame height should scale with the wider phone')
  assert.match(html, /Current flow steps/, 'work window should label the step list')
  assert.match(html, /View Analytics/, 'audit work window should expose the kickoff funnel table')
  assert.match(html, /Trip planning funnel/, 'analytics disclosure should reuse the first-scene funnel title')
  assert.match(html, /First-day itinerary completed/, 'analytics disclosure should include funnel rows from the first scene')
  assert.match(html, /Audit notes/, 'work window should label the notes section')
  assert.match(html, /data-testid="app-audit-companion"/, 'audit scene should render the Jordan companion panel')
  assert.match(html, /data-testid="app-audit-companion-window"[^>]+translateX\(-3\.25rem\)/, 'Jordan companion should move 0.5rem more left')
  assert.match(companionHtml, /data-testid="app-audit-companion-body"[^>]+padding:0\.75rem/, 'Jordan companion contents should have an inset margin from the window edge')
  assert.doesNotMatch(briefingSceneSource, /if anything is unclear\.\.\./, 'briefing prompt placeholder should end with a period, not ellipsis')
  assert.match(briefingSceneSource, /if anything is unclear\.'/, 'briefing prompt placeholder should use the approved period ending')
  assert.match(html, /Ask Jordan/, 'companion panel should identify Jordan as the peer helper')
  assert.match(html, /Try/, 'clickable audit actions should be explicitly marked as tappable')
  assert.match(html, /View vote details/, 'saved places screen should expose vote details instead of adding places')
  assert.match(html, /Generate AI itinerary/, 'itinerary screen should expose the AI full-plan action')
  assert.doesNotMatch(html, /Show hint/, 'static hint buttons should be removed from audit notes')
  assert.equal(gradableVoice, true, 'voice user interview should remain gradable')
  assert.equal(gradableCompanion, false, 'Jordan companion conversation should be excluded from grading')

  assert.equal(screenById.invite_status.primaryAction, 'Copy invite link', 'invite status should not offer a reminder CTA')
  assert.equal(screenById.invite_status.secondaryAction ?? '', '', 'invite status should not add a secondary follow-up CTA')
  assert.equal(screenById.invite_status.actions ?? undefined, undefined, 'invite status should not include reminder actions')
  assert.equal(screenById.invite_status.footerNote, 'Waiting for invited friends to join.', 'invite status should keep the app copy in a waiting state')
  assert.equal(observationById.invite_followthrough.prompt, 'What does this screen help the organizer understand, and what does it leave unresolved?', 'invite audit prompt should be less leading')
  assert.equal(observationById.invite_followthrough.metricLink, 'Related metric: At least 1 friend joins', 'invite audit should use the existing join metric')

  assert.doesNotMatch(JSON.stringify(screenById.date_budget), /Visible to organizer now|group summary later|Budget visibility|Organizer prompt/, 'date/budget screen should remove critique labels and unclear visibility copy')
  assert.match(JSON.stringify(screenById.date_budget), /Add your budget range when you can so the group can check them and plan\./, 'date/budget action should use the approved budget request copy')
  assert.equal(observationById.budget_pressure.prompt, 'What might make this step easy for friends to avoid or misunderstand?', 'date/budget prompt should ask about avoidable or misunderstood steps')

  assert.match(JSON.stringify(screenById.saved_places), /select multiple places/, 'saved places vote details should clarify that voting allows multiple selections')
  assert.match(JSON.stringify(screenById.saved_places), /Old Port walk.+3 votes/, 'saved places screen should include the first tied top option')
  assert.match(JSON.stringify(screenById.saved_places), /Bagel crawl.+3 votes/, 'saved places screen should include the second tied top option')
  assert.match(JSON.stringify(screenById.saved_places), /Rooftop dinner.+3 votes/, 'saved places screen should include the third tied top option')
  assert.match(JSON.stringify(screenById.saved_places), /Museum pass.+1 vote/, 'saved places screen should keep lower-vote options reflected in vote details')
  assert.match(JSON.stringify(screenById.saved_places), /Jazz bar.+1 vote/, 'saved places screen should keep lower-vote options reflected in vote details')
  assert.equal(screenById.saved_places.actions[0].label, 'View vote details', 'saved places action should reveal vote details')
  assert.equal(observationById.decision_overload.prompt, 'After viewing the vote details, why is it still hard for the organizer to choose what should go into the plan first?', 'voting prompt should focus on choosing the first plan item')
  assert.equal(observationById.decision_overload.metricLink, 'Related metric: First-day itinerary completed', 'voting audit should use the existing itinerary metric')

  assert.equal(screenById.itinerary_empty.title, 'AI Itinerary', 'itinerary screen should show the AI planning surface')
  assert.equal(screenById.itinerary_empty.textBoxPlaceholder, 'Manual option: write the full day plan here...', 'itinerary screen should still expose a manual full-plan path')
  assert.equal(screenById.itinerary_empty.actions[0].label, 'Generate AI itinerary', 'itinerary screen should expose a tappable AI generation action')
  assert.match(screenById.itinerary_empty.actions[0].resultBody, /share-ready plan from saved places, votes, dates, and budget responses/, 'AI result should be generated from current trip information')
  assert.match(screenById.itinerary_empty.actions[0].resultBody, /without marking what is confirmed or still needs a group decision/, 'AI result should reveal the missing confirmed-vs-unresolved distinction')
  assert.equal(observationById.next_decision.label, 'AI full-plan jump', 'itinerary audit should focus on AI full-plan overreach')
  assert.equal(observationById.next_decision.prompt, 'What does the AI itinerary make look decided, and what does it fail to separate from unresolved group choices?', 'itinerary prompt should focus on the AI draft making unresolved choices look decided')
  assert.equal(observationById.next_decision.metricLink, 'Related metric: First-day itinerary completed', 'itinerary audit should use the existing itinerary metric')

  for (const step of ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5']) {
    assert.match(html, new RegExp(step), `work window should include ${step}`)
  }

  assert.match(html, /data-scrollable="true"/, 'step and audit-note window should be marked scrollable')
  assert.doesNotMatch(html, /6px 6px 0 #000/, 'phone frame should not have a bottom-right offset shadow')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
