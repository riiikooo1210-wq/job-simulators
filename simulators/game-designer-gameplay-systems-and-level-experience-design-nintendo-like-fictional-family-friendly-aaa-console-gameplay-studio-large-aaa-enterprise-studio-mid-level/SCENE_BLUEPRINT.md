# Scene Blueprint — game-designer-gameplay-systems-and-level-experience-design-nintendo-like-fictional-family-friendly-aaa-console-gameplay-studio-large-aaa-enterprise-studio-mid-level

Use this as the Phase 2 approval artifact before scaffolding. It shows the practical chain that reduces manual repair: visible input artifact → student action → output artifact → rubric evidence.

## Work Mix

- Summary: For this mid-level game designer profile, the strongest signals are digital tool and artifact work, cognitive design decisions, written specs, and frequent cross-functional communication. O*NET, YouTube transcripts, and alternative public industry sources describe designers/planners creating design documents, flowcharts, proposals, test plans, level blockouts, spreadsheets, playtest loops, prototypes, acceptance criteria, and meeting-heavy coordination with specialists. Physical device/controller use appears, but it is supporting context rather than the core work.
- `physicalProceduralTool`: rare — Do not create a physical playground; represent the hands-on part through concrete digital design notes and playtest-based priority ranking.
- `digitalToolArtifactWork`: dominant — Most active scenes use Notion/doc, Google Docs-style watchlist, playtest observation, voice/typed handoff, and email work surfaces.
- `cognitiveAnalysisDecision`: major — The player must frame the player problem, define observable playtest signals, prioritize evidence, and defend tradeoffs.
- `writtenDocumentationArtifact`: major — Require bounded hook notes, watchlist selections, spec updates, and meeting prep.
- `spokenInterpersonalCommunication`: major — Include a realistic engineering handoff where the student clarifies buildable rules, with typed fallback for environments without voice.
- `passiveMonitoringWaitingContextSwitching`: secondary — Use briefings and Slack interruptions to create context switching, without making passive reading dominate the simulator.

## Scene Table

| Scene | Type / Surface | Visible Inputs | Student Action | Output Artifact | Rubric Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| `intro`<br>Welcome to Starling Grove Studios | `intro` | — | — | — | not explicitly mapped | morning_briefing |
| `morning_briefing`<br>Morning Recap | `briefing` | Coworker recap, build memory | Read the recap before producing design work. | context for later design artifacts | not explicitly mapped | mechanic_hook_sheet |
| `mechanic_hook_sheet`<br>Wind Bud Teaching Note | `structured_entry` / `notion_doc` | Debugging Notes tab with playtest numbers, clickable Wind Bud level slice | Pick one useful room area, then choose a fixed buildable change, success sign, and confusion sign the 4 PM playtest can show. | Wind Bud teaching note | Mechanic Problem Framing | playtest_watchlist |
| `playtest_watchlist`<br>Wind Bud Playtest Watchlist | `structured_entry` / `google_doc` | Wind Bud Teaching Note, 4 PM playtest goal | Turn the teaching note into fixed observable playtest signals that match the authored tester timeline. | Wind Bud playtest watchlist | Playtest Watchlist | playtest_workspace |
| `playtest_workspace`<br>Run the Playtest | `playtest_timeline` | Wind Bud Playtest Watchlist, visual tester run timeline | Watch moment-by-moment tester behavior, record conclusions with evidence, and rank fix priorities. | Run the Playtest observation log and priority ranking | Playtest Observation | spec_update |
| `spec_update`<br>Build Spec Update | `free_text` / `email_compose` | tab: Playtest Evidence, tab: Watchlist Focus, tab: Team Needs | Write an implementation-ready spec update email. | Wind Bud build spec update | Spec Update | design_review_prep |
| `design_review_prep`<br>Prepare the Engineering Handoff | `free_text` / `document_editor` | tab: Prep Checklist, tab: Your Priority Note, tab: Your Spec Update Email | Optionally prepare a concise note for Priya's implementation questions. | Prep note | not directly scored | design_review |
| `design_review`<br>Engineering Handoff with Priya | `voice_meeting` with typed fallback | Priority Note and Email, optional prep note | Clarify buildable gameplay rules and answer engineering edge-case questions. | Engineering handoff transcript (`voice:design_review:priya`) | Engineering Handoff | assessment_gate |
| `assessment_gate`<br>The Day Is Complete | `section_transition` | — | — | — | not explicitly mapped | grading |
| `grading`<br>Assessment | `grading` | — | — | — | not explicitly mapped | final_report |
| `final_report`<br>Final Report | `final_report` | — | — | — | not explicitly mapped | null |
