# Journalist NBA Beat Reporter Simulator — Deep Audit and Upgrade Plan

Target simulator:
`journalist-nba-team-beat-reporter-in-person-beat-reporting-nba-team-beat-reporting-at-a-national-sports-media-brand-in-the-united-states-established-national-sports-media-brand-entry-level-junior`

Scope:

- Audit only this journalist NBA simulator.
- Use the latest `WORKFLOW.md` as the quality standard.
- Treat existing data collection as usable.
- Plan improvements after data collection: synthesis/design, scene config, UI/UX, validation, image/action assets, and run/QA.

## Current State Summary

This simulator has a good job premise and a believable first draft of a game-night beat reporting arc. It gives the player meaningful constructed-response work: a reporting plan, voice meeting, note sort, fast gamer, editor Slack update, and final story package.

But it predates the current workflow. It lacks the newer Phase 2 design artifacts and many current hard gates:

- No `workMixDesign`.
- No generated `SCENE_BLUEPRINT.md`.
- No `ACTION_ASSETS.md`.
- No `deskWorkDesign` chains on active desk-work scenes.
- No `evidenceSceneIds` in rubric criteria.
- No in-person `meetingMode` despite in-arena spoken reporting.
- MCQ branch case missing for the strongest option.
- Source materials are introduced once, then later writing scenes rely too much on memory.
- The UI shell is older: dark meeting/kanban surfaces, off-palette meeting controls, older MCQ behavior, and no current in-person voice visual pattern.

Strict validation currently reports:

```text
14 pass · 6 warn · 5 fail
```

Hard failures:

- `lead_angle`: branch case missing for `strong_angle`.
- `media_scrum`: voice meeting missing `meetingMode`.
- `editor_slack`: missing explicit `maxTurns`.
- `editor_slack`: `goalPrompt` does not clearly tell the NPC when/how to end.
- Missing `workMixDesign`.

## Latest Workflow Requirements That Matter Here

The newest workflow changes after data collection require this simulator to be redesigned around these standards:

- Phase 2 must produce `job-simulation.md`, `scene-config.json`, and `SCENE_BLUEPRINT.md`.
- Phase 2 approval must happen before scaffolding.
- Every simulator needs a source-derived work mix; physical/procedural work is job-specific, not a universal ratio.
- Desk-work scenes need visible input artifacts, realistic work surfaces, student output artifacts, continuity, and rubric evidence.
- MCQ scenes must show meaningful immediate consequences before converging.
- MCQ message choices should feel sent before advancing.
- Spoken in-person work must be `voice_meeting` with `meetingMode: "in_person"`.
- In-person voice scenes must show a 16:9 illustration of people/place, not a laptop/video-call grid.
- Meeting prep must stay visible in the meeting via `prepNoteKey` when the player prepared questions/notes earlier.
- Typed workplace deliverables must be submitted in realistic tools.
- Work windows for reading/writing/sorting should use cream work surfaces, not dark UI.
- Physical/procedural/tool work should be represented as visible interaction when it matters, not narrated away.
- Strict validation should pass before the simulator is considered current-standard.

## Source-Derived Work Mix

Data inspected:

- O*NET `News Analysts, Reporters, and Journalists`.
- YouTube transcripts:
  - `Inside Pistons Coverage ft. Omari Sankofa & Ayden Novak`
  - `Courtside Reporter's Game Day in the Life`
  - `HOW I STARTED WORKING FOR THE LAKERS`
  - `How To Make it As A Sports Journalist`
  - `Taylor Rooks / NBA Bubble interview`
- Reddit digest exists but contains no qualifying posts because public JSON endpoints returned HTTP 403.

Recommended `workMixDesign`:

