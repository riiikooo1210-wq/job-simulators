# Validation report — investment-banking-analyst-generalist-m-a-and-capital-markets-execution-investment-banking-advisory-and-capital-markets-in-the-united-states-established-mid-to-large-investment-banking-company-in-america-entry-level-junior-analyst

**Summary:** 21 pass · 3 warn · 0 fail · advisory mode

## Hard gates
- ✅ No hard-gate failures.

## Next-rule references
- ✅ All `next` references resolve (19 nodes).

## NPC references
- ✅ All NPC references resolve (2 used).

## Work-mix design
- ✅ Source-derived work mix declared (physicalProceduralTool=minor, digitalToolArtifactWork=dominant, cognitiveAnalysisDecision=major, writtenDocumentationArtifact=major, spokenInterpersonalCommunication=secondary, passiveMonitoringWaitingContextSwitching=secondary).
- ✅ Digital tool/artifact work is represented with desk-work scene(s): model_audit, associate_update, diligence_matrix, turn_plan, final_status.
- ✅ Active-scene mix snapshot: 3/8 scenes involve manipulation/inspection/tool work. Use this as a comparison to the source-derived mix, not as a universal target.

## Scene mix
- ✅ Constructed-response work present (7 scenes): model_audit, associate_update, associate_voice, client_call, diligence_matrix, turn_plan, final_status
- ✅ Multiple-choice support present (1 scene(s)), for bounded decisions.
- ✅ Voice meeting scene(s) present: associate_voice, client_call.

## Action work mix
- ✅ Physical/procedural/tool-work scenes: 3/8 active scenes (38%). Compare this to `workMixDesign`; this validator does not impose a universal ratio.

## Desk-work quality
- ✅ Desk-work surface scene(s): model_audit, associate_update, diligence_matrix, turn_plan, final_status.
- ✅ Visible desk-work source artifact(s): model_audit, associate_update, diligence_matrix, turn_plan, final_status.
- ⚠️ **Desk-work quality issues:**
  - model_audit: `appTabs` currently render only in `free_text`; use referenceContent/prepReferenceContent for this scene type
  - turn_plan: `appTabs` currently render only in `free_text`; use referenceContent/prepReferenceContent for this scene type

## Physical playgrounds
- (no findings)

## Physical scene quality gate
- (no findings)

## Primitive-name visibility
- ✅ No canonical primitive names found in player-visible text.

## NPC interaction modes
- ✅ In-person spoken NPC scene(s): associate_voice.
- ✅ Remote/virtual spoken NPC scene(s): client_call.

## AI conversation endpoints
- ✅ All 2 AI conversation scene(s) declare maxTurns and endpoint guidance.

## MCQ branching
- ✅ MCQ branch redirects present: first_move.

## Source material visibility
- (no findings)

## Expert-knowledge inputs
- (no findings)

## Prep scene formatting
- (no findings)

## Prep answer-key risk
- ✅ Prep/reference materials avoid obvious answer-key phrasing.

## Scene images
- ⚠️ **Missing scene images** (3 of 17):
  - public/scenes/briefing_morning.png
  - public/scenes/model_audit.png
  - public/scenes/associate_update.png

## Citation markers
- ✅ Citations: 7 unique sources, 12/18 paragraphs cited.

## Rubric shape
- ✅ Rubric has 8 criteria across 3 sections.

## Rubric evidence mapping
- ✅ Every constructed-response scene is explicitly mapped to rubric evidence.

## Token leaks
- ⚠️ **GTM token leaks detected** (10+ hits, first 10 shown):
  - src/data/scene-config.json:312
  - src/data/scene-config.json:320
  - src/data/scene-config.json:335
  - src/data/scene-config.json:342
  - src/data/scene-config.json:343
  - src/data/scene-config.json:348
  - src/data/scene-config.json:671
  - src/data/scene-config.json:672
  - src/data/scene-config.json:673
  - src/data/scene-config.json:675
