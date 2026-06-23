# Publish Flow Details

Use this reference after `SKILL.md` routes to `publish-draft-and-monitor`.

## Defaults

- Default `source_branch` to the current branch.
- Default `base_branch` to `main` unless the user names another base or an existing truthful PR base should be preserved.
- Publish as a draft first.
- Treat the request as approval to make, commit, and push narrow in-scope fixes for local review findings and validated Codex concerns.
- Do not trigger GitHub Actions before Codex is clean for the current code-bearing head and actionable feedback is handled. Let GitHub Actions run the full specs through the gated empty `#CI` trigger commit.
- Keep repair commits intentional and small. Use `write-commit-name` for each repair batch and omit `#CI` unless the prompt explicitly asks for a CI marker; the normal gated CI trigger is owned by `monitor` through a marker-only `Trigger CI #CI` commit.
- Do not auto-merge.

## Preconditions

- Require a coherent, reviewable branch scope.
- Require authenticated `git push` and `gh` access before monitoring.
- If remote publication is unavailable, use `enable-remote-publication` and resume only after auth is verified.
- If the branch is too large, mixed, or stacked incorrectly, stop and use branch splitting or restacking first.
- Do not fold unrelated dirty worktree changes into a repair batch.

## Detailed Workflow

1. Inspect local state: `git status -sb`, branch name, base, diff, PR metadata, and targeted verification.
2. Publish or refresh the draft PR with `draft-pr-for-branch` without CI-trigger authorization. Preserve an existing open PR when it matches the branch and truthful base. Capture repo, PR number, URL, head SHA, base, and draft state. In the first update after the PR exists, include a Markdown PR link.
3. Clean the branch with `review-branch-until-clean` against the PR base. Push each validated repair commit without a CI marker unless the prompt explicitly asked for one. Refresh the captured PR head SHA after each push. When local review is clean, immediately continue to ready-for-review; do not start extended CI-only polling while the PR is still draft.
4. Mark the PR ready with `draft-pr-for-branch` without CI-trigger authorization. When possible, capture the PR-description `eyes` count immediately before the transition. Verify the PR is no longer draft, then run `monitor-codex` in ready-transition mode. That mode waits for automatic PR-description `eyes` evidence and must not post the initial `@codex review` comment.
5. Hand off to `monitor` in gated-trigger mode. Monitor must get Codex clean for the current code-bearing head, skip broad local specs, then create and push an empty `Trigger CI #CI` commit for the exact PR head branch in drive-to-merge-ready mode. After the push, monitor the push-triggered run for that head.
6. If remote CI later fails, `monitor` continues the loop: repair branch-caused code without `#CI`, run only quick targeted local verification when directly relevant, restart Codex review, and create a new empty `#CI` trigger commit only after the new code-bearing head is clean. If the failure is unrelated, external, or otherwise not actionable from the branch, keep monitoring it as `not_ready` instead of stopping.

## Delegation Contract

- `draft-pr-for-branch` owns draft PR creation, refresh, metadata checks, and the mark-ready transition. It must not trigger CI unless this workflow explicitly passes CI-trigger authorization after the Codex gate.
- `review-branch-until-clean` owns local Codex-style review and repair loops.
- `monitor` owns coordinated post-ready CI/Codex monitoring, gated empty `#CI` trigger commits, targeted local verification decisions, and restart-on-new-head behavior.
- `monitor-codex` owns ready-transition `eyes` handling, exact `@codex review` request comments for later pushed heads, clean Codex outcome evidence, thread-aware concern reads, and delegation to `address-codex-concerns`.
- `monitor-ci` owns GitHub Actions polling and failure classification. In gated-trigger mode, code-bearing CI repairs must return through targeted local verification when useful and Codex review before any new empty `#CI` trigger commit.

Do not duplicate CI or Codex repair logic in this skill; delegate to the smaller skills.

## Stop Conditions

Stop and report a blocker when:

- GitHub auth, push access, or PR mutation access is missing.
- A Codex concern is plausible but needs product intent or user judgment.
- Codex produced a current-head concern that was classified invalid, but a fresh follow-up pass did not produce a clean outcome.
- Automatic ready-review `eyes` evidence is not observed after bounded waits and merge-readiness depends on a Codex review that never starts.
- Two consecutive repair rounds fail to make meaningful progress on the same CI failure or concern.
- The PR becomes unmergeable for a reason outside this branch.

Do not stop only because required CI is red. A non-actionable or unrelated CI failure is a `not_ready` checkpoint owned by `monitor`; keep polling for reruns, replacement runs, head changes, feedback, mergeability changes, or user interruption.

## Success Criteria

Report success only when:

- The PR exists and is ready for review.
- GitHub Actions ran the required specs/checks for the current code-bearing tree.
- CI was triggered by an empty `#CI` commit only after Codex was clean and actionable feedback was handled for that code-bearing tree, unless the user explicitly asked for earlier Actions.
- The latest PR head SHA has passing required checks or no failing checks.
- A Codex review request was handled for the latest monitored head after the last pushed commit or ready transition by observing automatic ready-review `eyes`, reusing an exact existing `@codex review` comment with `eyes`, or posting one manual `@codex review` request for a later pushed head.
- Codex produced a clean outcome for the latest monitored head after that request; review-request `eyes` alone is not enough.
- A fresh thread-aware scan finds no unresolved Codex concerns.
- Valid fixed Codex review threads were reacted to and resolved after the fix commit was pushed.
- Local branch state is clean, or remaining local changes are explicitly out of scope and unpushed.
