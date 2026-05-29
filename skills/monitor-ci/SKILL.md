---
name: monitor-ci
description: Monitor GitHub Actions for an existing PR or pushed branch until CI is passing, pending/not_ready, or blocked. Use for "watch CI", "monitor GitHub Actions", "watch checks", "monitor this PR's Actions", or CI handoff from monitor. Do not use to open PRs or independently repair CI; delegate authorized branch-caused repair to fix-pr-until-green.
---

# Monitor CI

**UTILITY SKILL. INVOKES:** `gh`; `fix-pr-until-green` when repair is authorized.

Read [monitoring policy](references/monitoring-policy.md) before polling, cancelling, rerunning, or classifying failures.

## USE FOR:

- Watching Actions on an existing PR.
- Monitoring an already-pushed branch.
- Reporting CI as `passing`, `pending`, `not_ready`, or `blocked`.

## DO NOT USE FOR:

- Opening or refreshing a PR.
- Fixing CI without repair authorization.
- Cancelling or rerunning Actions without authorization.

## Workflow

1. Resolve the PR or pushed branch. Prefer a provided PR; otherwise use the current branch PR, then branch runs.
2. Capture remote head SHA and report unpushed commits.
3. Inspect checks with `gh pr checks`, `gh pr view`, `gh run list`, and `gh run view`.
4. Poll bounded sleeps. Pending stays pending; unchanged red required checks stay `not_ready` while watching can continue.
5. With repair authorization, delegate actionable branch-caused failures to `fix-pr-until-green`.
6. If repair changes the head, capture the new SHA and restart.

## Troubleshooting

- Missing tools, auth, status, logs, permissions, or required judgment is `blocked`.
- Shards running 30 minutes follow the reference policy.

## Examples

- PR or branch watch -> monitor checks.
- "Commit and monitor" -> top-level `monitor` passes repair context.

## Output

Return target, monitored head SHA, CI state, failing checks and URLs, repair status, and latest head SHA if changed.
