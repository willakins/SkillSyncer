---
name: fix-merge-conflicts
description: Resolve an active git merge with unmerged paths by inspecting conflicts, staging intentional resolutions, and continuing non-interactively with safe CI-marker merge-message handling. Use this skill when asked to fix or continue merge conflicts; not for rebases, cherry-picks, dirty worktrees, CI failures, or PR monitoring.
---

# Fix Merge Conflicts

**UTILITY SKILL. INVOKES:** git, filesystem reads, targeted file edits. **FOR SINGLE OPERATIONS:** active merge conflict repair only.

Use this skill for active local merge-conflict repair.

Read [merge resolution workflow](references/merge-resolution-workflow.md) before editing conflicted files.

## USE FOR:

- In-progress `git merge` states with unmerged paths.
- Resolving obvious conflicts, staging resolutions, and completing the merge.
- Asking the user only when the correct resolution is genuinely ambiguous.

## DO NOT USE FOR:

- Rebases, cherry-picks, amends, or commit-only requests.
- PR monitoring or remote merge-conflict detection.
- Generic dirty worktree cleanup when no merge is in progress.
- CI failures after a merge commit already exists.

## Examples

- `fix the merge conflicts`
- `resolve this merge and continue`

## Required Checks

1. Confirm a merge is in progress with git status and merge-state files.
2. Use git's unmerged path list as the worklist.
3. Read each conflicted file in context before resolving it.
4. Stage only intentional conflict resolutions.
5. Stop if unrelated staged paths would be swept into the merge commit.
6. Complete with `GIT_EDITOR=true git merge --continue` after updating `.git/MERGE_MSG` when the prepared subject needs `#CI`.

## Troubleshooting

- If no merge is in progress, report that there is nothing to continue.
- If the right resolution depends on product, rollout, or business intent, ask one concise question and wait.
- Never use blanket `--ours` or `--theirs` across all files.

## Output

Report whether a merge was in progress, resolved files, whether user input was needed, the final merge commit subject, and whether `git merge --continue` completed.
