# Upgrade Agent Output Contract

Future simulator-upgrade agents should produce the same report shape so their work can be reviewed and converted back into training examples.

## Required Report

```markdown
# Simulator Upgrade Report: <Simulator>

## Current Quality Score

- Overall:
- P0/P1 blockers:
- Main weaknesses:

## Defects Found

| Defect | Evidence | Checklist items | Pattern tags |
| --- | --- | --- | --- |

## Patterns Applied

| Pattern | Why it applies | Examples consulted |
| --- | --- | --- |

## Changes Made

| Change | Files/scenes | Intended purpose | Acceptance test |
| --- | --- | --- | --- |

## Browser Walkthrough Evidence

| Path/scene visited | Viewport | Actions performed | Screenshot/artifact path | Pass/fail | Issue notes | Student experience feel | Workplace software realism |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Verification

- Commands/checks run:
- Browser walkthrough status:
- Blocked or skipped paths:
- Known gaps:

## Change History Update

- `CHANGE_HISTORY.md` updated:
- Rows added:
- Rows needing confirmation:

## Human Review Needed

- Highest-risk judgment:
- Suggested review focus:
```

## Agent Rules

- Map every proposed change to at least one checklist item and one pattern tag.
- Do not implement until the user explicitly asks for implementation.
- Do not mark an audit, implementation, or ready-for-release review complete without browser walkthrough evidence for every reachable student-visible path.
- Explicitly report whether core workplace software feels realistic for the role. Treat unrealistic core job software as a P1 blocker when the scenario depends on that tool.
- If browser access is blocked, label the result `runtime browser walkthrough blocked`; a code-only pass is only a preliminary audit.
- Repeat the browser walkthrough after implementation changes UI, route, grading, interaction behavior, or visible copy.
- Do not change hidden grading/service prompts just to simplify visible student copy unless the upgrade requires it.
- Keep old saved-state compatibility in mind when deleting or renaming scenes.
- Update grading, sample answers, final report, docs, assets, and tests when route behavior changes.
- Preserve professional judgment. A simpler simulator still needs the hard role decision.
