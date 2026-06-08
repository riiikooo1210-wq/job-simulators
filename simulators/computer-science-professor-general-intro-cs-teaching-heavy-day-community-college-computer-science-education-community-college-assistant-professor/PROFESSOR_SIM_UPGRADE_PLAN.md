# Professor Simulator Upgrade Plan

## Scope

This is an audit and redesign plan for the existing community-college CS professor simulator. Data collection is treated as fixed. The upgrade starts after collection and brings the simulator up to the current workflow standard: source-derived work mix, visible input artifacts, realistic work surfaces, student-produced outputs, explicit rubric evidence, current reference UI behavior, and a Phase 2 approval artifact before any scaffolding.

## Current State Summary

- Existing story shape is strong: a teaching-heavy CSC 101 day with lesson adjustment, office hours, student support triage, department coordination, grading feedback, and an LMS announcement.
- Current strict validation result: `15 pass / 7 warn / 6 fail`.
- Hard failures:
  - `triage_morning` has a `diagnostic_first` branch flag but no explicit branch case.
  - `office_hour` has no `meetingMode`.
  - `office_hour` and `chair_slack` goal prompts do not define how the AI should end the conversation.
  - `chair_slack` has no explicit `maxTurns`.
  - `workMixDesign` is missing.
- Design warnings:
  - No `deskWorkDesign` chain on any desk-work scene.
  - `lms_announcement` uses `appWindow: "email"` but has no `emailHeaders`.
  - Colocated spoken work is not rendered as in-person.
  - Expert/source materials are mostly implied in prose rather than visible as source artifacts.
  - Rubric criteria lack `evidenceSceneIds`.
- Structural artifact gaps:
  - No `SCENE_BLUEPRINT.md`.
  - No `ACTION_ASSETS.md`.
  - `IMAGE_PROMPTS.md` uses old style-first packaging instead of subject-first prompt packaging.
  - Scene images are 8 KB placeholders, not generated scene art.
- Runtime/UI gaps:
  - The simulator copy predates current reference support for `physical_playground`, `action_simulation`, `appTabs`, `emailHeaders`, in-person voice meetings, meeting reference panels, and message-style MCQ preview.
  - Old app windows use off-palette brand colors and dark UI surfaces for work windows, especially Slack, spreadsheet, code, kanban, and meeting frames.
  - The office-hour scene is rendered like a laptop/video meeting even though it should be face-to-face in an office.

## Target Work Mix

The role is not a pure desk job. It is a hybrid classroom, student-support, and LMS/admin day.

- `physicalProceduralTool`: secondary. The professor physically teaches in a computer lab, uses a whiteboard/projector, observes student responses, and runs class-room checks. This should not be reduced to a written lesson plan only.
- `digitalToolArtifactWork`: major. Canvas, SpeedGrader, Slack, attendance records, lesson docs, and support triage boards are central.
- `cognitiveAnalysisDecision`: major. The professor diagnoses misconceptions, prioritizes student needs, and distinguishes class-wide learning issues from individual cases.
- `writtenDocumentationArtifact`: major. Lesson adjustments, feedback comments, Slack updates, and LMS announcements are real deliverables.
- `spokenInterpersonalCommunication`: major. Office hours are core and should be a real in-person voice scene.
- `passiveMonitoringWaitingContextSwitching`: secondary. Time pressure and interruptions matter, but active work should dominate.

Target active-scene mix: one bounded MCQ with real consequences, one physical/classroom action scene, one in-person voice meeting, one student-support sorting/triage scene, and at least four written or structured workplace deliverables.

## Proposed Revised Scene Arc

### 1. `intro` - Welcome to Mesa Vista

Keep the premise. Refresh the image prompt so the first scene clearly shows a community-college computer lab, CSC 101, Python loops, student diversity, and the instructor's desk. No grading evidence needed.

### 2. `briefing_morning` - Morning Source Packet

Change from prose-only briefing to a source-artifact briefing with `referenceTitle` and `referenceContent`.

Visible inputs:
- Canvas inbox excerpt: due-date confusion, lab access issue, screenshot-with-no-question, late-work question.
- Warm-up / Lab 4 pattern: several submissions show `range(5)` boundary confusion and accumulator updates outside the loop.
- Chair request: attendance flags due by noon.
- Tutoring center note: two Python help slots available.

Purpose: give novices enough evidence to make the next decision without needing hidden teaching knowledge.

### 3. `triage_morning` - Pick the First Move

Keep as a bounded MCQ, but fix branching.

Required changes:
- Add explicit `diagnostic_first` redirect, e.g. `redirect_diagnostic`, before converging to `lesson_plan`.
- Keep distinct redirects for email-first, pacing-first, and admin-first.
- Show the selected action's consequence before convergence.
- Add `deskWorkDesign` because the decision is based on visible Canvas / lab evidence.

This remains a good MCQ because the choice is a finite first-move triage decision.

### 4. `lesson_plan` - Redesign the First 15 Minutes

Keep as constructed response, but make the input artifact visible and more concrete.

Visible inputs:
- Warm-up snippet:
  ```python
  total = 0
  for i in range(5):
      total = total + i
  print(total)
  ```
