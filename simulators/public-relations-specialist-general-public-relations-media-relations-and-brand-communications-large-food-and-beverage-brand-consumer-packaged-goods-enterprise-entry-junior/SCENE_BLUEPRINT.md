# Scene Blueprint — public-relations-specialist-general-public-relations-media-relations-and-brand-communications-large-food-and-beverage-brand-consumer-packaged-goods-enterprise-entry-junior

Use this as the Phase 2 approval artifact before scaffolding. It shows the practical chain that reduces manual repair: visible input artifact → student action → output artifact → rubric evidence.

## Work Mix

- Summary: Public relations specialist work in the collected sources is primarily desk-based communication work: writing, email, media lists, press releases, pitching, monitoring, reporting, calls, and internal coordination. O*NET emphasizes media response, writing, public image, external communication, social content, time pressure, and daily email/phone/team contact. The YouTube and Reddit sources reinforce that junior PR work is concrete and artifact-heavy rather than abstract: build lists, draft pitches, track coverage, monitor issues, and escalate carefully.
- `physicalProceduralTool`: rare — No physical playground is needed. The concrete tools should be digital work surfaces: launch briefs, media lists, email, Slack, monitoring queues, and call reference packets.
- `digitalToolArtifactWork`: dominant — Most active scenes should happen in realistic desk windows: Notion/source packet, media-list table, email compose, Slack, monitoring kanban, and remote meeting reference panels.
- `cognitiveAnalysisDecision`: major — The student must decide which reporters fit the story, what information is safe to say, what issue signal is urgent, and what should be escalated.
- `writtenDocumentationArtifact`: dominant — The simulator must require typed work: reporter angles, a pitch email, and a concise correction request or holding statement.
- `spokenInterpersonalCommunication`: major — Include a remote voice meeting with a skeptical journalist so the student practices spoken relationship management and fact discipline.
- `passiveMonitoringWaitingContextSwitching`: secondary — Monitoring appears as a triage queue where the student must sort signals and write an escalation rationale, not as passive narration.

## Scene Table

| Scene | Type / Surface | Visible Inputs | Student Action | Output Artifact | Rubric Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| `intro`<br>Welcome to Northstar Foods | `intro` | — | — | — | not explicitly mapped | launch_packet |
| `launch_packet`<br>Launch Packet: Luma Fizz | `briefing` | Approved Launch Packet, Approved Launch Packet (launch_packet.referenceContent) | Read the source packet before making public-facing decisions. | Source packet reviewed | not explicitly mapped | first_move |
| `first_move`<br>Reply With Your First Move | `multiple_choice` / `slack` | Approved Launch Packet (launch_packet.referenceContent) | Choose a first Slack response that protects source discipline and realistic PR workflow. | First-move Slack choice | Source Discipline and Prioritization | branch: source_first->redirect_source_first, blast_release->redirect_blast_release, creative_first->redirect_creative_first, wait_for_maya->redirect_wait_for_maya |
| `redirect_source_first`<br>Maya Confirms the Sequence | `briefing` | — | — | — | not explicitly mapped | media_targets |
| `redirect_blast_release`<br>Maya Stops the Blast | `briefing` | — | — | — | not explicitly mapped | media_targets |
| `redirect_creative_first`<br>Maya Tightens the Guardrails | `briefing` | — | — | — | not explicitly mapped | media_targets |
| `redirect_wait_for_maya`<br>Maya Nudges You to Own a Draft | `briefing` | — | — | — | not explicitly mapped | media_targets |
| `media_targets`<br>Build the Media Target Table | `structured_entry` / `spreadsheet` | Reporter Cards and Launch Facts, Reporter Cards and Launch Facts (media_targets.referenceContent) | Build a three-row media target table with fit, tailored angle, and risk note. | Media target table | Media Targeting Judgment | section_transition_1_2 |
| `section_transition_1_2`<br>Section 2: Media Outreach | `section_transition` | — | — | — | not explicitly mapped | pitch_email |
| `pitch_email`<br>Draft the Reporter Pitch | `free_text` / `email` | tab: Launch Facts, tab: Reporter Context, tab: Pitch Guidance, Launch Facts (pitch_email.appTabs.launch_facts), Reporter Context (pitch_email.appTabs.reporter_context) | Write a concise reporter pitch email. | Reporter pitch email | Reporter Pitch Writing | journalist_call |
| `journalist_call`<br>Follow-Up Call With Lena | `voice_meeting` | Approved call facts, prep note from `pitch_email`, Pitch draft (journalist_call.prepNoteKey), Approved call facts (journalist_call.prepReferenceContent) | Speak with a skeptical journalist and maintain credibility under questioning. | Journalist call transcript | Reporter Relationship Management | section_transition_2_3 |
| `section_transition_2_3`<br>Section 3: Issues Response | `section_transition` | — | — | — | not explicitly mapped | monitoring_triage |
| `monitoring_triage`<br>Triage the Monitoring Queue | `kanban_board` / `kanban` | Issue Triage Guide, Monitoring cards (monitoring_triage.cards), Issue Triage Guide (monitoring_triage.referenceContent) | Sort monitoring signals and write a top-priority rationale. | Monitoring triage board and rationale | Monitoring Triage | issue_update |
| `issue_update`<br>Request a Blog Correction | `free_text` / `email` | tab: Article, tab: Article Alert, tab: Approved Language, Article (issue_update.appTabs.article), Article Alert (issue_update.appTabs.article_alert), Approved Language (issue_update.appTabs.approved_language) | Write a calm external correction request using approved facts. | Blog correction request email | External Correction Request | assessment_gate |
| `assessment_gate`<br>The Launch Work Period Is Complete | `section_transition` | — | — | — | not explicitly mapped | grading |
| `grading`<br>Assessment | `grading` | — | — | — | not explicitly mapped | final_report |
| `final_report`<br>Final Report | `final_report` | — | — | — | not explicitly mapped | null |
