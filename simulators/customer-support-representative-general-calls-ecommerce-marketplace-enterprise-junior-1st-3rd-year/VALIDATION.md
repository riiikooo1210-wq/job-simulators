# Validation report — customer-support-representative-general-calls-ecommerce-marketplace-enterprise-junior-1st-3rd-year

**Summary:** 27 pass · 5 warn · 0 fail · advisory mode

## Hard gates
- ✅ No hard-gate failures.

## Next-rule references
- ✅ All `next` references resolve (10 nodes).

## Assessment gate
- ✅ Assessment starts only after period-complete gate(s) with `View Assessment`: assessment_gate.

## NPC references
- ✅ All NPC references resolve (3 used).
- ⚠️ **Unused NPCs (defined but never referenced):**
  - talia_brooks
  - nisha_rao

## Work-mix design
- ✅ Source-derived work mix declared (physicalProceduralTool=minor, digitalToolArtifactWork=major, cognitiveAnalysisDecision=major, writtenDocumentationArtifact=minor, spokenInterpersonalCommunication=dominant, passiveMonitoringWaitingContextSwitching=secondary).
- ✅ Digital tool/artifact work is represented with desk-work scene(s): call_order_status, call_late_delivery, call_risk_refund.
- ✅ Active-scene mix snapshot: 0/3 scenes involve manipulation/inspection/tool work. Use this as a comparison to the source-derived mix, not as a universal target.

## Scene structure contracts
- ✅ Scene structure contracts pass: supported scene types, no app-window duplicate banners, and free-text scenes use tool-like surfaces.

## Scene mix
- ✅ Constructed-response work present (3 scenes): call_order_status, call_late_delivery, call_risk_refund
- ✅ Voice meeting scene(s) present: call_order_status, call_late_delivery, call_risk_refund.
- ⚠️ **No multiple-choice scene found** — include at least one MCQ for a simple bounded decision.

## Action work mix
- ✅ Physical/procedural/tool-work scenes: 0/3 active scenes (0%). Compare this to `workMixDesign`; this validator does not impose a universal ratio.
- ⚠️ **Possible off-screen physical/tool work** — the simulation document suggests hands-on, procedural, inspection, equipment, layout, artifact, or tool work, but no action/manipulation scene exists.

## Desk-work quality
- ✅ Desk-work surface scene(s): call_order_status, call_late_delivery, call_risk_refund.
- ✅ Visible desk-work source artifact(s): call_order_status, call_late_delivery, call_risk_refund.
- ✅ Desk-work scenes declare visible inputs, realistic surfaces, and output artifacts.

## Source realism
- ✅ Source inbox scene(s): prep_order_status, prep_late_delivery, prep_risk_refund.

## Physical playgrounds
- (no findings)

## Physical scene quality gate
- (no findings)

## Primitive-name visibility
- ✅ No canonical primitive names found in player-visible text.

## NPC interaction modes
- ✅ Remote/virtual spoken NPC scene(s): call_order_status, call_late_delivery, call_risk_refund.

## AI conversation endpoints
- ✅ All 3 AI conversation scene(s) declare maxTurns and endpoint guidance.

## MCQ branching
- (no findings)

## Source material visibility
- ✅ Source material visible where referenced: call_order_status, call_late_delivery, call_risk_refund.

## Expert-knowledge inputs
- ✅ Expert-knowledge inputs visible where required: prep_order_status (inline), call_order_status (via prep_order_status), prep_late_delivery (via call_order_status), call_late_delivery (via prep_late_delivery), prep_risk_refund (via call_late_delivery), call_risk_refund (via prep_risk_refund).
- ⚠️ **Missing expert-knowledge input:**
  - intro: asks for specialized/evidence-based knowledge, but no visible reference input (`prepReferenceContent`, `referenceContent`, clearly labeled prep/source material, or an immediate predecessor prep scene) is present.
  - call_order_status: includes a 182-word prep/reference material block inside the voice meeting. Move dense prep/source material to a separate prior scene so the meeting page stays focused.
  - call_late_delivery: includes a 241-word prep/reference material block inside the voice meeting. Move dense prep/source material to a separate prior scene so the meeting page stays focused.
  - call_risk_refund: includes a 269-word prep/reference material block inside the voice meeting. Move dense prep/source material to a separate prior scene so the meeting page stays focused.

## Prep scene formatting
- ✅ Dense prep/source scenes use structured containers where needed: prep_order_status, prep_late_delivery, prep_risk_refund.

## Prep answer-key risk
- ✅ Prep/reference materials avoid obvious answer-key phrasing.

## Scene images
- ✅ All 5 scene images present (placeholders OK until you generate real ones).

## Citation markers
- ✅ Citations: 21 unique sources, 13/74 paragraphs cited.
- ⚠️ **14 factual-looking paragraphs without citation markers** (showing first 3):
  - - Mia Lopez, Customer. Friendly but rushed. She has a normal "where is my order?" question and mostl
  - Visible input artifacts: common identity-verification/call-flow manual, order-status policy article,
  - Poor looks like: sounding vague, skipping verification, guessing delivery timing, or failing to solv

## Rubric shape
- ✅ Rubric has 6 criteria across 3 sections.

## Rubric evidence mapping
- ✅ Every constructed-response scene is explicitly mapped to rubric evidence.

## Token leaks
- ✅ No GTM token leaks detected.
