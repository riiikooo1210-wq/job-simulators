# Check Report - Urban Planner Simulator

## Summary

Static QA completed on 2026-05-24.

- `workflow.validate --strict`: PASS, 27 pass / 0 warn / 0 fail.
- `npm run build`: PASS.
- Dev server: started at `http://127.0.0.1:5173/`.
- Image generation: attempted with `workflow.images generate --limit 1`; blocked by Gemini API regional restriction (`User location is not supported for the API use`). Placeholder images remain, and `IMAGE_PROMPTS.md` is ready for external Nano Banana Pro generation.
- Browser runtime playthrough: INCOMPLETE. The Codex in-app browser rejected navigation to the local target, so no browser clicks, screenshots, route playthrough, app-window layout inspection, or microphone/voice-meeting runtime probe were performed.

## Issues

### QA-001 - Runtime playthrough not completed

- Severity: P1
- Scene id or file path: all runtime scenes
- Reproduction/inspection method: Attempted to open `http://127.0.0.1:5173/` in the Codex in-app browser after starting the Vite dev server.
- Expected behavior: Browser opens the simulator so the reviewer can play through each scene, inspect app-window layout, test routing, and probe high-risk surfaces.
- Actual behavior: Browser automation was blocked by browser security policy before navigation.
- Fix made or proposed: No workaround attempted. A human or an allowed browser session should run the normal-player pass before final delivery confidence is considered complete.
- Retest result: Not retested in browser.

### QA-002 - Real image generation blocked by API region

- Severity: P2
- Scene id or file path: `public/scenes/*.png`
- Reproduction/inspection method: Ran `python -m workflow.images generate --slug <slug> --limit 1 --only-missing --fallback-bibles`.
- Expected behavior: Generate real scene illustrations from the prepared prompts.
- Actual behavior: Gemini image generation returned `400 FAILED_PRECONDITION` with `User location is not supported for the API use`.
- Fix made or proposed: No local fix available in this environment. Use `IMAGE_PROMPTS.md` with Nano Banana Pro from a supported environment, or provide generated images manually.
- Retest result: Not retested; placeholders remain.

## Scene Audit

| Order | Scene id | Type | What player must do | Inputs visible where | Output captured where | Grading evidence | Route checked | UI/runtime notes | Issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `intro` | intro | Non-task: introduces VerdantWorks and the Riverbend Yard scenario. | Intro copy and illustration. | None. | Not graded. | Static next: `briefing_packet`. | Placeholder image exists; browser layout not inspected. | Static pass; QA-001 for runtime. |
| 2 | `briefing_packet` | briefing | Non-task: read the client/source packet. | `referenceContent`, Slack-style message, metrics. | None. | Not graded. | Static next: `first_move`. | Dense source packet is visible as coded text. | Static pass; QA-001 for runtime. |
| 3 | `first_move` | multiple_choice | Choose the best first planning move. | Prior packet plus Slack-style prompt. | `mcSelections.first_move`, branch flag. | Uses source evidence accurately. | Static branch targets resolve to four redirects. | Coded Slack-style surface; branch consequences distinct. | Static pass; QA-001 for runtime. |
| 4 | `redirect_design_first` | briefing | Non-task: consequence for design-first choice. | Consequence copy. | None. | Not graded. | Static next: `constraints_scan`. | Placeholder image prompt adjusted to avoid duplicating coded UI. | Static pass; QA-001 for runtime. |
| 5 | `redirect_constraints_first` | briefing | Non-task: consequence for evidence-first choice. | Consequence copy. | None. | Not graded. | Static next: `constraints_scan`. | Prompt uses generic team-chat, no real logo. | Static pass; QA-001 for runtime. |
| 6 | `redirect_overpromise` | briefing | Non-task: consequence for overpromising approval. | Consequence copy. | None. | Not graded. | Static next: `constraints_scan`. | Reinforces professional constraint. | Static pass; QA-001 for runtime. |
| 7 | `redirect_wait_for_data` | briefing | Non-task: consequence for freezing until more data. | Consequence copy. | None. | Not graded. | Static next: `constraints_scan`. | Sequencing is coherent. | Static pass; QA-001 for runtime. |
| 8 | `constraints_scan` | structured_entry | Fill opportunity, constraints, missing information, and city questions. | Current `referenceContent` packet excerpt. | `constraints_scan` structured-entry binding. | Source evidence, constraints, ambiguity, writing. | Static next: `transition_triage`. | Coded Notion-style surface; input is sufficient. | Static pass; QA-001 for runtime. |
| 9 | `transition_triage` | section_transition | Non-task: moves from scan into technical triage. | Transition copy. | None. | Not graded. | Static next: `issue_matrix`. | Scenario sequencing is plausible. | Static pass; QA-001 for runtime. |
| 10 | `issue_matrix` | priority_matrix | Place entitlement issues by impact/uncertainty and write rationale. | `referenceContent` triage criteria and issue cards. | `issue_matrix`, `issue_matrix_rationale`. | Constraints and prioritization. | Static next: `call_prep`. | Drag/drop matrix not runtime-tested. | Static pass; QA-001 for runtime. |
| 11 | `call_prep` | free_text | Draft 5-7 city-staff questions. | App tabs: Packet, Triage Notes, Meeting Guardrails. | `freeTextResponses.call_prep`. | Ambiguity and city-staff questions. | Static next: `city_call`. | Prep note is carried forward by `prepNoteKey`. | Static pass; QA-001 for runtime. |
| 12 | `city_call` | voice_meeting | Conduct a spoken pre-application call with Jordan Ellis. | Compact call context and `call_prep` prep note. | `npcConversations.city_call`. | Constraints, ambiguity, city-staff questions. | Static next: `client_email`. | Endpoint, mode, voice, max turns, success criteria, and conversation ending are declared. Voice not runtime-tested. | Static pass; QA-001 for runtime. |
| 13 | `client_email` | free_text | Draft a client-ready feasibility email for Priya to review. | App tabs: Planning Scan, City Call Notes, Client Tone. | `freeTextResponses.client_email`. | Source use, constraints, prioritization, ambiguity, writing. | Static next: `assessment_gate`. | Email headers present; input references prior work and call. | Static pass; QA-001 for runtime. |
| 14 | `assessment_gate` | section_transition | Non-task: explicit project-complete gate. | Completion copy. | None. | Not graded. | Static next: `grading`; validator confirms grading is gated. | Button label is exactly `View Assessment`. | Static pass; QA-001 for runtime. |
| 15 | `grading` | grading | Non-task: grading engine runs. | Captured work products. | Grading result state. | Rubric-driven assessment. | Static next: `final_report`. | Not browser/API tested. | Static pass; QA-001 for runtime. |
| 16 | `final_report` | final_report | Non-task: review assessment report. | Grading output. | None. | Final report display. | Static next: null. | Not browser-tested. | Static pass; QA-001 for runtime. |

