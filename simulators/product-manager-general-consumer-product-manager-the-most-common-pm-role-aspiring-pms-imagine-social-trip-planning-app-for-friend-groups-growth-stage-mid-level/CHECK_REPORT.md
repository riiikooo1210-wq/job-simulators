# Simulator QA Report

Simulator: `product-manager-general-consumer-product-manager-the-most-common-pm-role-aspiring-pms-imagine-social-trip-planning-app-for-friend-groups-growth-stage-mid-level`

Status: **Code issues fixed; runtime QA still incomplete**.

## Summary

- Game title: Product Manager Simulation
- `workflow.validate --strict`: 26 pass / 0 warn / 0 fail
- `npm run build`: PASS
- Open P0/P1/P2 simulator issues from this pass: none after fixes
- Resolved issues: VOICE-001, MATRIX-001, DOC-001
- Remaining blocker: QA-001, because Codex browser policy blocked local runtime playthrough. This is not fixed by simulator code.

## Open Issues

| ID | Severity | Scene/file | Reproduction or inspection method | Expected behavior | Actual behavior | Fix made or proposed | Retest result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QA-001 | QA blocker | Runtime browser playthrough | Local dev servers were started and Codex in-app browser navigation to 127.0.0.1 was attempted. | Normal-player runtime pass can click through every scene, submit realistic inputs, and visually inspect high-risk surfaces. | Browser security policy rejected the local URL and instructed not to work around the block with another browser surface. | Complete runtime playthrough in an allowed browser session. | Not retested here; static validation and production builds pass. |

## Resolved Issues

| ID | Severity | Area | Fix made | Retest result |
| --- | --- | --- | --- | --- |
| VOICE-001 | P1 fixed | Voice meeting player-facing goal/endpoint/success guidance | Added `playerGoal`, `endpoint`, and `successCriteria` to voice meetings; updated `VoiceMeetingScene` and types so the guidance is visible. Backported schema/prompt/validator support. | Strict validation and production build pass. |
| MATRIX-001 | P1 fixed | Priority matrix area-to-area revision | Made placed matrix chips draggable by adding `PlacedMatrixItem`; players can reposition before submit. Backported to template and affected simulators. | Production build passes for affected simulators. |
| DOC-001 | P2 fixed | Product Manager citation warning | Added a citation marker to the Product Manager job profile title line in simulator and synthesis documents. | Strict validation now reports 0 warn. |

## Scene Audit

