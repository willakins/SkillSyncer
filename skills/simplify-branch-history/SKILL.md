---
name: simplify-branch-history
description: Rewrite noisy feature-branch history into a smaller safe commit series. Use when asked to squash, rebase, reword, tidy, or simplify branch commits before PR review or merge. Do not use for ordinary commits, merge conflicts, CI fixes, or protected branches.
---

# Simplify Branch History

**UTILITY SKILL. INVOKES:** git and bundled scripts.

Read [Rewrite Playbook](references/rewrite-playbook.md).

## USE FOR:

- "squash this branch before review"
- "clean up these messy commits"
- "reword or reorder branch commits"
- "simplify this PR branch history"

## DO NOT USE FOR:

- Creating ordinary new commits; use `commit`.
- Resolving active merge conflicts; use `fix-merge-conflicts`.
- Fixing failing CI or missing CI triggers.
- Rewriting protected branches: `main`, `master`, `develop`, `staging`, `production`, or `release/*`.

## Workflow

1. Confirm the branch with `git status -sb`; stop on protected branches or dirty worktrees.
2. Run `scripts/inspect_branch_scope.sh [branch] [remote] [base_branch]`; stop if no branch-only commits exist.
3. Run `scripts/create_safety_branch.sh [branch]`; stop if it fails.
4. Rebase onto the chosen base only when needed, resolving conflicts in context.
5. Run `scripts/snapshot_branch_diff.sh [branch] [remote] [base_branch]`.
6. Rewrite with interactive rebase, or `git reset --soft <base>` plus logical commits when churn is heavy.
7. Run `scripts/verify_branch_diff.sh [branch]`, targeted tests, and `git log --oneline <base>..HEAD`.
8. Push with `scripts/force_push_rebased_branch.sh [branch] [remote] [expected_remote_sha]` unless local-only.

## Safety Rules

- Preserve the final branch diff and never include commits already reachable from the base.
- Use the captured expected remote SHA for the final lease; do not fetch immediately before force-pushing.
- Do not claim success until the diff is verified and the branch is pushed or explicitly left local-only.

## Output

Report branch/base, backup branch, old and new commit counts, final commit subjects, validation run, and push status.
