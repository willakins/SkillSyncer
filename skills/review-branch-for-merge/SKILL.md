---
name: review-branch-for-merge
description: Coordinate full merge-readiness reviews for explicit PRs or branches by pinning the base and head SHA, reading PR context, running UI/logic/style review skills, deciding approval, and optionally routing selected comments for publication. Trigger for approval, merge-readiness, and full-review requests. Exclude single-slice reviews, CI fixes, implementation, monitoring, and publication-only requests.
---

# Review Branch For Merge

**COORDINATOR SKILL. INVOKES:** `review-branch-ui`, `review-branch-logic`, `review-branch-style`, optional `github-publish-review-items`.

Coordinate a full branch or PR merge review and decide approval readiness.

## USE FOR:

- "review whether this branch should be merged"
- "fully review this PR branch"
- "should PR #123 be approved"

## DO NOT USE FOR:

- UI-only, correctness-only, or style-only checks.
- Publishing selected local review items.
- Fixing CI, implementing requested changes, or monitoring an existing PR.

## Workflow

1. Require an explicit branch name or PR number.
2. Resolve repo, PR number when present, truthful review base, and exact reviewed head SHA.
3. Read PR context and inspect the pinned diff for `<review_base>...<exact_pr_head>`.
4. Read [Review Contract](references/review-contract.md), then apply:
   - `../review-branch-ui/SKILL.md`
   - `../review-branch-logic/SKILL.md`
   - `../review-branch-style/SKILL.md`
5. Aggregate results, decide approval, and assign stable IDs: `A1`, `UI1`, `L1`, `S1`.
6. Ask one publish prompt only for an open GitHub PR. Publish nothing without explicit confirmation.

## Output

Return plain text only.

- Approved: `Decision: Approve.`, UI status, logic summary, code-quality summary, `A1 -> approval review comment -> ...`, publish prompt.
- Not ready: `Decision: Not ready for approval.`, UI status, `Logic issues:`, `Style / code quality issues:`, publish prompt.
- Use inline code paths, not local filesystem links.