- `physicalProceduralTool`: meaningful secondary. The job happens in physical spaces: media entrance, arena work table, court baseline, coach podium, locker-room hallway/media scrum. The sim needs at least one playable visual scene where the student inspects or records visible in-arena evidence.
- `digitalToolArtifactWork`: major. Beat reporters use Slack, CMS, live box scores, injury/availability reports, notes, quote logs, social feeds, and editor messages.
- `cognitiveAnalysisDecision`: major. The student must decide what is reportable, what is verified, what needs attribution, what leads, and what stays out.
- `writtenDocumentationArtifact`: dominant. The student should produce a reporting plan, observation note, note sort/rationale, gamer draft, editor update, and final story package.
- `spokenInterpersonalCommunication`: major. The role is built around player/coach availability, source relationships, concise questions, and respectful follow-ups. At least one in-person voice scene is required.
- `passiveMonitoringWaitingContextSwitching`: secondary. Waiting, deadlines, live game monitoring, and sudden updates should appear as time pressure and incoming material, not click-through filler.

## Existing Scene Inventory

Current nodes:

1. `intro` — intro
2. `assignment_brief` — briefing
3. `lead_angle` — multiple choice
4. `redirect_rumor` — briefing
5. `redirect_generic` — briefing
6. `redirect_color` — briefing
7. `reporting_plan` — structured entry
8. `media_scrum` — voice meeting
9. `fast_gamer` — free text
10. `editor_slack` — Slack thread
11. `final_story` — free text
12. `grading` — grading
13. `final_report` — final report

Current constructed-response scenes:

- `reporting_plan`
- `media_scrum`
- `fast_gamer`
- `editor_slack`
- `final_story`

That count is enough, but the scenes need stronger source visibility, continuity, and evidence mapping.

## Scene-by-Scene Audit and Improvement Plan

### `intro` — Welcome to Full Court Wire

Current function:

- Establishes the player as Jordan Lee, entry-level NBA beat reporter.
- States the core arc: choose an angle, ask questions, organize notes, file copy.

Current issues:

- Good framing, but too generic for the full game-night reality discovered in sources.
- Does not preview the physical/digital mix: media entrance, arena table, coach/player access, live note monitoring, CMS filing.
- Image prompt is from older packaging where style appears before scene-specific subject.
- Local persisted state can load an invalid node from prior dev state; this is a runtime/scaffold issue that should be fixed when upgrading the app shell.

Upgrade plan:

- Keep the role and fictional outlet.
- Make the first screen preview the real day structure: assignment, credentialed arena work, availability, live observation, postgame quotes, deadline filing.
- Regenerate prompt in subject-first format.
- Make sure the upgraded scaffold uses a reliable per-simulator persist key before the store initializes.

### `assignment_brief` — 4:18 PM Assignment Desk

Current inputs:

- Tessa Slack: clean gamer by 11:10 ET, watch Reed movement and closing lineup, do not chase trade rumor unless on record.
- Mia Slack: distinguish team PR injury status from reporter observation; use exact attribution.
- Metrics table:
  - Malik Reed available without restriction.
  - Deadline.
  - Rumor quality: fan accounts only.

Current strengths:

- Strong newsroom premise.
- Good attribution warning from copy desk.
- Meaningful bounded source material.

Current issues:

- The source packet is not formalized as `referenceTitle` / `referenceContent`.
- The assignment is not preserved as tabs/reference in later scenes.
- The "Start the Task" button appears before the source artifacts, making it easy to advance without reading.
- No `deskWorkDesign` because it is a briefing, but the visible inputs need to be the canonical source for later scenes.
- The illustration contains a laptop Slack view with tiny/truncated text; the actual source materials need to live in UI text, not only in image text.

Upgrade plan:

- Convert this into a structured game-night packet:
  - Editor ask and deadline.
  - Team PR injury/availability note.
  - Expected rotation/closing lineup context.
  - Live box score context placeholder.
  - Social rumor provenance and verification rule.
  - Copy desk attribution/style reminder.
- Add:
  - `referenceTitle: "Cyclones game-night source packet"`
  - `referenceContent` with the compact source packet.
- Let later scenes reference this packet in `deskWorkDesign.inputArtifacts`.
- Put the primary advance button after the visible artifacts.

### `lead_angle` — Choose the Lead Angle

Current options:

- `reed_return` -> `strong_angle`
- `trade_rumor` -> `rumor_angle`
- `generic_preview` -> `generic_angle`
- `coach_personality` -> `color_angle`

Current strengths:

