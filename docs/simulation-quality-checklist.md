# Simulator Quality Checklist

This checklist captures reusable quality patterns from the six simulators that already have `CHANGE_HISTORY.md` reports:

- Architect
- Customer Support Representative
- Game Designer
- Journalist / NBA Beat Reporter
- Product Manager
- UI/UX Designer

Use it when upgrading the remaining standalone simulators under `simulators/<slug>`. The goal is not to make every simulator identical. The goal is to bring each one up to the same standard: focused scenario, clear student work, visible evidence, realistic workplace software, fair grading, and durable verification.

## How to Use This Checklist

Start from the live simulator files, especially `src/data/scene-config.json`, `src/data/job-simulation.md`, `src/data/rubric.json`, current scene components, and nearby docs such as `SCENE_BLUEPRINT.md`, `VALIDATION.md`, and `CHECK_REPORT.md`.

For each item, mark it complete only when the current playable simulator satisfies the standard. If an item does not fit the role, write a short note explaining why it is intentionally not applicable. Do not change hidden prompts, rubric boundaries, or role identity just to simplify visible student copy unless the upgrade specifically requires it.

When the scenario depends on a core job tool, weak workplace software realism is a P1 blocker. The main tool should feel like role-specific software a worker would plausibly use, not generic cards, plain panels, or decorative mockups with role words pasted on top.

## A. Scenario and Flow

- [ ] **01. Lock one precise scenario contract.** Define the exact work problem, product state, client case, customer issue, or event the simulator is about. This prevents student work from drifting into generic role practice.
- [ ] **02. Tie every task to that scenario contract.** Check that each active scene produces evidence for the same core problem. A task that cannot connect back to the contract should be rewritten, merged, or removed.
- [ ] **03. Remove duplicate writing or reflection tasks.** Keep one supported artifact when two scenes ask students to write similar summaries, plans, or reports. Duplicate output increases workload without improving learning or grading.
- [ ] **04. Remove stale branches that delay the first real task.** Delete or bypass old multiple-choice detours, redirect scenes, and dead-end setup screens when they no longer teach the current flow. Students should reach meaningful work quickly.
- [ ] **05. Keep the required route short enough for high-school learners.** Count only required learner actions, not intro or assessment screens. The route should feel like a focused workday, not a long tour of every possible responsibility.
- [ ] **06. Make progress show actual learner work tasks only.** Progress labels should name submitted work, conversations, tool tasks, or decisions. Do not count intro, grading, final report, or passive briefing screens as progress steps.
- [ ] **07. Add short coworker/editor handoffs before major tasks.** Use compact recaps, Slack-style messages, editor notes, or memory cards to orient the learner. This gives context without front-loading a long essay.
- [ ] **08. Remove passive setup screens unless they provide needed evidence.** A scene should either orient the learner, expose source material, collect work, or assess work. Decorative or redundant setup should be collapsed into a handoff.
- [ ] **09. Preserve the role's core professional judgment.** Simplify the route without removing the hard decision that makes the role real, such as verify versus fix, safe attribution, refund authority, source-backed prioritization, or stakeholder tradeoffs.
- [ ] **10. Route old saved-state nodes safely when scenes are removed.** If the simulator has local persistence, redirect removed node IDs to the next valid scene. This keeps older browser state from trapping learners in deleted tasks.

## B. Student Readability

