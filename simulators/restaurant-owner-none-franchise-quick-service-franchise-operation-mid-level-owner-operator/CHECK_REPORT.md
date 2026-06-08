# Check Report — Restaurant Owner Simulator

## Summary

- Static validation: PASS, `29 pass · 1 warn · 0 fail` in strict mode.
- Build: PASS, `npm run build` completed successfully.
- Runtime smoke test: PASS for onboarding, briefing, MCQ branch, Slack KPI plan, physical line check, voice scene UI, franchisor email, daily memo, and assessment gate.
- Known limitation: Gemini voice/audio and grading were not exercised because they require a live API key, microphone permission, and model availability. The voice scene UI, endpoint guidance, support material, dev skip route, and downstream scenes were verified.

## Scene Audit

| Order | Scene id | Type | What player must do | Inputs visible where | Output captured where | Grading evidence | Route checked | UI/runtime notes | Issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `intro` | intro | Enter name and review onboarding. | Intro copy and steps. | `playerName`. | N/A. | Yes, `Begin Shift` reaches workspace. | Patched start button from misleading `Begin Assessment` to `Begin Shift`. | Pass |
| 2 | `morning_operating_workspace` | briefing | Open Excel, Calendar, and Drive sources. | Coded source workspace. | Source visit state. | Later scenes use workspace facts. | Yes. | KPI/source workspace is visible and readable. | Pass |
| 3 | `scene_01_first_twenty_minutes` | multiple_choice | Pick first pre-rush move. | Current scene plus workspace via source scene. | `mcSelections` and `branchFlags`. | KPI interpretation. | Yes, balanced option routes to consequence. | MCQ correctly routes immediately, no Submit needed. | Pass |
| 4 | `redirect_balanced_triage` | briefing | Read consequence. | Consequence text. | N/A. | Context for next task. | Yes. | Uses `Start the Task` template button. | Pass |
| 5 | `scene_02_kpi_shift_plan` | free_text / slack_reply | Send Mina a pre-rush Slack plan. | Excel, Calendar, and Drive source tabs mirror first workspace facts. | `freeTextResponses.scene_02_kpi_shift_plan`. | KPI and labor/service judgment. | Yes. | Send enables after minimum word count. | Pass |
| 6 | `transition_floor_walk` | section_transition | Read transition. | Prior plan context. | N/A. | N/A. | Yes. | Continues into physical line check. | Pass |
| 7 | `scene_03_line_check` | physical_playground | Inspect standard card plus four objects and submit observations. | Standard card, labels, temps, sanitizer, timer. | `freeTextResponses.scene_03_line_check` action log and observations. | Food safety and brand accountability. | Yes. | Must inspect standard card before Continue; verified route to coaching transition. | Pass |
| 8 | `transition_coaching` | section_transition | Read transition. | Line-check context. | N/A. | N/A. | Yes. | Continues to voice scene. | Pass |
| 9 | `scene_04_shift_lead_coaching` | voice_meeting | Speak with Jordan using line-check facts. | Prep note key plus line-check facts panel. | Voice transcript at runtime. | Coaching and labor/service judgment. | UI and dev skip route checked. | In-person mode, endpoint, max turns, support facts visible. | API/mic not tested |
| 10 | `scene_05_franchisor_response` | free_text/email | Draft email to Camila. | Incoming email and line-check context. | `freeTextResponses.scene_05_franchisor_response`. | Food safety and brand accountability. | Yes with 90+ words. | Email uses `Send`; min-word gate works. | Pass |
| 11 | `scene_06_daily_action_memo` | free_text/doc | Draft daily memo. | Three reference tabs: packet, line check, coaching. | `freeTextResponses.scene_06_daily_action_memo`. | Final memo quality and cross-scene synthesis. | Yes with 140+ words. | Reference tabs visible; Submit gate works. | Pass |
| 12 | `assessment_gate` | section_transition | Click `View Assessment`. | Completion summary. | N/A. | Assessment gate. | Yes, gate reached. | Correct label present. | Pass |
| 13 | `grading` | grading | Wait for assessment. | Captured responses. | Grading result. | All rubric criteria. | Static route checked. | Live Gemini grading not tested. | API not tested |
| 14 | `final_report` | final_report | Review results. | Grading output. | N/A. | N/A. | Static route checked. | Depends on grading API. | API not tested |

## Grading Evidence Map

| Rubric criterion | Expected evidence | Runtime source | Tested? | Issues |
| --- | --- | --- | --- | --- |
| Evidence-based KPI interpretation | MCQ, KPI plan, memo | `scene_01`, `scene_02`, `scene_06` | Yes | None |
| Labor and service tradeoff judgment | KPI plan, coaching transcript, memo | `scene_02`, `scene_04`, `scene_06` | Partial | Voice transcript requires API/mic |
| Food safety and line-check accuracy | Physical observations, email, memo | `scene_03`, `scene_05`, `scene_06` | Yes | None |
| Brand-standard accountability | Physical observations, franchisor email, memo | `scene_03`, `scene_05`, `scene_06` | Yes | None |
| Coaching specificity and accountability | Voice transcript and memo | `scene_04`, `scene_06` | Partial | Voice transcript requires API/mic |
| Action memo quality | Daily memo | `scene_06` | Yes | None |

## High-Risk Surface Audit

| Surface | Scene id(s) | Required probe | Result | Issues |
| --- | --- | --- | --- | --- |
| Voice meeting | `scene_04_shift_lead_coaching` | goal/endpoint/support/material/transcript | UI has in-person mode, endpoint, line-check support, turn guidance, and skip route. | Live audio not tested |
| Physical playground | `scene_03_line_check` | inspect/read/observe/continue | Standard card and four observations required; route advances after all are complete. | None |
| Source-heavy task | `morning_operating_workspace`, `scene_02`, `scene_05`, `scene_06` | source visibility | Source workspace, Slack source tabs, incoming email, and memo tabs visible where needed. | None |
| Expert-knowledge task | `scene_03_line_check` | novice support/reference | Standard card gives hot/cold/sanitizer/timer criteria before observations. | None |
| Email/doc windows | `scene_05`, `scene_06` | realistic work surface and submit gate | Email uses headers and Send; doc uses tabs and Submit. | None |

## Residual Notes

- Validation warning: `mina` and `camila` are defined NPCs but not referenced by `npcId`. This is accepted because Jordan is the only live voice NPC; Mina and Camila appear as manager/email characters in the scenario.
- Placeholder scene images are present. Real scene art and action closeups still need to be generated from `IMAGE_PROMPTS.md` and `ACTION_ASSETS.md`.
- `npm install` reports 3 moderate vulnerabilities from the template dependency tree; no automatic audit fix was applied.