- The options represent realistic novice traps: rumor, generic safety, personality color.
- MCQ is appropriate here because the decision is bounded.

Current issues:

- `strong_angle` has no explicit branch case; strict validation fails.
- The scene is not rendered as a Slack/editor reply even though the player is effectively answering an editor.
- Selection immediately advances; current workflow expects message choices to render as sent before submit.
- Only weaker choices receive redirect consequence scenes; the strong choice silently defaults forward.
- Redirect scenes do not preserve the student's selected reply.

Upgrade plan:

- Add `appWindow: "slack"` and `windowTitle: "#nba-cyclones"`.
- Add an incoming Tessa message in `slackMessages`.
- Add `prompt: "Choose the reply you would send Tessa."`
- Route every flag explicitly:
  - `strong_angle` -> `redirect_strong_angle`
  - `rumor_angle` -> `redirect_rumor`
  - `generic_angle` -> `redirect_generic`
  - `color_angle` -> `redirect_color`
- Add `deskWorkDesign` because this is a desk-message decision:
  - Input: assignment packet.
  - Action: choose reportable angle.
  - Output: editor Slack reply.
  - Rubric evidence: `mcSelections.lead_angle`, `branchFlags.lead_angle`.
- In the UI, selected option should render as the player's sent Slack message, then require Submit.

### `redirect_strong_angle` — New Consequence Scene

Why needed:

- Current strong option goes directly to `reporting_plan`.
- Latest workflow requires distinct consequence branches for all MCQ options.

Plan:

- Add a Slack-style briefing showing:
  - Tessa's original question.
  - Player's chosen reply via `{{mc.lead_angle.label}}`.
  - Tessa greenlighting the angle and giving a concrete next instruction.
- Converge to `reporting_plan`.

### `redirect_rumor` — Rumor Without Grounding

Current function:

- Explains that no direct source will touch the rumor on record and Tessa redirects to Reed/lineup.

Current issues:

- Plain narrative, not a continuous Slack consequence.
- Does not preserve the player's selected reply.
- The consequence is useful but should feel like a newsroom correction in-thread.

Upgrade plan:

- Render as Slack-style briefing:
  - Incoming editor prompt.
  - Player reply via `{{mc.lead_angle.label}}`.
  - Tessa correction about on-record threshold and credibility.
- Make the redirect teach: rumor can be monitored but cannot drive the gamer without verification.
- Converge to `reporting_plan`.

### `redirect_generic` — Too Broad for Deadline

Current function:

- Explains a broad preview would be accurate but forgettable.

Current issues:

- Same continuity issue: no visible sent reply.
- Needs a clearer immediate newsroom consequence: broad angle wastes scarce pregame access.

Upgrade plan:

- Render as Slack-style briefing.
- Tessa should redirect the student toward a specific verification plan.
- Converge to `reporting_plan`.

### `redirect_color` — Color Needs a Point

Current function:

- Explains coach mood can support a story but is not the story.

Current issues:

- Same continuity issue.
- Needs a stronger journalism lesson: observed color must be tied to verified decisions and should not become personality speculation.

Upgrade plan:

- Render as Slack-style briefing.
- Tessa should coach the student to use color only as support after reporting the Reed/lineup question.
- Converge to `reporting_plan`.

### `reporting_plan` — Pregame Reporting Plan

Current task:

- Structured entry with 4 reporting needs.
- Fields:
  - What you need to know.
  - Best source.
  - Question or verification step.
  - Reporting risk.

Current strengths:

- This is a strong, role-specific deliverable.
- The fields are genuinely useful for novice beat-reporting discipline.

Current issues:

- No source tabs inside the work surface.
- The player has to rely on memory from `assignment_brief`.
- The voice meeting does not surface this prep later via `prepNoteKey`.
- The prompt mentions coach availability and locker room, but current flow jumps straight to Malik.
- No `deskWorkDesign`.

Upgrade plan:

- Keep the same structured fields.
- Add source/reference tabs:
  - `assignment_packet`
  - `availability_schedule`
  - `injury_status`
  - `rumor_policy`
  - `copy_desk_bar`
