# Check Report — Wedding Planner Simulator

Status: QA incomplete. Static validation, production build, image-prompt preflight, and dev-server HTTP check passed. Normal-player browser runtime playthrough could not be completed because the in-app browser security policy blocked `http://127.0.0.1:5399/`.

## Commands Run

- `python -m workflow.validate --slug wedding-planner-general-wedding-planning-most-common-responsibilities-wedding-venue-mid-sized-venue-business-mid-level --strict`
  - Result: `32 pass · 0 warn · 0 fail`
- `npm install`
  - Result: dependencies installed; npm reported 3 moderate vulnerabilities.
- `npm run build`
  - Result: TypeScript and Vite production build succeeded.
- `npm run dev -- --host 127.0.0.1 --port 5399 --strictPort`
  - Result: dev server running at `http://127.0.0.1:5399/`.
- `curl -I http://127.0.0.1:5399/`
  - Result: `HTTP/1.1 200 OK`.

## Issues

### QA-001 — Runtime playthrough incomplete

- Severity: QA blocker, not confirmed simulator defect
- Scene id or file path: whole simulator
- Reproduction / inspection method: attempted to open `http://127.0.0.1:5399/` in the Codex in-app browser after starting Vite.
- Expected behavior: reviewer can play from intro through final report and record route/UI evidence.
- Actual behavior: browser security policy blocked use of the local URL, so normal-player runtime QA and screenshot-based UI QA were not completed.
- Fix made or proposed: no workaround attempted. User/manual browser playthrough is required, or rerun QA in an environment where the in-app browser allows this local URL.
- Retest result: static validation, build, and HTTP server check passed; runtime playthrough still not tested.

### QA-002 — npm audit reports moderate vulnerabilities

- Severity: P2
- Scene id or file path: `package-lock.json`
- Reproduction / inspection method: `npm install`
- Expected behavior: dependency install has no relevant security warnings.
- Actual behavior: npm reported 3 moderate vulnerabilities.
- Fix made or proposed: not changed during simulator generation because the simulator builds and the vulnerabilities are inherited dependency audit noise from the template stack.
- Retest result: not fixed.

## Scene Audit

| Order | Scene id | Type | What player must do | Inputs visible where | Output captured where | Grading evidence | Route checked | UI/runtime notes | Issues |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `intro` | intro | Non-task: enter the Willow & Stone scenario. | Intro content and illustration. | None. | None expected. | Static next to `briefing_kickoff`. | Runtime not browser-tested. | QA-001 |
| 2 | `briefing_kickoff` | briefing | Read the Rivera-Chen final details packet. | `referenceContent` with event, timeline, policy, setup notes, and client note. | None. | Source support for later tasks. | Static next to `scene_01_triage_choice`. | Runtime not browser-tested. | QA-001 |
| 3 | `scene_01_triage_choice` | multiple_choice | Choose the first triage move. | Prior packet plus option labels/bodies. | `mcSelections.scene_01_triage_choice` and branch flag. | Rubric: identifies timeline issues and open items. | Static branches to four redirects. | Runtime not browser-tested. | QA-001 |
| 4 | `redirect_timeline_first` | briefing | Non-task: consequence for timeline-first choice. | Consequence copy. | None. | None expected. | Static next to `scene_02_timeline_audit`. | Runtime not browser-tested. | QA-001 |
| 5 | `redirect_decor_first` | briefing | Non-task: consequence for decor-first choice. | Consequence copy. | None. | None expected. | Static next to `scene_02_timeline_audit`. | Runtime not browser-tested. | QA-001 |
| 6 | `redirect_client_first` | briefing | Non-task: consequence for client-first choice. | Consequence copy. | None. | None expected. | Static next to `scene_02_timeline_audit`. | Runtime not browser-tested. | QA-001 |
| 7 | `redirect_escalate_first` | briefing | Non-task: consequence for escalate-first choice. | Consequence copy. | None. | None expected. | Static next to `scene_02_timeline_audit`. | Runtime not browser-tested. | QA-001 |
| 8 | `scene_02_timeline_audit` | structured_entry | Comment on the 5 issues / open items with status, concern, and recommended fix. | Scene `content` plus `referenceContent` timeline source packet. | `freeTextResponses.timeline_audit` as structured JSON. | Rubric: timeline concerns and repair sequence. | Static next to `transition_walkthrough`. | Browser-tested: starts at 0/5, has no owner field, and enables Submit after 5 open-item comments. | QA-001 |
| 9 | `transition_walkthrough` | section_transition | Non-task: move to ballroom section. | Transition copy. | None. | None expected. | Static next to `scene_03_ballroom_setup`. | Runtime not browser-tested. | QA-001 |
| 10 | `scene_03_ballroom_setup` | physical_playground | Read setup sheet, drag guest-flow items, flag florist bins for florist move to vendor corner, mark missing signs, write setup note. | Setup sheet readable surface and visible ballroom objects. | Physical action log and `observationText.setup_note`. | Rubric: setup correction, observation, policy/relationship balance. | Static next to `scene_04_client_prep`. | Drag/drop and physical UI not browser-tested. | QA-001 |
| 11 | `scene_04_client_prep` | structured_entry | Prepare agenda, client questions, and scope language. | Scene `content` plus `referenceContent` walkthrough source packet. | `freeTextResponses.couple_walkthrough_prep` as structured JSON. | Rubric: focused walkthrough prep. | Static next to `scene_05_couple_walkthrough`. | App-window UI not browser-tested. | QA-001 |
| 12 | `scene_05_couple_walkthrough` | voice_meeting | Speak with Elena and Marcus in person. | Prep note via `prepNoteKey` and compact walkthrough facts. | Voice transcript in NPC conversation store. | Rubric: prep, warmth/clarity, scope management. | Static next to `transition_vendor`. | Voice/mic not browser-tested. | QA-001 |
| 13 | `transition_vendor` | section_transition | Non-task: return to operations desk. | Transition copy. | None. | None expected. | Static next to `scene_06_vendor_alignment`. | Runtime not browser-tested. | QA-001 |
| 14 | `scene_06_vendor_alignment` | slack_thread | Write a vendor-channel update. | Initial vendor/Maya messages plus prior timeline/setup/couple artifacts. | Message thread. | Rubric: repair sequence, actionable vendor update, policy balance. | Static next to `assessment_gate`. | Chat UI not browser-tested. | QA-001 |
| 15 | `assessment_gate` | section_transition | Click `View Assessment`. | Completion copy. | Section completion route. | Required assessment gate. | Static next to `grading`; validator passed. | Runtime not browser-tested. | QA-001 |
| 16 | `grading` | grading | Non-task: AI grading. | Rubric and captured artifacts. | Grading result. | All rubric criteria. | Static next to `final_report`. | Gemini/API behavior not browser-tested. | QA-001 |
| 17 | `final_report` | final_report | Non-task: review assessment. | Grading result. | None. | Final report display. | Static terminal route `null`. | Runtime not browser-tested. | QA-001 |