| Order | Scene id | Type | What player must do | Inputs visible where | Output captured where | Grading evidence | Route checked | UI/runtime notes | Issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `intro` | intro | intro scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: briefing_kickoff; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 2 | `briefing_kickoff` | briefing | briefing scene: context/navigation | referenceContent | None; context/navigation only | None / context only | Static next checked: scene_01_first_move; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 3 | `scene_01_first_move` | multiple_choice | Choose the first PM move under time pressure. | Roamly product-review workspace @ briefing_kickoff.sourceWorkspace | First-move decision (multiple_choice) | Evidence-based problem framing; mcSelections.scene_01_first_move; branchFlags.scene_01_first_move | Static next checked: branchOn scene_01_first_move; default redirect_problem_first; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 4 | `redirect_solution_first` | briefing | briefing scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: scene_02_problem_brief; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 5 | `redirect_problem_first` | briefing | briefing scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: scene_02_problem_brief; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 6 | `redirect_estimate_first` | briefing | briefing scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: scene_02_problem_brief; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 7 | `redirect_data_first` | briefing | briefing scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: scene_02_problem_brief; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 8 | `scene_02_problem_brief` | structured_entry | Synthesize messy product evidence into a concise brief for the main/largest product problem. | Same Roamly source workspace carried forward as in-window file/dashboard tabs @ briefing_kickoff.sourceWorkspace and scene_02_problem_brief.workSurface.sourceTabs | Problem brief (structured_entry) | Evidence-based problem framing; Risk and unknown identification; Clarity under ambiguity; structuredEntries.problemBrief | Static next checked: transition_research; runtime DOM checked for tabs | No high-risk visual surface. | Source tabs render as document/table previews inside the work window. |
| 9 | `transition_research` | section_transition | section_transition scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: scene_03_research_prep; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 10 | `scene_03_research_prep` | free_text | Draft non-leading user interview questions and a learning goal. | Nina user profile @ scene_03_research_prep.appTabs.profile; Research guardrails @ scene_03_research_prep.appTabs.research_guardrails; appTabs: User Profile, Research Gua... | User-call prep questions (free_text) | User research quality; Clarity under ambiguity; freeTextResponses.scene_03_research_prep | Static next checked: scene_04_user_call; runtime pending | No high-risk visual surface. | Static issue fixed or pass; runtime pending due QA-001 |
| 11 | `scene_04_user_call` | voice_meeting | Conduct a spoken user interview that explores behavior and motivation without leading the user. | Student's user-call prep @ scene_04_user_call.prepNoteKey; Compact user context @ scene_04_user_call.prepReferenceContent; initial messages (1); prepReferenceContent; pr... | User interview transcript (voice_meeting_transcript) | User research quality; transcripts.scene_04_user_call | Static next checked: scene_05_priority_matrix; runtime pending | Player goal, endpoint, success criteria, support, and transcript path configured; runtime transcript pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 12 | `scene_05_priority_matrix` | priority_matrix | Place product bets on an impact/effort matrix and justify the recommended bet. | Top tabs inside Group Momentum Bet Matrix window: workplace tabs for Amplitude Funnel, Customer Feedback, Constraints, Candidate Tickets; separate Nina Interview tab saying 18 saved places, 3 of 7 votes, quiet budget pressure, and need for one small decision @ scene_05_priority_matrix.workSurface.sourceTabs; Nina interview transcript @ scene_04_user_call transcript | Impact/effort matrix and rationale (priority_matrix) | Prioritization judgment; Clarity under ambiguity; interactiveCanvas.priorityMatrix; freeTextResponses.priorityMatrixRationale | Static next checked: scene_06_roadmap_kanban; runtime tab check passed for Amplitude source tab | Placed chips are draggable after fix; runtime drag probe pending. | Source tabs render in matrix window; Nina Interview tab separates the call evidence; drag runtime still pending. |
| 13 | `scene_06_roadmap_kanban` | kanban_board | Move roadmap cards into triage columns and explain the PM rationale. | Summary of information @ scene_06_roadmap_kanban.referenceTabs.summary; Triage criteria @ scene_06_roadmap_kanban.referenceTabs.triage_criteria; Roadmap cards @ scene_06_roadmap_kanban.cards | Roadmap triage board and rationale (kanban_board) | Risk and unknown identification; Prioritization judgment; Clarity under ambiguity; kanban.roadmapKanban; freeTextResponses.roadmapRationale | Static next checked: scene_07_prd_slice; runtime pending | Kanban state/rationale configured; runtime drag probe pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 14 | `scene_07_prd_slice` | free_text | Draft a concise PRD slice / decision memo. | Problem brief reminder @ scene_07_prd_slice.appTabs.problem_brief; Prioritization notes @ scene_07_prd_slice.appTabs.prioritization; PRD checklist @ scene_07_prd_slice.a... | PRD slice (free_text) | Risk and unknown identification; PRD and decision memo quality; Clarity under ambiguity; freeTextResponses.scene_07_prd_slice | Static next checked: assessment_gate; runtime pending | No high-risk visual surface. | Static issue fixed or pass; runtime pending due QA-001 |
| 15 | `assessment_gate` | section_transition | section_transition scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: grading; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 17 | `grading` | grading | grading scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: final_report; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 18 | `final_report` | final_report | final_report scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: terminal; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |

## Grading Evidence Map

| Rubric criterion | Expected evidence | Runtime source | Tested? | Issues |
| --- | --- | --- | --- | --- |
| Evidence-based problem framing | `scene_01_first_move`, `scene_02_problem_brief` | scene_01_first_move: First-move decision (multiple_choice); scene_02_problem_brief: Problem brief (structured_entry) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Risk and unknown identification | `scene_02_problem_brief`, `scene_06_roadmap_kanban`, `scene_07_prd_slice` | scene_02_problem_brief: Problem brief (structured_entry); scene_06_roadmap_kanban: Roadmap triage board and rationale (kanban_board); scene_07_prd_slice: PRD slice (free_text) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| User research quality | `scene_03_research_prep`, `scene_04_user_call` | scene_03_research_prep: User-call prep questions (free_text); scene_04_user_call: User interview transcript (voice_meeting_transcript) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Prioritization judgment | `scene_05_priority_matrix`, `scene_06_roadmap_kanban` | scene_05_priority_matrix: Impact/effort matrix and rationale (priority_matrix); scene_06_roadmap_kanban: Roadmap triage board and rationale (kanban_board) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| PRD and decision memo quality | `scene_07_prd_slice` | scene_07_prd_slice: PRD slice (free_text) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Clarity under ambiguity | `scene_02_problem_brief`, `scene_03_research_prep`, `scene_05_priority_matrix`, `scene_06_roadmap_kanban`, `scene_07_prd_slice` | scene_02_problem_brief: Problem brief (structured_entry); scene_03_research_prep: User-call prep questions (free_text); scene_05_priority_matrix: Impact/effort matrix and rational... | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |

