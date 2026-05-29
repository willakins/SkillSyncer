# CI Repair Loop

Use this reference after the skill has routed to an existing PR.

## Defaults

- Default `pr` to the current branch's PR when the user does not provide a PR number or URL.
- Preserve the existing base branch, draft state, and review state.
- Treat the user's request as approval for narrow, in-scope code changes and follow-up commits directly justified by failing CI.
- Prefer `gh` for check inspection and run logs. Use GitHub connector context when helpful, but do not depend on connector-only Actions features.

## Preconditions

- Require an existing PR or one that can be resolved from the current branch.
- Require a working `git push` path and authenticated `gh` access before entering the CI loop.
- Require targeted local verification after each repair round.
- If the remaining failing check is external, infrastructure-owned, secrets-related, flaky but unrelated to the branch, or otherwise not actionable from the PR diff, stop and document the blocker.

## Detailed Workflow

1. Resolve the PR.
   - Prefer the user-provided PR number or URL.
   - Otherwise resolve the current branch PR with `gh pr view --json number,url,headRefName`.
   - Capture the PR number, URL, and current head SHA.
2. Inspect the current check state.
   - Run `gh pr checks <pr>`.
   - If checks are pending, wait and poll again with a bounded loop.
   - If the remote tip failed to trigger CI because the pushed commit text lacks a case-insensitive CI marker such as `#CI` or `#ci`, use `repair-pr-ci-trigger` and restart for the new head SHA.
3. Exit immediately when actionable checks are green.
4. Inspect failing checks before changing code.
   - For GitHub Actions runs, inspect the failing run with `gh run view <run_id> --log-failed`.
   - Fall back to `gh run view <run_id> --log` when the failed-only log is insufficient.
   - Use `github:gh-fix-ci` when connector context or bundled inspection scripts help, but extract the concrete failing command, file, stack trace, or assertion before editing code.
5. Classify each failure.
   - Fix failures directly caused by the current branch.
   - Fix flaky failures only when the branch clearly exposed the flake and the repair remains in scope.
   - Report external, infrastructure-only, quota, network, missing-secret, or unrelated failures instead of guessing.
6. Implement the smallest justified repair.
   - Patch only the code needed for the observed failure.
   - Run the nearest matching local verification first, then widen only as needed.
   - Follow repo-specific validation rules.
7. Commit and publish the repair.
   - Write an intentional follow-up commit message that includes `#CI`.
   - Push the new commit to the same PR branch.
8. Repeat for the new head SHA until the PR is green or blocked.

## Verification

- Match local verification to the failing area whenever possible.
- After a focused fix passes locally, rerun the broader affected command if warranted.
- For Rails repos, prefer targeted `bundle exec rspec` paths and `bundle exec rubocop FILE` for touched files under `app` or `spec`.
- Do not run the full test suite unless the failure surface or repo conventions require it.

## Guardrails

- Do not create a new PR, replace the existing PR, mark it ready for review, auto-merge, or rebase.
- Do not rewrite history except through the narrow `repair-pr-ci-trigger` flow.
- Do not make speculative fixes that are not grounded in CI logs or local reproduction.
- Do not hide non-actionable failures; report them clearly.
- Do not spin forever. If two consecutive repair rounds fail to make no meaningful progress, stop and summarize the blocker.
- Keep each repair commit reviewable and in scope for the PR.
