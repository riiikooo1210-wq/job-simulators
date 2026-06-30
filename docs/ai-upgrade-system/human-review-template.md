# Human Review Template

Create one file under `docs/ai-upgrade-system/reviews/` after a human review materially accepts, rejects, or corrects an AI simulator upgrade.

Filename:

```text
YYYY-MM-DD-<simulator-short-name>.md
```

Template:

```markdown
# Human Review: <Simulator>

Date: YYYY-MM-DD
Reviewer:
Simulator: `<full-slug>`
Upgrade agent/report:

## Overall Decision

- [ ] Accepted
- [ ] Accepted with corrections
- [ ] Rejected

## What Worked

- Pattern:
- Why this matched Compassly quality:
- Reusable rule:

## What Did Not Work

- Problem:
- Why it missed the standard:
- Preferred fix:
- Pattern tag:

## Dataset Rows to Add or Update

```json
{"id":"review-YYYYMMDD-0001","simulator":"<slug>","source_change_history":"simulators/<slug>/CHANGE_HISTORY.md","source_row":"Human review YYYY-MM-DD","before_problem":"","change_made":"","intended_purpose":"","pattern_tags":[],"checklist_items":[],"when_to_apply":"","when_not_to_apply":"","acceptance_test":"","evidence_refs":[],"confidence":"high"}
```

## Follow-Up

- Required:
- Optional:
```
