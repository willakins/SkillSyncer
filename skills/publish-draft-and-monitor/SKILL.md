---
name: publish-draft-and-monitor
description: Publish current branch as draft PR, clean local review findings, mark ready, then hand off to monitor for Codex approval, gated empty `#CI` trigger commits, spec runs, and CI monitoring. Use for end-to-end publish-draft-and-monitor requests. Do not use for draft-only PRs, CI-only, Codex-only, branch splitting, or auto-merge.
---

# Publish Draft And Monitor

Publish one branch to a monitored, ready-for-review PR. Never auto-merge.

**ORCHESTRATION SKILL. INVOKES:** `draft-pr-for-branch`, `review-branch-until-clean`, `monitor`, `monitor-codex`. **MUTATING:** scoped commits, pushes, PR edits, repairs.

Read [publish flow details](references/publish-flow.md) before executing.

## USE FOR:

- End-to-end branch requests: draft PR, local review cleanup, ready transition, Codex approval, delayed empty `#CI` trigger commit, spec runs, and scoped repairs until merge-ready or blocked.

## DO NOT USE FOR:

- Draft-only or ready-only PR work; use `draft-pr-for-branch`.
- Existing PR CI-only work; use `fix-pr-until-green` or `monitor-ci`.
- Codex-only review/concerns; use `monitor-codex`.
- Branch splitting, conflicts, auto-merge, or read-only PR summaries.

## Workflow

1. Inspect branch/base, dirty scope, diff, PR metadata, and auth.
2. Use `draft-pr-for-branch` to publish or refresh the draft PR without CI-trigger authorization and report its link.
3. Use `review-branch-until-clean`; commit/push only validated repairs with `write-commit-name`, without `#CI` unless the prompt explicitly requested a CI marker.
4. Mark ready through `draft-pr-for-branch` without CI-trigger authorization, then run `monitor-codex` ready-transition mode to observe automatic PR `eyes` and reach a clean Codex outcome for the current code-bearing head.
5. Hand off to `monitor` in gated-trigger mode. `monitor` owns Codex approval evidence, the gated empty `#CI` trigger commit in drive-to-merge-ready mode, and continued repair/monitoring if remote CI fails.

## Troubleshooting

Stop for missing auth, unclear scope, non-actionable CI, product-intent gaps, external conflicts, missing ready-review `eyes`, or repeated no-progress repairs.

## Examples

- "Publish this as draft and monitor."
- "Take this branch to ready for review and keep fixing CI/Codex blockers."

## Output

Return PR link/state, head SHA, repairs, CI, Codex evidence, concerns, and blockers.
