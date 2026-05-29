# Review Loop

## Source Of Truth

- Read `git status -sb` before starting the review/fix loop.
- Review the diff against `base_branch`, not only filenames or commit messages.
- Treat skill, template, doc, and workflow-instruction edits as behavior changes that alter future agent actions.
- Cross-check related skills, AGENTS guidance, and workflow docs when automation behavior changes.
- Only raise findings that are real, actionable, introduced by the branch, and worth fixing.

## Review Pass

For each iteration, run a fresh review instead of carrying old assumptions forward.

- Use `review-branch-logic` for correctness, contracts, auth/scoping, data flow, concurrency, and missing edge cases.
- Use `review-branch-style` for architecture, maintainability, repo conventions, and workflow-doc consistency.
- Use `review-branch-ui` only when the branch changes a user-facing UI flow that can reasonably be checked.
- For workflow skills/docs, trace common rerun, fallback, dirty-worktree, and publication scenarios explicitly.

## Triage And Repair

- Send current findings to `address-codex-concerns`.
- Re-read cited files and surrounding code before editing.
- Classify each finding as valid, invalid, or needs user input.
- Dismiss invalid, speculative, or intentional findings without code churn.
- Repair valid findings with the smallest behavior-preserving change.
- Group related fixes into coherent repair batches and keep tests with the code they validate.
- Do not assume pre-existing dirty worktree files belong to the repair batch.

## Commit And Publication Safety

Before the first repair commit, inspect whether the branch already has an upstream remote or backs an open PR.

- If it backs an open PR, resolve that PR's exact head repo/ref before any default push.
- If no local remote alias matches that PR-head repo, stop and use `enable-remote-publication`.
- If there is no open PR, verify that any tracked upstream is the intended same-name remote head branch for the current local branch.
- Push each repair commit by default only after the exact PR head or tracked upstream has been verified as the intended publication target.
- When a PR-head target was resolved, push back to that exact repo/ref instead of whatever upstream the local branch happens to track.
- If the push is expected but auth is missing, use `enable-remote-publication` before continuing.

## Stop Conditions

Stop when:

- A fresh review raises no findings.
- Remaining findings are disputed, intentional, speculative, or need user direction.
- The branch is too large or mixed and should be split before more review work.
