---
name: compassly-simulator-quality-upgrader
description: Audit, plan, improve, and verify Compassly standalone job simulators against the Compassly quality standard using structured simulator-upgrade examples, golden patterns, the 50-item checklist, the quality rubric, realistic workplace software standards, and mandatory full browser walkthrough evidence. Use when Codex is asked to upgrade remaining simulators, learn from CHANGE_HISTORY.md, produce simulator-improvement plans, or make simulators match the Compassly high-quality standard.
---

# Compassly Simulator Quality Upgrader

Use this skill to turn a generated standalone simulator into a Compassly-quality simulator by applying learned patterns from prior upgrades.

This skill is self-contained when packaged: its checklist, rubric, examples, templates, and validator live in bundled `references/` and `scripts/` folders.

Default target repo root when present:

```text
/Users/liwengou/Desktop/work/compassly-startup/ui-style-experiments/job-simulators
```

On another computer, do not require that exact path. Use the current working directory or the user-provided simulator repo path; if no `job-simulators` checkout is visible, ask for the repo location before auditing.

## Required References

Read these before planning an upgrade:

- `references/simulation-quality-checklist.md`
- `references/compassly-quality-rubric.md`
- `references/schema.md`
- `references/golden-patterns.md`
- `references/simulator-upgrade-examples.jsonl`
- `references/upgrade-agent-output-contract.md`
- `references/browser-walkthrough-protocol.md`

## Workflow

1. **Resolve the simulator.**
   - Work under `simulators/<slug>`.
   - Treat live files as source of truth.
   - Inspect `src/data/scene-config.json`, `src/data/job-simulation.md`, `src/data/rubric.json`, scene components, and nearby docs.

2. **Pass 1: code audit.**
   - Score the simulator with `references/compassly-quality-rubric.md`.
   - Identify P0/P1 blockers first.
   - Map each defect to checklist item IDs and pattern tags.
   - A code-only review is preliminary. Do not mark the simulator ready from code inspection alone.

3. **Retrieve examples.**
   - Search the JSONL examples by pattern tags, checklist items, and role similarity.
   - Prefer examples from multiple source simulators when a pattern is broad.
   - Use examples to guide judgment, not to copy role-specific content blindly.

4. **Pass 2: mandatory full browser walkthrough.**
   - Read and follow `references/browser-walkthrough-protocol.md`.
   - Run the simulator in a real browser and visit every reachable student-visible path.
   - Test desktop and mobile viewports.
   - Capture screenshots plus notes for every visited path or scene.
   - Interact with source tabs, helper panels, glossary help, submit gates, AI/voice/typed fallback states, grading, and final reports.
   - Explicitly judge whether every core job software surface feels like realistic workplace software for the role, not a generic card stack, plain panel, or decorative mockup.
   - Treat unrealistic core software as a P1 blocker when the scenario depends on that tool for the main professional task.
   - If browser access is blocked, report `runtime browser walkthrough blocked` and do not say the simulator is ready.

5. **Use existing helper skills and scripts when relevant.**
   - Language/readability: `simplify-simulation-language`.
   - Tool surfaces and workplace software realism: `audit-simulation-tool-ui`.
   - Rubric drift: `simulation-rubric-auditor`.
   - Structural QA: `job-simulation-qa`.
   - Change history: `simulation-change-history`.
   - If those helper skills are not installed on the machine, perform the checks manually with the bundled checklist, rubric, golden patterns, and examples.

6. **Plan before implementation.**
   - Produce the report shape from `references/upgrade-agent-output-contract.md`.
   - Include defects, patterns, files/scenes, intended purpose, acceptance tests, verification, and human-review focus.
   - Do not implement unless the user explicitly asks for implementation.

7. **When implementation is requested.**
   - Keep edits scoped to the target simulator.
   - Preserve the role's core professional judgment.
   - Put task-critical evidence beside the task.
   - Build the main work surface as credible role-specific workplace software, with realistic layout density, data hierarchy, controls, and status indicators.
   - Convert vague free text into bounded artifacts when grading or completion needs structure.
   - Align rubric, sample answers, final report, docs, assets, and tests with the active route.
   - Add stale-state redirects when scenes are removed.
   - After UI, route, grading, or interaction changes, repeat the full browser walkthrough before final judgment.

8. **Pass 3: final judgment, verification, and learning.**
   - Run available tests, static checks, and build checks appropriate to the change.
   - Confirm the mandatory browser walkthrough passed or clearly report blocked/skipped paths as blockers or known gaps.
   - Update or create `CHANGE_HISTORY.md` with what changed and why.
   - If the user gives review feedback, record it using `references/human-review-template.md`, preferably in the target repo's `docs/ai-upgrade-system/reviews/` folder when available.
   - Validate the dataset after adding examples:

     ```bash
     node /path/to/compassly-simulator-quality-upgrader/scripts/validate-ai-upgrade-dataset.mjs
     ```

## Packaged Snapshot Updates

- Treat bundled references as a snapshot of the current Compassly standards and examples.
- When the source repo gets new approved examples, regenerate and reinstall the packaged skill instead of hand-editing the installed copy.
- If the target simulator repo also has newer `docs/ai-upgrade-system/` files, prefer those newer repo files only after confirming they validate.

## Guardrails

- Do not broaden the simulation into generic role practice.
- Do not hide required source evidence behind optional help.
- Do not let visible UI controls look clickable if they are static.
- Do not call a simulator release-ready when its core CRM, CMS, analytics, design, call, dashboard, document, or case-management software feels generic or unrealistic for the role.
- Do not let AI characters reveal answer-key details too early.
- Do not leave rubric criteria pointing at deleted scenes.
- Do not treat `CHECK_REPORT.md`, `VALIDATION.md`, or `UPGRADE_PLAN.md` as current without checking live code.
- Do not call an audit, upgrade, or release-ready review complete unless every reachable student-visible path has browser walkthrough evidence.
- Do not treat screenshots alone as enough; include notes about task clarity, interaction feel, blockers, and evidence visibility.