## High-Risk Surface Audit

| Surface | Scene id(s) | Required probe | Result | Issues |
| --- | --- | --- | --- | --- |
| Voice meeting | `scene_04_user_call` | goal/endpoint/support/material/transcript | Fixed statically: player goal, endpoint, success criteria, support, and transcript output are configured. | QA-001 for live transcript runtime proof |
| Video/recording | None | record/play/edit/transcript/grading evidence | Not applicable in this target set. | Pass |
| Drag/drop/matrix | `scene_05_priority_matrix`, `scene_06_roadmap_kanban` | move/re-move/submit/saved state | Priority matrix revision fixed statically; runtime drag probe pending. | QA-001 |
| Multi-window desktop | task app-window scenes | windows fit inside normal screen footprint | Static config/build pass; visual fit still needs browser. | QA-001 |
| Source-heavy task | task scenes with appTabs/reference/prep | all new task-critical info visible in workspace/prep | Static input chains configured. | QA-001 for visual proof |
| Expert-knowledge task | role-specific source scenes | beginner support/reference/definition present | Static support/reference configured. | QA-001 for visual proof |

## Scenario Ledger

| Item | First appearance | Later appearances | Coherent? | Issues |
| --- | --- | --- | --- | --- |
| Material times/counts/values | Source packet and task scenes | 18%, 7 days, 100%, 64%, 41%, 19%, 11%, 25 minutes, 20 minutes | Static scan did not find an open contradiction after fixes; runtime visual proof pending | QA-001 |

## Mandatory Failure Class Red-Team

| Failure class | Result | Issues |
| --- | --- | --- |
| No real task | Static task/output chains configured; runtime completion still pending. | QA-001 |
| Wrong or hidden input | Static input chains configured; visual sufficiency still pending. | QA-001 |
| Bad sequence | Static next-rule scan and validator pass. | Pass static |
| Narration instead of source artifact | Source artifacts remain in app tabs/reference/slack where configured. | QA-001 for visual realism |
| Role-inappropriate work | No open static role mismatch after fixes. | Pass static |
| Unclear task purpose | Voice player goals/endpoints/success criteria added. | Fixed |
| Expert-knowledge trap | Reference/prep support configured where declared. | QA-001 for visual proof |
| Fake physical/procedural work | No open static issue after fixes. | Pass static |
| No meeting endpoint | Fixed with player-facing endpoint fields. | Fixed |
| Video evidence broken | No video scenes in these target simulators. | Pass |
| Weak grading evidence | DeskWorkDesign/evidence chains added where missing. | Fixed static; QA-001 runtime |
| Duplicate visual context | Needs browser visual pass. | QA-001 |
| Hidden or missing illustration | Needs browser visual pass. | QA-001 |
| Cramped or oversized window | Needs browser visual pass. | QA-001 |
| Multi-window desktop overflow | Needs browser visual pass. | QA-001 |
| Unrealistic app UI | Build/static pass; visual pass pending. | QA-001 |
| Scenario-data mismatch | No open static contradiction found in this fix pass. | Pass static |
| Over-scripting | No open static issue from fixed fields. | Pass static |
| Missing core experience | Voice/live moments remain present; endpoints added. | Fixed static |
| Branch context loss | VC first MCQ chain metadata added; branch routes still validate. | Fixed |

## Backport Candidates

- Completed: priority-matrix placed chips are now draggable in the reference template and affected simulators.
- Completed: voice meetings now support player-facing `endpoint` and `successCriteria` in types, schema, prompt guidance, validator checks, and UI.
- Completed: validator now flags voice meetings missing player-facing goal/endpoint/success criteria.

## Final Readiness

- `workflow.validate --strict`: pass
- `npm run build`: pass
- Scene audit table: complete from static config
- Grading evidence map: complete from static config
- High-risk surface audit: static fixes complete; runtime probes blocked
- Scenario ledger: static scan complete
- Normal-player runtime route: **not completed**
- All P0 fixed: no P0 found
- All P1 fixed or accepted: fixed
- Final status: **Not ready only because runtime browser QA remains blocked**