- [ ] **11. Rewrite visible copy in plain high-school-readable language.** Shorten intros, prompts, goals, report copy, and task instructions. Keep the role realistic, but prefer concrete action words over specialist phrasing.
- [ ] **12. Keep authentic role terms only when necessary.** Do not erase important workplace vocabulary, but remove labels that sound technical without helping the task. Necessary terms should be explained where students see them.
- [ ] **13. Add clickable `?` glossary help for unavoidable jargon.** Terms like `PRD`, `scrum`, `carrier trace`, `QA`, or domain-specific acronyms should have inline help. Students should not need prior workplace knowledge to complete the task.
- [ ] **14. Ensure glossary help works across all visible text surfaces.** Audit email bodies, chat messages, quote blocks, field labels, meeting references, transcript text, source cards, and task prompts. Glossary coverage is not complete if it only works in one scene component.
- [ ] **15. Remove raw glossary markers from learner-facing UI.** Search for visible `{{term}}` style markers or broken red/help text. Broken glossary rendering makes the task look unfinished and can confuse students.
- [ ] **16. Replace abstract labels with concrete action labels.** Prefer labels like `Room part`, `Helpful change`, `Ask Reed`, `Refund Review`, or `Write the Product Plan` over vague labels like `edge case`, `final interaction`, or `synthesis`.
- [ ] **17. Keep instructions local to the action being performed.** Put the important rule, proof, or reminder near the card, question, editor, drawing, or meeting where the learner uses it. Do not require them to remember a rule from three scenes earlier.
- [ ] **18. Use examples only when they clarify the task.** Include compact examples for unfamiliar artifacts, but remove examples that give away the exact answer or add extra concepts the task does not grade.
- [ ] **19. Avoid giving exact answer values when the task is judgment-based.** Provide directional guidance, checklists, source tabs, and blocker messages. Do not replace professional judgment with answer-key numbers unless the task is meant to be deterministic.
- [ ] **20. Keep final-report and assessment copy aligned with the simplified experience.** If the learner no longer completes a voice call, roadmap, site note, or second writing task, the assessment and final report should not mention it as required work.

## C. Evidence and Work Surfaces

- [ ] **21. Put source evidence beside the task.** Show policies, notes, app screens, client choices, player notes, analytics, drawings, or source files inside the workspace where the learner acts. This makes the task fair.
- [ ] **22. Replace memory-dependent tasks with visible references.** If a later scene depends on earlier facts, surface those facts again as notes, source tabs, saved responses, or reference panels. Do not grade students on memorization.
- [ ] **23. Use tabs, cards, folders, or trays to organize evidence.** Split dense source material into readable groups such as Results, Player Notes, Safe Rules, Dana Choices, Team Rules, Debugging Notes, or Project Notes.
- [ ] **24. Trim source trays to only what the current task needs.** Remove process notes, hold-back material, stale details, or irrelevant data from the active task view. Extra source material should not hide the few facts students need.
- [ ] **25. Carry earlier learner work into later tasks.** Feed saved notes, prepared questions, selected choices, audit findings, or transcripts into follow-up meetings, design tasks, writing tasks, and grading. This makes the simulation feel continuous.
- [ ] **26. Make task-critical evidence visible before submission.** Required policy limits, source facts, client answers, app state, or note categories should be visible before the learner clicks submit. Hidden evidence creates unfair grading.
- [ ] **27. Convert generic document viewers into focused workspaces.** Replace plain text dumps with source inboxes, Docs-like editors, CMS trays, support manuals, drawing boards, app mocks, or decision panels that match the work.
- [ ] **28. Use realistic workplace software for the role.** Product work may need phone apps, Slack, analytics, and PRD docs. Journalism may need CMS and source trays. Customer support may need a case console, CRM lookup, call controls, customer profile, order timeline, and knowledge-base articles. Architecture may need drawings and Revit-like work. The main tool should use credible role-specific layout, data hierarchy, tabs, tables, search, status indicators, filters, forms, and controls where appropriate; do not use generic card/panel UI for core software work.
- [ ] **29. Keep software surfaces inside laptop or monitor frames.** Workspaces should not float outside the illustrated screen or be clipped by decorative frames. The frame should support the task instead of fighting it.
- [ ] **30. Validate desktop and mobile layout fit for dense work surfaces.** Check narrow screens, long source lists, side-by-side panels, scrollable references, and task buttons. Layout problems become task-completion problems.

## D. Interaction Design

