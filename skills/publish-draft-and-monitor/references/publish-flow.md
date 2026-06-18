# Publish Flow Details

Use this reference after `SKILL.md` routes to `publish-draft-and-monitor`.

## Defaults

- Default `source_branch` to the current branch.
- Default `base_branch` to `main` unless the user names another base or an existing truthful PR base should be preserved.
- Publish as a draft first.
- Treat the request as approval to make, commit, and push narrow in-scope fixes for local review findings and validated Codex concerns.
- Do not trigger GitHub Actions before Codex is clean for the current code-bearing head. Let `monitor` run `test-coded-tests` first; add a CI marker only after that Codex/local gate, or earlier only when the prompt explicitly asks for immediate CI.
- Keep repair commits intentional and small. Use `write-commit-name` for each repair batch and omit `#CI`; the only normal `#CI` commit is the final marker-only trigger owned by `monitor`.
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
3. Clean the branch with `review-branch-until-clean` against the PR base. Push each validated repair commit without a CI marker unless the prompt explicitly asked for immediate Actions. Refresh the captured PR head SHA after each push. When local review is clean, immediately continue to ready-for-review; do not start extended CI-only polling while the PR is still draft.
4. Mark the PR ready with `draft-pr-for-branch` without CI-trigger authorization. When possible, capture the PR-description `eyes` count immediately before the transition. Verify the PR is no longer draft, then run `monitor-codex` in ready-transition mode. That mode waits for automatic PR-description `eyes` evidence and must not post the initial `@codex review` comment.
5. Hand off to `monitor` in local-first mode. Monitor must get Codex clean for the current code-bearing head, run `test-coded-tests`, repair local failures without `#CI` when authorized, then create one final marker-only trigger such as `Trigger CI #CI` in drive-to-merge-ready mode.
6. If remote CI later fails, `monitor` continues the loop: repair code without `#CI`, run `test-coded-tests`, restart Codex review, and create a new final marker-only CI trigger only after the new code-bearing head is clean and locally passing.

## Delegation Contract

- `draft-pr-for-branch` owns draft PR creation, refresh, metadata checks, and the mark-ready transition. It must not trigger CI unless this workflow explicitly passes CI-trigger authorization after the Codex gate.
- `review-branch-until-clean` owns local Codex-style review and repair loops.
- `monitor` owns coordinated post-ready CI/Codex monitoring, `test-coded-tests`, final `#CI` marker commits, and restart-on-new-head behavior.
- `monitor-codex` owns ready-transition `eyes` handling, exact `@codex review` request comments for later pushed heads, clean Codex outcome evidence, thread-aware concern reads, and delegation to `address-codex-concerns`.
- `monitor-ci` owns GitHub Actions polling and failure classification. In local-first mode, code-bearing CI repairs must return through `test-coded-tests` and Codex review before any new final `#CI` trigger.

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
- `test-coded-tests` passed on the code-bearing tree before CI was triggered.
- CI was triggered by a final marker-only `#CI` commit only after Codex was clean for that code-bearing tree, unless the user explicitly asked for immediate Actions.
- The latest PR head SHA has passing required checks or no failing checks.
- A Codex review request was handled for the latest monitored head after the last pushed commit or ready transition by observing automatic ready-review `eyes`, reusing an exact existing `@codex review` comment with `eyes`, or posting one manual `@codex review` request for a later pushed head.
- Codex produced a clean outcome for the latest monitored head after that request; review-request `eyes` alone is not enough.
- A fresh thread-aware scan finds no unresolved Codex concerns.
- Valid fixed Codex review threads were reacted to and resolved after the fix commit was pushed.
- Local branch state is clean, or remaining local changes are explicitly out of scope and unpushed.
