# Scene Blueprint — product-manager-general-consumer-product-manager-the-most-common-pm-role-aspiring-pms-imagine-social-trip-planning-app-for-friend-groups-growth-stage-mid-level

Use this as the Phase 2 approval artifact before scaffolding. It shows the practical chain that reduces manual repair: visible input artifact → student action → output artifact → rubric evidence.

## Work Mix

- Summary: The collected PM sources show a mid-level consumer Product Manager working mostly through digital artifacts, analysis, written communication, and stakeholder conversation. The real work is not physical manipulation; it is reading messy dashboards and feedback, framing the product problem, choosing focused bets, writing decision artifacts, and aligning design, engineering, data, support, and leadership around tradeoffs.
- `physicalProceduralTool`: rare — No physical playground is needed; realistic action should happen through dashboard, document, matrix, kanban, Slack, and voice-meeting scenes.
- `digitalToolArtifactWork`: major — Include multiple desk-work scenes with visible source artifacts and realistic app windows.
- `cognitiveAnalysisDecision`: dominant — The core graded tasks should require synthesis, prioritization, hypothesis framing, and tradeoff reasoning.
- `writtenDocumentationArtifact`: major — Require the student to produce a problem brief, research prep, PRD slice, and stakeholder Slack response.
- `spokenInterpersonalCommunication`: secondary — Include a remote voice meeting with a user and async alignment with engineering/design.
- `passiveMonitoringWaitingContextSwitching`: secondary — Use briefing context to show time pressure, but grade active artifacts rather than waiting.

## Scene Table

| Scene | Type / Surface | Visible Inputs | Student Action | Output Artifact | Rubric Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| `intro`<br>Welcome to Roamly | `intro` | — | — | — | not explicitly mapped | briefing_kickoff |
| `briefing_kickoff`<br>Monday Product Source Workspace | `briefing` | Roamly product source workspace | — | — | not explicitly mapped | scene_01_first_move |
| `scene_01_first_move`<br>Pick the First Move | `multiple_choice` | Roamly product-review workspace (briefing_kickoff.sourceWorkspace) | Choose the first PM move under time pressure. | First-move decision | Evidence-based problem framing | branch: solution_first->redirect_solution_first, problem_first->redirect_problem_first, estimate_first->redirect_estimate_first, data_first->redirect_data_first |
| `redirect_solution_first`<br>Maya Slows the Room Down | `briefing` | — | — | — | not explicitly mapped | scene_02_app_audit |
| `redirect_problem_first`<br>The Team Has a Shared Starting Point | `briefing` | — | — | — | not explicitly mapped | scene_02_app_audit |
| `redirect_estimate_first`<br>Leo Pushes Back on Premature Estimates | `briefing` | — | — | — | not explicitly mapped | scene_02_app_audit |
| `redirect_data_first`<br>Data Can Help, but It Cannot Replace Judgment | `briefing` | — | — | — | not explicitly mapped | scene_02_app_audit |
| `scene_02_app_audit`<br>Audit the Current Roamly Flow | `app_audit` / current app flow | Current Roamly app screens: create trip, invite status, dates/budget, saved places, empty itinerary; per-observation hint buttons | Inspect the current app and write cause-hypothesis notes for invite follow-through, budget/date pressure, saved-place overload, and missing next small decision. | Current app audit notes | Evidence-based problem framing, Risk and unknown identification, Clarity under ambiguity | scene_02_problem_brief |
| `scene_02_problem_brief`<br>Synthesize the Problem | `structured_entry` / `notion` | Same Roamly source workspace carried forward as in-window file/dashboard tabs plus Current App Audit notes: product context, Amplitude funnel, app audit, customer feedback excerpts, engineering constraints, candidate tickets | Synthesize funnel data, source context, and current-app observations into a concise brief for the main/largest product problem. | Problem brief | Evidence-based problem framing, Risk and unknown identification, Clarity under ambiguity | transition_research |
| `transition_research`<br>Stand-up Ends with One Open Question | `section_transition` | — | — | — | not explicitly mapped | scene_03_research_prep |
| `scene_03_research_prep`<br>Prepare the User Call | `free_text` / `notion` | tab: User Profile, tab: Research Guardrails, tab: Your Problem Brief, Nina user profile (scene_03_research_prep.appTabs.profile), Research guardrails (scene_03_research_prep.appTabs.research_guardrails) | Draft non-leading user interview questions and a learning goal. | User-call prep questions | User research quality, Clarity under ambiguity | scene_04_user_call |
| `scene_04_user_call`<br>Remote User Interview with Nina | `voice_meeting` | Compact user context, prep note from `scene_03_research_prep`, Student's user-call prep (scene_04_user_call.prepNoteKey), Compact user context (scene_04_user_call.prepReferenceContent) | Conduct a spoken user interview that explores behavior and motivation without leading the user. | User interview transcript | User research quality | scene_05_priority_matrix |
| `scene_05_priority_matrix`<br>Place the Candidate Bets | `priority_matrix` / `miro` | Top tabs inside the Group Momentum Bet Matrix window: Amplitude Funnel, Current App Audit, Customer Feedback, Constraints, Candidate Tickets, and Nina Interview; plus Nina interview transcript (scene_04_user_call transcript) | Place product bets on an impact/effort matrix and justify the recommended bet. | Impact/effort matrix and rationale | Prioritization judgment, Clarity under ambiguity | scene_06_roadmap_kanban |
| `scene_06_roadmap_kanban`<br>Triage the Roadmap Board | `kanban_board` / `kanban` | Summary of information (scene_06_roadmap_kanban.referenceTabs.summary), Triage criteria (scene_06_roadmap_kanban.referenceTabs.triage_criteria), Roadmap cards (scene_06_roadmap_kanban.cards) | Move roadmap cards into triage columns and explain the PM rationale. | Roadmap triage board and rationale | Risk and unknown identification, Prioritization judgment, Clarity under ambiguity | scene_07_prd_slice |
| `scene_07_prd_slice`<br>Draft the PRD Slice | `free_text` / `doc` | tab: Problem Brief, tab: Prioritization Notes, tab: PRD Checklist, Problem brief reminder (scene_07_prd_slice.appTabs.problem_brief), Prioritization notes (scene_07_prd_slice.appTabs.prioritization), PRD checklist (scene_07_prd_slice.appTabs.prd_checklist) | Draft a concise PRD slice / decision memo. | PRD slice | Risk and unknown identification, PRD and decision memo quality, Clarity under ambiguity | assessment_gate |
| `assessment_gate`<br>The Product Planning Day Is Complete | `section_transition` | — | — | — | not explicitly mapped | grading |
| `grading`<br>Assessment in Progress | `grading` | — | — | — | not explicitly mapped | final_report |
| `final_report`<br>Product Manager Simulation Report | `final_report` | — | — | — | not explicitly mapped | null |
