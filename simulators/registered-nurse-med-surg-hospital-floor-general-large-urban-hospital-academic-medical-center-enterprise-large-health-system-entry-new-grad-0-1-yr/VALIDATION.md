# Validation report — registered-nurse-med-surg-hospital-floor-general-large-urban-hospital-academic-medical-center-enterprise-large-health-system-entry-new-grad-0-1-yr

**Summary:** 24 pass · 10 warn · 14 fail · advisory mode

## Hard gates
- ❌ scene3_orders: app-window scene declares `illustration`/`imageBrief`; remove the duplicate banner and let the app window be the visual focus
- ❌ scene2_conversation: voice meeting is missing player-facing `playerGoal`
- ❌ scene2_conversation: voice meeting is missing player-facing `endpoint`
- ❌ scene2_conversation: voice meeting is missing player-facing `successCriteria`
- ❌ scene2_explain_meds: voice meeting is missing player-facing `endpoint`
- ❌ scene2_explain_meds: voice meeting is missing player-facing `successCriteria`
- ❌ scene2_explain_meds: `goalPrompt` does not clearly tell the NPC when/how to end the conversation
- ❌ scene3_explain_draw: voice meeting is missing player-facing `endpoint`
- ❌ scene3_explain_draw: voice meeting is missing player-facing `successCriteria`
- ❌ scene3_explain_draw: `goalPrompt` does not clearly tell the NPC when/how to end the conversation
- ❌ scene4_call_marco: voice meeting is missing player-facing `endpoint`
- ❌ scene4_call_marco: voice meeting is missing player-facing `successCriteria`
- ❌ scene4_call_marco: `goalPrompt` does not clearly tell the NPC when/how to end the conversation
- ❌ workMixDesign missing `digitalToolArtifactWork` category

## Next-rule references
- ✅ All `next` references resolve (28 nodes).

## Assessment gate
- ✅ Assessment starts only after period-complete gate(s) with `View Assessment`: assessment_gate.

## NPC references
- ✅ All NPC references resolve (3 used).
- ⚠️ **Unused NPCs (defined but never referenced):**
  - priya
  - ben

## Work-mix design
- ✅ Physical/procedural/tool work is represented with visual playground scene(s): scene2_assessment, scene2_med_pass, scene3_lab_draw, scene3_perform_draw, scene3_label_specimen, scene3_dispose_send, scene4_stabilize, scene4_raise_hob, scene4_apply_oxygen, scene2_administer_meds, scene2_reassessment_reminder.
- ✅ Active-scene mix snapshot: 11/19 scenes involve manipulation/inspection/tool work. Use this as a comparison to the source-derived mix, not as a universal target.
- ⚠️ **Incomplete work-mix categories:** digitalToolArtifactWork

## Scene structure contracts
- ⚠️ **Scene structure contract issues:**
  - scene3_orders: app-window scene declares `illustration`/`imageBrief`; remove the duplicate banner and let the app window be the visual focus

## Scene mix
- ✅ Constructed-response work present (18 scenes): scene2_assessment, scene2_conversation, scene2_med_pass, scene3_orders, scene3_lab_draw, scene3_perform_draw, scene3_label_specimen, scene3_dispose_send...
- ✅ Multiple-choice support present (1 scene(s)), for bounded decisions.
- ✅ Voice meeting scene(s) present: scene2_conversation, scene2_explain_meds, scene3_explain_draw, scene4_call_marco.

## Action work mix
- ✅ Physical/procedural/tool-work scenes: 11/19 active scenes (58%). Compare this to `workMixDesign`; this validator does not impose a universal ratio.
- ✅ Physical/action scene(s) include primitives/assets/evidence: scene2_assessment, scene2_med_pass, scene3_lab_draw, scene3_perform_draw, scene3_label_specimen, scene3_dispose_send, scene4_stabilize, scene4_raise_hob, scene4_apply_oxygen, scene2_administer_meds, scene2_reassessment_reminder.

## Desk-work quality
- ✅ Desk-work surface scene(s): scene3_orders, scene4_decline, scene6_handoff.
- ✅ Visible desk-work source artifact(s): scene2_med_pass, scene4_decline, scene2_explain_meds, scene3_explain_draw, scene4_call_marco.
- ⚠️ **Desk-work quality issues:**
  - scene3_orders: desk-work scene has no `deskWorkDesign` chain (input → action → output → rubric evidence)
  - scene4_decline: desk-work scene has no `deskWorkDesign` chain (input → action → output → rubric evidence)
  - scene6_handoff: desk-work scene has no `deskWorkDesign` chain (input → action → output → rubric evidence)