- Store output under `pregame_plan`.
- Add `deskWorkDesign`:
  - Input artifacts: assignment packet, injury report, schedule, copy desk guidance.
  - Student action: build a plan for who to ask, what to verify, and what risk to avoid.
  - Output artifact: pregame reporting plan rows.
  - Rubric evidence: `freeTextResponses.pregame_plan`.
  - Continuity: appears in coach/player availability via `prepNoteKey`.
- Route next to a concrete arena observation or coach availability scene, not immediately to Malik.

### New `arena_check_in` or `warmup_observation` — Physical Playground

Why needed:

- The role is not purely desk work. Sources describe being at practices, games, media entrances, press conferences, locker rooms, and court areas.
- The current simulator says the player watches Reed's movement but never makes them inspect or record visible evidence.
- Latest workflow says meaningful physical/procedural/tool work should be simulated in visual playground scenes, not narrated.

Recommended scene: `warmup_observation`.

Real workflow script:

- Arrive at media row.
- Confirm credential/deadline context.
- Open injury/availability note.
- Watch Reed during warmups for specific movement evidence.
- Distinguish observation from official team status.
- Capture one observation and one caveat in notebook form.

Visible evidence:

- Arena/media-row 16:9 background.
- Reed on court during warmup.
- Trainer near baseline.
- Phone/social rumor feed.
- Team PR availability note.
- Notebook/recorder/laptop at media table.

Objects/surfaces:

- Credential/deadline card.
- Injury report closeup.
- Live box-score or pregame status panel.
- Notebook closeup.
- Court hotspots for Reed cut, trainer check-in, coach/assistant exchange, social rumor feed.

Digital primitives:

- Click to inspect readable surfaces.
- Click hotspots to observe evidence.
- Write observation note.
- Possibly mark observed evidence as `official`, `attributed`, `observation`, or `unverified`.

Output:

- `warmup_observation` text: observation + caveat.

Rubric evidence:

- Note discipline.
- Reporting plan quality.
- Angle judgment.

Asset needs:

- Background image.
- Readable closeups for injury report, rumor feed, credential/deadline, notebook.
- Optional transparent overlays for phone/notebook/recorder.

### New `coach_availability` — Coach Question Scene

Why needed:

- The final story uses a Coach Harris quote, but the current player never asks Coach Harris anything.
- Closing lineup is one of the central story questions, and the coach is the best source.

Recommended design:

- Prefer a short `voice_meeting` with `meetingMode: "in_person"`.
- If voice workload is too high, use a bounded MCQ question-selection scene with consequences, but voice is more authentic.

Inputs:

- Student `pregame_plan` via `prepNoteKey`.
- Compact reference: Reed status, closing lineup question, deadline, copy desk attribution reminder.

NPC behavior:

- Coach gives guarded, non-final answers.
- Rewards concise, specific questions.
- Pushes back if student asks rumor/personality speculation.
- Provides a usable quote like "closing groups are situational" only when asked a lineup/process question.

Output:

- Coach availability transcript or selected question + answer.

Rubric evidence:

- Scrum/question quality.
- Reporting plan.
- Note discipline.

### `media_scrum` — Malik Reed Media Scrum

Current behavior:

- Voice meeting with Malik Reed.
- Good `goalPrompt`: precise questions reveal ankle stability, minutes limit, trainer check-in, closing expectation, and not overframing personal comeback.
- `minTurns: 3`, `maxTurns: 7`, `voiceName: "Puck"`.

Current issues:

- Missing `meetingMode`.
- No `prepNoteKey`, despite following `reporting_plan`.
- Old UI renders it as a dark laptop meeting, not in-person arena scrum.
- Uses off-palette blue/red controls.
- Practice transcript is hardcoded in the renderer, making it job-specific code instead of content/config.
- Timeline is muddy: content says "After warmups," but later scenes use postgame facts and quotes.

Upgrade plan:

- Decide timeline:
  - Best: make Malik scene postgame, after warmup observation + coach availability + possession timeline watch.
  - Alternative: keep it pregame but remove postgame-specific facts from the NPC prompt.
