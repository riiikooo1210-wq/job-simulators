# VC Analyst Simulator Upgrade Plan

Slug: `vc-analyst-generalist-startup-sourcing-and-investment-diligence-venture-capital-firm-in-the-united-states-seed-to-series-a-early-stage-venture-firm-entry-junior-analyst`

This plan audits the current VC analyst simulator against the latest workflow standard after data collection. The collection itself is treated as accepted and unchanged. The goal is to bring the simulator up to the current Phase 2 through Phase 5 standards: work-mix design, desk-work artifact chains, explicit rubric evidence mapping, stronger source continuity, upgraded UI surfaces, and valid AI conversation endpoints.

## What I Inspected

- `WORKFLOW.md`, especially the latest Phase 2 desk-work, interaction design, AI conversation, app-window, and validation requirements.
- `workflow/lib/schemas/scene-config.schema.json` and `templates/prompts/scene_config_schema.md`.
- Desk-work prompt contracts in `templates/prompts/desk/`.
- Current collected/synthesized data in `data/<slug>/`.
- Current simulator config, rubric, generated images, components, and runtime behavior in `simulators/<slug>/`.
- Runtime screens at `http://127.0.0.1:5181/?devControls=1`.
- Strict validation with `python -m workflow.validate --slug <slug> --strict`.
- Production build with `npm run build`.

## Current Status

Strict validation result:

- 14 pass
- 6 warn
- 6 fail

Build result:

- `npm run build` passes.
- Vite warns that the main JS chunk is larger than 500 kB. That is not a workflow blocker.
- `npm install` reports 3 moderate npm vulnerabilities. That is outside the content upgrade, but worth tracking.

Hard validation failures:

- `triage_signal`: missing branch case for `traction_first`.
- `founder_call`: missing `meetingMode`.
- `founder_call`: `goalPrompt` lacks explicit endpoint/wrap-up instructions.
- Missing top-level `workMixDesign`.

Warnings:

- Missing `workMixDesign`.
- All desk-work scenes lack `deskWorkDesign`.
- `founder_call` missing NPC interaction mode.
- AI conversation endpoint gap in `founder_call`.
- MCQ branch/consequence gap for the correct answer path.
- Rubric lacks `evidenceSceneIds`.

## Latest Workflow Standard Summary

The current workflow expects a desk-work simulator to be concrete, not abstract. For this VC analyst role, every important active scene should prove this chain:

`visible input artifact -> student action -> student output artifact -> rubric evidence`

For this sim, that means visible deal packets, deck excerpts, CRM notes, KPI tables, founder-call prep, market-map references, Slack context, and memo source tabs. The student should not be asked to "use the deck" or "write the memo" from memory after the source material has disappeared.

The current workflow also expects:

- Top-level `workMixDesign`.
- `deskWorkDesign` on every meaningful desk-work scene.
- At least 3 constructed-response tasks. This sim already has 6, which is good.
- MCQs must route every option to a distinct immediate consequence before converging.
- Voice meetings must set `meetingMode`, `maxTurns`, voice settings, and endpoint guidance.
- Prior prep artifacts must appear during later meetings via `prepNoteKey`.
- Rubric criteria should declare `evidenceSceneIds`.
- Work windows for reading, writing, sorting, reviewing, and editing should use warm cream surfaces, not dark app interiors.
- App-window scenes should usually omit separate `illustration` and `imageBrief`; the work window is the visual focus.
- Desktop windows should fit within the laptop/desktop overlay at default and mobile viewports.

## Source-Derived Work Mix Target

The accepted sources describe junior early-stage VC work as fragmented, mostly digital, and judgment-heavy: sourcing, screening decks, mapping markets, conducting founder conversations, writing short recommendations, prioritizing deal flow, and making assumptions explicit from incomplete data.

Recommended `workMixDesign`:

