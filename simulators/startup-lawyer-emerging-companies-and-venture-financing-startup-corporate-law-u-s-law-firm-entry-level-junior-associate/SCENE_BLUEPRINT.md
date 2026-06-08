# Scene Blueprint — startup-lawyer-emerging-companies-and-venture-financing-startup-corporate-law-u-s-law-firm-entry-level-junior-associate

Use this as the Phase 2 approval artifact. It shows the practical chain that reduces manual repair: visible input artifact -> student action -> output artifact -> rubric evidence.

## Work Mix

- Summary: Entry-level startup and venture-financing law is a desk-document role: gather facts from client records, review transaction documents, maintain checklists, identify inconsistencies, draft reviewable work product, and communicate with senior lawyers and clients under deadline pressure.
- `physicalProceduralTool`: rare - no physical playground scenes needed.
- `digitalToolArtifactWork`: dominant - data room, checklist, cap table/charter, Slack, document editor, and call reference surfaces.
- `cognitiveAnalysisDecision`: major - issue spotting, closing consequence, prioritization, and caveat discipline.
- `writtenDocumentationArtifact`: major - checklist rows, call prep, and post-call checklist comments.
- `spokenInterpersonalCommunication`: secondary - one remote founder voice call.
- `passiveMonitoringWaitingContextSwitching`: secondary - represented through time-stamped asks, partner update pressure, and closing-timeline uncertainty.

## Scene Table

| Scene | Type / Surface | Visible Inputs | Student Action | Output Artifact | Rubric Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| `intro`<br>Welcome to Northstar Legal | `intro` | - | - | - | not explicitly mapped | briefing_morning |
| `briefing_morning`<br>The Deal Packet Lands | `briefing` | Maya's Slack assignment plus LumenLoop data-room materials: data-room index, charter/cap table excerpt, board consent status, SAFE note uncertainty, IP assignment gap, signature status, and investor-counsel diligence request | Read Slack assignment and source documents | - | not explicitly mapped | first_move |
| `first_move`<br>Reply With Your First Move | `multiple_choice` / `slack` | Maya Slack prompt and briefing packet | Choose first Slack response | First-move Slack choice | First-Move Judgment | branch: question_dump->redirect_questions, checklist_first->redirect_checklist_first, polish_first->redirect_polish, overclaim->redirect_overclaim |
| `redirect_checklist_first`<br>Maya Greenlights the Checklist Pass | `briefing` | Incoming Slack, sent player reply, Maya consequence | - | - | not explicitly mapped | closing_checklist |
| `redirect_questions`<br>The Question Dump Problem | `briefing` | Incoming Slack, sent player reply, Maya correction | - | - | not explicitly mapped | closing_checklist |
| `redirect_polish`<br>A Beautiful But Unreliable Checklist | `briefing` | Incoming Slack, sent player reply, Maya correction | - | - | not explicitly mapped | closing_checklist |
| `redirect_overclaim`<br>Too Early To Give Comfort | `briefing` | Incoming Slack, sent player reply, Maya correction | - | - | not explicitly mapped | closing_checklist |
| `closing_checklist`<br>Update the Closing Checklist | `structured_entry` / `spreadsheet` | Maya's Slack instruction plus LumenLoop data-room materials in briefing drawer | Enter four rows with condition, evidence, status/owner, risk/next action | Closing checklist rows | Closing Checklist Quality | founder_call_prep |
| `founder_call_prep`<br>Prepare for the Founder Call | `free_text` / `notion` | Tabs: Checklist issues, Call facts, Guardrails, Maya's bar; warning that Maya will use the call notes for post-call checklist comments | Turn checklist blockers into call-prep bullets: explain what matters, ask Arjun for exact documents/confirmations, listen for confirmed facts, and keep Maya's review boundary | Founder-call prep note | Founder Call Preparation and Handling | founder_call |
| `founder_call`<br>Founder Call with LumenLoop | `voice_meeting` / remote | Compact deal reference and student prep via `prepNoteKey` | Speak with founder, ask for exact facts, listen for confirmed call facts, avoid overclaiming | Voice transcript | Founder Call Preparation and Handling | issue_list |
| `issue_list`<br>Annotate the Closing Checklist for Maya | `structured_entry` / `doc` | Saved closing checklist rows, founder-call notes, deal record, and Maya's review bar | Add a Maya-facing post-call comment under each locked checklist row | Annotated closing checklist comments | Post-Call Checklist Annotation | assessment_gate |
| `assessment_gate`<br>The Day Is Complete | `section_transition` | - | Click `View Assessment` after the work period is complete | - | not explicitly mapped | grading |
| `grading`<br>End of Seed Financing Day | `grading` | - | - | - | not explicitly mapped | final_report |
| `final_report`<br>Final Report | `final_report` | - | - | - | not explicitly mapped | null |

## Repair Notes

- The correct first-move option now routes to its own consequence scene instead of falling through without a branch case.
- The founder call now declares `meetingMode: "remote"`, has compact reference material, and carries the student's prep note into the meeting UI.
- The post-call chain now tells the player to take notes during the founder call, then annotate the locked closing checklist with what Arjun said, what remains needed if anything, and what Maya should review or track.
- `briefing_morning` now separates delivery channels: Maya's assignment appears only as Slack, while the packet/reference card contains only source deal materials.
- The final graded work product is the annotated closing checklist; the separate external-message scene has been removed to avoid repeating the founder-call follow-up.
- Every active desk-work scene declares `deskWorkDesign`.
- Every rubric criterion declares `evidenceSceneIds`.
