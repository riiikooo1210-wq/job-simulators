# Check Report - Architect Simulation

Slug: `architect-none-most-common-residential-architecture-mid-size-firm-entry-junior`

## Summary

Static scaffold QA and focused runtime smoke testing are complete for the redline/order change. The playable route now runs from first-move consequences into redline pickup, then question drafting, then the client call. The former permit-readiness triage scene is removed.

## Commands Run

- `python -m workflow.synthesize --slug architect-none-most-common-residential-architecture-mid-size-firm-entry-junior`
- `python -m workflow.validate --slug architect-none-most-common-residential-architecture-mid-size-firm-entry-junior --strict`
- `npm run build`
- `curl -I http://127.0.0.1:5457/`
- Headless Chrome smoke test against `http://127.0.0.1:5457/`

## Static Validation Result

`workflow.validate --strict` result: 30 pass, 3 warn, 0 fail.

Accepted warnings:
- Unused NPC definitions: `maya_chen`, `owen_reed`, `riley_patel`. These characters appear in authored source materials/messages, but only Dana is an AI conversation NPC.
- NPC interaction mode warning: the simulator includes site observation but no in-person voice meeting. This is acceptable because the only live spoken meeting is a remote homeowner call.
- GTM token leak warning: manual search found no go-to-market residue. The validator appears to be matching ordinary content such as `Dana Moreno`.

## Scene Audit

| Order | Scene id | Type | What player must do | Route checked | Runtime notes | Issues |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `intro` | `intro` | Enter name/start | Static next: `maple_street_inbox` | Intro produce step now says redline pickup before prep questions | None |
| 2 | `maple_street_inbox` | `briefing` | Review shared project folder | Static next: `first_move` | Source files mention redline pickup and call prep in the right order | None |
| 3 | `first_move` | `multiple_choice` | Choose Slack first move | Branches to four consequence scenes | Correct choice now routes to `redirect_constraints`, not directly to work | None |
| 4 | `redirect_sketch` | `briefing` | Read consequence | Static next: `redline_note` | Distinct consequence | None |
| 5 | `redirect_constraints` | `briefing` | Read acknowledgement | Static next: `redline_note` | Distinct correct-choice acknowledgement | None |
| 6 | `redirect_promise` | `briefing` | Read consequence | Static next: `redline_note` | Distinct consequence | None |
| 7 | `redirect_wait` | `briefing` | Read consequence | Static next: `redline_note` | Distinct consequence | None |
| 8 | `redline_note` | `kanban_board` | Sort redline cards into drafting fix, ask/verify, hold/escalate | Static next: `client_prep` | Browser check: no extra notes tab, no typing/rationale prompt, Submit present, Owen rule tab scrolls | None |
| 9 | `client_prep` | `structured_entry` | Write 4-6 homeowner-facing questions and rationales | Static next: `client_call` | Browser check: prompt references redline pickup board and avoids zoning/field/drawing promises | None |
| 10 | `client_call` | `voice_meeting` | Speak with Dana Moreno | Static next: `site_observation` | Uses `prepNoteKey: client_prep` | None |
| 11 | `site_observation` | `slack_thread` | Inspect site photo and document field discrepancy | Static next: `schematic_option_study` | Source tabs/evidence validate | None |
| 12 | `schematic_option_study` | `architect_design_studio` | Create a Revit-like schematic option study | Static next: `assessment_gate` | Plan editor stores footprint, room tags, checks, window strategy, and notes | None |
| 13 | `assessment_gate` | `section_transition` | Click `View Assessment` | Static next: `grading` | Required assessment gate present | None |
| 14 | `grading` | `grading` | Run assessment | Static next: `final_report` | Needs valid runtime API key for AI grading | None |
| 15 | `final_report` | `final_report` | Review final report | Terminal | Terminal scene | None |

## Red-Team Pass

Static and focused runtime checks found no hard blocker:
- Assessment is gated by `assessment_gate` with exact `View Assessment` action label.
- The MCQ scene has distinct branch consequence/acknowledgement scenes before convergence.
- Constructed-response scenes exceed the minimum: `redline_note`, `client_prep`, `client_call`, `site_observation`, `schematic_option_study`.
- `redline_note` is classification-only: no extra notes tab and no user typing field.
- `client_prep` now comes after redline pickup and asks the learner to turn the classified uncertainty into Dana-facing questions.
- The redundant permit-readiness triage scene is removed.
