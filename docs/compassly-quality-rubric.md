# Compassly Simulator Quality Rubric

Use this rubric to score whether a simulator has reached Compassly quality after an upgrade. The score is for agent and engineer review, not for students.

Ship rule: a simulator should score `85+`, have no P0/P1 blockers, have all required learner artifacts visible, complete, and serializable for grading, and have completed browser walkthrough evidence for every reachable student-visible path.

## Scorecard

| Area | Points | Standard |
| --- | ---: | --- |
| Scenario and flow | 15 | One precise scenario contract, short required route, no duplicate writing, progress tied to real learner work, stale route nodes handled safely. |
| Student readability | 15 | High-school-readable visible copy, necessary jargon only, clickable `?` glossary help, no broken glossary markers, final/report copy aligned to the simplified route. |
| Evidence and work surfaces | 15 | Source evidence appears beside the task, previous learner work carries forward, source trays are scoped, realistic work surfaces replace generic document dumps. |
| Interaction design | 15 | Clickable-looking controls work, long free text becomes bounded artifacts where appropriate, submit gates and blocker messages are clear, dense panels fit desktop and mobile. |
| AI, voice, and conversation scenes | 10 | Live scenes have goals and limits, prep notes are visible, typed fallback exists when needed, transcripts are clean, NPCs do not leak answer-key details. |
| Grading and assessment | 15 | Rubric criteria match the active required route, learner artifacts serialize clearly, objective failures use deterministic checks before AI judgment. |
| Documentation, assets, and QA | 15 | Docs, prompts, assets, validation reports, tests, and visual evidence match the current playable route. Obsolete assets and stale docs are removed or marked. |

## Blocker Severity

- **P0:** The simulator cannot be completed, required artifacts cannot be graded, or the active route is broken.
- **P1:** A learner can complete the route, but a core task is unfair, misleading, unscorable, or materially inconsistent with the role.
- **P2:** Quality issue that should be fixed before batch release, such as weak copy, cramped layout, missing glossary coverage, or stale docs.
- **P3:** Polish issue that does not materially affect learning or grading.

## Scoring Guidance

- Score the playable simulator, not the intended design.
- Do not award points for a scene that exists only in docs or a removed branch.
- Treat hidden source evidence as unavailable unless it is visible before submission.
- Penalize over-helpful UI when it removes the professional judgment the role should test.
- Penalize realistic-looking controls that are static unless they are clearly decorative.
- A simulator with any P0 or P1 blocker should not ship even if its numeric score is high.

## Minimum Review Output

Every upgrade review should include:

```text
Overall score:
P0/P1 blockers:
Strongest areas:
Weakest areas:
Patterns applied:
Checklist item coverage:
Verification performed:
Human-review follow-up:
```
