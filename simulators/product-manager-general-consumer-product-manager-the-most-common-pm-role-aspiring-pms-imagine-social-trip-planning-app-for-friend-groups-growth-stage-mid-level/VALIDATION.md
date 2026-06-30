# Validation Report

Simulator: `product-manager-general-consumer-product-manager-the-most-common-pm-role-aspiring-pms-imagine-social-trip-planning-app-for-friend-groups-growth-stage-mid-level`

Status: **Validated locally for the four-task Product Manager route on 2026-06-30.**

## Hard Gates

- Active next-rule chain should resolve from `intro` through `final_report`.
- Assessment starts only after `assessment_gate`.
- Rubric evidence should map to the four active learner tasks: `scene_02_app_audit`, `scene_03_research_prep`, `scene_04_user_call`, and `scene_07_prd_slice`.
- Removed nodes are not active: `scene_02_problem_brief`, `transition_research`, roadmap, and priority-matrix scenes.

## Desk-Work Quality

- Source workspace is represented by `briefing_kickoff`.
- Visible work surfaces are represented by `scene_02_app_audit`, `scene_03_research_prep`, `scene_04_user_call`, and `scene_07_prd_slice`.
- Realistic software is a hard quality gate: the active route must show a PM source workspace shell, app-audit review console, Roamly Research Hub, interview console, and Product Plan doc editor rather than generic text boxes or decorative mock windows.
- Saved app-audit notes are visible in the research-prep task.
- Saved app-audit notes and Nina transcript are visible in the Product Plan task.

## Runtime Reliability

- Persisted state must use the Product Manager simulator storage key.
- Unknown saved node IDs must repair to a safe route instead of rendering a missing-node error.
- Typed interview backup must continue without Gemini and must not expose provider error text.
- Final report task labels should use learner-facing names, including Product Plan.

## Browser QA Completed

- Clean desktop walkthrough completed from intro to final report on `http://127.0.0.1:5179/`.
- Clean mobile walkthrough completed from intro to final report on `http://127.0.0.1:5179/`.
- Screenshots are in `/private/tmp/product-manager-realism-walkthrough-2026-06-30/`.
- No dev-only controls appeared without `?devtools=1`.
- `npm run test:software-realism` passed and should be rerun after any tool-surface change.
