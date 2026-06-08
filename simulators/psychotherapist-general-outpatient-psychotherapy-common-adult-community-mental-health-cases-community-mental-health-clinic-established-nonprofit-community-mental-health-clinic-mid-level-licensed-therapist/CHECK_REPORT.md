# Simulator QA Report

Simulator: `psychotherapist-general-outpatient-psychotherapy-common-adult-community-mental-health-cases-community-mental-health-clinic-established-nonprofit-community-mental-health-clinic-mid-level-licensed-therapist`

Status: **Code issues fixed; runtime QA still incomplete**.

## Summary

- Game title: Psychotherapist Simulation
- `workflow.validate --strict`: 27 pass / 0 warn / 0 fail
- `npm run build`: PASS
- Open P0/P1/P2 simulator issues from this pass: none after fixes
- Resolved issues: VOICE-001, TASK-CHAIN-001, INTRO-001
- Remaining blocker: QA-001, because Codex browser policy blocked local runtime playthrough. This is not fixed by simulator code.

## Open Issues

| ID | Severity | Scene/file | Reproduction or inspection method | Expected behavior | Actual behavior | Fix made or proposed | Retest result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QA-001 | QA blocker | Runtime browser playthrough | Local dev servers were started and Codex in-app browser navigation to 127.0.0.1 was attempted. | Normal-player runtime pass can click through every scene, submit realistic inputs, and visually inspect high-risk surfaces. | Browser security policy rejected the local URL and instructed not to work around the block with another browser surface. | Complete runtime playthrough in an allowed browser session. | Not retested here; static validation and production builds pass. |

## Resolved Issues

| ID | Severity | Area | Fix made | Retest result |
| --- | --- | --- | --- | --- |
| VOICE-001 | P1 fixed | Voice meeting player-facing goal/endpoint/success guidance | Added `playerGoal`, `endpoint`, and `successCriteria` to voice meetings; updated `VoiceMeetingScene` and types so the guidance is visible. Backported schema/prompt/validator support. | Strict validation and production build pass. |
| TASK-CHAIN-001 | P1 fixed | Missing deskWorkDesign on high-risk task scenes | Added deskWorkDesign metadata for the affected voice meetings so input -> task -> output -> grading evidence is auditable. | Strict validation passes. |
| INTRO-001 | P2 fixed | Psychotherapist intro type | Changed the psychotherapist start node from `briefing` to standard `intro` and mirrored it in synthesis config. | Strict validation and build pass. |

## Scene Audit

| Order | Scene id | Type | What player must do | Inputs visible where | Output captured where | Grading evidence | Route checked | UI/runtime notes | Issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `intro` | intro | intro scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: scene_01_morning_priority; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 2 | `scene_01_morning_priority` | multiple_choice | Choose the morning prioritization message to send. | clinic huddle messages @ slackMessages; Slack-style messages (2) | mc.scene_01_morning_priority | Clinical prioritization under clinic pressure; Clinical prioritization under clinic pressure | Static next checked: branchOn scene_01_morning_priority; default scene_01_review_maya_redirect; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 3 | `scene_01_review_maya_redirect` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: scene_02_case_prep; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 4 | `scene_01_clear_notes_redirect` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: scene_02_case_prep; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 5 | `scene_01_take_walkin_redirect` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: scene_02_case_prep; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 6 | `scene_01_ask_huddle_redirect` | briefing | briefing scene: context/navigation | Slack-style messages (2) | None; context/navigation only | None / context only | Static next checked: scene_02_case_prep; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 7 | `scene_02_case_prep` | free_text | Draft a brief session plan with concrete prompts. | Maya case packet @ appTabs.case_packet; clinic risk reminder @ appTabs.clinic_frame; appTabs: Maya case packet, Clinic risk reminder | session prep note (numbered prompts) | Clinical prioritization under clinic pressure; Session planning and risk-informed questions; Session planning and risk-informed questions | Static next checked: scene_03_client_session; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 8 | `scene_03_client_session` | voice_meeting | Conduct a client session with alliance-building and direct risk assessment. | Student session prep @ scene_03_client_session.prepNoteKey; Compact case cues @ scene_03_client_session.prepReferenceContent; prepReferenceContent; prepNoteKey: scene_02... | Client-session transcript (voice_meeting) | Session planning and risk-informed questions; Therapeutic alliance with clinically appropriate risk assessment; Session planning and risk-informed qu... | Static next checked: section_transition_1_2; runtime pending | Player goal, endpoint, success criteria, support, and transcript path configured; runtime transcript pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 9 | `section_transition_1_2` | section_transition | section_transition scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: scene_04_progress_note; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 10 | `scene_04_progress_note` | free_text | Draft a clinically useful progress note. | session facts @ appTabs.session_facts; DAP documentation standard @ appTabs.documentation_standard; appTabs: Session facts, Documentation standard | Maya progress note (DAP note) | Progress note quality and privacy judgment; Progress note quality and privacy judgment; Therapeutic alliance with clinically appropriate risk assessm... | Static next checked: scene_05_no_show_outreach; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 11 | `scene_05_no_show_outreach` | voice_meeting | Optionally draft talking points, then speak a privacy-safe voicemail for Jordan after the no-show call. | Jordan contact snapshot @ scene_05_no_show_outreach.prepReferenceContent | privacy-safe no-show voicemail transcript (spoken voicemail transcript) | No-show/outreach workflow; No-show/outreach workflow | Static next checked: section_transition_2_3; runtime pending | Phone-screen UI configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 12 | `section_transition_2_3` | section_transition | section_transition scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: scene_06_policy_briefing; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 13 | `scene_06_policy_briefing` | briefing | briefing scene: context/navigation | referenceContent | None; context/navigation only | None / context only | Static next checked: scene_07_supervisor_consult; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 14 | `scene_07_supervisor_consult` | voice_meeting | Present a concise risk consult and get supervisor guidance. | Consult facts and policy cues @ scene_07_supervisor_consult.prepReferenceContent; Risk and confidentiality reference @ prior scene scene_06_policy_briefing; prepReferenc... | Supervisor consult transcript (voice_meeting) | Supervisor consultation and ethical reasoning; Supervisor consultation and ethical reasoning | Static next checked: scene_08_safety_plan; runtime pending | Player goal, endpoint, success criteria, support, and transcript path configured; runtime transcript pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 15 | `scene_08_safety_plan` | structured_entry | Complete a client-specific safety and follow-up plan. | case facts and plan criteria @ referenceContent; referenceContent | Maya safety plan (structured EHR form) | Therapeutic alliance with clinically appropriate risk assessment; Collaborative safety and follow-up plan; Collaborative safety and follow-up plan; T... | Static next checked: scene_09_coordination_email; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 16 | `scene_09_coordination_email` | free_text | Write a secure care-coordination message. | minimum necessary guidance @ appTabs.coordination_guidance; appTabs: Coordination guidance | secure coordination email (email) | Minimum-necessary care coordination; Minimum-necessary care coordination | Static next checked: assessment_gate; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 17 | `assessment_gate` | section_transition | section_transition scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: grading; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 18 | `grading` | grading | grading scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: final_report; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 19 | `final_report` | final_report | final_report scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: terminal; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |

## Grading Evidence Map

| Rubric criterion | Expected evidence | Runtime source | Tested? | Issues |
| --- | --- | --- | --- | --- |
| Clinical prioritization under clinic pressure | `scene_01_morning_priority`, `scene_02_case_prep` | scene_01_morning_priority: mc.scene_01_morning_priority; scene_02_case_prep: session prep note (numbered prompts) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Session planning and risk-informed questions | `scene_02_case_prep`, `scene_03_client_session` | scene_02_case_prep: session prep note (numbered prompts); scene_03_client_session: Client-session transcript (voice_meeting) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Therapeutic alliance with clinically appropriate risk assessment | `scene_03_client_session`, `scene_08_safety_plan` | scene_03_client_session: Client-session transcript (voice_meeting); scene_08_safety_plan: Maya safety plan (structured EHR form) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Progress note quality and privacy judgment | `scene_04_progress_note` | scene_04_progress_note: Maya progress note (DAP note) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| No-show/outreach workflow | `scene_05_no_show_outreach` | scene_05_no_show_outreach: privacy-safe no-show voicemail transcript (spoken voicemail transcript) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Supervisor consultation and ethical reasoning | `scene_07_supervisor_consult` | scene_07_supervisor_consult: Supervisor consult transcript (voice_meeting) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Collaborative safety and follow-up plan | `scene_08_safety_plan` | scene_08_safety_plan: Maya safety plan (structured EHR form) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Minimum-necessary care coordination | `scene_09_coordination_email` | scene_09_coordination_email: secure coordination email (email) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |

## High-Risk Surface Audit

| Surface | Scene id(s) | Required probe | Result | Issues |
| --- | --- | --- | --- | --- |
| Voice meeting | `scene_03_client_session`, `scene_07_supervisor_consult` | goal/endpoint/support/material/transcript | Fixed statically: player goal, endpoint, success criteria, support, and transcript output are configured. | QA-001 for live transcript runtime proof |
| Video/recording | None | record/play/edit/transcript/grading evidence | Not applicable in this target set. | Pass |
| Drag/drop/matrix | None | move/re-move/submit/saved state | Priority matrix revision fixed statically; runtime drag probe pending. | QA-001 |
| Multi-window desktop | task app-window scenes | windows fit inside normal screen footprint | Static config/build pass; visual fit still needs browser. | QA-001 |
| Source-heavy task | task scenes with appTabs/reference/prep | all new task-critical info visible in workspace/prep | Static input chains configured. | QA-001 for visual proof |
| Expert-knowledge task | role-specific source scenes | beginner support/reference/definition present | Static support/reference configured. | QA-001 for visual proof |

## Scenario Ledger

| Item | First appearance | Later appearances | Coherent? | Issues |
| --- | --- | --- | --- | --- |
| Material times/counts/values | Source packet and task scenes | 8:35 AM, 10:00 AM, 10:00 , 8:36 AM, 10:00, 8:37 AM, 8:38 AM, 8:42 AM, 11:15, 11:00 , 15 minutes, 11:15 AM, 11:00 AM | Static scan did not find an open contradiction after fixes; runtime visual proof pending | QA-001 |

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
