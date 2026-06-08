# Scene Blueprint — customer-support-representative-general-calls-ecommerce-marketplace-enterprise-junior-1st-3rd-year

Use this as the Phase 2 approval artifact before scaffolding. It shows the practical chain that reduces manual repair: visible input artifact → student action → output artifact → rubric evidence.

## Work Mix

- Summary: Enterprise ecommerce customer support representative work is phone-centered and manual-driven. O*NET emphasizes daily telephone conversations, complaint handling, computer use, policy-bounded refunds or adjustments, escalation, time pressure, and angry customers. The collected videos and Reddit threads reinforce the loop this simulator now uses: review the shared support manual and relevant policy article, take the inbound call, learn the customer's concrete case after verification/lookup, apply policy in real time, reset, and repeat across normal and edge cases.
- `physicalProceduralTool`: minor — No physical playground is needed. The concrete workplace action is reading manuals and using them during phone calls.
- `digitalToolArtifactWork`: major — Each prep scene uses a sourceInbox-style common support manual plus the relevant policy article, not a customer-specific case packet. The calls keep the same reference visible while customer details emerge live.
- `cognitiveAnalysisDecision`: major — Assessment focuses on whether the student applies the manual correctly in a normal call, a late-delivery edge case, and a refund-risk edge case.
- `writtenDocumentationArtifact`: minor — Written artifacts are intentionally removed. The student's constructed-response evidence is spoken call performance.
- `spokenInterpersonalCommunication`: dominant — Three voice meetings are the core active scenes and the primary grading evidence.
- `passiveMonitoringWaitingContextSwitching`: secondary — Context switching is represented by the repeated prep -> call rhythm.

## Scene Table

| Scene | Type / Surface | Visible Inputs | Student Action | Output Artifact | Rubric Evidence | Next |
| --- | --- | --- | --- | --- | --- | --- |
| `intro`<br>Welcome to Mercury Market Support | `intro` | — | — | — | not explicitly mapped | prep_order_status |
| `prep_order_status`<br>Prep 1: Shared Manual + Order-Status Policy | `briefing` | sourceInbox: Mercury Support / Knowledge Base / Order Status, Shared manual and order-status policy (prep_order_status.sourceInbox) | Read the complete manual before the call. | Manual read before normal call | not explicitly mapped | call_order_status |
| `call_order_status`<br>Call 1: Order-Status Inbound Call | `voice_meeting` | Shared manual + order-status policy, Shared manual and order-status policy (call_order_status.prepReferenceContent) | Handle a normal inbound order-status call using the visible manual and live customer/CRM details. | Normal order-status call transcript | Manual Use, Normal-Call Efficiency | prep_late_delivery |
| `prep_late_delivery`<br>Prep 2: Late Delivery and Supervisor Request Manual | `briefing` | sourceInbox: Mercury Support / Knowledge Base / Late Delivery, Shared manual and late-delivery policy (prep_late_delivery.sourceInbox) | Read the late-delivery manual before the call. | Manual read before delivery edge call | not explicitly mapped | call_late_delivery |
| `call_late_delivery`<br>Call 2: Late-Delivery Inbound Call | `voice_meeting` | Shared manual + late-delivery policy, Shared manual and late-delivery policy (call_late_delivery.prepReferenceContent) | Handle an inbound late-delivery complaint using the visible manual and live customer/CRM details. | Late-delivery call transcript | Manual Use, Empathy and De-escalation, Policy-Safe Late Delivery Resolution, Boundary-Setting Under Pressure | prep_risk_refund |
| `prep_risk_refund`<br>Prep 3: High-Value Refund Risk Manual | `briefing` | sourceInbox: Mercury Support / Knowledge Base / High-Value Refund, Shared manual and high-value refund policy (prep_risk_refund.sourceInbox) | Read the high-value refund manual before the call. | Manual read before refund risk call | not explicitly mapped | call_risk_refund |
| `call_risk_refund`<br>Call 3: High-Value Refund Inbound Call | `voice_meeting` | Shared manual + high-value refund policy, Shared manual and high-value refund policy (call_risk_refund.prepReferenceContent) | Handle a high-value refund inbound edge case using the visible manual and live customer/CRM details. | Refund risk call transcript | Manual Use, Empathy and De-escalation, Trust/Risk Escalation Judgment, Boundary-Setting Under Pressure | assessment_gate |
| `assessment_gate`<br>The Shift Is Complete | `section_transition` | — | — | — | not explicitly mapped | grading |
| `grading`<br>Assessment | `grading` | — | — | — | not explicitly mapped | final_report |
| `final_report`<br>Final Report | `final_report` | — | — | — | not explicitly mapped | null |