- Two anonymized student answer patterns:
  - "range includes 5, so it runs 6 times"
  - "total changes after the loop, not during each pass"
- Time constraint: 15 minutes.
- Teaching constraints: prediction before running, trace table, short guided practice, evidence check.

Student output:
- Three-part mini-lesson plan with teaching move, why it helps, and evidence to watch.

UI plan:
- Use a warm cream Notion/doc work surface.
- Remove redundant banner image if `appWindow` is set.
- Add `deskWorkDesign`.

### 5. New `classroom_reset` - Teach the Loop Reset

Add a playable classroom action scene. This is the biggest authenticity upgrade.

Recommended type: `physical_playground`.

Simulated real-world action:
- Facilitate the first 10-15 minutes of class after discovering loop-boundary confusion.

Digital primitives:
- Click the projected code example to reveal / run it.
- Drag predicted values into a trace table.
- Select which student response card shows the key misconception.
- Place the correct next prompt onto the whiteboard: "Predict first, then run".
- Submit an observation note about what the class still misunderstands.

Visible stage:
- 16:9 computer lab image with projector, whiteboard, a few student monitors, and anonymized sticky/poll responses.

Required assets:
- Background lab image.
- Projected code closeup.
- Student answer cards with plausible distractors.
- Trace-table overlay or closeup.
- Whiteboard prompt cards.
- Optional before/after whiteboard state.

Why this matters:
- The current sim says the professor adjusts teaching, but the player only writes a plan. The latest workflow expects meaningful physical/procedural/classroom work to be playable inside the workplace stage.

### 6. `office_hour` - Office Hours with Jayden

Keep the voice scene but make it in-person and grounded in visible prep.

Required changes:
- Add `meetingMode: "in_person"`.
- Use the current in-person voice meeting UI pattern with the office illustration above the controls.
- Add `prepReferenceTitle` / `prepReferenceContent` with Jayden's anonymized evidence:
  - missed one lab
  - copied examples without predicting output
  - confusion about whether `range(5)` includes 5
  - working 25 hours/week
- Rewrite `goalPrompt` endpoint:
  - Jayden should reveal the copied-example habit and range misconception if asked.
  - If the professor explains one idea clearly and offers a concrete next step, Jayden should summarize the plan and close within 7 professor turns.
  - If the professor is dismissive or vague, Jayden should remain hesitant but still end when the turn limit approaches.
- Keep `minTurns: 3`, `maxTurns: 7`.

### 7. `support_matrix` - Prioritize Student Support Cases

Keep as a drag/sort task, but it needs real case details and novice-adequate criteria.

Visible inputs:
- Triage criteria card:
  - access/accommodation deadlines
  - imminent learning loss
  - class-wide confusion
  - privacy / FERPA
  - what can wait without harm
- Six expanded case cards:
  - Accommodation letter: lab extension needed before tonight's deadline.
  - Missing labs: student has missed three labs and stopped opening Canvas.
  - Broken laptop: student reports laptop failed before quiz; needs campus loaner path.
  - Academic integrity concern: two submissions similar; evidence incomplete, private handling needed.
  - Transfer advising: useful but not urgent today.
  - Due-date confusion: multiple students asking about the same Lab 4 deadline.

UI / logic:
- Require every card to be placed before submit, or convert to a `kanban_board` with `requireAllCardsMoved`.
- Add `referenceTitle` / `referenceContent`.
- Add `deskWorkDesign`.

### 8. `chair_slack` - Department Chair Check-in

Keep as Slack because the source says department coordination and LMS/email are realistic.

Required changes:
- Add `maxTurns: 1`.
- Rewrite `goalPrompt` with a clear endpoint: Morales should acknowledge once, ask no further questions unless the student's reply is dangerously unclear, and then close.
- Make the source material visible:
  - class-wide loop misconception count
  - support triage summary
  - FERPA reminder
  - tutoring center capacity
- Add `deskWorkDesign`.
- Consider making this a one-shot Slack deliverable rather than an open AI chat if we want lower cost and tighter grading.

### 9. `grading_feedback` - Grade Two Loop Lab Submissions

Keep the structured-entry task, but it currently has the biggest source-visibility problem: the player grades code they cannot see.

Visible inputs:
- Submission A code snippet with a boundary error.
- Submission B code snippet with an accumulator / indentation error.
- Mini grading guidance: identify misconception, explain repair, give one next test, avoid shaming.

Student output:
- For each student: main issue, exact feedback comment, next step.

UI plan:
- Prefer a SpeedGrader-like cream work surface.
- Either add reference/tab support to `StructuredEntryScene`, or convert this to a `free_text` scene with tabs for the two submissions and require two labeled comments.
- Add `deskWorkDesign`.

### 10. `lms_announcement` - Post the Canvas Announcement

Keep as final written deliverable but make it look like Canvas and show its inputs.

Required changes:
- If kept as `appWindow: "email"`, add `emailHeaders`:
  - From: `Dr. Avery Chen`
  - To: `CSC 101 - both sections`
  - Subject: `Loop Lab 4 due date and practice plan`
