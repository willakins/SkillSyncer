# Monitor CI Policy

Use this reference after `SKILL.md` routes to `monitor-ci`.

## Status Rules

- `passing`: all required checks for the monitored head passed.
- `pending`: required checks are queued or in progress and not stale.
- `not_ready`: a required check is red, cancelled, skipped unexpectedly, or externally blocked, but monitoring can still continue for a rerun, replacement suite, or head change.
- `blocked`: monitoring cannot continue without auth, permissions, logs, cancellation/rerun authority, product judgment, or user input.

A completed failed required check is not a terminal success. If repair is not authorized, keep bounded polling as `not_ready` after confirming no newer run or head change exists.

## Repair And Write Actions

This skill is observational by default. Code edits, commits, pushes, GitHub Actions reruns, and workflow cancellation require explicit user/caller authorization. The top-level `monitor` skill may pass CI repair, rerun, and cancellation authorization for drive-to-merge-ready monitoring.

When a failure is actionable from the branch and repair is authorized, invoke `fix-pr-until-green`. Do not duplicate its repair loop.

Rerun failed jobs only when authorization covers reruns and the failure is classified as flaky, runner, infrastructure, external, or otherwise not branch-caused.

## Polling Contract

Use finite sleeps, usually around 30 seconds, followed by explicit rechecks. Re-read the PR head SHA and check rollup after failed required checks and before classifying a state as unchanged.

Track in-progress test shards by job id, run id, URL, `startedAt`, and current test step start time when GitHub exposes it. Prefer the current `rspec`, `test`, or equivalent step start time; otherwise use job start time.

## Stale Shards

Treat a test shard as stale after 30 minutes in progress without a result. A stale shard is not normal pending CI.

If repair is not authorized, return `blocked` with the shard name, run URL, elapsed time, and the missing cancellation or repair authorization.

If repair is authorized, cancel the workflow with `gh run cancel <run_id> --repo <owner>/<repo>`, wait briefly for cancellation, then inspect logs with `gh run view <run_id> --job <job_id> --log` or the Actions job logs API.

Investigate cancelled stale shards as real failures. Use logs, changed files, and targeted local reproduction to distinguish branch-caused hangs, deadlocks, infinite waits, resource exhaustion, spec-order issues, flaky jobs, runner problems, and infrastructure issues.

For actionable branch-caused hangs, invoke `fix-pr-until-green`, push the repair through that workflow, capture the new head SHA, and restart monitoring.

If cancellation, logs, rerun, or repair is unavailable, return `blocked` and name the exact missing capability or decision.

## Failure Classification

Inspect logs promptly when repair is authorized. Report external services, secrets, quota, runner, and unrelated flaky failures as `not_ready` when monitoring can continue. Use `blocked` only when the agent cannot keep watching or needs user input before observation remains useful.
