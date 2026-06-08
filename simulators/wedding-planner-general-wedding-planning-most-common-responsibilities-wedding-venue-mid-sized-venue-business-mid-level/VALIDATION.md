# Validation report — wedding-planner-general-wedding-planning-most-common-responsibilities-wedding-venue-mid-sized-venue-business-mid-level

**Summary:** 32 pass · 2 warn · 0 fail · advisory mode

## Hard gates
- ✅ No hard-gate failures.

## Next-rule references
- ✅ All `next` references resolve (17 nodes).

## Assessment gate
- ✅ Assessment starts only after period-complete gate(s) with `View Assessment`: assessment_gate.

## NPC references
- ✅ All NPC references resolve (2 used).

## Work-mix design
- ✅ Source-derived work mix declared (physicalProceduralTool=secondary, digitalToolArtifactWork=major, cognitiveAnalysisDecision=major, writtenDocumentationArtifact=major, spokenInterpersonalCommunication=major, passiveMonitoringWaitingContextSwitching=secondary).
- ✅ Physical/procedural/tool work is represented with visual playground scene(s): scene_03_ballroom_setup.
- ✅ Digital tool/artifact work is represented with desk-work scene(s): scene_01_triage_choice, scene_02_timeline_audit, scene_03_ballroom_setup, scene_05_couple_walkthrough, scene_06_vendor_alignment.
- ✅ Active-scene mix snapshot: 1/5 scenes involve manipulation/inspection/tool work. Use this as a comparison to the source-derived mix, not as a universal target.

## Scene structure contracts
- ✅ Scene structure contracts pass: supported scene types, no app-window duplicate banners, and free-text scenes use tool-like surfaces.

## Scene mix
- ✅ Constructed-response work present (4 scenes): scene_02_timeline_audit, scene_03_ballroom_setup, scene_05_couple_walkthrough, scene_06_vendor_alignment
- ✅ Multiple-choice support present (1 scene(s)), for bounded decisions.
- ✅ Voice meeting scene(s) present: scene_05_couple_walkthrough.

## Action work mix
- ✅ Physical/procedural/tool-work scenes: 1/5 active scenes (20%). Compare this to `workMixDesign`; this validator does not impose a universal ratio.
- ✅ Physical/action scene(s) include primitives/assets/evidence: scene_03_ballroom_setup.

## Desk-work quality
- ✅ Desk-work surface scene(s): scene_01_triage_choice, scene_02_timeline_audit, scene_03_ballroom_setup, scene_05_couple_walkthrough, scene_06_vendor_alignment.
- ✅ Visible desk-work source artifact(s): scene_01_triage_choice, scene_02_timeline_audit, scene_03_ballroom_setup, scene_05_couple_walkthrough, scene_06_vendor_alignment.
- ✅ Desk-work scenes declare visible inputs, realistic surfaces, and output artifacts.

## Source realism
- ✅ Source workspace scene(s): briefing_kickoff, scene_02_timeline_audit.

## Physical playgrounds
- ⚠️ **Physical playground issues:**
  - scene_03_ballroom_setup: `interactiveObjects` item `florist staging bins blocking service aisle` requires observation text but has no generated visual asset reference
  - scene_03_ballroom_setup: `interactiveObjects` item `mark missing reserved family signs` requires observation text but has no generated visual asset reference
  - scene_03_ballroom_setup: `readableSurfaces` item `write setup note` requires observation text but has no generated visual asset reference

## Physical scene quality gate
- ✅ Physical scene quality gate inspected 1 physical/action scene(s).
- ⚠️ **Physical scene quality gate issues:**
  - scene_03_ballroom_setup: selection-like work appears present, but no `selectionSurface` with item hotspots is defined

## Primitive-name visibility
- ✅ No canonical primitive names found in player-visible text.

## NPC interaction modes
- ✅ In-person spoken NPC scene(s): scene_05_couple_walkthrough.
- ✅ Typed message/chat NPC scene(s): scene_06_vendor_alignment; verify these are realistic Slack/email/chat moments.

## AI conversation endpoints
- ✅ All 2 AI conversation scene(s) declare maxTurns and endpoint guidance.

## MCQ branching
- ✅ MCQ branch redirects present: scene_01_triage_choice.

## Source material visibility
- ✅ Source material visible where referenced: scene_06_vendor_alignment.

## Expert-knowledge inputs
- (no findings)

## Prep scene formatting
- ✅ Dense prep/source scenes use structured containers where needed: briefing_kickoff, scene_04_client_prep.

## Prep answer-key risk
- ✅ Prep/reference materials avoid obvious answer-key phrasing.

## Scene images
- ✅ All 12 scene images present (placeholders OK until you generate real ones).

## Citation markers
- ✅ Citations: 22 unique sources, 18/29 paragraphs cited.

## Rubric shape
- ✅ Rubric has 8 criteria across 4 sections.

## Rubric evidence mapping
- ✅ Every constructed-response scene is explicitly mapped to rubric evidence.

## Token leaks
- ✅ No GTM token leaks detected.