- Set `meetingMode: "in_person"`.
- Add:
  - `playerGoal`
  - `prepNoteKey: "pregame_plan"`
  - `prepNoteTitle: "Your reporting plan"`
  - `prepReferenceTitle: "Scrum reference"`
  - `prepReferenceContent` with short facts, not a script.
- Update `goalPrompt` endpoint:
  - Close naturally after the student has covered ankle feel, restrictions/check-in, closing role, and team frame.
  - Do not volunteer everything at once.
  - Do not open new topics after closing.
- Use the current in-person voice visual pattern:
  - 16:9 arena/locker-room scrum illustration.
  - Speak controls below.
  - Transcript and prep reference visible.
  - Cream transcript surfaces.
- Move offline/practice transcript into content config or a generic testing path, not hardcoded renderer text.

### `fast_gamer` — Write the Fast Gamer

Current task:

- Write 120-220 words.
- Include final score, Reed return, closing-lineup angle, and one attributed quote/paraphrase.
- Do not include unverified trade whisper.

Current strengths:

- Excellent role-specific production task.
- Word limit creates deadline pressure.
- Good accuracy constraint.

Current issues:

- No visible source tabs for box score, quotes, note sort, or copy desk rules.
- Player must remember exact details from prior scenes.
- No `deskWorkDesign`.
- The CMS surface is visually plausible but too context-thin.

Upgrade plan:

- Add app tabs:
  - `box_score`
  - `sorted_notes`
  - `quote_log`
  - `editor_bar`
  - `style_attribution`
- Add `deskWorkDesign`.
- Keep word count.
- Prompt should still explicitly ban the unverified whisper.
- Use the player's own working notes and voice transcripts where runtime supports it; otherwise summarize the relevant outputs in a reference tab.
- Output evidence: `freeTextResponses.fast_gamer`.

### `editor_slack` — Editor Slack Update

Current setup:

- Tessa asks for sharper morning follow: Reed comeback, closing lineup, or bench problem.
- Mia asks to flag anything not publishable yet.

Current strengths:

- Realistic editor communication moment.
- Good compact professional writing task.

Current issues:

- Missing `maxTurns`.
- Goal prompt lacks endpoint instruction.
- No visible reference to draft, working notes, quote log, or held-back detail.
- Chat can become broader than a one-message editor update.
- No `deskWorkDesign`.

Upgrade plan:

- Set `maxTurns: 1`.
- Goal prompt endpoint:
  - After one player reply, Tessa replies with a brief 2-3 sentence acknowledgement and closes.
  - Do not ask follow-up questions.
- Add compact reference panel or scene tabs:
  - Fast gamer summary.
  - Sorted note rationale.
  - Unverified items.
  - Tomorrow access window.
- Add `deskWorkDesign`.
- Output evidence: `npcConversations.chat:editor_slack:tessa` or equivalent conversation key.

### `final_story` — Final Filed Story Package

Current task:

- Write headline.
- 2-3 sentence nut graf.
- Three supporting bullets.
- One quote to use.
- One detail to hold back.
- Next reporting question.
- 160-320 words.

Current strengths:

- Strong final deliverable.
- It asks for story packaging, not just prose.
- It includes hold-back discipline and follow-up planning.

Current issues:

- No source tabs.
- No editor feedback carried from `editor_slack`.
- No quote/box score/style reference visible.
- No `deskWorkDesign`.

Upgrade plan:

- Add app tabs:
  - `fast_gamer_draft`
  - `editor_feedback`
  - `verified_facts`
  - `quote_log`
  - `hold_back`
  - `tomorrow_follow`
- Add `deskWorkDesign`.
- Keep current prompt structure.
- Output evidence: `freeTextResponses.final_story`.

### `grading` — End of Game Night

Current function:

- Transitions to final assessment.

Current issues:

- Grading can run, but rubric evidence mapping is incomplete.
- If new scenes are added, grading content should mention observation, coach access, and source discipline.

Upgrade plan:

- Update content to summarize the upgraded workflow:
  - Assignment.
  - Source packet.
  - Observation.
  - Coach/player access.
  - Note sort.
  - Gamer.
  - Editor update.
  - Final package.

### `final_report` — Final Report

Current function:

