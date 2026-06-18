# Monitor Contract

## Interruptions

If the user interrupts active monitoring, or follows a monitoring result with a change request, stop the monitoring loop and handle the new request as current. Before resuming after that change, ask one concise question confirming whether monitoring should continue.

## Required Gates

- Re-check PR mergeability before every extended CI wait or bounded polling cycle.
- If GitHub reports conflicts, interrupt CI polling, repair conflicts, and restart from the new head.
- Refresh issue comments, review submissions, unresolved review threads, requested changes, requested reviewers, and pending Codex feedback before every extended CI wait or bounded polling cycle.
- Treat review feedback as a first-class polling signal. Do not run repeated CI-only polls while feedback has not been refreshed for the current head.
- For PRs, run `monitor-codex` for the current head before `gh pr checks --watch`, any long CI watch, or any CI-only polling.
- After Codex is clean for the current code-bearing head, run `test-coded-tests` locally and require `status: "passed"` before triggering remote Actions.
- Do not satisfy a PR `monitor`, `watch`, or `commit and monitor` request with CI monitoring alone.
- Use normal Codex mode by default. Use ready-transition mode only when the caller just marked a draft PR ready for review.

## Delegation Context

Pass delegated skills:

- target PR number or URL, or pushed branch name
- latest known head SHA and base branch
- watch-set position when monitoring multiple PRs
- mode: `drive_to_merge_ready` or `observe_only`
- repair authorization for merge conflicts and Codex concerns
- repair and response-comment authorization for review feedback
- final empty `Trigger #CI` commit authorization from drive-to-merge-ready mode, after Codex and local test gates
- CI authorization separately for immediate triggers, missing-marker force repairs, code-bearing CI repair commits, reruns, and cancellations, granted only by prompt language such as trigger actions, run GitHub Actions, commit with actions, get checks green, or include a CI marker
- local-first/Codex-before-CI gate by default for CI-authorized monitor flows: Codex clean plus `test-coded-tests` passing before Actions
- Codex mode: `normal` or `ready_transition`
- caller context, such as standalone monitor, post-push handoff, or explicit until-green-and-clean request

Require delegated skills to return target, monitored head SHA, state, latest head SHA if changed, evidence URLs/ids, feedback IDs or timestamps inspected, repairs attempted, skipped, or blocked, comments posted, and blockers.

If a delegated skill returns a new head SHA, discard stale conclusions and restart from merge-conflict monitoring.

## Watch Set And Local State

Resolve the watch set before the first poll:

- If the user names PRs, monitor those PRs.
- If the current branch has an open PR and the user does not specify otherwise, monitor that PR.
- If the user asks to monitor "the PRs", enumerate open PRs for the current repo that are authored by, assigned to, or requested from the user, then state the watch set.

Before editing, inspect `git status --short`, fetch enough remote state to avoid stale conclusions, and avoid overwriting unrelated local changes. Prefer a separate worktree per PR when monitoring multiple PRs or when the current checkout is not already on the PR branch. Finish and push one coherent PR update before switching PRs when practical.

## Repair Authorization

Standalone PR `monitor` and `watch this PR` requests authorize merge-conflict repair, local test repair, Codex concern repair, and the final empty `Trigger #CI` commit after Codex is clean and `test-coded-tests` passes, unless the user explicitly asks to observe only, report only, not edit, not push, or not repair. They do not authorize immediate CI-triggering commits, missing-marker `#CI` repair outside the local-first trigger path, Actions reruns/cancellations, or `#CI` on code-bearing repair commits before local-first gates by default.

Standalone PR `monitor` and `watch this PR` requests authorize routine response comments for review feedback that Codex fixed or intentionally did not act on during an authorized repair flow, unless the user explicitly asks for no comments, observe-only, report-only, or no-repair behavior. They do not authorize high-impact, product-sensitive, or likely contentious response comments without user confirmation.

Immediate post-push handoffs such as `commit and monitor` authorize Codex concern repair and the final empty `Trigger #CI` commit after the local-first gates unless the user explicitly asked to observe only. They authorize immediate CI triggering, missing-marker repair outside the local-first trigger path, reruns, or `#CI` on code-bearing repair commits before local-first gates only when the user also asks to trigger actions, run Actions, run GitHub Actions, commit with actions, include a CI marker, get checks green, monitor until green, or similar CI-specific language.

