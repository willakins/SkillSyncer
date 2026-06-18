# Publication Safety

## Before The First Repair Commit

Inspect whether the current branch already has an upstream remote or backs an open PR.

If it backs an open PR, resolve that PR's exact head repo and ref before any default push. If no matching local remote alias exists for that exact PR-head repo, stop and use `enable-remote-publication` before relying on a default push.

If the branch does not back an open PR and later repair commits are expected to be pushed, verify that any tracked upstream is the intended same-name remote head branch for the current local branch before treating plain `git push` as safe.

## Commit Rules

- Commit each major repair round, not every tiny edit.
- Stage only files that belong in that repair round.
- Use `write-commit-name` based on the staged repair diff when staged, otherwise on the exact repair batch only.
- Follow `write-commit-name` defaults: omit `#CI` unless the prompt explicitly asks to trigger CI, trigger actions, run GitHub Actions, commit with actions, or include a CI marker.
- If unrelated local WIP is present and the intended repair batch is not clearly isolated, stop and clarify before committing or pushing.

## Push Rules

Push each successful repair commit by default only when one of these is true:

- the current branch backs an open PR whose exact head repo/ref has already been resolved as the intended publication target
- the current branch already tracks an upstream verified as the intended same-name remote head branch

When a PR-head target has been resolved, push back to that exact repo/ref instead of whatever upstream the local branch happens to track.

If no matching local remote alias exists for that exact PR-head repo, stop and use `enable-remote-publication` before pushing. If the tracked upstream has not been verified as intended, require an explicit `git push PUSH_REMOTE HEAD:PUSH_TARGET_REF` target or stop to clarify. If remote auth is missing, use `enable-remote-publication` before continuing so the remote branch does not stay stale.
