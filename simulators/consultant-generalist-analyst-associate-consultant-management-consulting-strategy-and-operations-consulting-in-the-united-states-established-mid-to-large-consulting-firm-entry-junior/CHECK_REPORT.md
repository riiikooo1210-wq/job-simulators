# Simulator QA Report

Simulator: `consultant-generalist-analyst-associate-consultant-management-consulting-strategy-and-operations-consulting-in-the-united-states-established-mid-to-large-consulting-firm-entry-junior`

Status: **Code issues fixed; runtime QA still incomplete**.

## Summary

- Game title: Consultant Simulation
- `workflow.validate --strict`: 27 pass / 0 warn / 0 fail
- `npm run build`: PASS
- Open P0/P1/P2 simulator issues from this pass: none after fixes
- Resolved issues: VOICE-001, MATRIX-001
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

## Scene Audit

| Order | Scene id | Type | What player must do | Inputs visible where | Output captured where | Grading evidence | Route checked | UI/runtime notes | Issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `intro` | intro | intro scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: briefing_morning; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 2 | `briefing_morning` | briefing | briefing scene: context/navigation | referenceContent; Slack-style messages (1) | None; context/navigation only | None / context only | Static next checked: first_move; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 3 | `first_move` | multiple_choice | Choose the first Slack response that sets up credible consultant work. | HarborMart source packet @ briefing_morning.referenceContent; Slack-style messages (1) | First-move Slack choice (multiple_choice) | First-Move Judgment; mcSelections.first_move; branchFlags.first_move | Static next checked: branchOn first_move; default redirect_analysis; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 4 | `redirect_analysis` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: case_packet_review; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 5 | `redirect_polish` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: case_packet_review; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 6 | `redirect_questions` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: case_packet_review; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 7 | `redirect_background` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: case_packet_review; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 8 | `case_packet_review` | free_text | Read the visible source tabs and write a concise packet readout. | Case brief @ briefing_morning.referenceContent and case_packet_review.appTabs.case_brief; KPI extract @ briefing_morning.referenceContent and case_packet_review.appTabs.... | Packet readout note (free_text) | First-Move Judgment; freeTextResponses.case_packet_review | Static next checked: issue_tree; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 9 | `issue_tree` | structured_entry | Transform source facts into testable issue-tree branches. | Case brief @ briefing_morning.referenceContent and case_packet_review.appTabs.case_brief; KPI extract @ briefing_morning.referenceContent and case_packet_review.appTabs.... | Issue tree rows (structured_entry) | Issue Tree Quality; freeTextResponses.issue_tree | Static next checked: data_triage; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 10 | `data_triage` | priority_matrix | Place every incoming issue on an urgency/decision-impact matrix and explain the first action. | Case brief @ briefing_morning.referenceContent and case_packet_review.appTabs.case_brief; KPI extract @ briefing_morning.referenceContent and case_packet_review.appTabs.... | Completed triage matrix plus rationale (priority_matrix) | Data Triage; freeTextResponses.input_triage; freeTextResponses.input_triage_rationale | Static next checked: client_call_prep; runtime pending | Placed chips are draggable after fix; runtime drag probe pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 11 | `client_call_prep` | free_text | Prepare compact client-call talking points and questions from visible source facts. | Current findings @ client_call_prep.appTabs.current_findings; appTabs: Current findings, Definitions, Triage criteria | Client call prep note (free_text) | Client Call Handling; freeTextResponses.client_call_prep | Static next checked: client_call; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 12 | `client_call` | voice_meeting | Speak with the client and clarify the missing inputs without over-claiming. | Student call prep @ client_call.prepNoteKey; Compact call reference @ client_call.prepReferenceContent; prepReferenceContent; prepNoteKey: client_call_prep | Voice transcript (voice_meeting) | Client Call Handling; npcConversations.voice:client_call:marcus | Static next checked: analysis_findings; runtime pending | Player goal, endpoint, success criteria, support, and transcript path configured; runtime transcript pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 13 | `analysis_findings` | structured_entry | Convert source data and client-call information into evidence/implication/caveat findings. | Current analysis notes @ analysis_findings.content | Structured findings table (structured_entry) | Analytical Synthesis; freeTextResponses.analysis_findings | Static next checked: manager_slack; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 14 | `manager_slack` | slack_thread | Send a concise answer-first manager update in Slack. | Student findings @ previous scene output; Client-call transcript @ prior voice meeting transcript; initial messages (2) | Manager Slack reply (slack_thread) | Manager Communication; npcConversations.chat:manager_slack:priya | Static next checked: slide_draft; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 15 | `slide_draft` | free_text | Draft a conclusion-style slide headline and speaker note. | Slide inputs @ slide_draft.appTabs.slide_inputs; appTabs: Slide inputs, Findings, Priya's bar | Slide headline and speaker note (free_text) | Slide-Ready Storytelling; freeTextResponses.slide_draft | Static next checked: assessment_gate; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 16 | `grading` | grading | grading scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: final_report; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 17 | `final_report` | final_report | final_report scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: terminal; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 18 | `assessment_gate` | section_transition | section_transition scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: grading; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |

## Grading Evidence Map

| Rubric criterion | Expected evidence | Runtime source | Tested? | Issues |
| --- | --- | --- | --- | --- |
| First-Move Judgment | `first_move`, `case_packet_review` | first_move: First-move Slack choice (multiple_choice); case_packet_review: Packet readout note (free_text) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Issue Tree Quality | `issue_tree` | issue_tree: Issue tree rows (structured_entry) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Data Triage | `data_triage` | data_triage: Completed triage matrix plus rationale (priority_matrix) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Client Call Handling | `client_call_prep`, `client_call` | client_call_prep: Client call prep note (free_text); client_call: Voice transcript (voice_meeting) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Analytical Synthesis | `analysis_findings` | analysis_findings: Structured findings table (structured_entry) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Manager Communication | `manager_slack` | manager_slack: Manager Slack reply (slack_thread) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Slide-Ready Storytelling | `slide_draft` | slide_draft: Slide headline and speaker note (free_text) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |

## High-Risk Surface Audit

| Surface | Scene id(s) | Required probe | Result | Issues |
| --- | --- | --- | --- | --- |
| Voice meeting | `client_call` | goal/endpoint/support/material/transcript | Fixed statically: player goal, endpoint, success criteria, support, and transcript output are configured. | QA-001 for live transcript runtime proof |
| Video/recording | None | record/play/edit/transcript/grading evidence | Not applicable in this target set. | Pass |
| Drag/drop/matrix | `data_triage` | move/re-move/submit/saved state | Priority matrix revision fixed statically; runtime drag probe pending. | QA-001 |
| Multi-window desktop | task app-window scenes | windows fit inside normal screen footprint | Static config/build pass; visual fit still needs browser. | QA-001 |
| Source-heavy task | task scenes with appTabs/reference/prep | all new task-critical info visible in workspace/prep | Static input chains configured. | QA-001 for visual proof |
| Expert-knowledge task | role-specific source scenes | beginner support/reference/definition present | Static support/reference configured. | QA-001 for visual proof |

## Scenario Ledger

| Item | First appearance | Later appearances | Coherent? | Issues |
| --- | --- | --- | --- | --- |
| Material times/counts/values | Source packet and task scenes | 8:18 AM, 10:00 , 18%, 21%, 24%, 13%, 31%, 43%, 19%, 25%, 8:24 AM, 8:25 AM, 8:26 AM, 10:45, 15 minutes, 10:45 , 3:30 , 3:30 | Static scan did not find an open contradiction after fixes; runtime visual proof pending | QA-001 |

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
