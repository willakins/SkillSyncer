---
name: github-publish-review-items
description: Route explicit requests to publish selected local PR review items to GitHub after rechecking the reviewed PR head SHA; avoid general review, CI, code-fix, drafting, or unselected publication requests.
---

# GitHub Publish Review Items

Route selected local PR review items only after a completed local review and explicit item-ID selection.

**UTILITY SKILL. INVOKES:** `github-submit-review-decision`, `github-publish-pr-comment`, `github-publish-inline-review-comment`. **FOR SINGLE OPERATIONS:** publish selected review items.

## USE FOR:

- `publish L1`, `publish A1,UI1`, `publish selected review items`.
- Mixed final decisions, top-level PR comments, and inline comments.
- Rechecking PR head SHA before publishing.

## DO NOT USE FOR:

- Running, drafting, or summarizing review.
- Fixing PR comments, CI, merge conflicts, or code.
- Requests missing selected IDs, `repo_full_name`, `pr_number`, or reviewed `commit_id`.
- Single already-classified writes; use the narrow publish skill directly.

## Inputs

Require `repo_full_name`, `pr_number`, pinned reviewed `commit_id`, selected item IDs, and classifications: `A*` decision, `L*`/`S*` inline, `UI*` or `general-comment-only`.

## Workflow

1. Re-read PR head SHA. If it differs from `commit_id`, stop and ask for a fresh local review.
2. Publish only selected IDs through the narrow skill: `A*` -> `github-submit-review-decision`, `UI*` -> `github-publish-pr-comment`, `L*`/`S*` -> `github-publish-inline-review-comment`.
3. Use exact selected text. Add no wrappers, summaries, placeholders, or duplicate notes.
4. Stop before writing if any target or classification is ambiguous.
5. Return concise status per ID.

## Examples

- Success: `Published A1,UI1,L1 to PR #123 on reviewed head <sha>.`

## Troubleshooting

- Head moved: `The PR head changed after the local review. Re-run the review before publishing.`
- No open PR: `Remote publication is unavailable because there is no open PR for this branch.`
