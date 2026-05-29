# Repair Flow

## Target Resolution

- If the request names a PR, read that PR's exact head repo, head ref, and head SHA first.
- If the request names a branch, resolve that branch and its intended push remote/ref before checking local state.
- Fall back to the current branch only when the request did not identify a PR or branch.
- If another workflow supplied `push_remote` plus `push_target_ref`, use that exact shell push target.
- If another workflow supplied `push_target_repo` plus `push_target_ref`, inspect `git remote -v` for a local remote matching that repository before using branch-local push heuristics.

## Preconditions

- Require a clean working tree before any checkout, amend, or push.
- Require the branch to exist remotely; if nothing is pushed yet, stop and use the normal PR creation flow.
- Move to the exact requested branch tip before comparing local `HEAD` with the pushed tip SHA.
- Fetch or otherwise refresh the remote/PR state before reading the pushed tip commit message.
- Verify shell git push access for the exact target before amending. GitHub app access is not enough because the final step is a shell force-push.
- If local `HEAD` differs from the pushed tip being repaired, stop and ask for sync or clarification.

## Open PR Handling

When an open PR exists, treat the PR head repo/ref as both the repair target and push destination. Resolve a local remote alias that matches the PR head repo. If none exists and no `push_remote` was supplied, preserve `push_target_repo` and `push_target_ref`, then route through `enable-remote-publication` instead of falling back to `branch.<name>.pushRemote`, `remote.pushDefault`, or the tracked upstream.

## Mutation Rules

- Do not change file contents.
- Do not amend the commit body unless explicitly requested.
- Do not create an empty commit; the branch tip itself must carry `#CI`.
- Do not use plain `git push --force`.
- Do not add another confirmation when the user explicitly requested this repair and push access has already been verified.
- If remote setup was required, resume the original repair only after that workflow verifies the exact target and the user confirms continuation.
- If a caller delegated with `original_task`, report the repair result so the caller can resume that task.

## No-op Rule

Treat the repair as a no-op only when the pushed tip full commit message already contains a case-insensitive CI marker such as `#CI` or `#ci`. Report the no-op and do not amend or push.
