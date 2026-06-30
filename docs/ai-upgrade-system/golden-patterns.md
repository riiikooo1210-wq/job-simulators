# Golden Patterns for Simulator Upgrades

These patterns summarize reusable changes extracted from the six upgraded simulators. Use them with `simulator-upgrade-examples.jsonl`; the JSONL gives concrete examples and evidence, while this document gives action guidance.

## 1. Lock the Scenario Contract

Apply when a simulator drifts across multiple products, problems, customers, client cases, or story goals.

Do:

- Name the exact work problem in the intro and major handoffs.
- Tie every task to the same contract.
- Remove artifacts that point to an older or broader scenario.

Do not:

- Narrow the scenario so much that the core role judgment disappears.
- Keep old branch tasks because they are already implemented.

## 2. Trim the Route to Real Work

Apply when the first meaningful task is delayed by passive setup, duplicate writing, stale branches, or broad reflection.

Do:

- Keep the required route short enough for high-school learners.
- Collapse duplicate writing into one supported artifact.
- Route removed saved-state nodes safely.

Do not:

- Remove the hard professional decision just to shorten the route.

## 3. Put Evidence Beside the Task

Apply when students must remember facts from earlier scenes or infer missing source context.

Do:

- Put policies, notes, app screens, data, source cards, or prior student work inside the task surface.
- Use tabs, folders, trays, or side references to keep evidence readable.
- Trim the active source tray to the evidence needed now.

Do not:

- Dump every source into every task.
- Give answer-key values when the point is professional judgment.

## 4. Convert Free Text into Bounded Artifacts

Apply when a broad writing prompt makes grading vague or asks students to do too much at once.

Do:

- Use checklists, required sections, choice groups, flow blocks, article sections, or drawing callouts.
- Add submit gates and clear blocker messages.
- Serialize the artifact with labels and source context.

Do not:

- Replace a real writing artifact, such as an article or product plan, with choices when prose is the job.

## 5. Make Tool Surfaces Role-Realistic

Apply when a task is shown as a generic document viewer, generic card, plain panel, or static illustration, especially when the scenario depends on realistic workplace software.

Do:

- Use the role's likely surfaces: Slack, CMS, phone app, source inbox, Google Docs, drawing board, design tool, support manual, or meeting workspace.
- Build core workplace software with credible role-specific layout, data hierarchy, tabs, tables, search, status indicators, forms, filters, timelines, and controls where appropriate.
- For support work, make call, CRM, case, customer profile, order timeline, and knowledge-base surfaces feel like one believable support console.
- Keep software inside laptop or monitor frames.
- Make controls interactive when they look interactive.

Do not:

- Build a decorative surface that makes the actual task harder to scan.
- Accept generic cards or panels as a release-ready CRM, CMS, analytics dashboard, call console, design tool, document editor, or case-management system when that software is central to the job.

## 6. Keep Helpers Useful but Secondary

Apply when an always-visible companion, example, or hint crowds the work or does too much reasoning for the learner.

Do:

- Move optional help behind `Need help`.
- Keep coworker handoffs short and contextual.
- Preserve the learner's responsibility for the decision.

Do not:

- Hide required source evidence behind optional help.

## 7. Bound Conversation Scenes

Apply when a voice or AI scene is required for completion or grading.

Do:

- State the learner goal, required turns, end condition, and reference materials.
- Add typed fallback when voice-only interaction hurts accessibility.
- Preserve one clean transcript for grading.
- Test off-task, angry, unsafe, and answer-seeking inputs.

Do not:

- Let the NPC volunteer private facts, answer-key details, or conclusions before the learner asks appropriately.

## 8. Align Rubric to the Active Route

Apply whenever scenes are removed, merged, retargeted, or converted into new artifact types.

Do:

- Remove rubric criteria for deleted scenes.
- Add criteria for new bounded artifacts.
- Make sample answers and final reports match the simplified experience.
- Add deterministic checks for objective artifact failures.

Do not:

- Let grading mention a call, report, roadmap, note, or writing task the learner no longer completes.

## 9. Clean Stale Docs, Assets, and QA

Apply after route or scene changes.

Do:

- Update `SCENE_BLUEPRINT.md`, `VALIDATION.md`, `CHECK_REPORT.md`, image prompts, asset manifests, and `job-simulation.md`.
- Delete or mark obsolete scene images and generated metadata.
- Add focused tests for route shape, source tabs, submit gates, saved-state redirects, and grading serialization.

Do not:

- Trust docs as current without checking live config and scene code.
