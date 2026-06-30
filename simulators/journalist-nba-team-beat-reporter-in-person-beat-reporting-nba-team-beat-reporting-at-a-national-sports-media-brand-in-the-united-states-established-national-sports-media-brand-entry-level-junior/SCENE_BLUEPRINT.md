# Scene Blueprint — journalist-nba-team-beat-reporter-in-person-beat-reporting-nba-team-beat-reporting-at-a-national-sports-media-brand-in-the-united-states-established-national-sports-media-brand-entry-level-junior

Use this as the Phase 2 approval artifact before scaffolding. It shows the practical chain that reduces manual repair: visible input artifact → student action → output artifact → rubric evidence.

## Work Mix

- Summary: NBA team beat reporting is an in-person deadline job built from repeated arena access, source conversations, observation, note discipline, and fast digital filing. Source material describes reporters attending shootaround and games, talking to coaches and players before and after games, transcribing and organizing interviews, watching injuries and rotations, and writing instant stories after the buzzer. The upgraded simulator therefore mixes physical arena observation, spoken availability, Slack/editor communication, source sorting, and deadline writing rather than treating the role as generic prose composition.
- `physicalProceduralTool`: secondary — Include a playable arena observation scene where the student inspects visible court/media-row evidence and records a caveated observation before writing.
- `digitalToolArtifactWork`: major — Use realistic document, Slack, kanban, and CMS-style surfaces with visible source tabs and reference packets.
- `cognitiveAnalysisDecision`: major — Keep the lead-angle pivot, note classification, and story-structure choices as explicit judgment moments.
- `writtenDocumentationArtifact`: dominant — Require a reporting plan, observation note, note rationale, and fast gamer.
- `spokenInterpersonalCommunication`: major — Use in-person coach/player interview scenes with voice or typed input, prep notes visible, and one transcript stream for grading.
- `passiveMonitoringWaitingContextSwitching`: secondary — Represent waiting and monitoring through timed source packets, live game notes, and deadline constraints, not passive click-through narration.

## Scene Table

| Scene | Type / Surface | Visible Inputs | Student Action | Output Artifact | Rubric Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| `intro`<br>Welcome to Full Court Wire | `intro` | — | Enter name and start the game-night assignment. | player name | not explicitly mapped | assignment_recap |
| `assignment_recap`<br>4:18 PM Editor Recap | `briefing` | Tessa recap, memory-card bullets, Reed background, game stakes, reporting question | Read the compact editor handoff. | context only | not explicitly mapped | lead_angle |
| `lead_angle`<br>Reply With the Lead Angle | `multiple_choice` / `slack` | Editor thread, official injury report, arena schedule, stats context, social rumor feed, CMS rules | Choose and send the most reportable Slack angle from a finite editor prompt. | Slack reply to editor | Story Angle Selection | branch: strong_angle->redirect_strong_angle, rumor_angle->redirect_rumor, generic_angle->redirect_generic, color_angle->redirect_color |
| `redirect_strong_angle`<br>Angle Greenlit | `briefing` | Editor consequence message | Confirm the direction and move into planning. | context only | Story Angle Selection | reporting_plan |
| `redirect_rumor`<br>Rumor Without Grounding | `briefing` | Editor correction message | Recover from rumor framing and move into planning. | context only | Story Angle Selection | reporting_plan |
| `redirect_generic`<br>Too Broad for Deadline | `briefing` | Editor correction message | Narrow the angle and move into planning. | context only | Story Angle Selection | reporting_plan |
| `redirect_color`<br>Color Needs a Point | `briefing` | Editor correction message | Tie color back to news value and move into planning. | context only | Story Angle Selection | reporting_plan |
| `reporting_plan`<br>Pregame Reporting Plan | `structured_entry` / `doc` | Source tabs, selected editor reply, row-specific guidance | Create three planning rows: Coach Harris question, Reed question, and safe fact/unsafe claim boundary. | Pregame reporting plan JSON | Reporting Plan | warmup_observation |
| `warmup_observation`<br>Warmup Observation at Media Row | `physical_playground` | PR email, Reed movement, closing-group drill, trainer check-in, fan rumor feed | Inspect all five surfaces and save one caveated running note. | Warmup observation JSON/action log | Warmup Observation | coach_availability |
| `coach_availability`<br>Coach Harris Availability | `voice_meeting` | Quick facts, pregame plan, warmup memo | Ask concise coach questions by voice or text, then save interview notes. | Shared transcript plus coach notes | Coach Harris Questioning | possession_timeline_watch |
| `possession_timeline_watch`<br>Possession Timeline Watch | `possession_timeline` | Pregame coach availability, final-stretch possessions, final result board, Reed question advice | Watch seven events, classify notes, and draft two Reed questions. | Possession timeline JSON plus summary | Game Observation Notes | media_scrum |
| `media_scrum`<br>Malik Reed Postgame Scrum | `voice_meeting` | Prepared Reed questions and possession timeline notes | Ask Reed the prepared questions by voice or text and save reporter notes. | Shared transcript plus Reed notes | Player Scrum Questioning | fast_gamer |
| `fast_gamer`<br>Write the Fast Gamer | `article_assembly` / `cms` | Results, Player Notes, Safe Rules, source cards, paragraph choices | Write a headline and choose one safe paragraph for News Lead, Proof, Angle, and Close. | Assembled game article text plus choice metadata | Deadline Game Article | assessment_gate |
| `assessment_gate`<br>The Day Is Complete | `section_transition` | Completed workday context | Start the assessment. | context only | not explicitly mapped | grading |
| `grading`<br>End of Game Night | `grading` | Stored choices, structured notes, transcripts, article assembly metadata | Submit stored artifacts to the grader. | grading result | all active rubric criteria | final_report |
| `final_report`<br>Final Report | `final_report` | Grading result | Review score, comments, and restart if needed. | final report view | not explicitly mapped | null |
| `grading`<br>End of Game Night | `grading` | — | — | — | not explicitly mapped | final_report |
| `final_report`<br>Final Report | `final_report` | — | — | — | not explicitly mapped | null |