- `physicalProceduralTool`: `rare`
  - No real physical object manipulation is central to this role.
  - Do not add physical playgrounds just to satisfy a generic ratio.
- `digitalToolArtifactWork`: `dominant`
  - CRM, deck excerpts, spreadsheets, Slack, market maps, and memo docs should carry the experience.
- `cognitiveAnalysisDecision`: `dominant`
  - The core skill is separating real signal from noisy startup claims.
- `writtenDocumentationArtifact`: `major`
  - The analyst produces screens, notes, Slack updates, prioritization rationale, and an investment memo.
- `spokenInterpersonalCommunication`: `secondary` to `major`
  - Founder calls and partner communication matter, but they should be anchored by prep artifacts.
- `passiveMonitoringWaitingContextSwitching`: `secondary`
  - The rhythm should feel fragmented: pipeline deadline, Slack interruptions, founder call, afternoon prioritization.

Active-scene implication:

- Use 7-9 active scenes.
- Most active time should be on digital artifact manipulation and written analysis.
- Include one real voice founder call.
- Use only 1 bounded MCQ pivot unless a second bounded decision has a strong immediate consequence.

## Current Scene-By-Scene Audit

### `intro` - Welcome to Northstar

Current strengths:

- Clear job framing.
- Good player role and stakes.
- Strong first-person visual concept.

Gaps:

- No workflow issue.
- The intro still uses older step UX and large centered cards, but it is acceptable.

Upgrade:

- Keep mostly as-is.
- Slightly sharpen the opening around "speed with rigor" and "do not overstate evidence."

### `morning_briefing` - 8:35 AM Pipeline Queue

Current strengths:

- Good initial Slack context.
- Good metrics table: ARR mix, logo count, founder-market fit.
- This is the strongest current visible source artifact.

Gaps:

- The visible artifact is not formalized in `deskWorkDesign`.
- The source packet is not reusable in later scenes except through "View Briefing."
- It shows only three metrics, not a full "deal packet" the student can consult.
- Runtime screenshot shows the scene can feel vertically clipped at default 1280x720.

Upgrade:

- Reframe as `morning_deal_packet`.
- Add `deskWorkDesign` even if the scene remains a briefing, because it provides the source artifact for later tasks.
- Visible source artifacts:
  - Partner Slack request.
  - ClaimPilot deck excerpt.
  - CRM note.
  - KPI table.
  - Fund fit rules.
- Add a compact "Deal Packet" reference content block that can be reused in later app tabs/prep references.

### `triage_signal` - Pick the First Signal

Current strengths:

- The MCQ is role-real: analysts often choose what to investigate first under time pressure.
- Off-path options have consequence scenes.

Gaps:

- The correct option `traction_first` has no branch case. It falls directly to `deck_screen`, which violates the "every MCQ option gets a distinct consequence" rule.
- The option bodies partially explain why each choice is good or bad before selection, which softens the decision.
- The MCQ is not visually represented as a realistic artifact choice surface, but this is acceptable because it is a bounded conceptual triage decision.

Upgrade:

- Add `redirect_traction` with title like "Revenue Quality First."
- Route `traction_first` to `redirect_traction`, then to `deck_screen`.
- Make every branch show a concrete immediate consequence:
  - Logo path: CRM note reveals unpaid pilots/design partners.
  - Tech path: AI architecture does not answer buyer pull.
  - FOMO path: partner pushes back on speed without conviction.
  - Traction path: the student opens the ARR table and sees the software/services split.
- Consider shortening option bodies so the choice is not over-coached.

### `redirect_logo`, `redirect_tech`, `redirect_fomo`

Current strengths:

- Each gives a useful redirect.
- They converge cleanly.

Gaps:

- Missing equivalent positive consequence for `traction_first`.
- They are text-heavy briefings rather than grounded workplace moments, though they do have image briefs.
- If upgraded to message-style consequences later, chat history should preserve the original choice.

Upgrade:

- Keep them as short consequence briefings.
- Add a visible artifact in each:
  - `redirect_logo`: CRM note annotated "pilot", "design partner", "annual contract."
  - `redirect_tech`: technical slide beside "buyer pull, renewal, wedge" note.
  - `redirect_fomo`: calendar pressure plus partner principle.
  - `redirect_traction`: ARR breakdown/source quality.

### `deck_screen` - Deck Tear-Down

Current strengths:

- Strong constructed-response task.
- The row schema is good: dimension, evidence, concern, implication.
- It maps well to VC first-pass screening.

Gaps:

- Missing `deskWorkDesign`.
- The student writes from memory instead of having deck/CRM/source tabs open in the same work window.
- The current UI renders four large card-like rows, making the task long and scroll-heavy. It feels less like a spreadsheet and more like a form stack.
- Runtime app chrome uses a green spreadsheet bar that is not the current palette.
- Because `appWindow` scenes still include `illustration` and `imageBrief`, the generated scene image is redundant under the latest standard.

Upgrade:

- Keep scene type `structured_entry`, but upgrade the renderer from latest `templates/reference`.
- Add `appTabs` or renderer support for source tabs if needed. If `structured_entry` cannot display tabs yet, add `referenceTitle`/`referenceContent` support or split the packet into the scene body.
- Add `deskWorkDesign`:
  - Input: ClaimPilot deck excerpt, CRM note, KPI table, fund-fit rules.
  - Surface: spreadsheet.
  - Action: fill first-pass screen rows.
  - Output: `claimpilot_screen`.
  - Rubric evidence: `freeTextResponses.claimpilot_screen`.
  - Continuity: informs founder-call prep and final memo.
- Consider reducing each row's vertical height or rendering as an actual table grid with expandable cells.
- Require the four dimensions explicitly:
  - Traction quality.
  - Buyer pain / urgency.
  - Founder-market fit / repeatability.
  - Market / competition / wedge.

### `market_map` - Market Map Sprint

Current strengths:

- Good use of a drag/sort task.
- The action is job-like: classify adjacent players and explain the wedge.
- Runtime drag works.

Gaps:

- Missing `deskWorkDesign`.
- Dark GitHub-like UI violates the latest cream app-window rule.
- It says "Drag each card", but submit only requires one card moved.
- Initial state already has most cards in plausible columns, so the student can pass by moving ClaimPilot only.
- There is no visible reference explaining the market-map criteria or buyer alternatives.
- The board categories are okay, but "Horizontal AI" may be too broad and lets students over-index on AI rather than workflow/buyer.

Upgrade:

- Use latest cream `KanbanBoardScene`.
- Set `requireAllCardsMoved: true`.
- Put all company cards initially in an "Inbox / Unsorted" column if the goal is classification, then require sorting into categories.
- Add `referenceTitle: "Market map criteria"` and `referenceContent` with concise definitions:
  - System of record.
  - Workflow point solution.
  - Horizontal AI tooling.
  - Compliance/ops.
  - Buyer alternative / manual process.
- Add `deskWorkDesign`:
  - Input: market note plus competitor cards.
  - Surface: kanban market map.
  - Action: classify every card and write wedge rationale.
  - Output: `market_map_board` plus `market_map_rationale`.
  - Evidence: `market_map_board`, `market_map_rationale`.
  - Continuity: informs founder questions and final memo.
- Consider replacing "Agency Systems" with "Agency system of record" and "Claims Workflow" with "Claims workflow / status follow-up" for clearer reasoning.

### New Recommended Scene: `founder_call_prep`

Why add:

- The current founder call asks the student to speak from prior memory, but the workflow now expects source materials and prep artifacts to be visible before use.
- It creates a clean continuity chain into the voice meeting via `prepNoteKey`.

Recommended type:

- `structured_entry` or `free_text`.

Recommended task:

- "Draft five founder-call questions that would change the investment decision."

