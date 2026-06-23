# Scene Blueprint — journalist-nba-team-beat-reporter-in-person-beat-reporting-nba-team-beat-reporting-at-a-national-sports-media-brand-in-the-united-states-established-national-sports-media-brand-entry-level-junior

Use this as the Phase 2 approval artifact before scaffolding. It shows the practical chain that reduces manual repair: visible input artifact → student action → output artifact → rubric evidence.

## Work Mix

- Summary: NBA team beat reporting is an in-person deadline job built from repeated arena access, source conversations, observation, note discipline, and fast digital filing. Source material describes reporters attending shootaround and games, talking to coaches and players before and after games, transcribing and organizing interviews, watching injuries and rotations, and writing instant stories after the buzzer. The upgraded simulator therefore mixes physical arena observation, spoken availability, Slack/editor communication, source sorting, and deadline writing rather than treating the role as generic prose composition.
- `physicalProceduralTool`: secondary — Include a playable arena observation scene where the student inspects visible court/media-row evidence and records a caveated observation before writing.
- `digitalToolArtifactWork`: major — Use realistic document, Slack, kanban, and CMS-style surfaces with visible source tabs and reference packets.
- `cognitiveAnalysisDecision`: major — Keep the lead-angle pivot, note classification, and editor recommendation as explicit judgment moments.
- `writtenDocumentationArtifact`: dominant — Require a reporting plan, observation note, note rationale, fast gamer, editor update, and final story package.
- `spokenInterpersonalCommunication`: major — Use in-person voice scenes for coach availability and the player scrum, with prep notes visible.
- `passiveMonitoringWaitingContextSwitching`: secondary — Represent waiting and monitoring through timed source packets, live game notes, and deadline constraints, not passive click-through narration.

## Scene Table

| Scene | Type / Surface | Visible Inputs | Student Action | Output Artifact | Rubric Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| `intro`<br>Welcome to Full Court Wire | `intro` | — | — | — | not explicitly mapped | assignment_brief |
| `assignment_brief`<br>4:18 PM Assignment Desk | `briefing` | Slack editor frame, official injury report, arena media schedule, stats dashboard, social media feed, and CMS sidebar | — | — | not explicitly mapped | lead_angle |
| `lead_angle`<br>Reply With the Lead Angle | `multiple_choice` / `slack` | Cyclones game-night work surfaces (assignment_brief Slack, injury report, media schedule, stats dashboard, social media feed, and CMS sidebar) | Choose and send the most reportable Slack angle from a finite editor prompt. | Slack reply to editor | Angle Judgment | branch: strong_angle->redirect_strong_angle, rumor_angle->redirect_rumor, generic_angle->redirect_generic, color_angle->redirect_color |
| `redirect_strong_angle`<br>Angle Greenlit | `briefing` | — | — | — | Angle Judgment | reporting_plan |
| `redirect_rumor`<br>Rumor Without Grounding | `briefing` | — | — | — | Angle Judgment | reporting_plan |
| `redirect_generic`<br>Too Broad for Deadline | `briefing` | — | — | — | Angle Judgment | reporting_plan |
| `redirect_color`<br>Color Needs a Point | `briefing` | — | — | — | Angle Judgment | reporting_plan |
| `reporting_plan`<br>Pregame Reporting Plan | `structured_entry` / `doc` | Cyclones game-night work surfaces (briefing drawer), Your selected editor reply (previous Slack branch) | Create four source-aware reporting needs with source, question or verification step, and risk. | Pregame reporting plan rows | Angle Judgment, Reporting Plan | warmup_observation |
| `warmup_observation`<br>Warmup Observation at Media Row | `physical_playground` | — | Inspect in-arena source surfaces and document a caveated observation before interviews. | action log.warmup_observation | Reporting Plan, Observation and Note Discipline | coach_availability |
| `coach_availability`<br>Coach Harris Availability | `voice_meeting` | Coach availability reminder, prep note from `pregame_plan`, warmup game memo from `warmup_observation` | Ask concise, specific coach questions that clarify Reed availability and closing-lineup logic without overstating what the coach can say before the game. | transcript.coach_availability | Reporting Plan, Availability Question Quality | possession_timeline_watch |
| `possession_timeline_watch`<br>Possession Timeline Watch | `possession_timeline` | Pregame coach availability, final-stretch possessions, final result board, pregame reporting plan | Watch late possessions, classify useful notes, record the official result board, and draft two Reed scrum questions plus any Harris/PR follow-up or hold-back items. | Media-row possession notes | Observation and Note Discipline, Availability Question Quality | media_scrum |
| `media_scrum`<br>Malik Reed Postgame Scrum | `voice_meeting` | Prepared Reed questions and possession timeline notes | Ask Reed concise postgame questions that turn your observation and live notes into attributable copy. | transcript.media_scrum | Availability Question Quality | fast_gamer |
| `fast_gamer`<br>Write the Fast Gamer | `free_text` / `doc` | tab: Box Score, tab: Working Notes, tab: Quote Log, tab: Style/Attribution, Final box score (app tab), working notes (app tab), quote log (app tab), style and attribution rules (app tab) | Write deadline gamer copy using visible verified reporting. | Fast gamer lead and nut graf | Fast Gamer | editor_slack |
| `editor_slack`<br>Editor Slack Update | `slack_thread` / `slack` | Fast gamer draft (scene context and prior response), working notes and hold-back item (fast_gamer source packet and prior response), Editor follow-up prompt (Slack thread) | Send a concise Slack recommendation that separates confirmed reporting from uncertainty. | Editor Slack update | Editor Communication | final_story |
| `final_story`<br>Final Filed Story Package | `free_text` / `doc` | tab: Fast Gamer, tab: Verified Facts, tab: Quote Log, tab: Hold Back, tab: Tomorrow Follow, Fast gamer draft (app tab and prior response), Verified facts (app tab), Quote log (app tab), Hold-back list (app tab), Follow-up angle (app tab) | Package the story for publication with headline, nut graf, bullets, quote, hold-back detail, and follow-up question. | Final filed story package | Final Story Package | assessment_gate |
| `grading`<br>End of Game Night | `grading` | — | — | — | not explicitly mapped | final_report |
| `final_report`<br>Final Report | `final_report` | — | — | — | not explicitly mapped | null |
