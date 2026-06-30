# Scene Blueprint — architect-none-most-common-residential-architecture-mid-size-firm-entry-junior

Use this as the Phase 2 approval artifact before scaffolding. It shows the practical chain that reduces manual repair: visible input artifact → student action → output artifact → rubric evidence.

## Work Mix

- Summary: Entry/junior residential architecture is dominated by digital drawing/model artifacts, cognitive coordination, written documentation, and focused client/team communication. Site and field constraints matter, but this scenario handles them through team verification replies and schematic constraints rather than physical field work.
- `physicalProceduralTool`: minor — Represent site conditions through Riley's verification reply and follow-on schematic constraints, not a physical playground.
- `digitalToolArtifactWork`: dominant — Most active scenes use realistic desk work surfaces.
- `cognitiveAnalysisDecision`: major — Tasks require issue spotting and uncertainty handling.
- `writtenDocumentationArtifact`: major — Require an A101/A201 redline click board, prep notes, a verify resolution summary, and a Revit-like schematic option study.
- `spokenInterpersonalCommunication`: secondary — Represented through a read-only Dana call handoff rather than a live homeowner voice meeting.
- `passiveMonitoringWaitingContextSwitching`: secondary — Use Slack-style coordination replies, client call pressure, and deadline pressure.

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
| `redline_note`<br>Pick Up the A101/A201 Redlines | `redline_click_board` / `bim` | Owen pickup rule, A101/A201 drawing callouts, Schedule tab, fixed proposed-addition and utility overlays | Classify redline callouts as Fix or Verify, then read Owen's Slack-style review. | redline_pickup_tracker | Junior judgment, Redline coordination | client_prep |
| `client_prep`<br>Build Dana Question Checklist | `client_question_checklist` / `notion` | Merged Project Notes tab with Dana priorities and open redline notes | Select exactly two Dana-facing questions: one privacy/daylight question and one kitchen, mudroom, or daily-routine question; leave zoning, drawing-tag, and field-condition items as team checks. | client_prep | Source-grounded intake | client_call |
| `client_call`<br>Dana Call Handoff | `briefing` | Selected Dana question areas from `client_prep`, deterministic Dana answers | Read the short Dana handoff before continuing. | dana_handoff | not explicitly mapped | review_verify_replies |
| `review_verify_replies`<br>Review Verify Replies | `structured_entry` / `notion` | Verify Replies tab with Owen, Riley, and Maya replies | Write one concise coordination summary for the schematic option. | verify_resolution_summary | Verify coordination | schematic_option_study |
| `schematic_option_study`<br>Create the Maple Street Schematic Option | `architect_design_studio` / `Maple Street Addition.rvt` | Maple Street design constraints, Verify Replies tab, Revit project views, resolved setback/coverage/privacy/utility constraints | Create a bounded schematic option by adjusting a plan footprint, placing Level 1 and Level 2 room tags, choosing translucent glass in the West Elevation view, checking constraints, and writing a design note. | Maple Street schematic option study | Schematic design reasoning | assessment_gate |
| `assessment_gate`<br>Studio Day Complete | `section_transition` | — | — | — | not explicitly mapped | grading |
| `grading`<br>Assessment | `grading` | — | — | — | not explicitly mapped | final_report |
| `final_report`<br>Final Report | `final_report` | — | — | — | not explicitly mapped | null |
