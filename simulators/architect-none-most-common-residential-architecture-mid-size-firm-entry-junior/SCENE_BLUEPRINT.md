# Scene Blueprint — architect-none-most-common-residential-architecture-mid-size-firm-entry-junior

Use this as the Phase 2 approval artifact before scaffolding. It shows the practical chain that reduces manual repair: visible input artifact → student action → output artifact → rubric evidence.

## Work Mix

- Summary: Entry/junior residential architecture is dominated by digital drawing/model artifacts, cognitive coordination, written documentation, and focused client/team communication. Site conditions matter, but this scenario uses Riley's digital site photo rather than asking the player to perform physical field work.
- `physicalProceduralTool`: minor — Represent site conditions through a digital photo-review and field-note desk task, not a physical playground.
- `digitalToolArtifactWork`: dominant — Most active scenes use realistic desk work surfaces.
- `cognitiveAnalysisDecision`: major — Tasks require issue spotting and uncertainty handling.
- `writtenDocumentationArtifact`: major — Require redline pickup tracker, prep notes, rationale, Slack site concern to Maya, and a Revit-like schematic option study.
- `spokenInterpersonalCommunication`: secondary — One homeowner voice meeting.
- `passiveMonitoringWaitingContextSwitching`: secondary — Use Slack, contractor message, and deadline pressure.

## Scene Table

| Scene | Type / Surface | Visible Inputs | Student Action | Output Artifact | Rubric Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| `intro`<br>Welcome to Harbor & Ash Studio | `intro` | — | — | — | not explicitly mapped | maple_street_inbox |
| `maple_street_inbox`<br>Maple Street Inbox | `briefing` | sourceInbox: /Projects/Maple_Street_Addition, Files reviewed from /Projects/Maple_Street_Addition | — | — | not explicitly mapped | first_move |
| `first_move`<br>Choose Your First Move | `multiple_choice` / `slack` | Shared project folder (maple_street_inbox.sourceInbox) | Choose a careful first move. | first_move_choice | Junior judgment | branch: sketch_first->redirect_sketch, constraints_first->redirect_constraints, overpromise->redirect_promise, wait_for_answers->redirect_wait |
| `redirect_sketch`<br>Consequence: Design Too Soon | `briefing` | — | — | — | not explicitly mapped | redline_note |
| `redirect_constraints`<br>Consequence: Useful First Pass | `briefing` | — | — | — | not explicitly mapped | redline_note |
| `redirect_promise`<br>Consequence: Overpromising Risk | `briefing` | — | — | — | not explicitly mapped | redline_note |
| `redirect_wait`<br>Consequence: Waiting Stalls the Team | `briefing` | — | — | — | not explicitly mapped | redline_note |
| `redline_note`<br>Pick Up the A101/A201 Redlines | `kanban_board` / `kanban` | Owen pickup rule, A101/A201 redline cards (kanban cards), Owen pickup rule (referenceContent) | Sort redline items into drafting fixes, ask/verify items, and hold/escalation items. | redline_pickup_tracker | Junior judgment, Redline coordination | client_prep |
| `client_prep`<br>Prepare Dana Client Call Questions | `structured_entry` / `notion` | Client prep source files, Shared project folder (referenceContent), Zoning Reference (referenceContent), Completed redline pickup board (prior redline_note response) | Draft client questions with rationale. | client_prep | Source-grounded intake | client_call |
| `client_call`<br>Client Call With Dana Moreno | `voice_meeting` | Compact project facts, prep note from `client_prep`, Student prep questions (prepNoteKey client_prep), Compact facts (prepReferenceContent) | Conduct a spoken homeowner clarification call. | client_call | Client communication | site_observation |
| `site_observation`<br>Send Maya the Site Concern | `slack_thread` / `slack_reply` | tab: Site Photo, tab: Riley Message, tab: Drawing Concern, Riley site photo (Site Photo app tab), Riley field message (Riley Message app tab), A401/survey concern (Drawing Concern app tab) | Review the digital site photo and notes, then send Maya a concise Slack message confirming the concern and review needed. | Slack message to Maya | Site observation and escalation | schematic_option_study |
| `schematic_option_study`<br>Create the Maple Street Schematic Option | `architect_design_studio` / `Maple Street Addition.rvt` | Maple Street design constraints, Maple Street design constraints (referenceContent, Site/Riley/Slack tabs, and in-scene plan overlays), Revit project views (Revit tab with Level 1, Level 2, and West Elevation sidebar views), Maya/Owen utility-clear direction (Slack tab and right-rear utility clear zone overlay) | Create a bounded schematic option by adjusting a plan footprint, placing Level 1 and Level 2 room tags, placing a window privacy strategy in the West Elevati... | Maple Street schematic option study | Schematic design reasoning | assessment_gate |
| `assessment_gate`<br>Studio Day Complete | `section_transition` | — | — | — | not explicitly mapped | grading |
| `grading`<br>Assessment | `grading` | — | — | — | not explicitly mapped | final_report |
| `final_report`<br>Final Report | `final_report` | — | — | — | not explicitly mapped | null |
