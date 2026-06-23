---
name: repair-pr-ci-trigger
description: Create an empty `#CI` trigger commit on a pushed branch or PR; use only when the prompt or caller explicitly asks to trigger CI/GitHub Actions for an already-published branch. Do not use for failing CI fixes, new PRs, check monitoring, merge conflicts, dirty or divergent branches, or ordinary commit naming.
---

Repair one pushed branch or PR tip by creating a marker-only commit with subject `Trigger CI #CI` and publishing it with a normal `git push <remote> HEAD:<ref>`. Use this only after explicit prompt/caller authorization to trigger CI or GitHub Actions. Use [Repair Flow](references/repair-flow.md) for exact target-resolution rules.

**UTILITY SKILL. INVOKES:** git, GitHub/PR metadata, `enable-remote-publication`. **FOR SINGLE OPERATIONS:** one pushed branch or PR that needs an empty CI trigger commit.

## Examples

- "repair PR #123 so CI runs"
- "push an empty #CI commit so checks trigger"
- "make GitHub Actions run for this PR head"

## DO NOT USE FOR:

- Fixing red GitHub Actions jobs after CI already ran.
- Creating, updating, or monitoring a PR.
- Choosing a normal commit subject for unpushed work.
- Repairing dirty worktrees, merge conflicts, or divergent local/remote tips.

## Workflow

1. Resolve the named PR or branch before relying on the current checkout; use the current branch only when no target was named.
2. Require a clean worktree and local `HEAD` matching the refreshed pushed tip being triggered.
3. Resolve the exact push destination; for open PRs, use the PR head repo/ref.
4. Verify shell push access before committing.
5. If the pushed tip message already contains `#CI` case-insensitively, report a no-op.
6. Otherwise create `git commit --allow-empty -m "Trigger CI #CI"` and push it to the exact resolved target.

## Troubleshooting

- If no matching PR-head remote or push auth exists, delegate to `enable-remote-publication`.
- If the worktree is dirty, no remote branch exists, or local `HEAD` differs from the pushed tip, stop before committing.

## Output

Return a short summary with branch, no-op status, previous pushed tip, trigger commit SHA when created, push status, and a labeled PR link when available.