- [ ] **31. Make anything that looks clickable either clickable or clearly static.** Rows, chips, tabs, phone controls, profile links, cards, and drawing callouts should respond if they look like controls. Static decoration should not mimic an action.
- [ ] **32. Convert long free-text tasks into bounded artifacts.** Use structured note sections, checklists, selected paragraphs, callout categories, flow blocks, or short product-plan parts. Bounded artifacts are easier for students and fairer to grade.
- [ ] **33. Use checklists, required selections, or structured sections.** Students should know what counts as complete. Required categories and named sections reduce vague submissions.
- [ ] **34. Add submit gates for required task evidence.** Prevent submission until required callouts, questions, note sections, source tabs, or artifact parts are complete. A clear gate is better than silent grading failure.
- [ ] **35. Provide clear blocker messages for incomplete work.** Tell students exactly what is still needed, such as choosing two client questions, labeling a final screen, opening required references, or answering every callout.
- [ ] **36. Keep helper companions hidden behind `Need help` when they distract.** Always-visible companions can make the workspace crowded or over-guided. Use a modal or help button when the companion is optional support.
- [ ] **37. Avoid over-helpful controls that reduce authentic task judgment.** Remove visible controls or hints that do the work for the learner. Keep enough feedback to understand the task without turning the task into a tutorial answer.
- [ ] **38. Make visual tasks hands-on where appropriate.** Use playable rooms, phone mocks, drawing callouts, flow builders, design studios, physical observations, or artifact assembly when visual judgment is central to the role.
- [ ] **39. Keep reference panels scrollable and readable.** Manuals, policies, support notes, source tabs, and transcript panels need stable height, overflow handling, and clear headings. Dense reference material should not clip or cover the task.
- [ ] **40. Add responsive behavior for narrow screens.** Use compact labels, stacking layouts, scrollable drawers, narrower cards, and mobile-safe controls. Students should be able to complete the same task on smaller screens.

## E. AI, Voice, and Conversation Scenes

- [ ] **41. Bound AI or live scenes with clear goals and turn limits.** Define what the learner should ask or explain, the minimum and maximum turns, and when the meeting can end. Unbounded conversations are hard to complete and grade.
- [ ] **42. Show prep notes or references during live conversations.** Keep the student's goal, saved notes, policy limits, prepared questions, or source facts visible during the meeting. This keeps the conversation fair and focused.
- [ ] **43. Add typed fallback when voice-only interaction hurts accessibility.** Let typed turns satisfy the same task requirements as spoken turns when the simulation supports both modes. Text should not become a second-class path.
- [ ] **44. Preserve transcript integrity for typed and spoken turns.** Append typed messages to the same conversation evidence and avoid duplicate transcript echoes. Grading should see one clean record of what the student actually said.
- [ ] **45. Prevent AI characters from revealing answer-key details too early.** NPCs should not volunteer private facts, CRM details, risk signals, user motivations, or prepared answers before the learner asks or verifies appropriately.
- [ ] **46. Test AI prompts against off-task, angry, unsafe, or answer-seeking inputs.** The AI should stay in role, refuse unsafe or irrelevant requests gracefully, avoid leaking final answers, and handle messy student behavior.
- [ ] **47. Replace live voice with a deterministic handoff when voice adds too much friction.** If a required live call does not teach enough for its cost, use a clear written handoff that carries the same facts into the next task.

## F. Grading and Assessment

- [ ] **48. Align rubric criteria to the active required route only.** Remove criteria and evidence IDs for deleted scenes. Add criteria for new bounded artifacts and make each scoreable task map to clear evidence.
- [ ] **49. Serialize learner artifacts clearly for grading.** Save structured outputs with labels, source context, transcript references, node kinds, selected options, or artifact bounds. Grading should not have to infer what the student meant from raw UI state.
- [ ] **50. Add deterministic checks for objective artifact failures.** Use code checks for overlaps, missing required node kinds, incomplete callouts, route drift, hidden correctness leaks, stale scene IDs, or missing source tabs before relying on AI judgment.

## G. Documentation, Assets, and QA

After completing the 50 checklist items, close the upgrade with a documentation and verification pass:

- Update nearby docs such as `SCENE_BLUEPRINT.md`, `VALIDATION.md`, `CHECK_REPORT.md`, `IMAGE_PROMPTS.md`, `ACTION_ASSETS.md`, `visual/visual-bible.json`, and `src/data/job-simulation.md` when the active route, task mix, assets, or scoring changed.
- Delete or reroute obsolete scene images, generated metadata, and prompt references when branches or scenes are removed.
- Add targeted static tests for route shape, required task content, source tabs, glossary rendering, submit gates, saved-state redirects, and artifact serialization.
- Run the simulator's existing tests or the strongest available checks for that package. When no test script exists, use JSON parsing, focused static assertions, `git diff --check`, build checks, and browser QA.
- Verify realistic workplace software visually on desktop and mobile, especially role-specific layout, data hierarchy, tabs/tables/search/status indicators, realistic controls, laptop/monitor fit, scroll behavior, button reachability, and text overflow.
- Record any intentionally skipped checklist item with a short reason so future agents do not reintroduce a rejected task or old flow.