- Summarizes performance as entry-level NBA team beat reporter.

Current issues:

- Depends on rubric evidence that is currently too broad.

Upgrade plan:

- Keep scene type.
- Improve rubric evidence mapping so final report can cite the exact scenes.

## Rubric Upgrade Plan

Current rubric criteria:

- Angle Judgment
- Reporting Plan
- Availability Question Quality
- Note Discipline
- Fast Gamer
- Editor Communication
- Final Story Package

Current issue:

- No `evidenceSceneIds` anywhere.

Recommended mapping:

- `Angle Judgment`: `lead_angle`, all redirect scenes, `reporting_plan`
- `Reporting Plan`: `reporting_plan`, `warmup_observation`, `coach_availability`
- `Availability Question Quality`: `coach_availability`, `media_scrum`
- `Observation and Note Discipline`: `warmup_observation`, `possession_timeline_watch`
- `Fast Gamer`: `fast_gamer`
- `Editor Communication`: `editor_slack`
- `Final Story Package`: `final_story`

Availability Question Quality now covers both coach availability and the Reed postgame scrum.

## UI/UX Audit

### App shell and state

Issue:

- Persisted state can leave the app on invalid nodes during local testing. The current store reads `STORE_PERSIST_KEY`, but the global assignment in `main.tsx` is not a robust import-order guarantee.

Plan:

- During upgrade/scaffold, use a reliable generated module or explicit env constant for persist key.
- Add a guard: if persisted `currentNodeId` is not in `storyline.nodes`, reset to `storyline.startNode`.

### Briefing UI

Issues:

- `Start the Task` may appear before the visible source artifacts.
- Briefing is not producing a reusable reference packet.

Plan:

- For dense briefings, use `referenceTitle`/`referenceContent`.
- Ensure source artifacts are visible before the advance action.
- Keep source packet accessible later via reference tabs/drawers.

### Multiple-choice UI

Issues:

- Current `lead_angle` is plain cards, not a message decision.
- Click immediately advances.

Plan:

- Use message reply mode for editor Slack choices.
- Show incoming editor message.
- Show selected reply as sent by the player.
- Require Submit.
- Then route to consequence.

### Voice meeting UI

Issues:

- Dark laptop-call visual for an in-person scrum.
- Off-palette controls: `#1a73e8`, `#EA4335`.
- No in-person scene image.
- No prep note/reference panel.

Plan:

- Use in-person voice layout for arena scrum/coach availability.
- Show 16:9 place/person image.
- Use cream transcript/reference surfaces.
- Palette-compliant controls only.
- Surface `prepNoteKey` and compact reference during meeting.

### Kanban UI

Issues:

- Dark kanban board is not aligned with current work-window requirement for reading/sorting tasks.
- Columns can feel cramped; dev controls overlap lower-right viewport during audit.

Plan:

- Use cream work surface and better responsive width.
- Add source tags on cards.
- Keep board inside desktop/laptop bounds.
- Hide dev tools in production QA.

### Writing UI

Issues:

- Fast gamer and final story have no source tabs.
- Current prompt is outside the editor, but source context is absent inside the writing surface.

Plan:

- Add app tabs to writing windows.
- Use CMS/doc surface with prompt and source tabs in same bounded window.
- Keep word counts and disabled submit states.

### Image prompts/assets

Issues:

- `IMAGE_PROMPTS.md` uses older style-first packaging.
- There is no `ACTION_ASSETS.md`.
- Images are real 1280x720 PNGs, but work-relevant information must not rely on tiny rendered text.

Plan:

- Regenerate prompt blocks with subject first, style second.
- For physical/action scenes, generate `ACTION_ASSETS.md`.
- Use readable UI text in React for critical facts; images should establish setting and evidence surfaces, not carry all needed text.

## Proposed Upgraded Flow

Recommended scene flow:

1. `intro`
2. `assignment_brief`
3. `lead_angle`
4. `redirect_strong_angle` / `redirect_rumor` / `redirect_generic` / `redirect_color`
5. `reporting_plan`
6. `warmup_observation`
7. `coach_availability`
8. `possession_timeline_watch`
9. `media_scrum`
10. `fast_gamer`
11. `editor_slack`
13. `final_story`
14. `grading`
15. `final_report`
- Do not remove `warmup_observation` unless `workMixDesign` explicitly classifies physical/in-person observation as too light, which the current sources do not support.

