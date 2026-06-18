# Validation report — registered-nurse-med-surg-hospital-floor-general-large-urban-hospital-academic-medical-center-enterprise-large-health-system-entry-new-grad-0-1-yr

**Summary:** 31 pass · 5 warn · 0 fail · strict mode

## Hard gates
- ✅ No hard-gate failures.

## Next-rule references
- ✅ All `next` references resolve (23 nodes).

## Assessment gate
- ✅ Assessment starts only after period-complete gate(s) with `View Assessment`: assessment_gate.

## NPC references
- ✅ All NPC references resolve (2 used).
- ⚠️ **Unused NPCs (defined but never referenced):**
  - priya
  - marco
  - ben

## Work-mix design
- ✅ Source-derived work mix declared (physicalProceduralTool=dominant, digitalToolArtifactWork=secondary, cognitiveAnalysisDecision=major, writtenDocumentationArtifact=secondary, spokenInterpersonalCommunication=secondary, passiveMonitoringWaitingContextSwitching=secondary).
- ✅ Physical/procedural/tool work is represented with visual playground scene(s): scene2_assessment, scene2_med_pass, scene3_lab_draw, scene3_perform_draw, scene3_label_specimen, scene3_dispose_send, scene2_administer_meds, scene2_reassessment_reminder.
- ✅ Digital tool/artifact work is represented with desk-work scene(s): scene3_orders, scene6_handoff.
- ✅ Active-scene mix snapshot: 8/14 scenes involve manipulation/inspection/tool work. Use this as a comparison to the source-derived mix, not as a universal target.

## Scene structure contracts
- ✅ Scene structure contracts pass: supported scene types, no app-window duplicate banners, and free-text scenes use tool-like surfaces.

## Scene mix
- ✅ Constructed-response work present (13 scenes): scene2_assessment, scene2_conversation, scene2_med_pass, scene3_orders, scene3_lab_draw, scene3_explain_draw, scene3_perform_draw, scene3_label_specimen...
- ✅ Multiple-choice support present (1 scene(s)), for bounded decisions.
- ✅ Voice meeting scene(s) present: scene2_conversation, scene3_explain_draw, scene2_explain_meds.

## Action work mix
- ✅ Physical/procedural/tool-work scenes: 8/14 active scenes (57%). Compare this to `workMixDesign`; this validator does not impose a universal ratio.
- ✅ Physical/action scene(s) include primitives/assets/evidence: scene2_assessment, scene2_med_pass, scene3_lab_draw, scene3_perform_draw, scene3_label_specimen, scene3_dispose_send, scene2_administer_meds, scene2_reassessment_reminder.

## Desk-work quality
- ✅ Desk-work surface scene(s): scene3_orders, scene6_handoff.
- ✅ Visible desk-work source artifact(s): scene2_med_pass, scene3_orders, scene3_explain_draw, scene6_handoff, scene2_explain_meds.
- ✅ Desk-work scenes declare visible inputs, realistic surfaces, and output artifacts.

## Source realism
- ✅ No generic packet-style source inputs detected.

## Physical playgrounds
- ✅ Physical playground scene(s) have stage/assets/coordinates: scene2_assessment, scene2_med_pass, scene3_lab_draw, scene3_perform_draw, scene3_label_specimen, scene2_administer_meds, scene2_reassessment_reminder.
- ⚠️ **Physical playground issues:**
  - scene3_dispose_send: asset path `action-assets/scene3_lab_draw/filled-tube.png` is referenced but missing from ACTION_ASSETS.md
  - scene3_dispose_send: asset path `action-assets/scene3_lab_draw/bag-and-tube.PNG` is referenced but missing from ACTION_ASSETS.md

