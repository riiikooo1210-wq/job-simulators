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
      title: 'Check the Current Roamly Flow',
      content: 'Inspect one current screen at a time.',
      prompt: 'Write one short note.',
      appName: 'Roamly',
      bindingKey: 'appAuditNotes',
      minCompleted: 5,
      next: 'next_scene',
      companion: {
        npcId: 'jordan',
        title: 'Ask Jordan',
        voiceName: 'Charon',
        fallbackPrompt: 'Type to Jordan if voice is unavailable.'
      },
      screens: [
        {
          id: 'create_trip',
          title: 'Create Trip',
          stepLabel: 'Step 1',
          subtitle: 'Set up trip.',
          chips: ['Montreal', '7 friends'],
          listItems: [
            { label: 'Dates', detail: 'Not chosen yet', status: 'pending' }
          ],
          primaryAction: 'Invite friends',
          secondaryAction: 'Add saved places',
          primaryInteraction: { kind: 'navigate', targetScreenId: 'invite_status' },
          secondaryInteraction: { kind: 'input_sheet', id: 'add_place', title: 'Add saved place', inputLabel: 'Place name', inputPlaceholder: 'Type a place', buttonLabel: 'Save place', successMessage: 'Place saved' }
        },
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
          id: 'trip_setup_clarity',
          label: 'Starting the trip',
          screenId: 'create_trip',
          prompt: 'What feels easy on this first screen? What is still unclear before friends join?',
          placeholder: 'Observation'
        },
        {
          id: 'invite_followthrough',
          label: 'After friends join',
          screenId: 'invite_status',
          prompt: 'What does this screen make clear for the trip organizer? What is still missing?',
          placeholder: 'Observation',
          hint: 'Check the reminder ask.'
        },
        {
          id: 'budget_pressure',
          label: 'Dates and budget',
          screenId: 'date_budget',
          prompt: 'What could make friends skip this step or feel unsure about it?',
          placeholder: 'Observation'
        },
        {
          id: 'decision_overload',
          label: 'Choosing a place',
          screenId: 'saved_places',
          prompt: 'After you view the vote details, why is it still hard to choose the first place for the plan?',
          placeholder: 'Observation'
        },
        {
          id: 'next_decision',
          label: 'AI plan jump',
          screenId: 'itinerary_empty',
          prompt: 'What does the AI plan make look decided? What is still not decided by the group?',
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
        chrome="plain"
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
  const appAuditSceneSource = await readFile(path.join(projectRoot, 'src/scenes/AppAuditScene.tsx'), 'utf8')
  const sceneConfig = JSON.parse(await readFile(path.join(projectRoot, 'src/data/scene-config.json'), 'utf8'))
  const appAuditNode = sceneConfig.storyline.nodes.scene_02_app_audit
  const screenById = Object.fromEntries(appAuditNode.screens.map((screen) => [screen.id, screen]))
  const observationById = Object.fromEntries(appAuditNode.observations.map((observation) => [observation.id, observation]))
  const budgetRequestCopy = 'This will send Ari and Sam this message: "Can you add your budget range? The group needs this before we can make a plan that works for everyone."'
  const budgetRequestSuccessCopy = 'Request sent to Ari and Sam. Their rows now show that a budget request was sent.'

  assert.match(html, /src="\/laptop\.png"/, 'app audit scene should render inside laptop.png')
  assert.match(html, /data-testid="app-audit-laptop"/, 'app audit scene should expose a laptop work area')
  assert.match(html, /data-testid="app-audit-work-window"/, 'focused notes should live in one laptop window')
  assert.match(html, /data-testid="app-audit-phone-window"/, 'phone preview should live beside the focused notes window')
  assert.match(html, /width:78%/, 'laptop audit work area should leave horizontal margin inside the computer screen')
  assert.match(html, /height:78%/, 'laptop audit work area should leave vertical margin inside the computer screen')
  assert.match(html, /grid-template-columns:minmax\(0, 0\.82fr\) minmax\(0, 1fr\)/, 'audit layout should use two flexible columns that can shrink inside the laptop')
  assert.match(html, /gap:1rem/, 'audit layout should keep a visible margin between phone and note window')
  assert.match(html, /padding:0\.6rem/, 'audit layout should keep inset margin inside the laptop screen')
  assert.match(html, /width:min\(100%, 300px\)/, 'phone frame should be capped so it fits next to the notes window')
  assert.match(html, /max-height:560px/, 'phone frame should be short enough to fit inside the laptop screen')
  assert.match(html, /data-testid="app-audit-iphone-shell"/, 'phone preview should render a realistic iPhone shell')
  assert.match(html, /data-testid="app-audit-iphone-notch"/, 'phone preview should include an iPhone-style notch')
  assert.match(html, /data-testid="app-audit-iphone-status-bar"/, 'phone preview should include a status bar')
  assert.match(html, /data-testid="app-audit-mobile-app-surface"/, 'phone preview should render the app inside the phone screen')
  assert.match(html, /data-testid="app-audit-mobile-nav-bar"/, 'phone preview should include app-like top navigation')
  assert.match(html, /data-testid="app-audit-mobile-bottom-tabs"/, 'phone preview should include app-like bottom tabs')
  assert.match(html, /data-testid="app-audit-iphone-home-indicator"/, 'phone preview should include an iPhone home indicator')
  assert.match(html, /9:41/, 'phone status bar should show a familiar iPhone time')
  assert.match(html, /Screen 1 of 5/, 'work window should show simple step-by-step progress')
  assert.match(html, /Notes 0\/5/, 'work window should show five required notes')
  assert.doesNotMatch(html, /Pick one screen/, 'work window should not invite students to jump around')
  assert.match(html, /data-testid="app-audit-focused-note"/, 'only the active audit prompt should render as the focused note card')
  assert.equal((html.match(/data-testid="app-audit-focused-note"/g) || []).length, 1, 'only one focused note card should render initially')
  assert.equal((html.match(/<textarea/g) || []).length, 1, 'only one audit textarea should render initially')
  assert.match(html, /Create Trip/, 'initial active phone preview should start on Create Trip')
  assert.match(html, /Invite friends/, 'initial active phone preview should show the real first-screen app action')
  assert.match(html, /data-testid="app-audit-phone-primary-action"/, 'phone primary actions should be real clickable controls')
  assert.match(html, /data-testid="app-audit-phone-secondary-action"/, 'phone secondary actions should be real clickable controls')
  assert.match(html, /data-testid="app-audit-phone-chip"/, 'phone chips should be tappable controls')
  assert.match(html, /data-testid="app-audit-phone-list-item"/, 'phone list rows should be tappable controls')
  assert.doesNotMatch(html, /Copy invite link/, 'inactive later-screen actions should not render before the student reaches that screen')
  assert.match(html, /Look at this Roamly screen like a real user/, 'plain instructions should sit above the laptop')
  assert.match(html, /View numbers/, 'analytics should be collapsed behind a simple numbers label')
  assert.match(html, /Trip planning funnel/, 'analytics disclosure should reuse the first-scene funnel title')
  assert.match(html, /First-day itinerary completed/, 'analytics disclosure should include funnel rows from the first scene')
  assert.match(html, /data-testid="app-audit-help-button"/, 'Jordan should be reachable through a Need help button')
  assert.match(html, /Need help\?/, 'help entry should use the student-facing Need help label')
  assert.doesNotMatch(html, /data-testid="app-audit-companion-window"/, 'Jordan should not render as an always-visible third column')
  assert.doesNotMatch(html, /data-testid="app-audit-companion"/, 'Jordan companion body should stay hidden until the modal opens')
  assert.doesNotMatch(html, /Set up trip\./, 'phone preview should not render screen subtitles')
  assert.doesNotMatch(html, /Review invites\./, 'phone preview should not render inactive screen subtitles')
  assert.doesNotMatch(html, /Waiting for invited friends to join\./, 'phone preview should not render footer coaching notes')
  assert.doesNotMatch(html, />Try</, 'phone action buttons should not render training badges')
  assert.match(companionHtml, /data-testid="app-audit-companion-body"[^>]+padding:0\.75rem/, 'plain Jordan companion contents should have an inset margin')
  assert.doesNotMatch(companionHtml, /title="Ask Jordan"/, 'plain Jordan companion should not render the laptop window chrome')
  assert.doesNotMatch(briefingSceneSource, /if anything is unclear\.\.\./, 'briefing prompt placeholder should end with a period, not ellipsis')
  assert.match(briefingSceneSource, /if anything is unclear\.'/, 'briefing prompt placeholder should use the approved period ending')
  assert.match(appAuditSceneSource, /data-testid="app-audit-phone-modal-backdrop"/, 'phone feedback should render as an in-phone modal overlay')
  assert.match(appAuditSceneSource, /aria-modal="true"/, 'phone feedback modal should identify itself as modal UI')
  assert.doesNotMatch(html, /Show hint/, 'static hint buttons should be removed from audit notes')
  assert.equal(gradableVoice, true, 'voice user interview should remain gradable')
  assert.equal(gradableCompanion, false, 'Jordan companion conversation should be excluded from grading')

  assert.equal(appAuditNode.title, 'Check the Current Roamly Flow', 'app audit scene title should use simpler language')
  assert.match(appAuditNode.content, /\{\{funnel\}\}/, 'app audit intro should route funnel jargon through the glossary marker')
  assert.equal(appAuditNode.prompt, 'For each screen, write one short note about what the user can understand and what still feels unclear. Do not design the fix yet.', 'app audit prompt should use student-friendly language')
  assert.equal(appAuditNode.minCompleted, 5, 'all five Roamly screens should require notes')
  assert.equal(appAuditNode.observations.length, 5, 'each Roamly screen should have one audit prompt')

  for (const screen of appAuditNode.screens) {
    if (screen.primaryAction) assert.ok(screen.primaryInteraction, `${screen.id} primary action should declare phone interaction`)
    if (screen.secondaryAction) assert.ok(screen.secondaryInteraction, `${screen.id} secondary action should declare phone interaction`)
    for (const chip of screen.chips || []) {
      assert.ok(typeof chip === 'object' && chip.interaction, `${screen.id} chip ${JSON.stringify(chip)} should declare phone interaction`)
    }
    for (const item of screen.listItems || []) {
      assert.ok(item.interaction, `${screen.id} list item ${item.label} should declare phone interaction`)
    }
    for (const action of screen.actions || []) {
      assert.ok(action.interaction, `${screen.id} action ${action.label} should declare phone interaction`)
    }
  }
  assert.ok(screenById.itinerary_empty.phoneTextInput, 'itinerary manual plan should be a real editable phone input')

  assert.equal(observationById.trip_setup_clarity.screenId, 'create_trip', 'create trip should have its own required note')
  assert.equal(observationById.trip_setup_clarity.prompt, 'What feels easy on this first screen? What is still unclear before friends join?', 'create trip prompt should stay plain')
  assert.match(JSON.stringify(screenById.create_trip), /Dates.+Not chosen yet/, 'create trip should show app-facing setup state')
  assert.doesNotMatch(JSON.stringify(screenById.create_trip), /Organizer task|shared decision matters first/, 'create trip config should not carry critique copy in the phone content')

  assert.equal(screenById.invite_status.primaryAction, 'Copy invite link', 'invite status should not offer a reminder CTA')
  assert.equal(screenById.invite_status.secondaryAction ?? '', '', 'invite status should not add a secondary follow-up CTA')
  assert.equal(screenById.invite_status.actions ?? undefined, undefined, 'invite status should not include reminder actions')
  assert.equal(screenById.invite_status.footerNote, 'Waiting for invited friends to join.', 'invite status should keep the app copy in a waiting state')
  assert.equal(observationById.invite_followthrough.label, 'After friends join', 'invite audit label should use plain student language')
  assert.equal(observationById.invite_followthrough.prompt, 'What does this screen make clear for the trip organizer? What is still missing?', 'invite audit prompt should be simpler and less leading')
  assert.equal(observationById.invite_followthrough.metricLink, 'Related number: At least 1 friend joins', 'invite audit should avoid metric jargon')

  assert.doesNotMatch(JSON.stringify(screenById.date_budget), /Visible to organizer now|group summary later|Budget visibility|Organizer prompt/, 'date/budget screen should remove critique labels and unclear visibility copy')
  assert.equal(screenById.date_budget.primaryInteraction.body, budgetRequestCopy, 'request modal should clearly show who receives the budget message')
  assert.equal(screenById.date_budget.primaryInteraction.buttonLabel, 'Send request', 'budget request modal should require a send confirmation')
  assert.equal(screenById.date_budget.primaryInteraction.successMessage, 'Budget request sent', 'budget request send action should keep the success title')
  assert.equal(screenById.date_budget.primaryInteraction.successBody, budgetRequestSuccessCopy, 'budget request success should explain the changed friend rows')
  assert.equal(screenById.date_budget.actions ?? undefined, undefined, 'date/budget should not include a redundant preview budget request action')
  assert.equal(screenById.date_budget.listItems.find((item) => item.label === 'Sam')?.status, 'warning', 'Sam has no date or budget, so the row should need attention before a request is sent')
  assert.equal(screenById.date_budget.listItems.find((item) => item.label === 'Jo')?.status, 'complete', 'Jo has a date and budget, so the row should not appear pending')
  assert.equal(observationById.budget_pressure.label, 'Dates and budget', 'date/budget audit label should be direct')
  assert.equal(observationById.budget_pressure.prompt, 'What could make friends skip this step or feel unsure about it?', 'date/budget prompt should use simpler language')
  assert.equal(observationById.budget_pressure.metricLink, 'Related number: 3+ people add dates or budget', 'date/budget audit should avoid metric jargon')

  assert.match(JSON.stringify(screenById.saved_places), /select multiple places/, 'saved places vote details should clarify that voting allows multiple selections')
  assert.match(JSON.stringify(screenById.saved_places), /Old Port walk.+3 votes/, 'saved places screen should include the first tied top option')
  assert.match(JSON.stringify(screenById.saved_places), /Bagel crawl.+3 votes/, 'saved places screen should include the second tied top option')
  assert.match(JSON.stringify(screenById.saved_places), /Rooftop dinner.+3 votes/, 'saved places screen should include the third tied top option')
  assert.match(JSON.stringify(screenById.saved_places), /Museum pass.+1 vote/, 'saved places screen should keep lower-vote options reflected in vote details')
  assert.match(JSON.stringify(screenById.saved_places), /Jazz bar.+1 vote/, 'saved places screen should keep lower-vote options reflected in vote details')
  assert.equal(screenById.saved_places.actions[0].label, 'View vote details', 'saved places action should reveal vote details')
  assert.equal(observationById.decision_overload.label, 'Choosing a place', 'voting audit label should be plain')
  assert.equal(observationById.decision_overload.prompt, 'After you view the vote details, why is it still hard to choose the first place for the plan?', 'voting prompt should focus on choosing the first plan item')
  assert.equal(observationById.decision_overload.metricLink, 'Related number: Finish the first-day plan', 'voting audit should avoid metric jargon')

  assert.equal(screenById.itinerary_empty.title, 'AI Itinerary', 'itinerary screen should show the AI planning surface')
  assert.equal(screenById.itinerary_empty.textBoxPlaceholder, 'Manual option: write the full day plan here...', 'itinerary screen should still expose a manual full-plan path')
  assert.equal(screenById.itinerary_empty.actions[0].label, 'Generate AI itinerary', 'itinerary screen should expose a tappable AI generation action')
  assert.match(screenById.itinerary_empty.actions[0].resultBody, /Saturday: 9:00 Old Port walk/, 'AI result should show the app-generated itinerary')
  assert.doesNotMatch(screenById.itinerary_empty.actions[0].resultBody, /without marking what is confirmed or still needs a group decision/, 'AI result should not put the critique clue inside the phone')
  assert.equal(observationById.next_decision.label, 'AI plan jump', 'itinerary audit should use shorter wording')
  assert.equal(observationById.next_decision.prompt, 'What does the AI plan make look decided? What is still not decided by the group?', 'itinerary prompt should focus on the AI draft making unresolved choices look decided')
  assert.equal(observationById.next_decision.metricLink, 'Related number: Finish the first-day plan', 'itinerary audit should avoid metric jargon')

  for (const step of ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5']) {
    assert.match(html, new RegExp(step), `work window should include ${step}`)
  }

  assert.match(html, /data-scrollable="true"/, 'step and audit-note window should be marked scrollable')
  assert.doesNotMatch(html, /6px 6px 0 #000/, 'phone frame should not have a bottom-right offset shadow')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
