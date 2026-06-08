# Simulator QA Report

Simulator: `brand-strategist-general-consumer-brand-strategy-for-fashion-brand-common-brand-strategist-work-imagined-by-aspiring-brand-strategists-fictional-fashion-brand-enterprise-global-brand-entry-junior`

Status: **Code issues fixed; runtime QA still incomplete**.

## Summary

- Game title: Brand Strategist Simulation
- `workflow.validate --strict`: 26 pass / 0 warn / 0 fail
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
| 1 | `intro` | intro | intro scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: briefing_packet; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 2 | `briefing_packet` | briefing | briefing scene: context/navigation | referenceContent; Slack-style messages (1) | None; context/navigation only | None / context only | Static next checked: first_move; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 3 | `first_move` | multiple_choice | Choose a first Slack response that protects the strategic work sequence. | Everyday Icons source packet @ briefing_packet.referenceContent; Slack-style messages (1) | First-move Slack choice (multiple_choice) | Strategic prioritization; mc.first_move | Static next checked: branchOn first_move; default redirect_frame; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 4 | `redirect_frame` | briefing | briefing scene: context/navigation | Slack-style messages (2) | None; context/navigation only | None / context only | Static next checked: audit_table; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 5 | `redirect_deck` | briefing | briefing scene: context/navigation | Slack-style messages (2) | None; context/navigation only | None / context only | Static next checked: audit_table; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 6 | `redirect_trend` | briefing | briefing scene: context/navigation | Slack-style messages (2) | None; context/navigation only | None / context only | Static next checked: audit_table; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 7 | `redirect_survey` | briefing | briefing scene: context/navigation | Slack-style messages (2) | None; context/navigation only | None / context only | Static next checked: audit_table; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 8 | `audit_table` | structured_entry | Write audit rows that separate observation, implication, and risk. | Everyday Icons source packet @ briefing_packet.referenceContent and section reference drawer | Competitive audit table (structured_entry) | Evidence-backed brand diagnosis; Junior-level synthesis and clarity; freeTextResponses.audit_table | Static next checked: insight_matrix; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 9 | `insight_matrix` | priority_matrix | Sort research signals on a decision-impact / evidence-confidence matrix and write a rationale. | Competitive audit rows @ previous scene output plus briefing_packet.referenceContent; Prioritization criteria @ insight_matrix.referenceContent; referenceContent | Insight prioritization matrix plus rationale (priority_matrix) | Evidence-backed brand diagnosis; Strategic prioritization; freeTextResponses.insight_matrix; freeTextResponses.insight_matrix_rationale | Static next checked: interview_prep; runtime pending | Placed chips are draggable after fix; runtime drag probe pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 10 | `interview_prep` | free_text | Prepare non-leading stakeholder interview questions. | Everyday Icons source packet @ interview_prep.appTabs.source_packet; Elena stakeholder context @ interview_prep.appTabs.stakeholder_context; appTabs: Source Packet, Elen... | Stakeholder question list (free_text) | Strategic prioritization; Focused stakeholder discovery; freeTextResponses.interview_prep | Static next checked: stakeholder_call; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 11 | `stakeholder_call` | voice_meeting | Ask focused questions and explain the emerging strategy in a remote stakeholder call. | Prepared stakeholder questions @ stakeholder_call.prepNoteKey; Call facts @ stakeholder_call.prepReferenceContent; initial messages (1); prepReferenceContent; prepNoteKe... | Stakeholder call transcript (voice_meeting) | Focused stakeholder discovery; Professional strategy communication; transcript.stakeholder_call | Static next checked: positioning_brief; runtime pending | Player goal, endpoint, success criteria, support, and transcript path configured; runtime transcript pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 12 | `positioning_brief` | structured_entry | Write a structured brand positioning brief. | Everyday Icons source packet @ briefing_packet.referenceContent and section reference drawer; Competitive audit @ student output from audit_table; Stakeholder call trans... | Positioning brief (structured_entry) | Actionable positioning brief; Junior-level synthesis and clarity; freeTextResponses.positioning_brief | Static next checked: creative_slack; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 13 | `creative_slack` | slack_thread | Send a strategy-grounded Slack response to creative pushback. | Positioning brief @ previous scene output; Creative Slack thread @ creative_slack.initialMessages; initial messages (2) | Creative Slack response (slack_thread) | Professional strategy communication; Actionable positioning brief; Junior-level synthesis and clarity; npcConversations.theo | Static next checked: final_note; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 14 | `final_note` | campaign_studio | Assemble a static social post concept and explain the strategic rationale. | Mara's finalized creative direction @ final_note.referenceContent; background/copy/color/sticker options @ campaign studio | Static launch post mockup (campaign_studio_json) | Evidence-backed brand diagnosis; Professional strategy communication; Actionable positioning brief; Junior-level synthesis and clarity; freeTextRespo... | Static next checked: assessment_gate; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 15 | `assessment_gate` | section_transition | section_transition scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: grading; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 16 | `grading` | grading | grading scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: final_report; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 17 | `final_report` | final_report | final_report scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: terminal; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |

## Grading Evidence Map

| Rubric criterion | Expected evidence | Runtime source | Tested? | Issues |
| --- | --- | --- | --- | --- |
| Evidence-backed brand diagnosis | `audit_table`, `insight_matrix`, `final_note` | audit_table: Competitive audit table (structured_entry); insight_matrix: Insight prioritization matrix plus rationale (priority_matrix); final_note: Static launch post mockup (campaign_studio_json) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Strategic prioritization | `first_move`, `insight_matrix`, `interview_prep` | first_move: First-move Slack choice (multiple_choice); insight_matrix: Insight prioritization matrix plus rationale (priority_matrix); interview_prep: Stakeholder question list (f... | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Focused stakeholder discovery | `interview_prep`, `stakeholder_call` | interview_prep: Stakeholder question list (free_text); stakeholder_call: Stakeholder call transcript (voice_meeting) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Professional strategy communication | `stakeholder_call`, `creative_slack`, `final_note` | stakeholder_call: Stakeholder call transcript (voice_meeting); creative_slack: Creative Slack response (slack_thread); final_note: Static launch post mockup rationale (campaign_studio_json) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Actionable positioning brief | `positioning_brief`, `creative_slack`, `final_note` | positioning_brief: Positioning brief (structured_entry); creative_slack: Creative Slack response (slack_thread); final_note: Static launch post mockup (campaign_studio_json) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Junior-level synthesis and clarity | `audit_table`, `positioning_brief`, `creative_slack`, `final_note` | audit_table: Competitive audit table (structured_entry); positioning_brief: Positioning brief (structured_entry); creative_slack: Creative Slack response (slack_thread); final_not... | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |

## High-Risk Surface Audit

| Surface | Scene id(s) | Required probe | Result | Issues |
| --- | --- | --- | --- | --- |
| Voice meeting | `stakeholder_call` | goal/endpoint/support/material/transcript | Fixed statically: player goal, endpoint, success criteria, support, and transcript output are configured. | QA-001 for live transcript runtime proof |
| Video/recording | None | record/play/edit/transcript/grading evidence | Not applicable in this target set. | Pass |
| Drag/drop/matrix | `insight_matrix` | move/re-move/submit/saved state | Priority matrix revision fixed statically; runtime drag probe pending. | QA-001 |
| Multi-window desktop | task app-window scenes | windows fit inside normal screen footprint | Static config/build pass; visual fit still needs browser. | QA-001 |
| Source-heavy task | task scenes with appTabs/reference/prep | all new task-critical info visible in workspace/prep | Static input chains configured. | QA-001 for visual proof |
| Expert-knowledge task | role-specific source scenes | beginner support/reference/definition present | Static support/reference configured. | QA-001 for visual proof |

## Scenario Ledger

| Item | First appearance | Later appearances | Coherent? | Issues |
| --- | --- | --- | --- | --- |
| Material times/counts/values | Source packet and task scenes | 8:42 AM, 4:00 PM, 8:49 AM, 8:50 AM, 8:51 AM, 8:52 AM, 8:53 AM, 11:30, 3:38 PM | Static scan did not find an open contradiction after fixes; runtime visual proof pending | QA-001 |

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
