# CI Repair Loop

Use this reference after the skill has routed to an existing PR.

## Defaults

- Default `pr` to the current branch's PR when the user does not provide a PR number or URL.
- Preserve the existing base branch, draft state, and review state.
- Treat the user's request as approval for narrow, in-scope code changes and follow-up commits directly justified by failing CI only when the prompt explicitly requested a green CI/Actions outcome.
- Prefer `gh` for check inspection and run logs. Use GitHub connector context when helpful, but do not depend on connector-only Actions features.

## Preconditions

- Require an existing PR or one that can be resolved from the current branch.
- Require a working `git push` path and authenticated `gh` access before entering the CI loop.
- Use targeted local verification after each repair round only when it is quick, available, and directly exercises the repair.
- If the remaining failing check is external, infrastructure-owned, secrets-related, flaky but unrelated to the branch, or otherwise not actionable from the PR diff, stop and document the blocker.

## Detailed Workflow

1. Resolve the PR.
   - Prefer the user-provided PR number or URL.
   - Otherwise resolve the current branch PR with `gh pr view --json number,url,headRefName`.
   - Capture the PR number, URL, and current head SHA.
2. Inspect the current check state.
   - Run `gh pr checks <pr>`.
   - If checks are pending, wait and poll again with a bounded loop.
   - If Actions have not run for the current head, use `repair-pr-ci-trigger` to create and push an empty `Trigger CI #CI` commit on the exact PR head branch.
   - Capture the push-triggered run with `gh run list --workflow CI --branch HEAD_BRANCH --event push --limit 1`.
3. Exit immediately when actionable checks are green.
4. Inspect failing checks before changing code.
   - For GitHub Actions runs, inspect the failing run with `gh run view <run_id> --log-failed`.
   - Fall back to `gh run view <run_id> --log` when the failed-only log is insufficient.
   - Use `github:gh-fix-ci` when connector context or bundled inspection scripts help, but extract the concrete failing command, file, stack trace, or assertion before editing code.
5. Classify each failure.
   - Fix failures directly caused by the current branch.
   - Fix flaky failures only when the branch clearly exposed the flake and the repair remains in scope.
   - Report external, infrastructure-only, quota, network, missing-secret, or unrelated failures instead of guessing.
6. Implement the smallest justified repair batch.
   - Patch only the code needed for the observed failure.
   - Run the nearest matching local verification only when it is fast and directly relevant.
   - Follow repo-specific validation rules.
7. Commit and publish the repair.
   - Write an intentional follow-up commit message without `#CI` for code-bearing repairs.
   - Push the new commit to the same PR branch.
   - If Actions need to run for the new tree, create and push a marker-only follow-up commit with `repair-pr-ci-trigger` instead of putting `#CI` on the code repair commit.
8. Repeat for the new head SHA until the PR is green or blocked.

## Verification

- Match local verification to the failing area whenever possible.
- Let GitHub Actions run the full spec suite. After a focused fix passes locally, do not broaden into slow local specs just to pre-validate the next Actions run.
- For Rails repos, prefer targeted `bundle exec rspec` paths and `bundle exec rubocop FILE` for touched files under `app` or `spec`.
- Do not run broad local specs just to duplicate GitHub Actions.

## Guardrails

- Do not create a new PR, replace the existing PR, mark it ready for review, auto-merge, or rebase.
- Do not rewrite history to trigger CI; use the empty-commit `repair-pr-ci-trigger` flow.
- Do not make speculative fixes that are not grounded in CI logs or local reproduction.
- Do not hide non-actionable failures; report them clearly.
- Do not spin forever. If two consecutive repair rounds fail to make no meaningful progress, stop and summarize the blocker.
- Keep each repair commit reviewable and in scope for the PR.
