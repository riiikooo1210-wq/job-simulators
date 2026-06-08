# Scene Blueprint — brand-strategist-general-consumer-brand-strategy-for-fashion-brand-common-brand-strategist-work-imagined-by-aspiring-brand-strategists-fictional-fashion-brand-enterprise-global-brand-entry-junior

Use this as the Phase 2 approval artifact before scaffolding. It shows the practical chain that reduces manual repair: visible input artifact → student action → output artifact → rubric evidence.

## Work Mix

- Summary: The selected Brand Strategist transcripts describe a computer-and-meeting role centered on brand audits, competitive research, client or stakeholder meetings, customer interviews, messaging, and turning messy inputs into an actionable brand point of view. O*NET Marketing Managers is only an adjacent baseline for market research, team communication, strategy, written communication, and computer-heavy work. Reddit threads are used as supplemental signals that strategy should be evidence-backed and useful, not just a vague deck.
- `physicalProceduralTool`: rare — No physical_playground scene is needed; realism comes from visible brand briefs, competitor snapshots, research notes, Slack, docs, and voice meeting contexts.
- `digitalToolArtifactWork`: dominant — Most active scenes use desk-work surfaces: Slack, structured audit table, Miro-style matrix, document editor, and a Canva-like static post builder.
- `cognitiveAnalysisDecision`: major — The student must diagnose audience tensions, prioritize evidence, separate observation from implication, and avoid trend-chasing without strategic fit.
- `writtenDocumentationArtifact`: major — The simulator requires written audit notes, interview questions, a positioning brief, a Slack strategy response, and a rationale-backed static post concept.
- `spokenInterpersonalCommunication`: secondary — Include one remote voice meeting where the student uses evidence and prepared questions to align a stakeholder.
- `passiveMonitoringWaitingContextSwitching`: secondary — Use Slack pings and stakeholder pressure to create context switching, but keep the active work focused on making strategy artifacts.

## Scene Table

| Scene | Type / Surface | Visible Inputs | Student Action | Output Artifact | Rubric Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| `intro`<br>Welcome to Aurelia & Co. | `intro` | — | — | — | not explicitly mapped | briefing_packet |
| `briefing_packet`<br>The Everyday Icons Packet | `briefing` | Everyday Icons source packet | — | — | not explicitly mapped | first_move |
| `first_move`<br>Reply With Your First Move | `multiple_choice` / `slack` | Everyday Icons source packet (briefing_packet.referenceContent) | Choose a first Slack response that protects the strategic work sequence. | First-move Slack choice | Strategic prioritization | branch: frame_audit->redirect_frame, deck_shell->redirect_deck, trend_hunt->redirect_trend, survey_dump->redirect_survey |
| `redirect_frame`<br>Mara Confirms the Path | `briefing` | — | — | — | not explicitly mapped | audit_table |
| `redirect_deck`<br>Mara Stops the Deck Theater | `briefing` | — | — | — | not explicitly mapped | audit_table |
| `redirect_trend`<br>Mara Redirects the Trend Hunt | `briefing` | — | — | — | not explicitly mapped | audit_table |
| `redirect_survey`<br>Mara Narrows the Ask | `briefing` | — | — | — | not explicitly mapped | audit_table |
| `audit_table`<br>Build the Competitive Audit | `structured_entry` / `spreadsheet` | Everyday Icons source packet (briefing_packet.referenceContent and section reference drawer) | Write audit rows that separate observation, implication, and risk. | Competitive audit table | Evidence-backed brand diagnosis, Junior-level synthesis and clarity | insight_matrix |
| `insight_matrix`<br>Prioritize the Insight Signals | `priority_matrix` / `miro` | Prioritization criteria, Competitive audit rows (previous scene output plus briefing_packet.referenceContent), Prioritization criteria (insight_matrix.referenceContent) | Sort research signals on a decision-impact / evidence-confidence matrix and write a rationale. | Insight prioritization matrix plus rationale | Evidence-backed brand diagnosis, Strategic prioritization | interview_prep |
| `interview_prep`<br>Prepare Stakeholder Questions | `free_text` / `doc` | tab: Source Packet, tab: Elena Context, Everyday Icons source packet (interview_prep.appTabs.source_packet), Elena stakeholder context (interview_prep.appTabs.stakeholder_context) | Prepare non-leading stakeholder interview questions. | Stakeholder question list | Strategic prioritization, Focused stakeholder discovery | stakeholder_call |
| `stakeholder_call`<br>Remote Call With Merchandising | `voice_meeting` | Call facts, prep note from `interview_prep`, Prepared stakeholder questions (stakeholder_call.prepNoteKey), Call facts (stakeholder_call.prepReferenceContent) | Ask focused questions and explain the emerging strategy in a remote stakeholder call. | Stakeholder call transcript | Focused stakeholder discovery, Professional strategy communication | positioning_brief |
| `positioning_brief`<br>Write the Positioning Brief | `structured_entry` / `doc` | Everyday Icons source packet (briefing_packet.referenceContent and section reference drawer), Competitive audit (student output from audit_table), Stakeholder call transcript (previous voice meeting transcript) | Write a structured brand positioning brief. | Positioning brief | Actionable positioning brief, Junior-level synthesis and clarity | creative_slack |
| `creative_slack`<br>Respond to Creative Pushback | `slack_thread` / `slack` | Positioning brief (previous scene output), Creative Slack thread (creative_slack.initialMessages) | Send a strategy-grounded Slack response to creative pushback. | Creative Slack response | Professional strategy communication, Actionable positioning brief, Junior-level synthesis and clarity | final_note |
| `final_note`<br>Build the Static Launch Post | `campaign_studio` / `figma` | Mara's finalized creative direction (final_note.referenceContent), background/copy/color/sticker options (final_note campaign studio) | Assemble a static social post concept and explain the strategic rationale. | Static launch post mockup | Evidence-backed brand diagnosis, Professional strategy communication, Actionable positioning brief, Junior-level synthesis and clarity | assessment_gate |
| `assessment_gate`<br>The Day Is Complete | `section_transition` | — | — | — | not explicitly mapped | grading |
| `grading`<br>Assessment | `grading` | — | — | — | not explicitly mapped | final_report |
| `final_report`<br>Final Report | `final_report` | — | — | — | not explicitly mapped | null |
