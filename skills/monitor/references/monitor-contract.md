# Monitor Contract

## Interruptions

If the user interrupts active monitoring, or follows a monitoring result with a change request, stop the monitoring loop and handle the new request as current. Before resuming after that change, ask one concise question confirming whether monitoring should continue.

## Required Gates

- Re-check PR mergeability before every extended CI wait or bounded polling cycle.
- If GitHub reports conflicts, interrupt CI polling, repair conflicts, and restart from the new head.
- Refresh issue comments, review submissions, unresolved review threads, requested changes, requested reviewers, and pending Codex feedback before every extended CI wait or bounded polling cycle.
- Treat review feedback as a first-class polling signal. Do not run repeated CI-only polls while feedback has not been refreshed for the current head.
- For PRs, run `monitor-codex` for the current head before `gh pr checks --watch`, any long CI watch, or any CI-only polling.
- After Codex is clean for the current code-bearing head and actionable feedback is handled, use GitHub Actions as the spec runner. Do not require broad local coded-test runs before triggering remote Actions.
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
- empty `#CI` trigger commit authorization from drive-to-merge-ready mode, after Codex and feedback gates
- CI authorization separately for immediate triggers, missing-marker force repairs, reruns, and cancellations, granted only by prompt language such as trigger actions, run GitHub Actions, commit with actions, get checks green, or include a CI marker
- code-bearing CI repair authorization from standalone `monitor` and `watch this PR` requests when the failure is clearly branch-caused and the repair is scoped to making the watched PR merge-ready
- gated-trigger/Codex-before-CI mode by default for CI-authorized monitor flows: Codex clean and actionable feedback handled before Actions
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

Standalone PR `monitor` and `watch this PR` requests authorize merge-conflict repair, targeted local verification for repairs when useful, Codex concern repair, clear branch-caused CI failure repair after the gated CI trigger, and an empty `#CI` trigger commit after Codex is clean and actionable feedback is handled, unless the user explicitly asks to observe only, report only, not edit, not push, or not repair. They do not authorize immediate CI-triggering commits before gates, missing-marker `#CI` repair outside the gated trigger path, Actions reruns/cancellations, or `#CI` on code-bearing repair commits by default.

Standalone PR `monitor` and `watch this PR` requests authorize routine response comments for review feedback that Codex fixed or intentionally did not act on during an authorized repair flow, unless the user explicitly asks for no comments, observe-only, report-only, or no-repair behavior. They do not authorize high-impact, product-sensitive, or likely contentious response comments without user confirmation.

Immediate post-push handoffs such as `commit and monitor` authorize Codex concern repair, clear branch-caused CI failure repair after the gated CI trigger, and an empty `#CI` trigger commit after the Codex/feedback gates unless the user explicitly asked to observe only. They authorize immediate CI triggering before gates, missing-marker repair outside the gated trigger path, reruns, or `#CI` on code-bearing repair commits only when the user also asks to trigger actions, run Actions, run GitHub Actions, commit with actions, include a CI marker, get checks green, monitor until green, or similar CI-specific language.

Explicit until-green-and-clean requests authorize both CI and Codex repair. Targeted reruns are allowed only when failure classification says the run is flaky, infra-related, or otherwise not branch-caused.

## Polling Loop And Cadence

Treat monitoring as a loop: inspect, classify, act, verify, push when needed, then poll again. Do not stop immediately after pushing a commit, rerunning CI, resolving feedback, seeing mergeability as `unknown`, or finding failed required checks on an otherwise open PR.

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
- Conflicted: resolve when the conflict is mechanical and the intended behavior remains clear. Fetch the PR head and base, work in the PR's worktree or create one, merge or rebase according to repo convention, resolve conflicts, run only quick targeted verification when directly relevant, commit, push, and return to polling.
- Risky or ambiguous conflict: pause for the user when resolution would require a product decision, data migration judgment, substantial rewrite, or a force-push that is not clearly acceptable for the PR branch.

## Feedback Handling

Classify non-Codex feedback before deciding whether to edit:

- Must act: correctness, security, data integrity, user-visible regressions, broken tests, maintainability concerns with clear benefit, or explicit requested changes that match the PR's scope.
- Consider critically: UX/product suggestions, architecture requests, naming, style, extra abstractions, and scope expansion.
- Usually do not act without discussion: broad rewrites, changes that undermine the chosen approach, risky migrations, feedback that adds complexity without clear value, or ambiguous asks.

Make clear local fixes directly when repair is authorized. If feedback calls the approach into question, pause and discuss the decision with the user before implementing. If feedback is not worth acting on, add a response comment on the PR or review thread instead of silently skipping it when comments are authorized. Keep the explanation specific: acknowledge the concern, state why the suggestion is not being followed, and mention any alternative already covered by the current approach. Confirm with the user before posting a high-impact, product-sensitive, or contentious response.

