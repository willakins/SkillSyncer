---
name: monitor-merge-conflicts
description: Detect whether a monitored pull request or branch has merge conflicts, and resolve them by delegating to the existing merge-conflict workflow. Use when monitoring should include PR mergeability, base-branch conflicts, or GitHub reports that a PR cannot be merged cleanly.
---

# Monitor Merge Conflicts

Check mergeability before long-running CI or Codex monitoring, then delegate conflict repair to existing merge skills.

## Defaults

- Default `pr` to the current branch's PR when the user does not provide a PR number or URL.
- Default base branch to the PR base, or `main` when only a branch is available.
- Do not hand-resolve conflicts in this skill.
- If a merge is already in progress, invoke `fix-merge-conflicts`.
- If GitHub reports the PR branch conflicts with its base and no merge is in progress, invoke `merge-main-into-branch`, which fetches `origin/main`, starts the merge, delegates active conflicts to `fix-merge-conflicts`, finishes the merge commit, and pushes.
- If the PR is mergeable or mergeability is still unknown, report that state without changing code.

## Workflow

1. Resolve the target.
   - Prefer a user-provided PR number or URL.
   - Otherwise use `gh pr view --json number,url,baseRefName,headRefName,headRefOid,mergeable,mergeStateStatus`.
   - Capture the current branch, upstream branch, PR URL, base branch, and head SHA.
2. Check local merge state.
   - Run `git status -sb`.
   - If `.git/MERGE_HEAD` exists or `git diff --name-only --diff-filter=U` returns paths, invoke `fix-merge-conflicts`.
3. Check PR mergeability.
   - Treat `mergeStateStatus` values such as `DIRTY`, `BEHIND`, or `UNKNOWN` as signals to inspect further.
   - Treat `mergeable: CONFLICTING` or a GitHub message that the branch has conflicts as a required conflict repair.
   - Re-check once after a short wait when GitHub returns `UNKNOWN`, because mergeability can be asynchronous.
4. Repair conflicts when needed.
   - Use `merge-main-into-branch` for remote PR conflicts when no local merge is active.
   - That workflow must use `fix-merge-conflicts` for the actual conflict resolution.
   - After repair, capture the new head SHA and report that monitoring must restart for the new head.
5. Report clean or blocked states.
   - If mergeability is clean, report `mergeable`.
   - If conflict repair cannot proceed because the worktree is dirty, auth is missing, or the conflict is ambiguous, report `blocked`.

## Output

Return a concise status with:

- PR or branch target
- base branch and monitored head SHA
- merge-conflict state: `mergeable`, `conflicted`, `repaired`, `unknown`, or `blocked`
- whether `fix-merge-conflicts` or `merge-main-into-branch` was used
- resolved files and final merge commit subject when a repair was made
- latest head SHA if it changed
