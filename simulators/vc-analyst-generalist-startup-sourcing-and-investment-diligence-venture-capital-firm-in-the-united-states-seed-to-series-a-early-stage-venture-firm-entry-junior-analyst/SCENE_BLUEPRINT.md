# Scene Blueprint — vc-analyst-generalist-startup-sourcing-and-investment-diligence-venture-capital-firm-in-the-united-states-seed-to-series-a-early-stage-venture-firm-entry-junior-analyst

Use this as the Phase 2 approval artifact before scaffolding. It shows the practical chain that reduces manual repair: visible input artifact → student action → output artifact → rubric evidence.

## Work Mix

- Summary: Junior early-stage VC analyst work is mostly digital, artifact-heavy, and judgment-heavy: analysts source and screen incomplete startup information, review decks and CRM notes, build market context, talk with founders, and communicate concise recommendations to partners from partial evidence. The role has little physical/procedural work, but it has substantial concrete tool work in spreadsheets, CRM-style notes, market maps, Slack, and diligence notes.
- `physicalProceduralTool`: rare — Do not add physical_playground scenes. The concrete work should be simulated through realistic digital artifacts and work surfaces.
- `digitalToolArtifactWork`: dominant — Most active scenes should use visible deal workspaces, spreadsheet-like screens, kanban/market maps, Slack, and Miro-style matrices.
- `cognitiveAnalysisDecision`: dominant — Tasks should force evidence hierarchy, assumption discipline, market/wedge judgment, and clear recommendation logic.
- `writtenDocumentationArtifact`: major — Require multiple typed artifacts: a first-pass screen, founder-call prep, partner-ready call debrief notes, and a pipeline Slack update.
- `spokenInterpersonalCommunication`: secondary — Include one high-signal voice founder call and asynchronous partner communication. The call should use the student's prep notes.
- `passiveMonitoringWaitingContextSwitching`: secondary — The day should move through time-boxed context switches, but passive waiting should not dominate active play.

## Scene Table

| Scene | Type / Surface | Visible Inputs | Student Action | Output Artifact | Rubric Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| `intro`<br>Welcome to Northstar | `intro` | — | — | — | not explicitly mapped | morning_source_workspace |
| `triage_signal`<br>Pick the First Signal | `multiple_choice` | ClaimPilot desktop apps (morning_source_workspace.sourceWorkspace), Partner Slack request (morning_source_workspace.sourceWorkspace) | Choose the first diligence signal to investigate before pipeline. | First-signal decision | Signal Triage | branch: logo_first->redirect_logo, traction_first->redirect_traction, tech_first->redirect_tech, fomo_first->redirect_fomo |
| `redirect_logo`<br>Logos Without Context | `briefing` | — | — | — | not explicitly mapped | deck_screen |
| `redirect_traction`<br>Revenue Quality First | `briefing` | — | — | — | not explicitly mapped | deck_screen |
| `redirect_tech`<br>Novelty Is Not Enough | `briefing` | — | — | — | not explicitly mapped | deck_screen |
| `redirect_fomo`<br>Speed Needs a Reason | `briefing` | — | — | — | not explicitly mapped | deck_screen |
| `deck_screen`<br>Deck Tear-Down | `structured_entry` / `spreadsheet` | sourceWorkspace: Document App, Excel, Slack, ClaimPilot seed deck (deck_screen.sourceWorkspace.app:documents.file:pitch_deck), Northstar CRM record (deck_screen.sourceWorkspace.app:documents.file:crm_record), ARR bridge (deck_screen.sourceWorkspace.app:arr.file:arr_bridge), Partner Slack request (deck_screen.sourceWorkspace.app:slack) | Fill a structured first-pass screen that separates evidence, concern, and implication for fund fit. | ClaimPilot first-pass screen | Structured Deal Screen | market_map |
| `market_map`<br>Market Map Sprint | `kanban_board` / `kanban` | Market map criteria, Market map criteria (referenceContent), Buyer alternatives (dropdown assignment rows) | Classify each buyer alternative and write why that comparison clarifies ClaimPilot's wedge. | Insurance workflow market map | Market Mapping | founder_call_prep |
| `founder_call_prep`<br>Founder Call Prep | `free_text` / `notion` | tab: Deck Tear-Down, tab: Market Map, tab: Call Bar, Deck Tear-Down signals (founder_call_prep.appTabs.deck_screen_signals), Market Map signals (founder_call_prep.appTabs.market_map_signals), Leo's call bar (founder_call_prep.appTabs.call_bar) | Write a compact 5-7 question call plan tied to the deck-screen risks and market-map hypothesis. | Founder-call question prep | Founder Call Prep | founder_call |
| `founder_call`<br>Founder Call with Alex | `voice_meeting` | ClaimPilot facts, prep note from `founder_call_prep`, Founder-call question prep (founder_call.prepNoteKey), ClaimPilot facts (founder_call.prepReferenceContent) | Use the prepared founder-call question list to ask specific diligence questions tied to claims and risks. | Founder call transcript | Founder Call Quality | call_debrief |
| `call_debrief`<br>Call Debrief Notes | `free_text` / `notion` | tab: Founder Call Notes, Founder-call transcript (voice meeting transcript and referenceContent), Founder-call notes (call_debrief.appTabs.founder_call_notes) | Write one free-form call debrief for Leo that separates confirmed facts, assumptions or risks, and second-meeting implications. | Call debrief notes | Founder Call Quality, Partner Communication | lead_priority |
| `lead_priority`<br>Prioritize the Afternoon Pipeline | `priority_matrix` / `Afternoon Pipeline Priority` | Northstar prioritization rules, Lead Briefs (referenceTabs.lead_briefs), Northstar prioritization rules (content and referenceContent), Afternoon company briefs (Lead Briefs tab and priority matrix items), Leo Slack request (lead_priority.slackTab.slackMessages) | Place companies on a fund-fit/evidence-quality matrix, then send Leo a concise Slack message naming the first new lead to handle and why. | Afternoon pipeline priority and Leo Slack update | Pipeline Prioritization | assessment_gate |
| `grading`<br>End of Analyst Day | `grading` | — | — | — | not explicitly mapped | final_report |
| `final_report`<br>Final Report | `final_report` | — | — | — | not explicitly mapped | null |
| `morning_source_workspace`<br>8:35 AM Source Workspace | `briefing` | sourceWorkspace: Document App, Excel, Slack, Source workspace (morning_source_workspace.sourceWorkspace) | Open the source documents and spreadsheet before choosing the first work move. | Source materials reviewed | not explicitly mapped | triage_signal |
| `assessment_gate`<br>The Day Is Complete | `section_transition` | — | — | — | not explicitly mapped | grading |
