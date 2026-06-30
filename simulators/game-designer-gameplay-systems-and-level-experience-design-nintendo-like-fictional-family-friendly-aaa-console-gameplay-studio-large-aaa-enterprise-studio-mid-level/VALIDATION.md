# Validation report - game-designer-gameplay-systems-and-level-experience-design-nintendo-like-fictional-family-friendly-aaa-console-gameplay-studio-large-aaa-enterprise-studio-mid-level

## Current Contract

- Active node count: 11.
- Active route: `intro` -> `morning_briefing` -> `mechanic_hook_sheet` -> `playtest_watchlist` -> `playtest_workspace` -> `spec_update` -> `design_review_prep` -> `design_review` -> `assessment_gate` -> `grading` -> `final_report`.
- Assessment gate: only `assessment_gate` routes to `grading`.
- Scoreable tasks: `mechanic_hook_sheet`, `playtest_watchlist`, `playtest_workspace`, `spec_update`, `design_review`.
- Ungraded prep exception: `design_review_prep`.
- Removed-scene redirects: `issue_priority_matrix` -> `spec_update`; `final_handoff_email` -> `assessment_gate`.
- Input continuity: `mechanic_hook_sheet` and `playtest_watchlist` use bounded select fields so their saved artifacts can be consumed by the fixed `playtest_workspace` timeline.

## Rubric Shape

| Scoring Item | Evidence Scene |
| --- | --- |
| Mechanic Problem Framing | `mechanic_hook_sheet` |
| Playtest Watchlist | `playtest_watchlist` |
| Playtest Observation | `playtest_workspace` |
| Spec Update | `spec_update` |
| Engineering Handoff | `design_review` |

The grading copy is English in `src/data/rubric.json`, the embedded `scene-config.json` rubric, and `src/data/job-simulation.md`.

## High-Risk Checks Added

- Intro transition does not rely on `AnimatePresence mode="wait"` for route replacement.
- Normal student mode hides dev-only controls; `?devtools=1` opt-in keeps developer jumps available during local testing.
- Priya handoff has a typed fallback transcript path using the same conversation key as the voice handoff.
- Regression tests cover the merged Teaching Note data tab, current Priya prep wording, typed fallback config, stale redirects, English rubric labels, and route-transition/devtools source guards.
- Regression tests cover the bounded Teaching Note / Watchlist contract so future upgrades do not reintroduce arbitrary open-ended input before a fixed downstream scenario.
