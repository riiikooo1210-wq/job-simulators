# Simulator Upgrade Report: Customer Support Representative - Mercury Market Calls

## Current Quality Score

- Overall: **93/100 implementation quality; support-software realism blocker addressed by the Mercury Assist console, with final release verification still blocked by the earlier Gemini HTTP 429 grading limit.**
- P0/P1 blockers:
  - External verification block: live grading could not complete in the prior post-change browser QA because all Gemini grading model attempts returned HTTP 429. This UI-realism pass used deterministic local browser QA and did not retry the rate-limited grader.
- Main remaining weaknesses:
  - Mobile renders correctly but is dense; it should get human review for scrolling comfort before release.
  - Browser proof depends on local dev controls and direct persisted-state scene loading because this standalone simulator has no URL scene router.
  - The app currently persists under `job-simulator-storage`; this existing behavior was preserved for compatibility.

## Defects Found

| Defect | Evidence | Checklist items | Pattern tags |
| --- | --- | --- | --- |
| Prompt builder mixed UI glossary rendering into Live system-prompt text for initial messages. | `buildSystemPrompt` used `renderContentWithGlossary(m.content)`, which can stringify React nodes if glossary terms appear in initial messages. | 44, 45, 49 | `prompt-text-serialization`, `ai-boundary-safety` |
| Core support software previously did not feel realistic enough for release. | Human review on 2026-06-30 found that the support console/CRM/call workspace felt insufficiently realistic even though the route was functional. | 28, 29, 30, 31 | `realistic_tool_surface`, `responsive_fit`, `clickable_affordance` |
| No repeatable static QA command for route/rubric/prompt drift. | Package only had `dev`, `build`, and `preview`. | 48, 50, G docs/QA | `deterministic-route-check`, `rubric-drift-check` |
| Nearby docs were stale against the live rubric and route. | `VALIDATION.md` said 6 criteria; live `src/data/rubric.json` has 3 criteria. `SCENE_BLUEPRINT.md` referenced old rubric labels. | 20, 48, G docs/QA | `docs-match-live-route`, `rubric-alignment` |
| Live grading verification is externally blocked until quota is available. | Prior browser walkthrough reached grading, then Gemini grading requests returned HTTP 429 and the UI showed `Assessment Unavailable`. | 46, 50, G docs/QA | `external-ai-verification-block`, `grading-error-state` |

## Patterns Applied

| Pattern | Why it applies | Implementation |
| --- | --- | --- |
| Keep task-critical evidence beside the call. | Each live call needs policy limits and CRM rules visible during the conversation. | `SupportConsoleCall` keeps live call, CRM/case record, order timeline, and KB article panels in one Mercury Assist workspace. |
| Make software surfaces role-specific. | Customer support work should look like queue, CRM, case, order, timeline, and KB software, not generic simulator panels. | `supportConsole.ts` adds per-case queue metadata, customer/order/case fields, safe actions, internal notes, timeline events, and article metadata. |
| Lock answer-key facts until the learner earns them. | Customer/order/risk details should not appear before identity confirmation and CRM lookup. | CRM, case, order, timeline, and internal notes stay masked until the transcript contains a CRM lookup result. |
| Deterministic drift checks before AI judgment. | Route/rubric/prompt regressions should fail fast before browser or grader runs. | `npm run qa:static` now checks route shape, support-console metadata, rubric mapping, prompt safety, and CRM unlock wiring. |
| Docs follow live code, not older generated artifacts. | Future agents need to understand the exact UI change and remaining blocker. | `CHECK_REPORT.md`, `VALIDATION.md`, `SCENE_BLUEPRINT.md`, and `CHANGE_HISTORY.md` were refreshed with current evidence. |

## Changes Made

| Change | Files/scenes | Intended purpose | Acceptance test |
| --- | --- | --- | --- |
| Added plain-text prompt serialization helper for Live initial messages. | `src/scenes/VoiceMeetingScene.tsx` | Keep glossary React nodes in the UI only; send plain strings to the Live model. | `npm run qa:static`; TypeScript build |
| Added static QA script and package command. | `scripts/qa-static.mjs`, `package.json` | Check route shape, typed-call contracts, rubric evidence, embedded rubric parity, prompt safety, and support-console wiring. | `npm run qa:static` |
| Added Mercury Assist support-console data model. | `src/data/supportConsole.ts`, `src/types/game.ts`, `src/data/scene-config.json` | Give all three prep/call loops realistic queue, CRM, case, order, timeline, KB, and safe-action data. | `npm run qa:static`; browser walkthrough |
| Added Mercury Assist prep and call UI. | `src/components/ui/SupportConsole.tsx`, `src/index.css` | Replace generic prep/call panels with role-specific customer-support software while preserving existing scenario structure. | Browser screenshots for 3 prep scenes, 3 locked call states, 3 unlocked call states, and mobile renders |
| Wired the console into prep and live-call scenes. | `src/scenes/BriefingScene.tsx`, `src/scenes/VoiceMeetingScene.tsx` | Use realistic software surfaces for all six customer-support work scenes without changing route or rubric scope. | TypeScript build; browser walkthrough |
| Refreshed validation, blueprint, report, and change history. | `VALIDATION.md`, `SCENE_BLUEPRINT.md`, `CHECK_REPORT.md`, `CHANGE_HISTORY.md` | Record exactly what changed and what future simulator-upgrader work should learn from it. | Manual doc review |