After any feedback fix, run targeted tests or checks that match the change, commit according to repo conventions without `#CI` unless separately authorized, push, and restart from mergeability because the code-bearing head changed.

## Gated CI Trigger

For drive-to-merge-ready monitor workflows, use gated-trigger mode by default. Do not add or repair `#CI` triggers, rerun Actions, or delegate code-bearing CI repair until actionable feedback is handled and `monitor-codex` has a clean outcome for the current code-bearing head.

Do not run broad local coded-test suites as a required monitor gate. Use targeted local verification only when the monitor itself made a code repair and a fast command directly matches the changed area. GitHub Actions is the source of truth for the full spec run.

After that gate, trigger CI with an empty `#CI` commit on the exact PR head branch so the run appears in the PR checks surface:

```sh
git commit --allow-empty -m "Trigger CI #CI"
git push
```

Resolve the PR head branch before committing and push only to that exact remote/ref. Before creating the empty trigger commit, confirm there are no uncommitted or staged changes that would be accidentally included; if unrelated local changes exist, use an empty commit without staging them. After pushing, capture the push-triggered run with `gh run list --workflow CI --branch HEAD_BRANCH --event push --limit 1 --json databaseId,headSha,status,conclusion,url,createdAt` and verify that the run is for the pushed trigger SHA. If required CI is already passing in the PR checks surface for the same code-bearing tree, do not create a redundant trigger commit. In observe-only mode, report the missing final trigger instead of committing or pushing.

If later CI investigation requires code changes, commit and push that repair without `#CI`, run only quick targeted verification when it is directly relevant, restart mergeability and Codex review, and create a fresh empty `#CI` trigger commit only after the new code-bearing head is Codex clean.

When the latest pushed head is an empty `#CI` trigger commit created by the monitor, keep the prior Codex-clean code-bearing SHA in the monitoring evidence and do not request a fresh Codex pass solely for that empty trigger commit unless the caller requires current-head review evidence.

## Targeted Local Verification

When monitor makes a code repair:

- Run the nearest fast check only if it directly exercises the changed area and is practical in the current environment.
- Prefer linters, focused unit/spec paths, type checks, or syntax checks over broad suite discovery.
- Skip slow or broad local specs and let GitHub Actions run them.
- Commit and push targeted-verification repairs without `#CI`.
- Restart from mergeability and Codex review because the code-bearing head changed.
- If the same targeted local failure repeats after two repair rounds without meaningful progress, return `blocked` with the failing command and messages.

## CI Not Ready

A failed required CI check is not a completed monitoring state. `not_ready` is a checkpoint for the current poll, not a final answer for a still-open PR. When CI repair cannot proceed because the failure is external, unrelated, unsafe, lacks credentials, or needs product judgment, keep the PR as `not_ready` while bounded polling continues.

Do not end monitoring just because a failed check appears unrelated to the watched branch, even if the failure reproduces locally outside the changed files. Classify it, report the evidence in a `not_ready` checkpoint, and keep polling for a rerun, replacement run, head change, new feedback, mergeability change, or user interruption. Only return `blocked` when observation itself cannot continue or a required next action needs user input or unavailable permissions.

Classify CI failures before editing:

- Tests, lint, type checks, or app behavior: inspect logs, reproduce locally when practical, and repair branch-caused failures when authorized. Standalone drive-to-merge-ready monitoring authorizes scoped branch-caused CI repairs after the gated trigger has run.
- Flaky or infrastructure failure: rerun once only when appropriate and authorized, or wait and report why no code change is warranted.
- External or inaccessible check: report the check name and details URL; do not guess.

Every polling cycle must have a finite wait and explicit recheck. After roughly 30 minutes or six unchanged cycles, send a `not_ready` checkpoint naming the exact check, review state, rerun, replacement run, or head change being awaited, then continue monitoring unless the user interrupts, the PR reaches stable state, or a true blocker is reached.

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

Stable means a fresh full poll confirms the PR is open, mergeable, required CI is passing or explicitly not required, optional checks are explicitly classified, Codex is clean for the latest code-bearing tree, an empty `#CI` trigger commit was pushed only after the Codex/feedback gates when Actions were authorized unless CI was already passing in the PR checks surface for the same tree, no current-head Codex concerns remain unresolved, no actionable review feedback remains unhandled, no requested response comments remain unposted, and no unpushed repair commits remain. A merged or closed PR is also stable.

Blocked means CI, feedback, mergeability, or Codex cannot progress without user input, external service changes, missing permissions, product judgment, an ambiguous conflict decision, or unresolved invalid Codex concerns that did not receive a clean follow-up outcome. Red required CI is not blocked by itself when the failure has not been classified, when a scoped branch-caused repair is authorized, or when the failure is classified as unrelated and monitoring can still observe reruns, replacement runs, head changes, feedback, or mergeability changes.