## New Scene Sketches

### `warmup_observation`

Type: `physical_playground`

Purpose:

- Let the student perform visible arena observation before asking/writing.

Student action:

- Inspect injury report, observe Reed movement/trainer interaction, and write a short observation/caveat.

Output:

- Observation note.

Success evidence:

- Names observation as observation, not official medical fact.
- Notes which source could confirm it.
- Avoids rumor.

### `coach_availability`

Type: `voice_meeting`, `meetingMode: "in_person"`

Purpose:

- Get the lineup quote currently appearing later without player involvement.

Student action:

- Ask concise, specific, non-leading coach questions.

Output:

- Voice transcript.

Success evidence:

- Gets a usable lineup/process quote.
- Does not ask rumor/personality-first questions.
- Keeps rotation claims caveated.

### `possession_timeline_watch`

Type: `possession_timeline`

Purpose:

- Make the player capture organized late-game evidence before postgame access and sorting/writing.

Inputs:

- Box score.
- Play-by-play snippets.
- Coach quote.
- Warmup observation.
- Social rumor update.

Student action:

- Mark notes as fact, quote, observation, color, or needs verification.

Output:

- Timeline notes and postgame scrum questions for `media_scrum` and the deadline story.

## Implementation Plan

Do this through the workflow, not by jumping straight into the scaffold:

1. Keep existing data collection.
2. Refresh Phase 2 from existing data:

   ```bash
   python -m workflow.synthesize --slug journalist-nba-team-beat-reporter-in-person-beat-reporting-nba-team-beat-reporting-at-a-national-sports-media-brand-in-the-united-states-established-national-sports-media-brand-entry-level-junior --refresh
   ```

3. Manually review and strengthen:
   - `data/<slug>/synthesis/job-simulation.md`
   - `data/<slug>/synthesis/scene-config.json`
   - `data/<slug>/synthesis/SCENE_BLUEPRINT.md`
4. Pause for approval before scaffolding.
5. After approval, scaffold with force:

   ```bash
   python -m workflow.scaffold --slug journalist-nba-team-beat-reporter-in-person-beat-reporting-nba-team-beat-reporting-at-a-national-sports-media-brand-in-the-united-states-established-national-sports-media-brand-entry-level-junior --force
   ```

6. Run strict validation:

   ```bash
   python -m workflow.validate --slug journalist-nba-team-beat-reporter-in-person-beat-reporting-nba-team-beat-reporting-at-a-national-sports-media-brand-in-the-united-states-established-national-sports-media-brand-entry-level-junior --strict
   ```

7. Run locally and click through every scene.
8. Generate scene images and action assets.
9. Re-run validation and browser QA.

## Acceptance Criteria

The upgraded journalist NBA simulator is ready only when:

- Strict validation passes with zero failures.
- `workMixDesign` exists and reflects NBA beat reporting.
- `SCENE_BLUEPRINT.md` exists and traces every active scene.
- Every active desk scene has visible source material and `deskWorkDesign`.
- All MCQ branch flags route to distinct consequence scenes.
- Message-choice MCQ renders the player's selected reply before submit.
- At least one spoken scene is `voice_meeting` with `meetingMode: "in_person"`.
- Prep from `reporting_plan` is visible in later spoken scenes via `prepNoteKey`.
- At least one concrete in-arena observation/procedural scene exists if the final work mix keeps physical/in-person observation as meaningful.
- Fast gamer and final story provide visible box score, notes, quotes, style/attribution guidance, and held-back rumor context.
- Rubric criteria include `evidenceSceneIds`.
- Work windows use cream reading/writing/sorting surfaces.
- Buttons stay on the established palette.
- Image prompt blocks are subject-first.
- Physical/action scenes have asset prompts in `ACTION_ASSETS.md`.
- Browser QA confirms no cramped desktop windows, overlapping important UI, or inaccessible source materials.
