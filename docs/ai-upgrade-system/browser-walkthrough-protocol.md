# Browser Walkthrough Protocol

Use this protocol for every Compassly simulator audit or upgrade. Code inspection is necessary, but it is not enough. A simulator can only be called ready after a real browser walkthrough confirms what the learner actually sees and does.

## Required Coverage

Visit every reachable student-visible path, not only the main required route:

- Intro, name entry, onboarding, scenario setup, and first real task.
- Every required route scene.
- Every reachable branch, optional path, alternate ending, modal, drawer, tab, source tray, helper panel, and glossary/help state.
- Every task-critical interaction: typing, selecting, dragging, opening evidence, submitting, retrying incomplete work, navigating next/back, and returning after saved state.
- AI, voice, or conversation scenes, including typed fallback when present, no-key/error states when relevant, transcript behavior, turn limits, and answer-leak checks.
- Grading, assessment, final report, restart, and any post-completion state.

Exclude only dev-only, admin-only, or test-only paths that normal students cannot see. If a dev control is visible to normal students, count it as a defect.

## Viewports

Run the walkthrough in both:

- Desktop viewport: enough width to inspect dense work surfaces, laptop frames, source trays, and side-by-side layouts.
- Mobile or narrow viewport: enough to catch clipped text, hidden submit buttons, unusable tabs, scroll traps, and crowded controls.

If a viewport cannot be tested because the browser tool is blocked, record it as a blocker or explicit gap. Do not mark the simulator ready.

## Evidence to Capture

For every visited path or scene, capture screenshots plus written notes. Store screenshots in the target simulator when possible, using an artifact folder such as `qa-screens/` or `output/playwright/`.

Each walkthrough note must include:

- Path or scene ID/name visited.
- Viewport tested.
- Actions performed.
- Screenshot or artifact path.
- Pass/fail status.
- Issue notes.
- Student experience feel: what feels clear, confusing, crowded, unfair, over-helpful, or realistic.
- Workplace software realism: whether each core tool feels like credible role-specific software or like generic cards, plain panels, or decorative mockups.

## What to Check While Clicking

- The learner can identify the current task within a few seconds.
- Source evidence needed for the task is visible before submission.
- Inputs, selections, tabs, source trays, glossary `?` help, helper panels, and submit gates work as they appear.
- Anything that looks clickable either works or is clearly static.
- Required blocker messages say exactly what is missing.
- Earlier learner work carries forward where the flow depends on it.
- Progress labels match actual learner work, not passive intro or grading screens.
- Desktop and mobile layouts avoid clipped text, overlap, scroll traps, offscreen buttons, and cramped work surfaces.
- Core job software feels realistic for the role, with credible layout density, data hierarchy, tabs/tables/search/status indicators, and real-feeling controls where appropriate.
- AI or NPC scenes stay bounded, preserve transcript evidence, handle messy inputs, and do not reveal answer-key details too early.
- Grading and final reports match the active route and the artifacts the learner actually created.

## Reporting Rules

- A code-only pass is a `preliminary audit`, never a completed audit.
- If any student-visible path is skipped, list it under known gaps with the reason and severity.
- If browser access is blocked, write `runtime browser walkthrough blocked` and do not say the simulator is ready.
- If implementation changes UI, route, grading, interaction behavior, or visible copy, repeat the browser walkthrough before final judgment.
- Screenshots without notes are incomplete. Notes without screenshots are incomplete unless the browser tool cannot capture screenshots and the gap is explicitly documented.
