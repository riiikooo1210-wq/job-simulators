# Validation report — restaurant-owner-none-franchise-quick-service-franchise-operation-mid-level-owner-operator

**Summary:** 31 pass · 1 warn · 0 fail · advisory mode

## Hard gates
- ✅ No hard-gate failures.

## Next-rule references
- ✅ All `next` references resolve (17 nodes).

## Assessment gate
- ✅ Assessment starts only after period-complete gate(s) with `View Assessment`: assessment_gate.

## NPC references
- ✅ All NPC references resolve (1 used).
- ⚠️ **Unused NPCs (defined but never referenced):**
  - mina

## Work-mix design
- ✅ Source-derived work mix declared (physicalProceduralTool=secondary, digitalToolArtifactWork=major, cognitiveAnalysisDecision=dominant, writtenDocumentationArtifact=major, spokenInterpersonalCommunication=major, passiveMonitoringWaitingContextSwitching=secondary).
- ✅ Physical/procedural/tool work is represented with visual playground scene(s): scene_03_line_check.
- ✅ Digital tool/artifact work is represented with desk-work scene(s): scene_01_first_twenty_minutes, scene_02_kpi_shift_plan, scene_04_coaching_prep, scene_06_daily_action_memo.
- ✅ Active-scene mix snapshot: 2/6 scenes involve manipulation/inspection/tool work. Use this as a comparison to the source-derived mix, not as a universal target.

## Scene structure contracts
- ✅ Scene structure contracts pass: supported scene types, no app-window duplicate banners, and free-text scenes use tool-like surfaces.

## Scene mix
- ✅ Constructed-response work present (5 scenes): scene_02_kpi_shift_plan, scene_03_line_check, scene_04_coaching_prep, scene_04_shift_lead_coaching, scene_06_daily_action_memo
- ✅ Multiple-choice support present (1 scene(s)), for bounded decisions.
- ✅ Voice meeting scene(s) present: scene_04_shift_lead_coaching.

## Action work mix
- ✅ Physical/procedural/tool-work scenes: 2/6 active scenes (33%). Compare this to `workMixDesign`; this validator does not impose a universal ratio.
- ✅ Physical/action scene(s) include primitives/assets/evidence: scene_03_line_check.

## Desk-work quality
- ✅ Desk-work surface scene(s): scene_01_first_twenty_minutes, scene_02_kpi_shift_plan, scene_04_coaching_prep, scene_06_daily_action_memo.
- ✅ Visible desk-work source artifact(s): scene_01_first_twenty_minutes, scene_02_kpi_shift_plan, scene_04_coaching_prep, scene_04_shift_lead_coaching, scene_06_daily_action_memo.
- ✅ Desk-work scenes declare visible inputs, realistic surfaces, and output artifacts.

## Source realism
- ✅ Source workspace scene(s): morning_operating_workspace.

## Physical playgrounds
- ✅ Physical playground scene(s) have stage/assets/coordinates: scene_03_line_check.

## Physical scene quality gate
- ✅ Physical scene quality gate passed for: scene_03_line_check.

## Primitive-name visibility
- ✅ No canonical primitive names found in player-visible text.

## NPC interaction modes
- ✅ In-person spoken NPC scene(s): scene_04_shift_lead_coaching.

## AI conversation endpoints
- ✅ All 1 AI conversation scene(s) declare maxTurns and endpoint guidance.

## MCQ branching
- ✅ MCQ branch redirects present: scene_01_first_twenty_minutes.

## Source material visibility
- ✅ Source material visible where referenced: scene_04_coaching_prep, scene_04_shift_lead_coaching.

## Expert-knowledge inputs
- (no findings)

## Prep scene formatting
- (no findings)

## Prep answer-key risk
- ✅ Prep/reference materials avoid obvious answer-key phrasing.

## Scene images
- ✅ All 12 scene images present (placeholders OK until you generate real ones).

## Citation markers
- ✅ Citations: 18 unique sources, 10/21 paragraphs cited.

## Rubric shape
- ✅ Rubric has 6 criteria across 3 sections.

## Rubric evidence mapping
- ✅ Every constructed-response scene is explicitly mapped to rubric evidence.

## Token leaks
- ✅ No GTM token leaks detected.