## Browser Walkthrough Evidence

Artifact folder: `/private/tmp/simulation-tool-ui-audits/customer-support-1782752629715`

| Path/scene visited | Viewport | Actions performed | Screenshot/artifact path | Pass/fail | Issue notes | Student experience feel |
| --- | --- | --- | --- | --- | --- | --- |
| `intro` | Desktop | Fresh load with persisted state cleared. | `01-intro-desktop.png` | Pass | Intro route loaded cleanly. | Scenario opens clearly. |
| `prep_order_status` | Desktop | Opened the shared inbound-call flow in the Mercury Assist KB prep console. | `02-prep_order_status-desktop.png` | Pass | Queue metadata, locked case preview, required articles, and policy preview rendered. | Prep feels like checking a support KB before taking the call. |
| `prep_late_delivery` | Desktop | Opened the late-delivery manual in the Mercury Assist KB prep console. | `03-prep_late_delivery-desktop.png` | Pass | Required article cards and locked CRM/case preview rendered. | Policy evidence is close to the task. |
| `prep_risk_refund` | Desktop | Opened the high-value refund manual in the Mercury Assist KB prep console. | `04-prep_risk_refund-desktop.png` | Pass | Sensitive-case metadata and required policy article rendered. | Refund-risk policy is visible before the call. |
| `call_order_status` | Desktop | Verified locked CRM state, then seeded a CRM lookup result and confirmed CRM/case/timeline unlocked. | `05-call_order_status-locked-desktop.png`; `06-call_order_status-unlocked-desktop.png` | Pass | Customer/order facts stayed masked before lookup and appeared after lookup. | The call sits inside a believable support console. |
| `call_late_delivery` | Desktop | Verified locked CRM state, then seeded a CRM lookup result and confirmed CRM/case/timeline unlocked. | `06-call_late_delivery-locked-desktop.png`; `07-call_late_delivery-unlocked-desktop.png` | Pass | Carrier timeline and allowed options appeared only after lookup. | Empathy/policy boundary task has visible support tools. |
| `call_risk_refund` | Desktop | Verified locked CRM state, then seeded a CRM lookup result and confirmed CRM/case/timeline/internal risk notes unlocked. | `07-call_risk_refund-locked-desktop.png`; `08-call_risk_refund-unlocked-desktop.png` | Pass | Delivery proof, internal notes, and Trust/Risk-safe actions appeared after lookup. | Trust/Risk boundary feels more like real case handling. |
| `prep_order_status` | Mobile 390px | Loaded responsive prep console. | `08-prep_order_status-mobile.png` | Pass with review note | No script error; dense console stacks vertically. | Usable but should be human-reviewed for scrolling comfort. |
| `call_order_status` | Mobile 390px | Loaded responsive live support console. | `09-call_order_status-mobile.png` | Pass with review note | Initial render shows top call/console panels; lower panels require scrolling. | Works as a stacked mobile console. |
| `call_late_delivery` | Mobile 390px | Loaded responsive live support console. | `10-call_late_delivery-mobile.png` | Pass with review note | Dense call scene requires scrolling. | Works as a stacked mobile console. |
| `call_risk_refund` | Mobile 390px | Loaded responsive live support console. | `11-call_risk_refund-mobile.png` | Pass with review note | Dense call scene requires scrolling. | Works as a stacked mobile console. |

## Verification

- Commands/checks run:
  - `node -e "JSON.parse(...)"` for `scene-config.json`
  - `npm run qa:static`
  - `./node_modules/.bin/tsc -b --pretty false`
  - `npm run build`
  - Chrome DevTools Protocol walkthrough against `http://127.0.0.1:5194/`
- Browser walkthrough status:
  - Passed for intro, all three Mercury Assist prep scenes, all three locked call states, all three unlocked call states, and four mobile renders.
  - Live grading was not retried in this UI-realism pass because the prior run was rate-limited by Gemini HTTP 429.
- Blocked or skipped paths:
  - Full live grading-to-final-report path remains externally blocked until Gemini quota is available.
  - Microphone/voice audio path was not manually tested; typed/live-call transcript mode remains the verified path.
- Known gaps:
  - Mobile density should be human-reviewed before release.
  - Dev controls are visible in local dev mode.
  - Persisted state key remains `job-simulator-storage` to preserve current behavior.
- Git tracking status:
  - `src/data/supportConsole.ts` and `src/components/ui/SupportConsole.tsx` have been added to the Git index along with updated simulator-local QA/report files.

## Change History Update

- `CHANGE_HISTORY.md` updated: yes.
- Rows added: Mercury Assist support-console UI/data, CRM unlock gating, browser/static QA evidence, and matching per-chat request-log row.
- Rows needing confirmation: none.

## Lessons For Future Simulator Upgrades

- A realistic UI pass should not stop at nicer styling. It should introduce the actual software objects the role uses: queue context, status metadata, search, tabs, records, actions, and locked/unlocked data states.
- For support simulations, answer-key details should be visually masked until the learner performs the expected verification/lookup step.
- Browser evidence should include both locked and unlocked states; otherwise a screenshot can accidentally prove only the static shell.
- Mobile can be accepted as stacked-scroll for dense workplace software, but it needs explicit human review because the first viewport cannot show every panel.