Recommended fields if `structured_entry`:

- Question.
- Claim/source it tests.
- Why it matters.
- Strong answer / weak answer signal.

Input artifacts:

- ClaimPilot Deal Packet.
- Deck tear-down summary.
- Market map rationale.

Output:

- `founder_call_prep`.

Continuity:

- `founder_call` sets `prepNoteKey: "founder_call_prep"` and `prepNoteTitle: "Your founder-call prep"`.

### `founder_call` - Founder Call with Alex

Current strengths:

- Excellent role-real scene type. A founder call should be spoken.
- NPC prompt contains useful hidden facts and reacts to specific diligence questions.
- `minTurns`, `maxTurns`, and `voiceName` are present in current config, but validation still wants explicit mode and endpoint instructions.

Gaps:

- Missing `meetingMode`.
- `goalPrompt` does not include explicit wrap-up rules.
- No `prepNoteKey`, so the student cannot see their prepared questions during the call.
- No compact deal fact reference in the meeting.
- UI uses the old dark meeting window; for a remote video call, dark media interior can be acceptable, but the transcript/reference area should use the updated cream treatment.
- The image brief says video-call view from a laptop, which is fine for an external founder, but the config must say `meetingMode: "remote"`.

Upgrade:

- Set `meetingMode: "remote"`.
- Set `maxTurns: 6` or `7`.
- Add `prepNoteKey: "founder_call_prep"` and `prepNoteTitle: "Your founder-call prep"`.
- Add `prepReferenceTitle: "ClaimPilot facts"` and compact `prepReferenceContent`:
  - Claimed $1M+ ARR = $720K software ARR + $310K implementation fees.
  - 18 pilots, 7 annual contracts.
  - Founder was claims ops lead for 8 years.
  - One customer expanded 10 to 35 seats.
  - Churn unknown due to young contracts.
  - Biggest pain: manual claim-status follow-up.
- Modify `goalPrompt`:
  - Reveal facts only when asked specifically.
  - If the student asks broad questions, answer generally.
  - After the student has covered revenue quality, buyer pain, implementation effort, and expansion/churn, close naturally with a line like: "Happy to send customer references and the ARR bridge after this."
  - Do not start new topics after wrap-up.
- Upgrade renderer to latest `VoiceMeetingScene` so prep notes and references appear.

### New Recommended Scene: `call_debrief`

Why add:

- The founder call currently jumps straight into a Slack update.
- A real analyst would quickly turn call notes into facts, assumptions, risks, and next steps.
- This gives the final memo better evidence continuity.

Recommended type:

- `structured_entry`.

Recommended fields:

- Confirmed fact.
- Open assumption.
- Risk or diligence question.
- Implication for second meeting.

Input:

- Founder-call transcript summary or compact "What you heard" reference.
- Prior deal packet.

Output:

- `call_debrief_notes`.

Rubric evidence:

- Founder Call Quality.
- Partner Communication.
- Investment Memo.

### Removed Slack Update Task

Current decision:

- Remove the separate Slack update scene.
- Treat `call_debrief` as the partner-ready note sent to Leo.
- Route `call_debrief` directly to `lead_priority`.
- Grade Partner Communication from the call debrief itself.

### `lead_priority` - Prioritize the Afternoon Pipeline

Current strengths:

- Strong role-real prioritization task.
- The matrix axes are appropriate: fund fit and evidence quality.
- The leads are plausible and differentiated.

Gaps:

- Missing `deskWorkDesign`.
- The Miro-like UI uses purple accents and can be vertically clipped at default viewport.
- The source criteria for "fund fit" and "evidence quality" are not visible.
- The company cards originally contained only one-line summaries. A beginner needs a separate brief tab with enough evidence to place them well.
- Submit requires dragging, but the scene does not clearly show item placement state in the DOM snapshot.

Upgrade:

