# Simulator Upgrade Example Schema

This schema turns simulator improvement history into examples that future Codex agents can retrieve, compare, and apply. Each JSONL row should teach one reusable change pattern: what weakness to recognize, what intervention fixed it, why the intervention matches Compassly quality, and how to verify it.

Canonical dataset:

```text
docs/ai-upgrade-system/simulator-upgrade-examples.jsonl
```

## Required Fields

Each line must be a standalone JSON object with these fields:

| Field | Type | Requirement |
| --- | --- | --- |
| `id` | string | Unique stable id such as `architect-0001`. |
| `simulator` | string | Full simulator slug. |
| `source_change_history` | string | Repo-relative path to the source `CHANGE_HISTORY.md`. |
| `source_row` | string | Short label for the source row or change-history source. |
| `before_problem` | string | The weakness a future agent should learn to recognize. |
| `change_made` | string | The concrete simulator improvement. |
| `intended_purpose` | string | Why the change improves learner value, realism, grading fairness, reliability, or maintainability. |
| `pattern_tags` | string array | One or more controlled tags. |
| `checklist_items` | number array | One or more item numbers from `docs/simulation-quality-checklist.md`. |
| `when_to_apply` | string | The condition that should trigger this pattern in a future simulator. |
| `when_not_to_apply` | string | A boundary that prevents over-generalizing the pattern. |
| `acceptance_test` | string | The evidence that the improved simulator meets the standard. |
| `evidence_refs` | string array | Files, docs, scripts, scene ids, or tests that support the example. |
| `confidence` | string | `high` or `medium`. |

## Controlled Pattern Tags

Use only these tags in v1:

```text
scenario_contract
route_trim
progress_real_work
student_readability
glossary_help
source_visibility
memory_dependency_removal
bounded_artifact
realistic_tool_surface
clickable_affordance
submit_gate
helper_hidden
conversation_boundaries
typed_fallback
answer_leak_prevention
rubric_alignment
artifact_serialization
deterministic_check
stale_state_redirect
asset_doc_cleanup
responsive_fit
```

## Curation Rules

- Prefer rows that teach a future agent how to recognize and fix a simulator-quality defect.
- Skip pure scaffolding, repository sync, server setup, and generic provenance unless the row teaches a reusable upgrade behavior.
- Split one change-history row into multiple dataset rows when it contains multiple reusable patterns.
- Keep examples specific enough to guide action, but broad enough to apply to other roles.
- Use current simulator files or focused diffs only when needed to recover the original weakness, acceptance test, or evidence reference.
- Do not mine all session logs in v1.

## Example

```json
{"id":"architect-0001","simulator":"architect-none-most-common-residential-architecture-mid-size-firm-entry-junior","source_change_history":"simulators/architect-none-most-common-residential-architecture-mid-size-firm-entry-junior/CHANGE_HISTORY.md","source_row":"Working tree, redline board renderer and response payload","before_problem":"The redline task could collapse into a long written note instead of a hands-on drawing judgment artifact.","change_made":"Added a redline click board with drawing tabs, Fix/Verify buttons, response JSON, review notes, and a submit gate.","intended_purpose":"Make the learner classify concrete drawing issues while producing structured rubric evidence.","pattern_tags":["bounded_artifact","submit_gate","artifact_serialization"],"checklist_items":[32,33,34,49],"when_to_apply":"Use when an important role judgment is currently asked as a broad free-text response.","when_not_to_apply":"Do not replace writing when the professional artifact really is a prose memo or article.","acceptance_test":"Every callout must be answered before submit and the stored response identifies each Fix or Verify decision.","evidence_refs":["src/data/scene-config.json","src/scenes/RedlineClickBoardScene.tsx","tests/verifyRepliesRedlines.test.mjs"],"confidence":"high"}
```
