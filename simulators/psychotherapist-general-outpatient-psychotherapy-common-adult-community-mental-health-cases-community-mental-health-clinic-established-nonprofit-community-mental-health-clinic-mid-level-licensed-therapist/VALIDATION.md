# Validation report — psychotherapist-general-outpatient-psychotherapy-common-adult-community-mental-health-cases-community-mental-health-clinic-established-nonprofit-community-mental-health-clinic-mid-level-licensed-therapist

**Summary:** 26 pass · 3 warn · 0 fail · strict mode

## Hard gates
- ✅ No hard-gate failures.

## Next-rule references
- ✅ All `next` references resolve (18 nodes).

## Assessment gate
- ✅ Assessment starts only after period-complete gate(s) with `View Assessment`: assessment_gate.

## NPC references
- ✅ All NPC references resolve (3 used).
- ⚠️ **Unused NPCs (defined but never referenced):**
  - dr_elena_rivera

## Work-mix design
- ✅ Source-derived work mix declared (physicalProceduralTool=minor, digitalToolArtifactWork=major, cognitiveAnalysisDecision=major, writtenDocumentationArtifact=major, spokenInterpersonalCommunication=dominant, passiveMonitoringWaitingContextSwitching=secondary).
- ✅ Digital tool/artifact work is represented with desk-work scene(s): scene_01_morning_priority, scene_02_case_prep, scene_03_client_session, scene_04_progress_note, scene_05_no_show_outreach, scene_07_supervisor_consult, scene_08_safety_plan.
- ✅ Active-scene mix snapshot: 0/7 scenes involve manipulation/inspection/tool work. Use this as a comparison to the source-derived mix, not as a universal target.

## Scene structure contracts
- ✅ Scene structure contracts pass: supported scene types, no app-window duplicate banners, and free-text scenes use tool-like surfaces.

## Scene mix
- ✅ Constructed-response work present (6 scenes): scene_02_case_prep, scene_03_client_session, scene_04_progress_note, scene_05_no_show_outreach, scene_07_supervisor_consult, scene_08_safety_plan
- ✅ Multiple-choice support present (1 scene(s)), for bounded decisions.
- ✅ Voice meeting scene(s) present: scene_03_client_session, scene_05_no_show_outreach, scene_07_supervisor_consult.

## Action work mix
- ✅ Physical/procedural/tool-work scenes: 0/7 active scenes (0%). Compare this to `workMixDesign`; this validator does not impose a universal ratio.
- ⚠️ **Possible off-screen physical/tool work** — the simulation document suggests hands-on, procedural, inspection, equipment, layout, artifact, or tool work, but no action/manipulation scene exists.

## Desk-work quality
- ✅ Desk-work surface scene(s): scene_01_morning_priority, scene_02_case_prep, scene_03_client_session, scene_04_progress_note, scene_05_no_show_outreach, scene_07_supervisor_consult, scene_08_safety_plan.
- ✅ Visible desk-work source artifact(s): scene_01_morning_priority, scene_02_case_prep, scene_03_client_session, scene_04_progress_note, scene_05_no_show_outreach, scene_07_supervisor_consult, scene_08_safety_plan.
- ✅ Desk-work scenes declare visible inputs, realistic surfaces, and output artifacts.

## Source realism
- ✅ No generic packet-style source inputs detected.

## Physical playgrounds
- (no findings)

## Physical scene quality gate
- (no findings)

## Primitive-name visibility
- ✅ No canonical primitive names found in player-visible text.

## NPC interaction modes
- ✅ In-person spoken NPC scene(s): scene_03_client_session, scene_07_supervisor_consult.

## AI conversation endpoints
- ✅ All 3 AI conversation scene(s) declare maxTurns and endpoint guidance.

## MCQ branching
- ✅ MCQ branch redirects present: scene_01_morning_priority.

## Source material visibility
- ✅ Source material visible where referenced: scene_03_client_session, scene_04_progress_note, scene_05_no_show_outreach.

## Expert-knowledge inputs
- (no findings)

## Prep scene formatting
- (no findings)

## Prep answer-key risk
- ✅ Prep/reference materials avoid obvious answer-key phrasing.

## Scene images
- ⚠️ **Missing scene images** (1 of 10):
  - public/scenes/section_transition_2_3.png

## Citation markers
- ✅ Citations: 21 unique sources, 21/82 paragraphs cited.

## Rubric shape
- ✅ Rubric has 7 criteria across 3 sections.

## Rubric evidence mapping
- ✅ Every constructed-response scene is explicitly mapped to rubric evidence.

## Token leaks
- ✅ No GTM token leaks detected.