- Use latest cream `PriorityMatrixScene`.
- Add `referenceTitle: "Northstar prioritization rules"` and `referenceContent`:
  - Seed-to-Series A fit.
  - Vertical software/AI workflow/fintech infrastructure focus.
  - Prefer specific customer evidence over hype.
  - Avoid late-stage companies outside ownership/check-size fit.
  - Favor warm trusted operator intro when evidence is specific.
- Add richer company briefs in a separate tab while keeping matrix drag cards to company names only:
  - ClaimPilot: strong pain, mixed ARR quality, second-meeting question.
  - VoxBridge AI: hot voice AI market, no paid pilots.
  - AtlasPermit: vertical SaaS, 12 paying customers, warm operator source.
  - HarborPay: good company, wrong stage/fund fit.
  - AuditNest: clever product, unclear buyer.
- Add `deskWorkDesign`.
- Consider `requireAllCardsMoved` equivalent for priority matrix if the renderer supports it; otherwise validation should confirm all items placed before submit.

### `final_memo` - Final Investment Memo

Current strengths:

- Correct capstone deliverable.
- The prompt asks for company summary, why now, evidence, risks, recommendation, and next questions.
- Word count guardrails are reasonable.

Gaps:

- Missing `deskWorkDesign`.
- No visible source materials in the memo editor.
- The student must rely on memory from all prior scenes.
- The current doc editor is okay visually, but final memo needs tabs/reference panes under latest workflow.
- It is not explicitly connected to the earlier call/market artifacts in config.

Upgrade:

- Keep `free_text` with `appWindow: "doc"` or maybe `appWindow: "notion"`.
- Add `appTabs`:
  - `Deal Packet`
  - `First-Pass Screen`
  - `Market Map`
  - `Founder Call Debrief`
  - `Fund Fit Rules`
- Add `deskWorkDesign`.
- Slightly revise prompt:
  - "Write a 180-260 word IC prep memo. Use the source tabs. Make a recommendation: second meeting, pass, or hold for specific evidence."
- Keep max 320 if the product wants more student latitude.
- Rubric should grade evidence hierarchy, assumption discipline, clear recommendation, and next diligence questions.

### `grading` and `final_report`

Current strengths:

- Standard ending flow.

Gaps:

- Grading lacks explicit evidence mapping in rubric.
- If `founder_call` depends on Gemini and no key is present, the path can contain API-error artifacts that may leak into grading evidence.

Upgrade:

- Add `evidenceSceneIds` throughout rubric.
- Confirm final report pulls all constructed-response outputs.
- Run full click-through after upgrade with a Gemini key or use dev controls only for non-grading UI QA.

## Current Item-Level Audit

### Existing ClaimPilot source items

Keep:

- `$720K software ARR + $310K implementation fees`.
- `18 pilots, 7 annual contracts`.
- Former claims ops lead, 8 years in insurance.
- Manual claim-status follow-up as pain.
- Expansion from 10 to 35 seats.
- Churn unknown because contracts are young.
- Founder-led implementation as repeatability risk.

Improve:

- Put these into a reusable `ClaimPilot Deal Packet`.
- Make the ARR bridge visible at every point where revenue quality matters.
- Distinguish "paid annual contracts" from "pilots/design partners/logos."
- Add a tiny fund-fit reference so students know what Northstar cares about.

### Existing market-map cards

Keep:

- ClaimPilot.
- Generic agency CRM.
- Legacy AMS.
- Document AI startup.
- RegTrack.
- Adjuster portal.

Improve:

- Add buyer-alternative framing: "manual spreadsheet/email follow-up" as a card or reference.
- Start all cards in an unsorted source column if the student is supposed to classify them.
- Require all cards to be sorted.
- Add reference criteria for novice adequacy.

### Existing afternoon pipeline items

Keep:

- ClaimPilot.
- VoxBridge AI.
- AtlasPermit.
- HarborPay.
- AuditNest.

Improve:

