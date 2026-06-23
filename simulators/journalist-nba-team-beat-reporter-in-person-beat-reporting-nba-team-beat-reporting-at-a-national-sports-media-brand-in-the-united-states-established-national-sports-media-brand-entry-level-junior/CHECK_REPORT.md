# Simulator QA Report

Simulator: `journalist-nba-team-beat-reporter-in-person-beat-reporting-nba-team-beat-reporting-at-a-national-sports-media-brand-in-the-united-states-established-national-sports-media-brand-entry-level-junior`

Status: **Code issues fixed; runtime QA still incomplete**.

## Summary

- Game title: Journalist Simulation
- `workflow.validate --strict`: 30 pass / 0 warn / 0 fail
- `npm run build`: PASS
- Open P0/P1/P2 simulator issues from this pass: none after fixes
- Resolved issues: VOICE-001, TASK-CHAIN-001
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

## Scene Audit

| Order | Scene id | Type | What player must do | Inputs visible where | Output captured where | Grading evidence | Route checked | UI/runtime notes | Issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `intro` | intro | intro scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: assignment_brief; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 2 | `assignment_brief` | briefing | briefing scene: context/navigation | referenceContent; Slack-style messages (2) | None; context/navigation only | None / context only | Static next checked: lead_angle; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 3 | `lead_angle` | multiple_choice | Choose and send the most reportable Slack angle from a finite editor prompt. | Cyclones game-night source packet @ assignment_brief reference card and briefing drawer; Slack-style messages (1) | Slack reply to editor (multiple-choice message selection) | Angle Judgment; Angle Judgment | Static next checked: branchOn lead_angle; default redirect_strong_angle; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 4 | `redirect_strong_angle` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | Angle Judgment | Static next checked: reporting_plan; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 5 | `redirect_rumor` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | Angle Judgment | Static next checked: reporting_plan; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 6 | `redirect_generic` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | Angle Judgment | Static next checked: reporting_plan; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 7 | `redirect_color` | briefing | briefing scene: context/navigation | Slack-style messages (3) | None; context/navigation only | Angle Judgment | Static next checked: reporting_plan; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 8 | `reporting_plan` | structured_entry | Create four source-aware reporting needs with source, question or verification step, and risk. | Cyclones game-night source packet @ briefing drawer; Your selected editor reply @ previous Slack branch | Pregame reporting plan rows (structured entry JSON) | Angle Judgment; Reporting Plan; Reporting Plan; Angle Judgment | Static next checked: warmup_observation; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 9 | `warmup_observation` | physical_playground | Inspect in-arena source surfaces and document a caveated observation before interviews. | physicalWorkDesign source surfaces/action closeups | None; context/navigation only | Reporting Plan; Observation and Note Discipline; warmup_observation action log; observation note text | Static next checked: coach_availability; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 10 | `coach_availability` | voice_meeting | Ask concise, attributable coach availability questions. | Pregame reporting plan @ coach_availability.prepNoteKey; Coach availability facts @ coach_availability.prepReferenceContent; prepReferenceContent; prepNoteKey: pregame_p... | Coach availability transcript (voice_meeting) | Reporting Plan; Availability Question Quality; Reporting Plan; Availability Question Quality | Static next checked: possession_timeline_watch; runtime pending | Player goal, endpoint, success criteria, support, and transcript path configured; runtime transcript pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 11 | `possession_timeline_watch` | possession_timeline | Watch late possessions, mark useful notes, classify each note, and draft three Reed scrum questions plus any Harris/PR follow-up or hold-back items. | Pregame coach availability @ reference card; Final-stretch possessions @ interactive court timeline; referenceContent | Media-row possession notes (timeline notes JSON plus summary) | Observation and Note Discipline; Availability Question Quality | Static next checked: media_scrum; runtime pending | No high-risk visual surface. | Static issue fixed or pass; runtime pending due QA-001 |
| 12 | `media_scrum` | voice_meeting | Ask postgame scrum questions that create attributable story material. | Prepared Reed questions and possession timeline notes in support panel | Postgame scrum transcript (voice_meeting) | Availability Question Quality; Observation and Note Discipline | Static next checked: fast_gamer; runtime pending | Player goal, endpoint, success criteria, support, and transcript path configured; runtime transcript pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 13 | `fast_gamer` | free_text | Write deadline gamer copy using visible verified reporting. | Final box score @ app tab; Working notes @ app tab; Quote log @ app tab; Style and attribution rules @ app tab; appTabs: Box Score, Working Notes, Quote Log, Style/Attribu... | Fast gamer lead and nut graf (120-220 word CMS draft) | Fast Gamer; Fast Gamer | Static next checked: editor_slack; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 14 | `editor_slack` | slack_thread | Send a concise Slack recommendation that separates confirmed reporting from uncertainty. | Fast gamer draft @ scene context and prior response; Working notes and hold-back item @ fast_gamer source packet and prior response; Editor follow-up prompt @ Slack thread; initial... | Editor Slack update (AI-evaluated Slack reply) | Editor Communication; Editor Communication | Static next checked: final_story; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 15 | `final_story` | free_text | Package the story for publication with headline, nut graf, bullets, quote, hold-back detail, and follow-up question. | Fast gamer draft @ app tab and prior response; Verified facts @ app tab; Quote log @ app tab; Hold-back list @ app tab; Follow-up angle @ app tab; appTabs: Fast Gamer, V... | Final filed story package (160-320 word CMS package) | Final Story Package; Final Story Package | Static next checked: assessment_gate; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 16 | `grading` | grading | grading scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: final_report; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 19 | `final_report` | final_report | final_report scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: terminal; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |
| 20 | `assessment_gate` | section_transition | section_transition scene: context/navigation | context/navigation only | None; context/navigation only | None / context only | Static next checked: grading; runtime pending | Illustration configured; visual runtime pending. | Static issue fixed or pass; runtime pending due QA-001 |

