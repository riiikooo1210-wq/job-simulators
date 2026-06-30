# Simulator QA Report

Simulator: `product-manager-general-consumer-product-manager-the-most-common-pm-role-aspiring-pms-imagine-social-trip-planning-app-for-friend-groups-growth-stage-mid-level`

Status: **Quality upgrade implemented and locally browser-verified on 2026-06-30.**

## Summary

- Active route: `intro` -> `briefing_kickoff` -> `scene_02_app_audit` -> `scene_03_research_prep` -> `scene_04_user_call` -> `scene_07_prd_slice` -> `assessment_gate` -> `grading` -> `final_report`.
- Current learner tasks: App Audit, Interview Prep, User Interview, Product Plan.
- Fixed in this pass: simulator-specific persistence, stale saved-node recovery, student-safe interview backup replies, saved app-audit note carry-forward, Nina transcript carry-forward, Product Plan report labels, name-field accessibility, onboarding step/content sync, mobile prep-submit reachability, and realistic software surfaces for the active PM workflow.
- Fresh desktop and mobile walkthrough screenshots are in `/private/tmp/product-manager-realism-walkthrough-2026-06-30/`.
- Obsolete generated nodes such as `scene_02_problem_brief` and `transition_research` are not part of the active storyline.

## Resolved Issues

| ID | Severity | Area | Fix made | Retest expectation |
| --- | --- | --- | --- | --- |
| PM-QA-001 | P1 | Persistence and stale state | Store now uses `SIMULATOR_STORAGE_KEY` from a module loaded before Zustand initialization. Persisted state is repaired on hydration, and invalid node IDs reset to the start route. | Seed an old node ID such as `prep_risk_refund`; app should restart from intro instead of showing a missing-node error. |
| PM-QA-002 | P1 | User interview reliability | Typed backup no longer depends on Gemini availability. API failures use bounded Nina backup replies and never show raw provider JSON or API URLs. | Simulate missing key or Gemini 429; typed interview should continue with safe copy and a usable transcript. |
| PM-QA-003 | P1 | Artifact continuity | Research prep renders the student's saved app-audit notes; Product Plan evidence rail renders saved audit notes and the Nina transcript when present. | Complete audit and interview, then confirm those artifacts appear in later workspaces. |
| PM-QA-004 | P2 | Final report language | Rubric display maps `要件文書` to Product Plan, and report copy is converted from "candidate" language to student-facing language. | Final report should not show `PRD Slice` or repeated "candidate" wording. |
| PM-QA-005 | P2 | Mobile/accessibility polish | Intro name field has a real label; onboarding step content updates in sync; mobile prep navigation is sticky at the bottom. | Mobile walkthrough should allow normal taps without forced clicks. |
| PM-QA-006 | P1 | Realistic software UI | Upgraded the PM source workspace shell, app-audit review console, Roamly Research Hub prep tool, interview console, and Product Plan doc editor so each active task uses workplace-like software instead of generic text areas or floating mock windows. | Run `npm run test:software-realism`, desktop walkthrough, and mobile walkthrough; each task should show realistic software chrome and reachable controls. |

## Scene Audit

| Order | Scene id | Type | Student action | Output captured | Evidence visibility |
| --- | --- | --- | --- | --- | --- |
| 1 | `intro` | intro | Enter name and read setup. | Player name | Name input has an accessible label. |
| 2 | `briefing_kickoff` | briefing | Open required Slack and Analytics source apps. | Source review state | PM source workspace shell, Slack, Analytics, search/status header, and evidence progress are visible before continuing. |
| 3 | `scene_02_app_audit` | app_audit | Inspect five Roamly screens and save one note per screen. | `freeTextResponses.appAuditNotes` | Phone screens, app-audit review console, numbers, and Jordan help are in the audit workspace. |
| 4 | `scene_03_research_prep` | free_text | Write five non-leading questions and one learning goal. | `freeTextResponses.scene_03_research_prep` | Roamly Research Hub shows Nina profile, guardrails, question rows, and saved app-audit notes. |
| 5 | `scene_04_user_call` | voice_meeting | Ask Nina at least five questions and end the meeting. | `npcConversations.voice:scene_04_user_call:nina` | Interview console shows prep tray, compact context, transcript, typed backup, and reference notes. |
| 6 | `scene_07_prd_slice` | free_text | Write the four-part Product Plan. | `freeTextResponses.scene_07_prd_slice` | Product Plan doc editor shows section structure, saved audit notes, and Nina transcript in the evidence rail. |
| 7 | `assessment_gate` | section_transition | Start assessment. | none | Gate appears only after the four work tasks. |
| 8 | `grading` | grading | Wait for scoring. | `gradingResult` | Uses the active four-task evidence set. |
| 9 | `final_report` | final_report | Review career exploration feedback. | displayed report | Task labels use learner-facing names. |

## Verification Completed

- Passed `npm run test:four-task-flow`, `npm run test:remove-roadmap-tasks`, `npm run test:app-audit-layout`, `npm run test:prd-workspace`, `npm run test:user-call-ui`, `npm run test:software-realism`, `npm run test:artifact-continuity`, `npm run test:docs-report-mobile-cleanup`, `npm run test:grading-fallback`, `npm run test:interview-fallback`, `npm run test:persistence-repair`, and `npm run test:progress-state`.
- Passed `npm run build`.
- Completed clean desktop and mobile browser walkthroughs from intro through final report on `http://127.0.0.1:5179/`.
- Clean student URL hides dev-only controls; walkthrough script failed if `Skip (dev)` appeared.
- Missing Gemini key and provider failure paths are covered by fallback tests and the clean walkthrough used typed backup plus grading fallback successfully.
