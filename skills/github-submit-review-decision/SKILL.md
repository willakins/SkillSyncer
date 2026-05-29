---
name: github-submit-review-decision
description: Use when submitting a final GitHub PR review decision as APPROVE, REQUEST_CHANGES, or COMMENT with a body, pinned to the reviewed commit SHA; do not use for inline comments, top-level PR comments, or mixed review items.
---

# GitHub Submit Review Decision

**UTILITY SKILL. INVOKES:** GitHub review tool. **FOR SINGLE OPERATIONS:** final PR review submission only.

## USE FOR:

- Approving a PR.
- Requesting changes on a PR.
- Submitting a comment-only final PR review.
- Repo, PR number, reviewed SHA, action, and body are available.

## DO NOT USE FOR:

- Inline file comments; use `github-publish-inline-review-comment`.
- Top-level PR comments; use `github-publish-pr-comment`.
- Mixed review-item batches; use `github-publish-review-items`.
- Review drafting without final submission.

## Inputs

- Require `repo_full_name`.
- Require `pr_number`.
- Require pinned reviewed `commit_id`.
- Require the review `action`:
  - `APPROVE`
  - `REQUEST_CHANGES`
  - `COMMENT`
- Require review body.

## Workflow

1. Confirm the PR head still matches reviewed `commit_id`.
   - If the head moved, ask for a fresh local review.
   - If required input is missing, ask before submitting.
2. Submit through the GitHub PR review tool.
3. Do not attach file comments or top-level PR comments.
4. Return short status.

## Examples

- "Approve repo `acme/app` PR #42 at reviewed commit `abc123` with body `Looks good to me.`"
- "Submit REQUEST_CHANGES on PR #42 with this review body..."

## Troubleshooting

- Head moved: ask for a fresh local review.
- Missing input: ask for the field; do not submit.

## Output

- Success:
  - `Submitted APPROVE review to PR #123 at reviewed head <sha>.`
- Failure:
  - `Could not submit APPROVE review to PR #123: ...`
