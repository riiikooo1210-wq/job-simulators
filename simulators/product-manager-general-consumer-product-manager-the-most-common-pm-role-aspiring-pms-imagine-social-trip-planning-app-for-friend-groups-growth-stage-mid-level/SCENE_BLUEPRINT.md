# Scene Blueprint

Simulator: `product-manager-general-consumer-product-manager-the-most-common-pm-role-aspiring-pms-imagine-social-trip-planning-app-for-friend-groups-growth-stage-mid-level`

This blueprint describes the current active Product Manager route. It supersedes older generated drafts that included removed intermediate nodes.

## Work Mix

- `digitalToolArtifactWork`: major. The student works in Slack, Analytics, a Roamly phone mock, a research note, a video-call transcript, and a product-plan doc.
- `cognitiveAnalysisDecision`: dominant. The key judgment is connecting current-flow evidence, user interview evidence, and a scoped next product step.
- `writtenDocumentationArtifact`: major. The student writes app-audit notes, user-call prep, and a short Product Plan.
- `spokenInterpersonalCommunication`: secondary. The student interviews Nina and uses the transcript as product evidence.
- `physicalProceduralTool`: rare. No physical-playground task is active.
- Realistic software quality gate: each active PM task must expose workplace-like software chrome and source context. Current surfaces are the PM source workspace shell, Roamly app-audit review console, Roamly Research Hub, interview console, and Product Plan doc editor.

## Scene Table

| Scene | Type / Surface | Visible Inputs | Student Action | Output Artifact | Rubric Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| `intro` Welcome to Roamly | `intro` | Scenario setup and name field | Enter name and read the setup. | Player name | not graded | `briefing_kickoff` |
| `briefing_kickoff` Monday Product Source Workspace | `briefing` | PM source workspace shell, Maya Slack, Analytics funnel, evidence progress | Open the required source apps before auditing. | Source-review state | not graded | `scene_02_app_audit` |
| `scene_02_app_audit` Check the Current Roamly Flow | `app_audit` | Five Roamly screens, app-audit review console, related funnel numbers, Jordan help | Save one grounded note for each screen. | Current app-audit notes | Current Flow Audit | `scene_03_research_prep` |
| `scene_03_research_prep` Prepare the User Call | `free_text` / Roamly Research Hub | Nina profile, research guardrails, saved app-audit notes, five question rows | Write exactly five interview questions and one learning goal. | User-call prep | Interview Prep | `scene_04_user_call` |
| `scene_04_user_call` Remote User Interview with Nina | `voice_meeting` | Interview console, prep tray, compact user context, prep note, transcript, typed backup | Ask Nina at least five questions without pitching a solution. | User interview transcript | User Interview | `scene_07_prd_slice` |
| `scene_07_prd_slice` Write the Product Plan | `free_text` / Product Plan doc editor | Saved audit notes, Nina transcript, product-plan checklist, document section strip | Write a four-part Product Plan. | Product Plan draft | Product Plan | `assessment_gate` |
| `assessment_gate` The Product Planning Day Is Complete | `section_transition` | Completed task summary | Start assessment. | none | not graded | `grading` |
| `grading` Assessment in Progress | `grading` | Saved artifacts and transcript | Wait for scoring. | Career report data | all rubric criteria | `final_report` |
| `final_report` Product Manager Simulation Report | `final_report` | Grading result | Review feedback and restart if desired. | displayed report | not graded | null |

## Removed Active Nodes

- `scene_02_problem_brief` and `transition_research` are not active.
- Roadmap and priority-matrix scenes are not active in this Product Manager route.
