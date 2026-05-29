# Monitor Contract

## Interruptions

If the user interrupts active monitoring, or follows a monitoring result with a change request, stop the monitoring loop and handle the new request as current. Before resuming after that change, ask one concise question confirming whether monitoring should continue.

## Required Gates

- Re-check PR mergeability before every extended CI wait or bounded polling cycle.
- If GitHub reports conflicts, interrupt CI polling, repair conflicts, and restart from the new head.
- For PRs, run `monitor-codex` for the current head before `gh pr checks --watch`, any long CI watch, or any CI-only polling.
- Do not satisfy a PR `monitor`, `watch`, or `commit and monitor` request with CI monitoring alone.
- Use normal Codex mode by default. Use ready-transition mode only when the caller just marked a draft PR ready for review.

## Delegation Context

Pass delegated skills:

- target PR number or URL, or pushed branch name
- latest known head SHA and base branch
- mode: `drive_to_merge_ready` or `observe_only`
- repair authorization for merge conflicts, CI, Codex concerns, reruns, and cancellations
- Codex mode: `normal` or `ready_transition`
- caller context, such as standalone monitor, post-push handoff, or explicit until-green-and-clean request

Require delegated skills to return target, monitored head SHA, state, latest head SHA if changed, evidence URLs/ids, repairs attempted, skipped, or blocked, and blockers.

If a delegated skill returns a new head SHA, discard stale conclusions and restart from merge-conflict monitoring.

## Repair Authorization

Standalone PR `monitor` and `watch this PR` requests authorize CI and Codex repair unless the user explicitly asks to observe only, report only, not edit, not push, or not repair.

Immediate post-push handoffs such as `commit and monitor` authorize CI and Codex repair unless the user explicitly asked to observe only.

Explicit until-green-and-clean requests authorize both CI and Codex repair. Targeted reruns are allowed only when failure classification says the run is flaky, infra-related, or otherwise not branch-caused.

## CI Not Ready

A failed required CI check is not a completed monitoring state. When CI repair cannot proceed because the failure is external, unrelated, unsafe, lacks credentials, or needs product judgment, keep the PR as `not_ready` while bounded polling can continue.

Every polling cycle must have a finite wait and explicit recheck. After roughly 30 minutes or six unchanged cycles, send a `not_ready` checkpoint naming the exact check, review state, rerun, replacement run, or head change being awaited.

## Stable And Blocked

Stable means the PR is mergeable, required CI is passing, optional checks are explicitly classified, Codex is clean for the latest head, no current-head Codex concerns remain unresolved, and no unpushed repair commits remain.

Blocked means CI or Codex cannot progress without user input, external service changes, missing permissions, product judgment, or unresolved invalid Codex concerns that did not receive a clean follow-up outcome.