- Add a visible evidence snippet for each.
- Add fund fit rules.
- Clarify that "operator intro" is likely the highest priority because it combines fit and evidence, not because it is warm alone.
- Make ClaimPilot placement nuanced rather than obviously best or worst.

### Existing NPCs

Alex Rivera:

- Keep persona.
- Add behavior rule: does not volunteer hidden facts unless asked specifically.
- Add endpoint rule.
- Add better pressure: wants to keep momentum because the seed round is competitive.

Leo Martinez:

- Keep concise partner persona.
- Add endpoint rule if used in Slack.
- Make Leo's response useful but not a grading lecture.

Potential new NPC:

- Leo Martinez remains the single partner voice for the debrief request and final memo request. No need for a new voice scene unless adding too much scope.

## Proposed V2 Scene Map

Recommended node sequence:

1. `intro` - Welcome to Northstar.
2. `morning_deal_packet` - Source briefing with Slack request, deck excerpt, CRM note, KPI table, and fund-fit rules.
3. `triage_signal` - MCQ: pick first signal.
4. `redirect_logo` - consequence for logo-first.
5. `redirect_tech` - consequence for tech-first.
6. `redirect_fomo` - consequence for round-speed-first.
7. `redirect_traction` - consequence for correct revenue-quality-first.
8. `deck_screen` - structured first-pass screen using visible deal packet.
9. `market_map` - classify market cards using visible criteria, then write wedge rationale.
10. `founder_call_prep` - write targeted founder-call questions.
11. `founder_call` - remote voice meeting with prep note and compact deal reference visible.
12. `call_debrief` - convert call into partner-ready notes for Leo: confirmed facts, assumptions or risks, and second-meeting implications.
13. `lead_priority` - place leads on fund-fit/evidence matrix using fund rules and richer lead snippets.
14. `final_memo` - write IC prep memo using tabs from prior work.
15. `grading` - score.
16. `final_report` - report.

This creates 7-8 active constructed-response scenes. That is more than the minimum, but still coherent for a roughly 30-minute desk-work simulator because most tasks are compact.

## Recommended Rubric Evidence Mapping

Section 1: Morning Deal Screen

- Signal Triage: `triage_signal`, redirect scenes as context.
- Structured Deal Screen: `deck_screen`.
- Market Mapping: `market_map`.

Section 2: Founder and Partner Work

- Founder Call Prep: `founder_call_prep`.
- Founder Call Quality: `founder_call`, `call_debrief`.
- Partner Communication: `call_debrief`.

Section 3: Investment Recommendation

- Pipeline Prioritization: `lead_priority`.
- Investment Memo: `final_memo`, with supporting evidence from `deck_screen`, `market_map`, and `call_debrief`.

Each criterion should include `evidenceSceneIds`.

## Config Upgrade Checklist

Top-level:

- Add `workMixDesign`.
- Ensure top-level `rubric` exists in synthesized config.
- Generate `SCENE_BLUEPRINT.md`.

Every desk-work scene:

- Add `deskWorkDesign`.
- Add visible source artifacts through `appTabs`, `referenceTitle`/`referenceContent`, `prepReferenceTitle`/`prepReferenceContent`, or a prior prep scene.
- Remove redundant `illustration`/`imageBrief` from `appWindow` scenes after adopting latest reference behavior.

MCQ:

- Add `redirect_traction`.
- Ensure every `branchFlag` has a `cases` entry.
- Ensure every branch routes to a distinct consequence scene.

Voice:

- Set `meetingMode: "remote"` for the external founder call.
- Add `prepNoteKey`.
- Add compact prep reference.
- Add explicit `maxTurns`.
- Add endpoint instructions in `goalPrompt`.

Slack:

- Set explicit `maxTurns`.
- Add endpoint instructions.
- Decide whether to keep AI response or convert to a pure typed deliverable.

Rubric:

