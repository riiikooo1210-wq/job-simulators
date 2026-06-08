# Simulator QA Report

Simulator: `startup-lawyer-emerging-companies-and-venture-financing-startup-corporate-law-u-s-law-firm-entry-level-junior-associate`

Status: **Code issues fixed; runtime QA still incomplete**.

## Summary

- Game title: Startup Lawyer Simulation
- `workflow.validate`: 26 pass / 0 warn / 0 fail
- `npm run build`: PASS
- Open P0/P1/P2 simulator issues from this pass: none after fixes
- Resolved issues: VOICE-001, MATRIX-001, FLOW-001
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
| FLOW-001 | P1 fixed | Startup lawyer task flow | Removed the standalone deal-signal matrix and routed `closing_checklist` directly into `founder_call_prep`, where checklist issues are converted into Arjun call bullets. | Validation passes: 26 pass / 0 warn / 0 fail. |

## Scene Audit

| Order | Scene id | Type | What player must do | Inputs visible where | Output captured where | Grading evidence | Route checked | UI/runtime notes | Issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `intro` | intro | intro scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: briefing_morning; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 2 | `briefing_morning` | briefing | briefing scene: context/navigation | referenceContent; Slack-style messages (1) | None; context/navigation only | None / context only | Static next checked: first_move; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 3 | `first_move` | multiple_choice | Choose the first Slack response that sets up a substance-first legal checklist pass. | LumenLoop deal packet @ briefing_morning.referenceContent; Slack-style messages (1) | First-move Slack choice (multiple_choice) | First-Move Judgment; mcSelections.first_move; branchFlags.first_move | Static next checked: branchOn first_move; default redirect_checklist_first; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 4 | `redirect_checklist_first` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: closing_checklist; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 5 | `redirect_questions` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: closing_checklist; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 6 | `redirect_polish` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: closing_checklist; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 7 | `redirect_overclaim` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: closing_checklist; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 8 | `closing_checklist` | structured_entry | Transform visible deal sources into reviewable closing checklist rows. | LumenLoop deal packet @ briefing_morning.referenceContent and reference drawer | Closing checklist rows (structured_entry) | Closing Checklist Quality; freeTextResponses.closing_checklist | Static next checked: founder_call_prep; runtime pending | App-window focus configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 9 | `founder_call_prep` | free_text | Turn checklist blockers into call-prep bullets for Arjun. | Checklist issues @ founder_call_prep.appTabs.checklist_findings; Founder-call facts @ founder_call_prep.appTabs.call_facts; appTabs: Checklist issues, Call facts, Guardrails, Maya's bar | Founder-call prep note (free_text) | Founder Call Preparation and Handling; freeTextResponses.founder_call_prep | Static next checked: founder_call; runtime pending | App-window focus configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 10 | `founder_call` | voice_meeting | Speak with the founder and clarify missing items without over-promising. | Student founder-call prep @ founder_call.prepNoteKey; Compact deal reference @ founder_call.prepReferenceContent; prepReferenceContent; prepNoteKey: founder_call_prep | Voice transcript (voice_meeting) | Founder Call Preparation and Handling; npcConversations.voice:founder_call:arjun | Static next checked: issue_list; runtime pending | Player goal, endpoint, success criteria, support, and transcript path configured; runtime transcript pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 11 | `issue_list` | structured_entry | Annotate the saved closing checklist with post-call comments for Maya. | Founder-call notes @ previous response tab; Saved checklist rows @ annotation source | Annotated closing checklist comments (structured_entry) | Post-Call Checklist Annotation; freeTextResponses.issue_list | Static next checked: assessment_gate; runtime checked | App-window focus configured; visual runtime checked. | Static issue fixed or pass |
| 12 | `assessment_gate` | section_transition | section_transition scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: grading; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 13 | `grading` | grading | grading scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: final_report; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 14 | `final_report` | final_report | final_report scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: terminal; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |

## Grading Evidence Map

| Rubric criterion | Expected evidence | Runtime source | Tested? | Issues |
| --- | --- | --- | --- | --- |
| First-Move Judgment | `first_move` | first_move: First-move Slack choice (multiple_choice) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Closing Checklist Quality | `closing_checklist` | closing_checklist: Closing checklist rows (structured_entry) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Founder Call Preparation and Handling | `founder_call_prep`, `founder_call` | founder_call_prep: Founder-call prep note (free_text); founder_call: Voice transcript (voice_meeting) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Post-Call Checklist Annotation | `issue_list` | issue_list: Annotated closing checklist comments (structured_entry) | Static retested; runtime checked | Static evidence chain configured; runtime save proof checked |

## High-Risk Surface Audit

| Surface | Scene id(s) | Required probe | Result | Issues |
| --- | --- | --- | --- | --- |
| Voice meeting | `founder_call` | goal/endpoint/support/material/transcript | Fixed statically: player goal, endpoint, success criteria, support, and transcript output are configured. | QA-001 for live transcript runtime proof |
| Video/recording | None | record/play/edit/transcript/grading evidence | Not applicable in this target set. | Pass |
| Drag/drop/matrix | None | move/re-move/submit/saved state | Not applicable after removing the standalone matrix task. | Pass |
| Multi-window desktop | task app-window scenes | windows fit inside normal screen footprint | Static config/build pass; visual fit still needs browser. | QA-001 |
| Source-heavy task | task scenes with appTabs/reference/prep | all new task-critical info visible in workspace/prep | Static input chains configured. | QA-001 for visual proof |
| Expert-knowledge task | role-specific source scenes | beginner support/reference/definition present | Static support/reference configured. | QA-001 for visual proof |

## Scenario Ledger

| Item | First appearance | Later appearances | Coherent? | Issues |
| --- | --- | --- | --- | --- |
| Material times/counts/values | Source packet and task scenes | 11:30 , 8:12 AM, 2:00 PM, 2:00 , 8:20 AM, 8:21 AM, 8:22 AM, 10:35, 15 minutes, 10:35  | Static scan did not find an open contradiction after fixes; runtime visual proof pending | QA-001 |

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
