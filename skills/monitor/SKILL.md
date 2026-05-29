---
name: monitor
description: Monitor an existing pushed branch or pull request by coordinating mergeability, GitHub Actions CI, and Codex review until the target is merge-ready or truly blocked. Use when the user says "monitor", "watch this PR", "commit and monitor", "monitor until green and clean", or when another skill needs coordinated PR or pushed-branch monitoring; for PRs, default to drive-to-merge-ready unless the user explicitly asks to observe only.
---

# Monitor

Coordinate PR monitoring through:

- `monitor-merge-conflicts` for mergeability and base-branch conflicts.
- `monitor-codex` for Codex review request evidence, clean outcome evidence, and concerns.
- `monitor-ci` for GitHub Actions status.

Read [monitor contract](references/monitor-contract.md) for mode rules, delegation context, polling behavior, and stable/blocked definitions.

## Defaults

- Default to the current branch's PR when no PR number or URL is provided.
- Monitor the latest pushed PR head SHA.
- Drive PRs to merge-ready by default. This is mutating: delegated skills may repair conflicts, CI failures, or Codex concerns, create commits, rerun/cancel jobs when authorized, and push.
- Treat explicit observe-only, report-only, no-edit, no-push, or no-repair wording as observe-only.
- Check merge conflicts before Codex or CI monitoring.
- Codex review request and clean Codex outcome are required PR gates; CI green alone is not enough.

## Workflow

1. Resolve the target PR or pushed branch, head branch, current head SHA, base branch, and repair mode.
2. Run `monitor-merge-conflicts`. If conflict repair pushes a merge commit, restart on the new head; if blocked, stop before CI/Codex polling.
3. Run `monitor-codex` for the current head before any extended CI watch.
4. Run `monitor-ci` for the same head. If required checks fail and repair is authorized, let `monitor-ci` invoke the CI repair loop. If checks are pending, use bounded waits and recheck mergeability.
5. Continue `monitor-codex` until the current head is clean, has concerns, or is blocked. If concern repair is authorized, let `monitor-codex` invoke concern repair.
6. Restart from mergeability whenever a repair commit or external push changes the head.
7. Stop only when stable or truly blocked. Red or pending required CI is `not_ready` while polling can continue.

## Output

Return PR/branch target, latest head SHA, merge-conflict status, CI status, Codex request and clean-outcome evidence, repair mode, repairs made or skipped, and blockers or follow-up.