## Grading Evidence Map

| Rubric criterion | Expected evidence | Runtime source | Tested? | Issues |
| --- | --- | --- | --- | --- |
| Identifies timeline issues and open items | MCQ choice and timeline audit text | `scene_01_triage_choice`, `freeTextResponses.timeline_audit` | Static only | QA-001 |
| Repairs sequence with usable fixes | Timeline audit and vendor update | `freeTextResponses.timeline_audit`, message thread | Static only | QA-001 |
| Uses the setup sheet to correct visible room issues | Physical scene action log | `scene_03_ballroom_setup` action state | Static only | QA-001 |
| Documents operational observations clearly | Setup note text | `observationText.setup_note` | Static only | QA-001 |
| Prepares focused walkthrough questions | Walkthrough prep entry and meeting use | `freeTextResponses.couple_walkthrough_prep`, voice transcript | Static only | QA-001 |
| Handles the couple meeting with warmth and clarity | Voice meeting transcript | `npcConversations.voice:scene_05_couple_walkthrough:elena_marcus` | Static only | QA-001 |
| Sends an actionable vendor update | Vendor channel response | `scene_06_vendor_alignment` message thread | Static only | QA-001 |
| Balances policy, flexibility, and relationship management | Setup, voice meeting, and vendor thread | physical action state, voice transcript, message thread | Static only | QA-001 |

## High-Risk Surface Audit

| Surface | Scene id(s) | Required probe | Result | Issues |
| --- | --- | --- | --- | --- |
| Voice meeting | `scene_05_couple_walkthrough` | goal/endpoint/support/material/transcript | Static config has `meetingMode`, `maxTurns`, endpoint, success criteria, `prepNoteKey`, and compact facts. Runtime not tested. | QA-001 |
| Drag/drop/physical | `scene_03_ballroom_setup` | move/re-move/submit/saved state | Static config has required objects, drop targets, readable setup sheet, observation note, action assets, and state rules. Runtime not tested. | QA-001 |
| Source-heavy task | `scene_02_timeline_audit`, `scene_04_client_prep`, `scene_06_vendor_alignment` | all task-critical info visible in workspace/prep | Static config includes source packets in scene content/reference content, and vendor channel messages. Runtime not tested. | QA-001 |
| Expert-knowledge task | none material | beginner support/reference/definition present | Venue-policy and rain-plan facts are provided inline; no hidden expert trap found statically. Runtime not tested. | QA-001 |
| Multi-window desktop | none | windows fit normal screen footprint | App windows are single-window surfaces. Runtime not tested. | QA-001 |
| Video/recording | none | record/play/edit/transcript/grading evidence | Not applicable. | Pass statically |

## Red-Team Failure Classes

- No real task: pass statically; five constructed-response scenes exist. Runtime not tested.
- Wrong or hidden input: pass statically after moving structured-entry source packets into visible scene content/reference content. Runtime not tested.
- Bad sequence: pass statically; packet -> triage -> audit -> setup -> prep -> meeting -> vendor update. Runtime not tested.
- Narration instead of source artifact: pass statically for key tasks; source packets and channel messages are visible in config. Runtime not tested.
- Role-inappropriate work: pass statically; work matches venue planner responsibilities. Runtime not tested.
- Unclear task purpose: pass statically; task instructions and fields are specific. Runtime not tested.
- Expert-knowledge trap: pass statically; policy facts are visible. Runtime not tested.
- Fake physical/procedural work: pass statically; physical scene uses object movement, annotation, and observation text. Runtime not tested.
- No meeting endpoint: pass statically; endpoint and turn limits present. Runtime not tested.
- Weak grading evidence: pass statically; rubric maps to typed, physical, voice, and message outputs. Runtime not tested.
- Duplicate visual context: image prompts for coded app-window scenes are intentionally skipped; physical/action prompt is task-aligned. Runtime not tested.
- Hidden or missing illustration: placeholders exist; runtime layout not browser-tested.
- Cramped or oversized window: not browser-tested.
- Unrealistic app UI: not browser-tested.
- Scenario-data mismatch: pass statically; key times and constraints are consistent across packet, prep, and vendor thread. Runtime not tested.
- Over-scripting: pass statically; source packets provide facts, not sentence-level answers. Runtime not tested.
- Missing core experience: pass statically; includes in-person couple meeting and vendor alignment. Runtime not tested.
- Branch context loss: MCQ redirects have distinct consequence scenes; runtime branch preservation not browser-tested.