## Physical scene quality gate
- ✅ Physical scene quality gate inspected 8 physical/action scene(s).
- ⚠️ **Physical scene quality gate issues:**
  - scene2_assessment: missing `physicalWorkDesign`; new physical scenes should include the decomposition/design pass
  - scene2_assessment: movable object `Place call light within reach` has no `objectState`/`stateChange` persistence rule
  - scene2_med_pass: missing `physicalWorkDesign`; new physical scenes should include the decomposition/design pass
  - scene2_med_pass: selection-like work appears present, but no `selectionSurface` with item hotspots is defined
  - scene3_lab_draw: missing `physicalWorkDesign`; new physical scenes should include the decomposition/design pass
  - scene3_lab_draw: selection-like work appears present, but no `selectionSurface` with item hotspots is defined
  - scene3_lab_draw: movement/placement/attachment/disposal work appears present but lacks object-to-target movement primitives and targets
  - scene3_perform_draw: missing `physicalWorkDesign`; new physical scenes should include the decomposition/design pass
  - scene3_perform_draw: selection-like work appears present, but no `selectionSurface` with item hotspots is defined
  - scene3_perform_draw: movable object `Tourniquet` has no `objectState`/`stateChange` persistence rule
  - scene3_perform_draw: movable object `Alcohol swab` has no `objectState`/`stateChange` persistence rule
  - scene3_perform_draw: movable object `Butterfly needle` has no `objectState`/`stateChange` persistence rule
  - scene3_perform_draw: movable object `Lavender tube` has no `objectState`/`stateChange` persistence rule
  - scene3_perform_draw: movable object `Gauze` has no `objectState`/`stateChange` persistence rule
  - scene3_label_specimen: missing `physicalWorkDesign`; new physical scenes should include the decomposition/design pass
  - scene3_label_specimen: movable object `Specimen label` has no `objectState`/`stateChange` persistence rule
  - scene3_dispose_send: missing `physicalWorkDesign`; new physical scenes should include the decomposition/design pass
  - scene3_dispose_send: movable object `Used butterfly` has no `objectState`/`stateChange` persistence rule
  - scene3_dispose_send: movable object `Labeled tube` has no `objectState`/`stateChange` persistence rule
  - scene3_dispose_send: movable object `Bagged specimen` has no `objectState`/`stateChange` persistence rule
  - scene2_administer_meds: missing `physicalWorkDesign`; new physical scenes should include the decomposition/design pass
  - scene2_administer_meds: selection-like work appears present, but no `selectionSurface` with item hotspots is defined
  - scene2_administer_meds: movable object `PO ibuprofen` has no `objectState`/`stateChange` persistence rule
  - scene2_administer_meds: movable object `Water cup` has no `objectState`/`stateChange` persistence rule
  - scene2_administer_meds: movable object `IV acetaminophen` has no `objectState`/`stateChange` persistence rule
  - scene2_administer_meds: movable object `Saline flush` has no `objectState`/`stateChange` persistence rule
  - scene2_reassessment_reminder: missing `physicalWorkDesign`; new physical scenes should include the decomposition/design pass
  - scene2_reassessment_reminder: selection-like work appears present, but no `selectionSurface` with item hotspots is defined

## Primitive-name visibility
- ✅ No canonical primitive names found in player-visible text.

## NPC interaction modes
- ✅ In-person spoken NPC scene(s): scene2_conversation, scene3_explain_draw, scene2_explain_meds.

## AI conversation endpoints
- ✅ All 3 AI conversation scene(s) declare maxTurns and endpoint guidance.

## MCQ branching
- ✅ MCQ branch redirects present: scene1_prioritization.

## Source material visibility
- (no findings)

## Expert-knowledge inputs
- ✅ Expert-knowledge inputs visible where required: scene2_conversation (via scene2_clinical_prep), scene3_explain_draw (inline).

## Prep scene formatting
- ✅ Dense prep/source scenes use structured containers where needed: scene2_clinical_prep.

## Prep answer-key risk
- ✅ Prep/reference materials avoid obvious answer-key phrasing.

## Scene images
- ⚠️ **Missing scene images** (1 of 18):
  - public/scenes/scene2_conversation.png

## Citation markers
- ✅ Citations: 11 unique sources, 22/31 paragraphs cited.
- ⚠️ **3 factual-looking paragraphs without citation markers** (showing first 3):
  - **What "good" looks like vs. "poor" looks like:**
*   **Good:** The student completes hand hygiene b
  - Your message should briefly state the pattern you noticed, frame the concern around patient comfort
  - | 採点項目 | 根拠シーン | 採点基準 |
| :--- | :--- | :--- |
| 朝の優先判断 | scene1_prioritization | 9-10: 申し送り情報から、緊急度

## Rubric shape
- ✅ Rubric has 7 criteria across 1 sections.

## Rubric evidence mapping
- ✅ Every scoreable active task is mapped to exactly one rubric criterion; 0 meeting-prep scene(s) are ungraded exceptions.

## Token leaks
- ✅ No GTM token leaks detected.
