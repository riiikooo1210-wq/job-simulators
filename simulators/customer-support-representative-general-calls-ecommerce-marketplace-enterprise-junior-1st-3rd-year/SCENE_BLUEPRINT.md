# Scene Blueprint - customer-support-representative-general-calls-ecommerce-marketplace-enterprise-junior-1st-3rd-year

Last updated: 2026-06-30 JST

This blueprint reflects the live simulator route after the Customer Support quality-upgrader hardening pass and Mercury Assist realistic-software UI pass. The core loop is:

`read focused support manual -> handle customer call -> repeat for three call types -> assessment gate -> grading -> final report`

Release-readiness note: the 2026-06-30 Mercury Assist pass addressed the prior realistic-workplace-software blocker by giving the prep and call scenes role-specific support software. Final release still needs human review of mobile scrolling comfort and a live-grading retry when Gemini quota is available.

## Work Mix

- Summary: Mercury Market support work is phone-centered and policy-driven. The simulator assesses whether the learner can use a shared support manual and call-specific policy article during live customer calls.
- `physicalProceduralTool`: minor. The realistic work is headset/computer use, but no physical manipulation is needed for this call-focused simulator.
- `digitalToolArtifactWork`: major. Each prep scene uses a Mercury Assist knowledge-base prep console; each call uses a Mercury Assist live support console with call, CRM/case, order timeline, and knowledge-base panels.
- `cognitiveAnalysisDecision`: major. The learner must verify identity, use confirmed facts, apply policy limits, avoid unsafe promises, and escalate when required.
- `writtenDocumentationArtifact`: minor. Written artifacts are intentionally not required in this version; graded evidence is the call transcript.
- `spokenInterpersonalCommunication`: dominant. Three live customer calls are the active scoreable scenes.
- `passiveMonitoringWaitingContextSwitching`: secondary. The repeated prep-call rhythm models queue work and emotional reset.

## Route Table

| Scene | Type / surface | Visible inputs | Student action | Output artifact | Rubric evidence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| `intro`<br>Welcome to Mercury Market Support | `intro` | Role, company, three-call overview | Enter learner name and start | Name/progress state | Not scored | `prep_order_status` |
| `prep_order_status`<br>Prep 1: Manual + Order-Status Policy | `briefing` / Mercury Assist KB prep console | Shared inbound-call manual; order-status policy; queue metadata; locked customer/case preview | Open/read required source files | Source-read completion state | Not scored directly | `call_order_status` |
| `call_order_status`<br>Call 1: Order-Status Call | `voice_meeting` / Mercury Assist live support console | Call checklist; shared manual; order-status policy; CRM/case/order/timeline facts revealed after lookup | Confirm identity, ask what Mia needs, check CRM, explain tracking status and notification path | Call transcript | `Order-Status Call` | `prep_late_delivery` |
| `prep_late_delivery`<br>Prep 2: Late Delivery + Supervisor Request | `briefing` / Mercury Assist KB prep console | Shared inbound-call manual; late-delivery and supervisor policy; queue metadata; locked customer/case preview | Open/read required source files | Source-read completion state | Not scored directly | `call_late_delivery` |
| `call_late_delivery`<br>Call 2: Late-Delivery Call | `voice_meeting` / Mercury Assist live support console | Call checklist; shared manual; late-delivery policy; CRM/case/order/timeline facts revealed after lookup | Show empathy, explain carrier handoff, offer allowed options, set callback boundary | Call transcript | `Late-Delivery Call` | `prep_risk_refund` |
| `prep_risk_refund`<br>Prep 3: High-Value Refund Review | `briefing` / Mercury Assist KB prep console | Shared inbound-call manual; high-value refund and Trust/Risk policy; queue metadata; locked customer/case preview | Open/read required source files | Source-read completion state | Not scored directly | `call_risk_refund` |
| `call_risk_refund`<br>Call 3: High-Value Refund Call | `voice_meeting` / Mercury Assist live support console | Call checklist; shared manual; high-value refund policy; delivery proof, case status, risk notes, and Trust/Risk-safe actions revealed after lookup | Verify identity, avoid accusation, refuse unauthorized refund, route to Trust/Risk review, give status path | Call transcript | `High-Value Refund Call` | `assessment_gate` |
| `assessment_gate`<br>The Shift Is Complete | `section_transition` | Completion recap | Choose `View Assessment` | Assessment readiness | Not scored | `grading` |
| `grading`<br>Assessment | `grading` | Serialized call transcripts and rubric | Wait for AI grading or retry on error | `gradingResult` or error state | All three criteria | `final_report` |
| `final_report`<br>Final Report | `final_report` | Completed grading result | Review score, comments, and recommendation | Assessment report | Displays rubric output | `null` |

## Rubric Mapping

| Criterion | Evidence scene | What the grader should use |
| --- | --- | --- |
| `Order-Status Call` | `call_order_status` | Only the normal order-status call transcript. |
| `Late-Delivery Call` | `call_late_delivery` | Only the late-delivery call transcript. |
| `High-Value Refund Call` | `call_risk_refund` | Only the high-value refund call transcript. |

## Implementation Notes

- The prep/call software shell renders through `src/components/ui/SupportConsole.tsx` and case data from `src/data/supportConsole.ts`.
- The live calls still render the conversation surface through `src/scenes/VoiceMeetingScene.tsx`, embedded inside the Mercury Assist live support console.
- Typed turns and spoken turns are both stored under `voice:<sceneId>:<npcId>` conversation keys.
- The app currently reads persisted state from `job-simulator-storage`; keep that behavior unless a broader migration explicitly handles old saved state.
- Prep scenes are intentionally not graded directly, but they provide required visible evidence for fair call performance.
- CRM/case/order/timeline/internal-note data is masked before lookup and unlocks after the transcript contains `CRM lookup result`; this protects answer-key details while making the interface look realistic.
- All six prep/call scenes carry `supportConsole` metadata in `src/data/scene-config.json`.
- Future UI changes should preserve the Mercury Assist objects that make the software feel realistic: queue strip, side navigation, KB article cards, search affordance, locked CRM preview, customer/case/order fields, timeline, safe actions, and internal notes.
