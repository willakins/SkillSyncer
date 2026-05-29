---
name: github-publish-inline-review-comment
description: Use when publishing one inline pull request review comment to GitHub by checking the PR head SHA, targeting a changed file line, pinning to the reviewed commit_id, and leaving the review-level body empty unless explicitly requested. Do not use for top-level PR comments, batch review publication, or final review decisions.
---

# GitHub Publish Inline Review Comment

**UTILITY SKILL. INVOKES:** GitHub PR review tool or known review-thread reply. **FOR SINGLE OPERATIONS:** one inline PR review comment.

## USE FOR:

- Publishing one selected inline review item on a PR diff line.
- Replying to a known existing inline thread when the thread id is available.

## DO NOT USE FOR:

- Top-level PR conversation comments; use `github-publish-pr-comment`.
- Multiple selected review items; use `github-publish-review-items`.
- Final approve, comment, or request-changes review decisions; use `github-submit-review-decision`.
- Guessing an ambiguous repo, PR, commit SHA, file path, line, side, or comment body.

## Inputs

- Require `repo_full_name`.
- Require `pr_number`.
- Require the pinned reviewed `commit_id`.
- Require the inline target:
  - `path`
  - `line`
  - `side` when needed by the tool
- Require the exact inline comment body.

## Workflow

1. Confirm the PR still points at the reviewed head SHA before publishing.
2. Publish the inline comment through the GitHub PR review tool, pinned to `commit_id`.
3. Keep the review-level body empty unless the user explicitly asked for a top-level summary note.
   - Do not add placeholder text like `Posting selected review item ...`.
4. If the selected item clearly belongs in an existing thread and the thread id is known, prefer replying there over opening a duplicate thread.
5. Return only a short publication status.

## Troubleshooting

- If the PR head moved, stop and ask for a fresh local review.
- If GitHub rejects the file line, report the failure and do not retry on a guessed line.

## Examples

- Success:
  - `Published inline review comment on \`path:line\` for PR #123 at reviewed head <sha>.`
- Failure:
  - `Could not publish inline review comment on \`path:line\` for PR #123: ...`