- Better: use `appWindow: "notion"` or `"doc"` titled `Canvas Announcement Editor` if the renderer supports it more naturally.
- Add `appTabs`:
  - due-date clarification
  - loop topic to review
  - tutoring / office-hours support options
  - tone bar: warm, precise, not punitive
- Add `deskWorkDesign`.

### 11. `grading` and `final_report`

Keep both. Update copy only if new scenes are added, so the final grading summary names classroom reset, office-hour coaching, support triage, feedback, Slack, and LMS communication.

## Rubric Redesign

Keep 7-8 criteria, but add explicit evidence mapping. Proposed criteria:

- Instructional diagnosis: `triage_morning`, `lesson_plan`, `classroom_reset`
- Mini-lesson design: `lesson_plan`, `classroom_reset`
- Classroom facilitation: `classroom_reset`
- Office-hour coaching: `office_hour`
- Student-support prioritization: `support_matrix`
- Professional coordination and privacy: `chair_slack`
- Diagnostic programming feedback: `grading_feedback`
- LMS communication: `lms_announcement`

Every constructed-response or action scene must appear in at least one `evidenceSceneIds` array.

## UI / Runtime Upgrade Plan

The safest implementation path is not to hand-patch this old scaffold one component at a time. Use the current reference simulator as the base, then inject the revised professor content.

Required runtime updates for this simulator:
- Bring in current `types/game.ts`, `SceneEngine.tsx`, `PhysicalPlaygroundScene.tsx`, `ActionSimulationScene.tsx`, `VoiceMeetingScene.tsx`, `FreeTextScene.tsx`, `MultipleChoiceScene.tsx`, `LaptopFrame.tsx`, `index.css`, and related store/interpolation changes.
- Verify `StructuredEntryScene` can show visible source artifacts. If it cannot, either add reference/tab support generically or use `free_text` for grading feedback.
- Ensure all app windows use warm cream surfaces, not dark mode.
- Remove off-palette controls such as Google blue, bright red, Slack purple, Miro purple, dark kanban, and dark meeting UI from this simulator's active path.
- Ensure desktop overlays fit within the laptop screen footprint.
- For message-style MCQs, show the selected reply as a sent message before submit. This simulator may not need a message MCQ unless `triage_morning` is redesigned as a Slack/Canvas reply choice.

## Image and Asset Plan

- Regenerate `IMAGE_PROMPTS.md` using current subject-first packaging.
- Generate real scene images after approval, replacing placeholder 8 KB PNGs.
- Add `ACTION_ASSETS.md` for `classroom_reset`.
- Required classroom action assets:
  - `public/scenes/classroom.png`
  - `public/action-assets/classroom_reset/projected-loop-code.png`
  - `public/action-assets/classroom_reset/student-answer-boundary.png`
  - `public/action-assets/classroom_reset/student-answer-accumulator.png`
  - `public/action-assets/classroom_reset/trace-table-empty.png`
  - `public/action-assets/classroom_reset/trace-table-filled-state.png`
  - `public/action-assets/classroom_reset/whiteboard-prompt-card.png`
- Office-hour illustration must show Jayden in the faculty office, not a video-call grid or laptop meeting.

## Proposed Build Sequence

1. Phase 2 redesign:
   - Rewrite `job-simulation.md` only as needed to reflect the playable classroom scene and visible artifacts.
   - Rewrite `scene-config.json` with `workMixDesign`, `deskWorkDesign`, visible sources, in-person voice, branch consequences, and evidence mapping.
   - Generate `SCENE_BLUEPRINT.md`.
   - Pause for user approval.
2. After approval, scaffold or sync:
   - Prefer rerunning scaffold with the revised config, or carefully sync this simulator to the current `templates/reference`.
   - Preserve any manually desired professor content.
3. Validate:
   - Run `python -m workflow.validate --slug <slug> --strict`.
   - Fix all hard gates and source-artifact warnings.
4. Run and playtest:
   - Install dependencies if needed.
   - Run the simulator locally.
   - Click/play every branch, including each MCQ consequence.
   - Test voice meeting behavior with and without API-key availability.
5. Image iteration:
   - Generate scene images and action assets.
   - Verify hotspots/assets align with the classroom physical playground.
   - Re-run validation and perform a final walkthrough.

## Acceptance Criteria

- Strict validation passes, or any remaining warnings are documented and intentionally accepted.
- `SCENE_BLUEPRINT.md` exists and shows the input -> action -> output -> rubric chain for every active scene.
- Active scenes include at least:
  - one MCQ with distinct consequences
  - one classroom physical/action scene
  - one in-person voice meeting
  - one sorting/prioritization task
  - at least three written/structured deliverables
- Every source-based task has visible source material.
- Every constructed-response/action scene maps into `evidenceSceneIds`.
- The office-hour conversation is in-person, not a remote laptop meeting.
- The grading feedback scene shows the code being graded.
- The LMS announcement has visible due-date/support inputs and realistic headers or Canvas editor framing.
- No generic "I did it" button replaces classroom action.
- All active work windows use the warm cream simulator palette.