## Grading Evidence Map

| Rubric criterion | Expected evidence | Runtime source | Tested? | Issues |
| --- | --- | --- | --- | --- |
| Uses source evidence accurately | First move, constraints scan, client email. | `mcSelections.first_move`, structured entry, free text. | Static only. | QA-001 |
| Spots regulatory and technical constraints | Constraints scan, issue matrix, city call, client email. | Structured entry, matrix state, transcript, free text. | Static only. | QA-001 |
| Prioritizes impact and uncertainty | Issue matrix and client email. | Matrix state and rationale/free text. | Static only. | QA-001 |
| Handles ambiguity responsibly | Constraints scan, call prep, city call, client email. | Structured/free text and transcript. | Static only. | QA-001 |
| Asks targeted city-staff questions | Call prep and city call. | Free text and transcript. | Static only. | QA-001 |
| Writes client-ready planning language | Constraints scan and client email. | Structured entry and free text. | Static only. | QA-001 |

## High-Risk Surface Audit

| Surface | Scene id(s) | Required probe | Result | Issues |
| --- | --- | --- | --- | --- |
| Voice meeting | `city_call` | goal/endpoint/support/material/transcript | Static config passes: endpoint, mode, voice, min/max turns, prep note, support material, success criteria, and ending guidance present. Runtime voice/transcript not tested. | QA-001 |
| Video/recording | None | record/play/edit/transcript/grading evidence | Not applicable. | None |
| Drag/drop/matrix | `issue_matrix` | move/re-move/submit/saved state | Static config passes; cards, axes, binding, rationale binding, and source criteria present. Runtime drag/drop not tested. | QA-001 |
| Multi-window desktop | None | windows fit inside normal screen footprint | Not applicable; scenes use single app surfaces/tabs. | None |
| Source-heavy task | `briefing_packet`, `constraints_scan`, `call_prep`, `client_email` | all task-critical info visible in workspace/prep | Static pass: source packet and compact task references are visible before action. Runtime layout not inspected. | QA-001 |
| Expert-knowledge task | `constraints_scan`, `issue_matrix`, `call_prep`, `city_call`, `client_email` | beginner support/reference/definition present | Static pass: zoning, process, triage criteria, guardrails, glossary, and call context are present. Runtime layout not inspected. | QA-001 |

## Red-Team Pass

- No real task: static pass; five constructed-response/action scenes exist.
- Wrong or hidden input: static pass; task scenes include source references/tabs/prep notes.
- Bad sequence: static pass; packet -> first move -> scan -> triage -> prep -> call -> client email.
- Narration instead of source artifact: static pass; source packet and task references are coded text, not image-only.
- Role-inappropriate work: static pass; work matches junior consulting planner responsibilities.
- Unclear task purpose: static pass from scene copy; runtime readability not inspected.
- Expert-knowledge trap: static pass; references and glossary are present.
- Fake physical/procedural work: static pass; physical work is source-derived rare and not forced into fake playgrounds.
- No meeting endpoint: fixed before this report; `goalPrompt` now tells Jordan when/how to end.
- Video evidence broken: not applicable.
- Weak grading evidence: static pass; evidence maps to typed/spoken/matrix artifacts.
- Duplicate visual context: image prompts adjusted to avoid duplicating coded UI where prompts exist.
- Hidden or missing illustration: not runtime-tested.
- Cramped or oversized window: not runtime-tested.
- Multi-window desktop overflow: not applicable.
- Unrealistic app UI: static surface choices are appropriate; runtime visual quality not inspected.
- Scenario-data mismatch: static pass; packet facts align with tasks and rubric.
- Over-scripting: static pass; prep references give criteria/facts, not full answer scripts.
- Missing core experience: static pass; the city-staff call is included as a voice meeting.
- Branch context loss: static branch routing passes; runtime continuity not inspected.

## Status

The simulator is structurally valid and builds successfully. Full runtime QA is incomplete until a browser playthrough can be performed. Real image generation is also incomplete because the available Gemini image API is region-blocked in this environment.
