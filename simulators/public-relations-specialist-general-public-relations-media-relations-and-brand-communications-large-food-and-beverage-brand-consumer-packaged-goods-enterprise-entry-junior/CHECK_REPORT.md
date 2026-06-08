# Simulator QA Report

Simulator: `public-relations-specialist-general-public-relations-media-relations-and-brand-communications-large-food-and-beverage-brand-consumer-packaged-goods-enterprise-entry-junior`

Status: **Code issues fixed; runtime QA still incomplete**.

## Summary

- Game title: Public Relations Simulation
- `workflow.validate --strict`: 25 pass / 0 warn / 0 fail
- `npm run build`: PASS
- Open P0/P1/P2 simulator issues from this pass: none after fixes
- Resolved issues: VOICE-001
- Remaining blocker: QA-001, because Codex browser policy blocked local runtime playthrough. This is not fixed by simulator code.

## Open Issues

| ID | Severity | Scene/file | Reproduction or inspection method | Expected behavior | Actual behavior | Fix made or proposed | Retest result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QA-001 | QA blocker | Runtime browser playthrough | Local dev servers were started and Codex in-app browser navigation to 127.0.0.1 was attempted. | Normal-player runtime pass can click through every scene, submit realistic inputs, and visually inspect high-risk surfaces. | Browser security policy rejected the local URL and instructed not to work around the block with another browser surface. | Complete runtime playthrough in an allowed browser session. | Not retested here; static validation and production builds pass. |

## Resolved Issues

| ID | Severity | Area | Fix made | Retest result |
| --- | --- | --- | --- | --- |
| VOICE-001 | P1 fixed | Voice meeting player-facing goal/endpoint/success guidance | Added `playerGoal`, `endpoint`, and `successCriteria` to voice meetings; updated `VoiceMeetingScene` and types so the guidance is visible. Backported schema/prompt/validator support. | Strict validation and production build pass. |

## Scene Audit

| Order | Scene id | Type | What player must do | Inputs visible where | Output captured where | Grading evidence | Route checked | UI/runtime notes | Issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `intro` | intro | intro scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: launch_packet; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 2 | `launch_packet` | briefing | briefing scene: context/navigation | Approved Launch Packet @ launch_packet.referenceContent; referenceContent | Source packet reviewed (briefing) | context for all later artifacts | Static next checked: first_move; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 3 | `first_move` | multiple_choice | Choose a first Slack response that protects source discipline and realistic PR workflow. | Approved Launch Packet @ launch_packet.referenceContent; Slack-style messages (1) | First-move Slack choice (multiple_choice) | Source Discipline and Prioritization; mc.first_move | Static next checked: branchOn first_move; default redirect_source_first; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 4 | `redirect_source_first` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: media_targets; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 5 | `redirect_blast_release` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: media_targets; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 6 | `redirect_creative_first` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: media_targets; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 7 | `redirect_wait_for_maya` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | None / context only | Static next checked: media_targets; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 8 | `media_targets` | structured_entry | Build a three-row media target table with fit, tailored angle, and risk note. | Reporter Cards and Launch Facts @ media_targets.referenceContent; referenceContent | Media target table (structured_entry) | Media Targeting Judgment; freeTextResponses.media_targets | Static next checked: section_transition_1_2; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 9 | `section_transition_1_2` | section_transition | section_transition scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: pitch_email; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 10 | `pitch_email` | free_text | Write a concise reporter pitch email. | Launch Facts @ pitch_email.appTabs.launch_facts; Reporter Context @ pitch_email.appTabs.reporter_context; appTabs: Launch Facts, Reporter Context, Pitch Guidance | Reporter pitch email (free_text_email) | Reporter Pitch Writing; freeTextResponses.pitch_email | Static next checked: journalist_call; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 11 | `journalist_call` | voice_meeting | Speak with a skeptical journalist and maintain credibility under questioning. | Pitch draft @ journalist_call.prepNoteKey; Approved call facts @ journalist_call.prepReferenceContent; initial messages (1); prepReferenceContent; prepNoteKey: pitch_ema... | Journalist call transcript (voice_meeting) | Reporter Relationship Management; transcript.journalist_call | Static next checked: section_transition_2_3; runtime pending | Player goal, endpoint, success criteria, support, and transcript path configured; runtime transcript pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 12 | `section_transition_2_3` | section_transition | section_transition scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: monitoring_triage; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 13 | `monitoring_triage` | kanban_board | Sort monitoring signals and write a top-priority rationale. | Monitoring cards @ monitoring_triage.cards; Issue Triage Guide @ monitoring_triage.referenceContent; referenceContent | Monitoring triage board and rationale (kanban_board) | Monitoring Triage; freeTextResponses.monitoring_triage; freeTextResponses.monitoring_triage_rationale | Static next checked: issue_update; runtime pending | Kanban state/rationale configured; runtime drag probe pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 14 | `issue_update` | free_text | Write a calm external correction request using approved facts. | Article @ issue_update.appTabs.article; Article Alert @ issue_update.appTabs.article_alert; Approved Language @ issue_update.appTabs.approved_language; appTabs: Article, Article Alert, Approved Language | Blog correction request email (free_text_email) | External Correction Request; freeTextResponses.issue_update | Static next checked: assessment_gate; runtime pending | Email correction request configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 15 | `assessment_gate` | section_transition | section_transition scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: grading; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 16 | `grading` | grading | grading scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: final_report; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 17 | `final_report` | final_report | final_report scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: terminal; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |

## Grading Evidence Map

| Rubric criterion | Expected evidence | Runtime source | Tested? | Issues |
| --- | --- | --- | --- | --- |
| Source Discipline and Prioritization | `first_move` | first_move: First-move Slack choice (multiple_choice) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Media Targeting Judgment | `media_targets` | media_targets: Media target table (structured_entry) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Reporter Pitch Writing | `pitch_email` | pitch_email: Reporter pitch email (free_text_email) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Reporter Relationship Management | `journalist_call` | journalist_call: Journalist call transcript (voice_meeting) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Monitoring Triage | `monitoring_triage` | monitoring_triage: Monitoring triage board and rationale (kanban_board) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| External Correction Request | `issue_update` | issue_update: Blog correction request email (free_text_email) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |

## High-Risk Surface Audit

| Surface | Scene id(s) | Required probe | Result | Issues |
| --- | --- | --- | --- | --- |
| Voice meeting | `journalist_call` | goal/endpoint/support/material/transcript | Fixed statically: player goal, endpoint, success criteria, support, and transcript output are configured. | QA-001 for live transcript runtime proof |
| Video/recording | None | record/play/edit/transcript/grading evidence | Not applicable in this target set. | Pass |
| Drag/drop/matrix | `monitoring_triage` | move/re-move/submit/saved state | Priority matrix revision fixed statically; runtime drag probe pending. | QA-001 |
| Multi-window desktop | task app-window scenes | windows fit inside normal screen footprint | Static config/build pass; visual fit still needs browser. | QA-001 |
| Source-heavy task | task scenes with appTabs/reference/prep | all new task-critical info visible in workspace/prep | Static input chains configured. | QA-001 for visual proof |
| Expert-knowledge task | role-specific source scenes | beginner support/reference/definition present | Static support/reference configured. | QA-001 for visual proof |

## Scenario Ledger

| Item | First appearance | Later appearances | Coherent? | Issues |
| --- | --- | --- | --- | --- |
| Material times/counts/values | Source packet and task scenes | 8:42 AM, 8:43 AM, 8:44 AM | Static scan did not find an open contradiction after fixes; runtime visual proof pending | QA-001 |

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
