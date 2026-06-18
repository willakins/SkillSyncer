---
name: review-branch-until-clean
description: Review and repair the current branch against main until no Codex findings remain. Trigger for end-to-end branch review-and-fix loops. Exclude review-only, CI-only, publication-only, branch-splitting, and single-concern triage requests.
---

# Review Branch Until Clean

**COORDINATOR SKILL. INVOKES:** `review-branch-logic`, `review-branch-style`, `review-branch-ui` when relevant, `address-codex-concerns`, `write-commit-name`, optional `enable-remote-publication`.

Run a current-branch review/fix loop. Default `source_branch` to the current branch and `base_branch` to `main`.

Read [Review Loop](references/review-loop.md) before editing, committing, or pushing.

## USE FOR:

- "review this branch and fix the issues"
- "keep reviewing this branch until Codex has no concerns"
- "fully review, repair valid findings, and push each fix"

## DO NOT USE FOR:

- Review-only approval or merge-readiness; use `review-branch-for-merge`.
- Single concern sets; use `address-codex-concerns`.
- CI repair, monitoring, PR publication, or merge-conflict resolution.
- Branches too large or mixed to stabilize; use `split-branch-into-stack`.

## Workflow

1. Inspect `git status -sb`, resolve `base_branch`, and read the branch diff.
2. Run a fresh full-branch review using repo standards plus focused review skills where applicable.
3. Stop if no findings remain.
4. Send findings to `address-codex-concerns`; fix only validated issues in one coherent batch.
5. Run targeted verification.
6. Stage only the batch, use `write-commit-name`, commit without `#CI` unless the prompt explicitly asks to trigger CI, trigger actions, run GitHub Actions, commit with actions, or include a CI marker, and push only to a verified safe target.
7. Repeat until clean or blocked by an intentional/disputed finding.

## Troubleshooting

- Dirty unrelated worktree: ask which files belong.
- Unverified PR head, upstream, remote alias, or auth: use `enable-remote-publication`.
- Repeated disputed finding or failed verification: stop and report.

## Output

Return Markdown with review base, iteration count, repair commits, checks run, and final status. Use inline code paths, not local filesystem links.
