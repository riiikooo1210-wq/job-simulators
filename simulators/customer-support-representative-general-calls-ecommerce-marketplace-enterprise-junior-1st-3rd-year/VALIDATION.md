# Validation report - customer-support-representative-general-calls-ecommerce-marketplace-enterprise-junior-1st-3rd-year

Last updated: 2026-06-30 JST

**Summary:** 38 pass · 3 warn · 0 code fail · 0 code P1 blockers · 1 external verification block

## Hard Gates

- ✅ Route resolves across 10 nodes: `intro -> prep_order_status -> call_order_status -> prep_late_delivery -> call_late_delivery -> prep_risk_refund -> call_risk_refund -> assessment_gate -> grading -> final_report`.
- ✅ Required assessment gate exists before grading: `assessment_gate`.
- ✅ Supported scene types only: `intro`, `briefing`, `voice_meeting`, `section_transition`, `grading`, `final_report`.
- ✅ All three voice calls have min/max turn limits, visible references, completion endpoints, success criteria, and submit gates.
- ✅ JSON parse passed for `src/data/scene-config.json`, `src/data/rubric.json`, and `package.json`.
- ✅ TypeScript compile passed with `./node_modules/.bin/tsc -b --pretty false`.
- ✅ Production build passed with `npm run build`.

## Work Mix

- ✅ Source-derived work mix remains intentional: spoken customer-support calls are dominant, digital policy/CRM reference work is major, cognitive policy judgment is major, written documentation is minor, and physical/procedural tool work is minor.
- ✅ No MCQ or physical-playground scene is required for this version because the user-approved scenario is a focused three-call support block.
- ✅ Prep scenes expose the source evidence before each call.
- ✅ Live calls keep the checklist and policy reference visible while the learner types or speaks.

## Scene Structure

- ✅ Required route has three prep scenes, three live calls, one assessment gate, grading, and final report.
- ✅ Prep scenes use the Mercury Assist knowledge-base prep console with queue metadata, required article cards, locked customer/case previews, search affordance, and policy preview.
- ✅ Calls use the Mercury Assist live support console around the shared `VoiceMeetingScene.tsx` typed/voice surface.
- ✅ All six prep/call work scenes now declare `supportConsole` metadata with the expected scenario id and mode.
- ✅ Customer, order, case, timeline, safe-action, and internal-note details remain locked before CRM lookup and unlock after the transcript contains a CRM lookup result.
- ✅ Call submit gates remain disabled until the learner has met the min-turn requirement and ended the meeting.
- ✅ Browser walkthrough confirmed typed turns in all three calls:
  - `call_order_status`: 3 user turns, submit enabled after meeting end.
  - `call_late_delivery`: 4 user turns, submit enabled after meeting end.
  - `call_risk_refund`: 4 user turns, submit enabled after meeting end.

## Rubric Shape

- ✅ Live rubric has 3 criteria in 1 section.
- ✅ Embedded `scene-config.json` rubric matches `src/data/rubric.json`.
- ✅ Rubric evidence mapping matches active required calls:
  - `Order-Status Call` -> `call_order_status`
  - `Late-Delivery Call` -> `call_late_delivery`
  - `High-Value Refund Call` -> `call_risk_refund`
- ✅ Prep scenes are intentionally not graded directly.

## Student Readability and Evidence

- ✅ Visible student-facing route uses plain support-call instructions and local call checklists.
- ✅ Unavoidable support terms use clickable `?` glossary help in call instructions, references, and transcripts.
- ✅ No raw `{{term}}` glossary markers found in the active visible UI.
- ✅ Task-critical policy evidence is visible inside the Mercury Assist support console next to the call workspace.
- ✅ Browser screenshots showed no horizontal overflow on desktop or 390px mobile for the new support-console pass.

## AI, Voice, and Typed Calls

- ✅ Typed messages are appended to the same voice conversation transcript used for grading.
- ✅ Prompt construction now keeps UI glossary rendering out of the Live system prompt.
- ✅ Customer NPCs did not reveal full CRM/order facts before the learner verified identity and stated they were checking CRM during the walkthrough.
- ⚠️ Live voice/microphone audio was not manually tested in this pass. Typed live-call mode was the selected walkthrough depth.

## Browser Walkthrough

- ✅ Desktop walkthrough covered intro, all three Mercury Assist prep scenes, all three locked call states, and all three unlocked call states.
- ✅ Mobile walkthrough covered initial renders for `prep_order_status`, `call_order_status`, `call_late_delivery`, and `call_risk_refund` at 390px width.
- ✅ The prior realistic-workplace-software P1 blocker is addressed by the new Mercury Assist console surface.
- ⚠️ Mobile support-console scenes are dense and should receive human review for scrolling comfort before release.
- ✅ Screenshot/artifact folder: `/private/tmp/simulation-tool-ui-audits/customer-support-1782752629715`.
- ⚠️ Dev controls are visible in local dev mode. This is expected for the standalone simulator dev server and was not treated as production UI.

## External Verification Block

- ⚠️ Live Gemini grading returned HTTP 429 rate-limit responses during the prior post-change browser verification, so the route could not reach desktop final report through live grading in that run.
- ⚠️ This UI-realism pass did not retry live grading; it used deterministic local browser QA focused on the support-console surfaces.
- ✅ Grading error state rendered cleanly with `Try Again` and `Restart`.
- ✅ Final-report rendering was separately verified with a synthetic completed grading result on desktop and mobile.

## Deterministic QA

- ✅ Added `npm run qa:static`.
- ✅ Static QA checks route shape, call scene contracts, rubric evidence mapping, embedded rubric parity, prompt-safety regression, support-console scene metadata, support-console component wiring, CRM unlock detection, and scenario data coverage.