- Add `evidenceSceneIds`.
- Add criteria for new prep/debrief scenes if they remain.

Runtime:

- Port latest reference renderer/components into this simulator or resaffold from latest reference while preserving generated images and custom content.
- Use cream app surfaces.
- Fix off-palette colors:
  - Purple Slack headers.
  - Bright Google blue/red controls in voice meeting.
  - Dark kanban board.
  - Purple Miro chrome.
  - White document surfaces where latest cream rule expects warm paper.
- Confirm desktop windows fit in the laptop overlay at 1280x720 and mobile.

## Implementation Plan

Phase A - Preserve current assets:

- Back up existing `public/scenes/`.
- Note which scenes are no longer used after app-window scenes omit illustrations.
- Keep generated art for `intro`, `morning_deal_packet`, redirect briefings, `founder_call` remote visual, `grading`, and `final_report`.

Phase B - Upgrade Phase 2 artifacts:

- Edit `data/<slug>/synthesis/job-simulation.md` only as needed to reflect added prep/debrief scenes.
- Replace `data/<slug>/synthesis/scene-config.json` with V2 config.
- Generate or hand-write `SCENE_BLUEPRINT.md`.
- Review with the user before scaffold/runtime changes.

Phase C - Upgrade runtime:

- Safest path: scaffold to a temporary folder using latest `templates/reference`, then port the V2 data and existing images.
- Alternative: copy latest reference renderer files into current simulator.
- Avoid overwriting user-generated images without a backup.

Phase D - Validate:

- Run `python -m workflow.validate --slug <slug> --strict`.
- Fix all hard gates.
- Expected pass conditions:
  - No missing `workMixDesign`.
  - No missing `deskWorkDesign` on desk scenes.
  - No MCQ branch gaps.
  - Voice and Slack endpoint checks pass.
  - Rubric evidence mapping passes.

Phase E - Runtime QA:

- Run `npm run build`.
- Run local dev server.
- Click through all scenes at 1280x720.
- Check mobile/narrow viewport if browser tooling is available.
- Verify no dark/off-palette work surfaces remain except legitimate video-call interior areas.
- Verify every source-dependent task has visible source material.
- Verify prior prep appears inside founder call.
- Verify final memo has source tabs.

Phase F - Image prompt update:

- Regenerate `IMAGE_PROMPTS.md` from V2 config.
- Generate only new or changed images:
  - `morning_deal_packet` if renamed.
  - `redirect_traction`.
  - `founder_call_prep` only if it remains a non-app briefing; if it is an app-window scene, no illustration.
  - `call_debrief` only if non-app; likely no illustration if structured app-window.
- App-window scenes should not need generated 16:9 scene art.

## Acceptance Criteria

The upgraded sim should be considered ready when:

- Strict validation exits 0.
- `npm run build` exits 0.
- Every active desk scene has a declared artifact chain.
- Every source-dependent task displays or links its source material in the scene.
- The correct MCQ path has a visible consequence before converging.
- The founder call is a remote voice meeting with prep notes and a compact deal reference visible.
- Call Debrief Notes clearly serves as the partner-ready note to Leo and routes directly to the priority matrix.
- Final memo includes source tabs/reference material from the day.
- Rubric criteria explicitly map to scene evidence.
- Work surfaces follow the latest cream palette and fit inside the desktop/laptop overlay.
- The simulator still feels like junior early-stage VC work: ambiguous data, concise judgment, founder curiosity, partner-useful writing.

## Product Decision Before Implementation

Resolved:

- Treat `founder_call` as the main AI conversation.
- Remove the separate Slack update task.
- Make `call_debrief` the partner-ready note that goes to Leo.

Reason:

- The core graded behavior is the student's ability to turn the founder call into decision-useful notes.
- A separate one-shot Slack conversation duplicated the debrief and added avoidable AI dependency.
- The new flow is cleaner: founder call, debrief for Leo, priority matrix, final memo.