Explicit until-green-and-clean requests authorize both CI and Codex repair. Targeted reruns are allowed only when failure classification says the run is flaky, infra-related, or otherwise not branch-caused.

## Polling Loop And Cadence

Treat monitoring as a loop: inspect, classify, act, verify, push when needed, then poll again. Do not stop immediately after pushing a commit, rerunning CI, resolving feedback, or seeing mergeability as `unknown`.

Each poll for each watched PR checks, in this order:

1. PR state: open, closed, merged, base branch, head branch, latest commit, and whether the head changed since the last full refresh.
2. Feedback: issue comments, review submissions, unresolved review threads, requested changes, requested reviewers, and pending Codex feedback since the last seen ID or timestamp.
3. Mergeability: mergeable, behind, unknown, conflicted, dirty, or stale.
4. Checks: pending, running, passing, failing, cancelled, skipped, external, or inaccessible.

Use a short initial poll, then poll every few minutes unless the user specifies a cadence. While CI is pending or running, run lightweight feedback refreshes at least as often as check-status refreshes. A practical default is feedback every 60-120 seconds and full CI status every few minutes unless a check changes state. Do not let a sleep command hide useful work; before sleeping, either refresh feedback or state that it was just checked.

## Mergeability Handling

Classify mergeability before entering or continuing CI waits:

- Mergeable: record status and continue through the gates.
- Unknown: refetch or wait for GitHub recalculation before treating it as blocked.
- Behind base without conflicts: update the branch only when required by repo policy, blocked checks, or user intent. Use the repo's normal branch-update style.
- Conflicted: resolve when the conflict is mechanical and the intended behavior remains clear. Fetch the PR head and base, work in the PR's worktree or create one, merge or rebase according to repo convention, resolve conflicts, run the most relevant tests, commit, push, and return to polling.
- Risky or ambiguous conflict: pause for the user when resolution would require a product decision, data migration judgment, substantial rewrite, or a force-push that is not clearly acceptable for the PR branch.

## Feedback Handling

Classify non-Codex feedback before deciding whether to edit:

- Must act: correctness, security, data integrity, user-visible regressions, broken tests, maintainability concerns with clear benefit, or explicit requested changes that match the PR's scope.
- Consider critically: UX/product suggestions, architecture requests, naming, style, extra abstractions, and scope expansion.
- Usually do not act without discussion: broad rewrites, changes that undermine the chosen approach, risky migrations, feedback that adds complexity without clear value, or ambiguous asks.

Make clear local fixes directly when repair is authorized. If feedback calls the approach into question, pause and discuss the decision with the user before implementing. If feedback is not worth acting on, add a response comment on the PR or review thread instead of silently skipping it when comments are authorized. Keep the explanation specific: acknowledge the concern, state why the suggestion is not being followed, and mention any alternative already covered by the current approach. Confirm with the user before posting a high-impact, product-sensitive, or contentious response.

After any feedback fix, run targeted tests or checks that match the change, commit according to repo conventions without `#CI` unless separately authorized, push, and restart from mergeability because the code-bearing head changed.

## Local-First CI Gate

For drive-to-merge-ready monitor workflows, use local-first mode by default. Do not add or repair `#CI` triggers, rerun Actions, or delegate code-bearing CI repair until `monitor-codex` has a clean outcome for the current code-bearing head and `test-coded-tests` has passed for that same tree.

Run `test-coded-tests` from the repository root and parse the JSON. Treat `status: "passed"` as the local test gate. Treat `status: "failed"`, `error`, or `timeout` as `not_ready`; repair branch-caused failures when repair is authorized, using the JSON `failures[].file` list as the starting point. Treat `status: "not_found"` as an explicit local-verification gap and continue only if repo context makes the absence of coded tests expected.

After that gate, trigger CI by creating one empty commit with the exact subject `Trigger #CI` and pushing it to the exact PR head. If the pushed tip already contains `#CI` or has passing required CI for the tested tree, do not create a redundant trigger commit. In observe-only mode, report the missing final trigger instead of creating it.

