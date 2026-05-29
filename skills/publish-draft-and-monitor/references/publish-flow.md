# Publish Flow Details

Use this reference after `SKILL.md` routes to `publish-draft-and-monitor`.

## Defaults

- Default `source_branch` to the current branch.
- Default `base_branch` to `main` unless the user names another base or an existing truthful PR base should be preserved.
- Publish as a draft first.
- Treat the request as approval to make, commit, and push narrow in-scope fixes for local review findings, GitHub Actions failures, and validated Codex concerns.
- Keep repair commits intentional and small. Use `write-commit-name` for each repair batch so pushed commits carry a CI marker by default.
- Do not auto-merge.

## Preconditions

- Require a coherent, reviewable branch scope.
- Require authenticated `git push` and `gh` access before monitoring.
- If remote publication is unavailable, use `enable-remote-publication` and resume only after auth is verified.
- If the branch is too large, mixed, or stacked incorrectly, stop and use branch splitting or restacking first.
- Do not fold unrelated dirty worktree changes into a repair batch.

## Detailed Workflow

1. Inspect local state: `git status -sb`, branch name, base, diff, PR metadata, and targeted verification.
2. Publish or refresh the draft PR with `draft-pr-for-branch`. Preserve an existing open PR when it matches the branch and truthful base. Capture repo, PR number, URL, head SHA, base, and draft state. In the first update after the PR exists, include a Markdown PR link.
3. Clean the branch with `review-branch-until-clean` against the PR base. Push each validated repair commit and refresh the captured PR head SHA after each push. When local review is clean, immediately continue to ready-for-review; do not start extended CI-only polling while the PR is still draft.
4. Mark the PR ready with `draft-pr-for-branch`. When possible, capture the PR-description `eyes` count immediately before the transition. Verify the PR is no longer draft, then run `monitor-codex` in ready-transition mode. That mode waits for automatic PR-description `eyes` evidence and must not post the initial `@codex review` comment.
5. Monitor with `monitor` and pass repair authorization through. If CI, Codex, or merge-conflict repair pushes a new commit, restart monitoring from the new head SHA. `monitor` must check PR mergeability before extended CI polling and between bounded CI waits; if the PR becomes conflicted, repair the conflict before waiting on pending or long-running test shards. `monitor` must run `monitor-codex` for that head before extended CI-only polling.

## Delegation Contract

- `draft-pr-for-branch` owns draft PR creation, refresh, metadata checks, CI-marker checks, and the mark-ready transition.
- `review-branch-until-clean` owns local Codex-style review and repair loops.
- `monitor` owns coordinated post-ready CI/Codex monitoring and restart-on-new-head behavior.
- `monitor-codex` owns ready-transition `eyes` handling, exact `@codex review` request comments for later pushed heads, clean Codex outcome evidence, thread-aware concern reads, and delegation to `address-codex-concerns`.
- `monitor-ci` owns GitHub Actions polling, failure classification, and delegation to `fix-pr-until-green`.

Do not duplicate CI or Codex repair logic in this skill; delegate to the smaller skills.

## Stop Conditions

Stop and report a blocker when:

- CI is failing for a reason not actionable from this branch.
- GitHub auth, push access, or PR mutation access is missing.
- A Codex concern is plausible but needs product intent or user judgment.
- Codex produced a current-head concern that was classified invalid, but a fresh follow-up pass did not produce a clean outcome.
- Automatic ready-review `eyes` evidence is not observed after bounded waits and merge-readiness depends on a Codex review that never starts.
- Two consecutive repair rounds fail to make meaningful progress on the same CI failure or concern.
- The PR becomes unmergeable for a reason outside this branch.

## Success Criteria

Report success only when:

- The PR exists and is ready for review.
- The latest PR head SHA has passing required checks or no failing checks.
- A Codex review request was handled for the latest monitored head after the last pushed commit or ready transition by observing automatic ready-review `eyes`, reusing an exact existing `@codex review` comment with `eyes`, or posting one manual `@codex review` request for a later pushed head.
- Codex produced a clean outcome for the latest monitored head after that request; review-request `eyes` alone is not enough.
- A fresh thread-aware scan finds no unresolved Codex concerns.
- Valid fixed Codex review threads were reacted to and resolved after the fix commit was pushed.
- Local branch state is clean, or remaining local changes are explicitly out of scope and unpushed.
