# Validation report — architect-none-most-common-residential-architecture-mid-size-firm-entry-junior

**Summary:** 28 pass · 3 warn · 0 fail · strict mode

## Hard gates
- ✅ No hard-gate failures.

## Next-rule references
- ✅ All `next` references resolve (15 nodes).

## Assessment gate
- ✅ Assessment starts only after period-complete gate(s) with `View Assessment`: assessment_gate.

## NPC references
- ✅ All NPC references resolve (2 used).
- ⚠️ **Unused NPCs (defined but never referenced):**
  - owen_reed
  - riley_patel

## Work-mix design
- ✅ Source-derived work mix declared (physicalProceduralTool=minor, digitalToolArtifactWork=dominant, cognitiveAnalysisDecision=major, writtenDocumentationArtifact=major, spokenInterpersonalCommunication=secondary, passiveMonitoringWaitingContextSwitching=secondary).
- ✅ Digital tool/artifact work is represented with desk-work scene(s): first_move, redline_note, client_prep, client_call, site_observation, schematic_option_study.
- ✅ Active-scene mix snapshot: 2/6 scenes involve manipulation/inspection/tool work. Use this as a comparison to the source-derived mix, not as a universal target.

## Scene structure contracts
- ✅ Scene structure contracts pass: supported scene types, no app-window duplicate banners, and free-text scenes use tool-like surfaces.

## Scene mix
- ✅ Constructed-response work present (5 scenes): redline_note, client_prep, client_call, site_observation, schematic_option_study
- ✅ Multiple-choice support present (1 scene(s)), for bounded decisions.
- ✅ Voice meeting scene(s) present: client_call.

## Action work mix
- ✅ Physical/procedural/tool-work scenes: 2/6 active scenes (33%). Compare this to `workMixDesign`; this validator does not impose a universal ratio.

## Desk-work quality
- ✅ Desk-work surface scene(s): first_move, redline_note, client_prep, client_call, site_observation, schematic_option_study.
- ✅ Visible desk-work source artifact(s): first_move, redline_note, client_prep, client_call, site_observation, schematic_option_study.
- ✅ Desk-work scenes declare visible inputs, realistic surfaces, and output artifacts.

## Source realism
- ✅ Source inbox scene(s): maple_street_inbox.

## Physical playgrounds
- (no findings)

## Physical scene quality gate
- (no findings)

## Primitive-name visibility
- ✅ No canonical primitive names found in player-visible text.

## NPC interaction modes
- ✅ Remote/virtual spoken NPC scene(s): client_call.
- ✅ Typed message/chat NPC scene(s): site_observation; verify these are realistic Slack/email/chat moments.
- ⚠️ **NPC interaction mode issues:**
  - Simulation document suggests colocated/on-site work, but no `voice_meeting` uses `meetingMode: in_person`

## AI conversation endpoints
- ✅ All 2 AI conversation scene(s) declare maxTurns and endpoint guidance.

## MCQ branching
- ✅ MCQ branch redirects present: first_move.

## Source material visibility
- ✅ Source material visible where referenced: site_observation.

## Expert-knowledge inputs
- (no findings)

## Prep scene formatting
- ✅ Dense prep/source scenes use structured containers where needed: maple_street_inbox.

## Prep answer-key risk
- ✅ Prep/reference materials avoid obvious answer-key phrasing.

## Scene images
- ✅ All 7 scene images present (placeholders OK until you generate real ones).

## Citation markers
- ✅ Citations: 19 unique sources, 7/9 paragraphs cited.

## Rubric shape
- ✅ Rubric has 6 criteria across 3 sections.

## Rubric evidence mapping
- ✅ Every constructed-response scene is explicitly mapped to rubric evidence.

## Token leaks
- ⚠️ **GTM token leaks detected** (30+ hits, first 30 shown):
  - CHECK_REPORT.md:22
  - CHECK_REPORT.md:24
  - CHECK_REPORT.md:39
  - CHECK_REPORT.md:53
  - IMAGE_PROMPTS.md:478
  - SCENE_BLUEPRINT.md:27
  - SCENE_BLUEPRINT.md:28
  - visual/visual-bible.json:21
  - visual/visual-bible.json:24
  - visual/visual-bible.json:103
  - src/scenes/ArchitectDesignStudioScene.tsx:755
  - src/data/job-simulation.md:18
  - src/data/scene-config.json:90
  - src/data/scene-config.json:100
  - src/data/scene-config.json:102
  - src/data/scene-config.json:140
  - src/data/scene-config.json:253
  - src/data/scene-config.json:331
  - src/data/scene-config.json:366
  - src/data/scene-config.json:413
  - src/data/scene-config.json:423
  - src/data/scene-config.json:459
  - src/data/scene-config.json:460
  - src/data/scene-config.json:462
  - src/data/scene-config.json:463
  - src/data/scene-config.json:521
  - src/data/scene-config.json:527
  - src/data/scene-config.json:541
  - src/data/scene-config.json:579
  - src/data/scene-config.json:669
