---
name: review-branch-logic
description: "Review a pull request or branch for actionable correctness bugs only: wrong base, missing auth or scoping, broken contracts, misleading tests, read/write mismatches, races, or duplicate writes. Do not use for style, UI, CI, implementation, or publishing comments."
---

# Review Branch Logic

Review pinned branch diffs for correctness defects only.

**UTILITY SKILL. FOR SINGLE OPERATIONS:** focused logic review of a pinned branch diff.

## USE FOR:

- Correctness review of a PR or branch.
- Merge-readiness reviews needing only a logic pass.

## DO NOT USE FOR:

- Style, architecture, UI, docs-only, or formatting review.
- CI monitoring, implementation, merge-conflict repair, or publishing comments.
- Speculation not grounded in changed code.

## Inputs

- Truthful review base and exact reviewed head SHA.
- PR description when available.
- Changed file list or diff.

## Workflow

1. Pin the exact revision. For PRs, capture base and head SHAs. If the PR base is a temporary stack base, stop until the real integration base is resolved.
2. Read the PR description, then the diff for `<review_base>...<exact_pr_head>`.
3. Read relevant changed files and tests; verify tests set up the claimed behavior.
4. Check for broken assumptions, missing fallback/auth/scoping, read/write mismatch, contract regressions, races, duplicate writes, and misleading tests.
5. Exclude style or architecture-only commentary.
6. Emit only actionable logic findings. Prefer changed-line `path:line`; use `general-comment-only` only when inline placement would be dishonest.

## Troubleshooting

- If base/head or PR intent is unknown, ask or stop before reviewing.

## Output

- No issues: `Logic: I did not find actionable correctness gaps in the changed flow.`
- Inline issue: `L1 -> \`path/to/file.rb:line\` -> review comment`
- General issue: `L2 -> general-comment-only -> review comment`

## Examples

- `L1 -> app/models/user.rb:42 -> This update is not scoped to the account.`
- `L2 -> general-comment-only -> The diff is based on the stack branch, so the real integration diff is unknown.`
