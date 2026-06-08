# Scene Blueprint — game-designer-gameplay-systems-and-level-experience-design-nintendo-like-fictional-family-friendly-aaa-console-gameplay-studio-large-aaa-enterprise-studio-mid-level

Use this as the Phase 2 approval artifact before scaffolding. It shows the practical chain that reduces manual repair: visible input artifact → student action → output artifact → rubric evidence.

## Work Mix

- Summary: For this mid-level game designer profile, the strongest signals are digital tool and artifact work, cognitive design decisions, written specs, and frequent cross-functional communication. O*NET, YouTube transcripts, and alternative public industry sources describe designers/planners creating design documents, flowcharts, proposals, test plans, level blockouts, spreadsheets, playtest loops, prototypes, acceptance criteria, and meeting-heavy coordination with specialists. Physical device/controller use appears, but it is supporting context rather than the core work.
- `physicalProceduralTool`: rare — Do not create a physical playground; represent the hands-on part through concrete digital design notes and playtest triage.
- `digitalToolArtifactWork`: dominant — Most active scenes use Notion/doc, Miro-style matrix, Slack, voice review, and email work surfaces.
- `cognitiveAnalysisDecision`: major — The player must frame the player problem, define observable playtest signals, prioritize evidence, and defend tradeoffs.
- `writtenDocumentationArtifact`: major — Require typed hook notes, spec updates, meeting prep, and final handoff email.
- `spokenInterpersonalCommunication`: major — Include a realistic in-person voice design review where the student presents and handles pushback.
- `passiveMonitoringWaitingContextSwitching`: secondary — Use briefings and Slack interruptions to create context switching, without making passive reading dominate the simulator.

## Scene Table

| Scene | Type / Surface | Visible Inputs | Student Action | Output Artifact | Rubric Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| `intro`<br>Welcome to Starling Grove Studios | `intro` | — | — | — | not explicitly mapped | morning_briefing |
| `morning_briefing`<br>Morning Build Packet | `briefing` | Feature Brief - Wind Bud Tutorial, Feature Brief - Wind Bud Tutorial (reference card), Morning playtest metrics (briefing metrics table) | Read the build packet before producing design work. | context for later design artifacts | not explicitly mapped | mechanic_hook_sheet |
| `mechanic_hook_sheet`<br>Wind Bud Teaching Note | `structured_entry` / `notion_doc` | Feature Brief - Wind Bud Tutorial (section briefing drawer), Morning playtest metrics (section briefing drawer), clickable Wind Bud level slice | Pick one useful map area, then write the cue/effect and success feedback the designer would add. | Wind Bud teaching note | Player Problem Framing, Learnable Level Pacing | playtest_watchlist |
| `playtest_watchlist`<br>Wind Bud Playtest Watchlist | `structured_entry` / `notion_doc` | Wind Bud Teaching Note (previous structured entry and section briefing drawer), 4 PM playtest goal (scene prompt) | Turn the teaching note into observable playtest signals. | Wind Bud playtest watchlist | Testable Playtest Planning | playtest_workspace |
| `playtest_workspace`<br>Run the Playtest | `playtest_timeline` | Wind Bud Playtest Watchlist (reference card), visual tester run timeline | Watch moment-by-moment tester behavior and record behavior, signal read, and triage implication. | Run the Playtest observation log | Playtest Evidence Use, Testable Playtest Planning | issue_priority_matrix |
| `issue_priority_matrix`<br>Observation Triage | `priority_matrix` / `priority_matrix` | Triage Reference, Run the Playtest observation log (previous structured entry and reference content) | Place observed behaviors by impact/risk and justify the top-priority design change. | Playtest observation priority matrix | Playtest Evidence Use, Testable Playtest Planning | spec_update |
| `spec_update`<br>Implementation Spec Update | `free_text` / `document_editor` | tab: Playtest Evidence, tab: Watchlist Focus, tab: Team Needs, Playtest Evidence (app tab), Watchlist Focus (app tab), Team Needs (app tab) | Write an implementation-ready design spec update. | Wind Bud implementation spec update | Playtest Evidence Use, Testable Playtest Planning, Implementation Spec Clarity | design_review_prep |
| `design_review_prep`<br>Prepare for the Design Review | `free_text` / `document_editor` | tab: Review Agenda, tab: Spec Summary, Review Agenda (app tab), Spec Summary (app tab) | Prepare a concise review note for a live design critique. | Design review prep note | Testable Playtest Planning, Cross-Functional Communication | design_review |
| `design_review`<br>In-Person Design Review | `voice_meeting` | Compact Review Packet, prep note from `design_review_prep`, Compact Review Packet (meeting reference card), Your Prep Note (meeting reference card via prepNoteKey) | Speak through the design recommendation and answer pushback. | Design review transcript | Player Problem Framing, Testable Playtest Planning, Cross-Functional Communication | final_handoff_email |
| `final_handoff_email`<br>Final Handoff Email | `free_text` / `email_compose` | tab: Final Decision, tab: QA Check, tab: Owner List, Final Decision (app tab), QA Check (app tab), Owner List (app tab) | Write and send a final implementation handoff email. | Wind Bud final handoff email | Playtest Evidence Use, Implementation Spec Clarity, Cross-Functional Communication | assessment_gate |
| `assessment_gate`<br>The Day Is Complete | `section_transition` | — | — | — | not explicitly mapped | grading |
| `grading`<br>Assessment | `grading` | — | — | — | not explicitly mapped | final_report |
| `final_report`<br>Final Report | `final_report` | — | — | — | not explicitly mapped | null |
