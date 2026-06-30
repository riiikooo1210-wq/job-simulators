# Tracking Decision: Architect

Date: 2026-06-30
Reviewer: User decision captured by Codex
Simulator: `architect-none-most-common-residential-architecture-mid-size-firm-entry-junior`
Upgrade agent/report: `compassly-simulator-quality-upgrader`

## Decision

- Track persistent simulator-local upgrade artifacts that future agents need: source files, docs, tests, deliberate assets, and review notes.
- Do not track generated browser captures, Playwright CLI files, local output screenshots, browser profiles, build artifacts, or `/private/tmp` audit runs.
- This note records the Git-tracking decision only. It does not mark the Architect upgrade accepted, complete, or release-ready.

## Files To Track For This Upgrade

- `CHANGE_HISTORY.md`
- `public/action-assets/revit/level2.png`
- `public/action-assets/revit/west_elevation_post_fix.png`
- `src/components/hooks/useNarrowViewport.ts`
- `src/scenes/ClientQuestionChecklistScene.tsx`
- `src/scenes/RedlineClickBoardScene.tsx`
- `tests/verifyRepliesRedlines.test.mjs`

## Files To Leave Local Only

- `.playwright-cli/`
- `output/playwright/`
- `/private/tmp/architect*`

## Reusable Rule

Future quality-upgrader runs should explicitly stage new persistent source, docs, tests, and deliberate assets before finalizing. Generated evidence should stay local unless the user explicitly asks to preserve it in Git.