## Source realism
- ✅ No generic packet-style source inputs detected.

## Physical playgrounds
- ✅ Physical playground scene(s) have stage/assets/coordinates: scene2_assessment, scene2_med_pass, scene3_lab_draw, scene3_perform_draw, scene3_label_specimen, scene4_stabilize, scene4_raise_hob, scene4_apply_oxygen, scene2_administer_meds, scene2_reassessment_reminder.
- ⚠️ **Physical playground issues:**
  - scene3_dispose_send: asset path `action-assets/scene3_lab_draw/filled-tube.png` is referenced but missing from ACTION_ASSETS.md
  - scene3_dispose_send: asset path `action-assets/scene3_lab_draw/bag-and-tube.PNG` is referenced but missing from ACTION_ASSETS.md

## Physical scene quality gate
- ✅ Physical scene quality gate inspected 11 physical/action scene(s).
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
  - scene4_stabilize: missing `physicalWorkDesign`; new physical scenes should include the decomposition/design pass
  - scene4_stabilize: selection-like work appears present, but no `selectionSurface` with item hotspots is defined
  - scene4_stabilize: movement/placement/attachment/disposal work appears present but lacks object-to-target movement primitives and targets
  - scene4_raise_hob: missing `physicalWorkDesign`; new physical scenes should include the decomposition/design pass
  - scene4_raise_hob: movement/placement/attachment/disposal work appears present but lacks object-to-target movement primitives and targets
  - scene4_apply_oxygen: missing `physicalWorkDesign`; new physical scenes should include the decomposition/design pass
  - scene4_apply_oxygen: selection-like work appears present, but no `selectionSurface` with item hotspots is defined
  - scene4_apply_oxygen: movable object `Nasal cannula` has no `objectState`/`stateChange` persistence rule
  - scene4_apply_oxygen: control `Oxygen flow` may need prerequisite gating but declares none
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
- ✅ In-person spoken NPC scene(s): scene2_conversation, scene2_explain_meds, scene3_explain_draw, scene4_call_marco.

## AI conversation endpoints
- ⚠️ **AI conversation endpoint issues:**
  - scene2_conversation: voice meeting is missing player-facing `playerGoal`
  - scene2_conversation: voice meeting is missing player-facing `endpoint`
  - scene2_conversation: voice meeting is missing player-facing `successCriteria`
  - scene2_explain_meds: voice meeting is missing player-facing `endpoint`
  - scene2_explain_meds: voice meeting is missing player-facing `successCriteria`
  - scene2_explain_meds: `goalPrompt` does not clearly tell the NPC when/how to end the conversation
  - scene3_explain_draw: voice meeting is missing player-facing `endpoint`
  - scene3_explain_draw: voice meeting is missing player-facing `successCriteria`
  - scene3_explain_draw: `goalPrompt` does not clearly tell the NPC when/how to end the conversation
  - scene4_call_marco: voice meeting is missing player-facing `endpoint`
  - scene4_call_marco: voice meeting is missing player-facing `successCriteria`
  - scene4_call_marco: `goalPrompt` does not clearly tell the NPC when/how to end the conversation

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
- ⚠️ **Missing scene images** (1 of 22):
  - public/scenes/scene2_conversation.png

## Citation markers
- ✅ Citations: 11 unique sources, 27/36 paragraphs cited.
- ⚠️ **4 factual-looking paragraphs without citation markers** (showing first 3):
  - **What "good" looks like vs. "poor" looks like:**
*   **Good:** The student completes hand hygiene b
  - **Prompt:** Write a professional, concise secure chat message to Dr. Carter regarding the series of 
  - **Prompt:** In the text box below, first list the immediate actions you took. Then, write the exact 

## Rubric shape
- ✅ Rubric has 6 criteria across 1 sections.

## Rubric evidence mapping
- ⚠️ **Rubric lacks explicit `evidenceSceneIds`** — add scene-id evidence mapping to each criterion so validation can prove every constructed-response scene is graded.

## Token leaks
- ✅ No GTM token leaks detected.
