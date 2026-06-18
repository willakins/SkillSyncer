---
name: repair-pr-ci-trigger
description: Repair a pushed branch or PR whose latest tip is missing `#CI`; use only when the prompt or caller explicitly asks to amend the last commit message so CI/GitHub Actions runs. Do not use for failing CI fixes, new PRs, check monitoring, merge conflicts, dirty or divergent branches, or ordinary commit naming.
---

Repair one pushed branch or PR tip by appending ` #CI` to the commit subject, preserving the body, and publishing with `git push --force-with-lease <remote> HEAD:<ref>`. Use this only after explicit prompt/caller authorization to trigger CI or GitHub Actions. Use [Repair Flow](references/repair-flow.md) for exact target-resolution rules.

**UTILITY SKILL. INVOKES:** git, GitHub/PR metadata, `enable-remote-publication`. **FOR SINGLE OPERATIONS:** one pushed branch or PR tip missing a CI marker.

## Examples

- "repair PR #123 so CI runs"
- "append #CI to the last commit and force push"
- "fix the latest commit message so checks trigger"

## DO NOT USE FOR:

- Fixing red GitHub Actions jobs after CI already ran.
- Creating, updating, or monitoring a PR.
- Choosing a normal commit subject for unpushed work.
- Repairing dirty worktrees, merge conflicts, or divergent local/remote tips.

## Workflow

1. Resolve the named PR or branch before relying on the current checkout; use the current branch only when no target was named.
2. Require a clean worktree and local `HEAD` matching the refreshed pushed tip being repaired.
3. Resolve the exact push destination; for open PRs, use the PR head repo/ref.
4. Verify shell push access before amending.
5. If the pushed tip message already contains `#CI` case-insensitively, report a no-op.
6. Otherwise amend only the latest commit subject to append ` #CI`, preserve the body, and push with lease.

## Troubleshooting

- If no matching PR-head remote or push auth exists, delegate to `enable-remote-publication`.
- If the worktree is dirty, no remote branch exists, or local `HEAD` differs from the pushed tip, stop before amending.

## Output

Return a short summary with branch, no-op status, previous subject, new subject when changed, force-push status, and a labeled PR link when available.