## Grading Evidence Map

| Rubric criterion | Expected evidence | Runtime source | Tested? | Issues |
| --- | --- | --- | --- | --- |
| Angle Judgment | `lead_angle`, `redirect_strong_angle`, `redirect_rumor`, `redirect_generic`, `redirect_color`, `reporting_plan` | lead_angle: Slack reply to editor (multiple-choice message selection); redirect_strong_angle: None; context/navigation only; redirect_rumor: None; context/navigation only; redirec... | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Reporting Plan | `reporting_plan`, `warmup_observation`, `coach_availability` | reporting_plan: Pregame reporting plan rows (structured entry JSON); warmup_observation: None; context/navigation only; coach_availability: Coach availability transcript (voice_me... | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Availability Question Quality | `coach_availability`, `media_scrum` | coach_availability: Coach availability transcript (voice_meeting); media_scrum: Postgame scrum transcript (voice_meeting) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Observation and Note Discipline | `warmup_observation`, `possession_timeline_watch` | warmup_observation: None; context/navigation only; possession_timeline_watch: Media-row possession notes (timeline notes JSON plus summary) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Fast Gamer | `fast_gamer` | fast_gamer: Fast gamer lead and nut graf (120-220 word CMS draft) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Editor Communication | `editor_slack` | editor_slack: Editor Slack update (AI-evaluated Slack reply) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |
| Final Story Package | `final_story` | final_story: Final filed story package (160-320 word CMS package) | Static retested; runtime pending | Static evidence chain configured; QA-001 for runtime save/transcript proof |

## High-Risk Surface Audit

| Surface | Scene id(s) | Required probe | Result | Issues |
| --- | --- | --- | --- | --- |
| Voice meeting | `coach_availability`, `media_scrum` | goal/endpoint/support/material/transcript | Fixed statically: player goal, endpoint, success criteria, support, and transcript output are configured. | QA-001 for live transcript runtime proof |
| Video/recording | None | record/play/edit/transcript/grading evidence | Not applicable in this target set. | Pass |
| Drag/drop/matrix | None | move/re-move/submit/saved state | Not applicable in the current flow. | Pass |
| Multi-window desktop | task app-window scenes | windows fit inside normal screen footprint | Static config/build pass; visual fit still needs browser. | QA-001 |
| Source-heavy task | task scenes with appTabs/reference/prep | all new task-critical info visible in workspace/prep | Static input chains configured. | QA-001 for visual proof |
| Expert-knowledge task | role-specific source scenes | beginner support/reference/definition present | Static support/reference configured. | QA-001 for visual proof |

## Scenario Ledger

| Item | First appearance | Later appearances | Coherent? | Issues |
| --- | --- | --- | --- | --- |
| Material times/counts/values | Source packet and task scenes | 4:18 PM, 11:10 PM, 5:25 PM, 11:10 , 4:21 PM, 7:10 PM, 9:55 PM, 25 minutes, 4:27 PM, 4:28 PM, 4:29 PM, 6:12, 4:48, 3:31, 1:42, 0:58, 0:19, 6:12 , 10:34 PM | Static scan did not find an open contradiction after fixes; runtime visual proof pending | QA-001 |

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