If later CI investigation requires code changes, commit and push that repair without `#CI`, run `test-coded-tests`, restart mergeability and Codex review, and create a fresh empty `Trigger #CI` commit only after the new code-bearing head is Codex clean and locally passing.

If the empty `Trigger #CI` commit changes the head SHA without changing the tree, keep the prior Codex-clean code-bearing SHA in the monitoring evidence and do not request a fresh Codex pass solely for the empty trigger commit unless the caller requires current-head review evidence.

## Local Test Failures

When `test-coded-tests` fails before the final empty `Trigger #CI` commit:

- Do not trigger Actions.
- Use the JSON failure files and messages to repair only branch-caused failures when repair is authorized.
- Commit and push local test repairs without `#CI`.
- Restart from mergeability and Codex review because the code-bearing head changed.
- If the same local failure repeats after two repair rounds without meaningful progress, return `blocked` with the failing files and messages.

## CI Not Ready

A failed required CI check is not a completed monitoring state. When CI repair cannot proceed because the failure is external, unrelated, unsafe, lacks credentials, or needs product judgment, keep the PR as `not_ready` while bounded polling can continue.

Classify CI failures before editing:

- Tests, lint, type checks, or app behavior: inspect logs, reproduce locally when practical, and repair branch-caused failures when authorized.
- Flaky or infrastructure failure: rerun once only when appropriate and authorized, or wait and report why no code change is warranted.
- External or inaccessible check: report the check name and details URL; do not guess.

Every polling cycle must have a finite wait and explicit recheck. After roughly 30 minutes or six unchanged cycles, send a `not_ready` checkpoint naming the exact check, review state, rerun, replacement run, or head change being awaited.

## Subagent Use

Use subagents when available and allowed for bounded read-only diagnosis, especially noisy CI logs or large review-comment sets. Keep the primary agent responsible for the monitoring loop, final judgment, code edits, commits, pushes, GitHub comments, and user communication.

- Prefer the current/inherited thinking level. Do not override model or reasoning level unless the user explicitly asks.
- Ask for evidence, not a patch: first meaningful failure, likely root cause, flaky/infrastructure signal, reproduction command, affected files, and exact log excerpts or check URLs.
- Do not ask multiple agents to inspect the same failure unless the diagnosis is still uncertain after the first pass.
- Verify the conclusion against the logs and code before editing.
- If CI fails because of a flaky test unrelated to the watched PR and a clear, low-risk improvement exists, keep that fix out of the watched PR. Use a separate worktree and branch when a separate fix PR is warranted.

Useful CI triage prompt shape:

```text
Inspect PR <number> at commit <sha>, failing check "<check name>". Use the available GitHub logs or provided log excerpts. Identify the first meaningful failure, likely root cause, whether it looks flaky/infrastructure-related, the most targeted local reproduction command, and the files likely involved. Do not edit files, commit, push, or comment on GitHub. Return concise findings with evidence.
```

## Status Reporting

Each loop should leave a compact state snapshot:

- Watched PRs and latest commit SHAs.
- Mergeability status: mergeable, conflicted, behind base, unknown, or blocked by an ambiguous conflict decision.
- CI status: passing, pending, failing, flaky, or inaccessible.
- Feedback status: no new feedback, fixes applied, decisions needed, pending Codex feedback, or intentionally skipped feedback.
- Last feedback refresh time, or "checked this loop" when CI is still pending or running.
- Local actions taken: files changed, conflicts resolved, tests run, commits pushed, comments posted, or review triggered.
- Next poll timing, stable-state reason, `not_ready` checkpoint, or blocker reason.

## Stable And Blocked

Stable means a fresh full poll confirms the PR is open, mergeable, required CI is passing or explicitly not required, optional checks are explicitly classified, Codex is clean for the latest code-bearing tree, `test-coded-tests` passed for that tree, the final empty `Trigger #CI` commit was created only after those gates when Actions were authorized, no current-head Codex concerns remain unresolved, no actionable review feedback remains unhandled, no requested response comments remain unposted, and no unpushed repair commits remain. A merged or closed PR is also stable.

Blocked means CI, feedback, mergeability, or Codex cannot progress without user input, external service changes, missing permissions, product judgment, an ambiguous conflict decision, or unresolved invalid Codex concerns that did not receive a clean follow-up outcome.
