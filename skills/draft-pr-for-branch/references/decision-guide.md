# Decision Guide

Use this guide after the top-level skill triggers. Keep the workflow scoped to the current branch unless the user explicitly names another source branch.

## Defaults

- `source_branch`: current branch.
- `base_branch`: `main` for a new direct PR.
- New PR state: `draft`, unless the user explicitly asks for ready-for-review.
- Existing PR state: preserve current draft/ready state unless the user explicitly asks to change it.
- CI marker: do not create or repair a case-insensitive `#CI` marker by default. Treat explicit requests to trigger CI, trigger actions, run GitHub Actions, get checks running, commit with actions, or include a CI marker as authorization to ensure the pushed tip carries a marker.
- Stacked PRs: only open against a parent slice branch when the user explicitly asks for that stacked review base. Name the stacked base in the PR body.

## Required Inspection

Before committing, pushing, creating a PR, editing PR metadata, or changing draft state:

- Read `git status -sb`, the in-scope local diff, and the branch diff against the requested base.
- Check whether the branch already has an open PR.
- Capture existing PR base branch, draft/ready state, exact head repo/ref, pushed tip SHA, and full pushed-tip commit message.
- Decide whether local `HEAD` is the branch tip that will actually be published.
- Check whether remote branch publication and PR mutation capabilities both exist for the requested operation.

If local-only WIP is present but no new branch content will be published, keep that WIP out of scope. Use the refreshed pushed tip and pushed diff as the source of truth for PR metadata and verification.

## Capability Rules

Use `git push` for branch publication. The GitHub app can create or mutate PR objects from already-published branch content, but it is not a replacement for publishing committed local history.

Valid paths include:

- authenticated `git push` plus GitHub app PR creation for same-repo PRs when the app can encode the exact head branch;
- authenticated `git push` plus authenticated `gh` when PR creation must preserve a fork, cross-repo head, non-default head ref, base edit, metadata edit, or draft-state change;
- authenticated `gh` alone when the branch is already published and only PR creation or mutation remains;
- GitHub app PR creation from an already-published same-repo branch when no branch update is needed.

If the needed path is missing, stop and use `enable-remote-publication`. After that auth handoff, ask whether to resume before making remote changes.

## Create Or Update PR

1. Confirm the branch is a coherent PR-sized slice.
2. Stop if the requested base is only a temporary parent slice branch and the user did not explicitly ask for a stacked PR.
3. Stop if a later stack slice still re-includes earlier unlanded slice content against the requested base.
4. If an open PR exists, reuse it only when its base and requested final state match, or when a verified `gh pr edit`/state-change path can repair them.
5. If uncommitted changes belong in scope, stage only those files and generate the commit subject with `write-commit-name`; pass through CI-trigger intent only when the prompt explicitly authorized Actions/CI triggering.
6. If no content commit is needed and explicit CI-trigger authorization exists while the candidate published tip lacks `#CI`, require a clean worktree before creating a marker-only follow-up commit or using the configured CI-trigger repair path. If CI was not explicitly authorized, do not create marker-only commits.
7. Run targeted verification against the exact branch state that will be published.
8. Push with a command that targets the existing PR head repo/ref when reusing a PR. Use plain `git push` only when upstream already matches the intended same-name remote head.
9. Generate title and body with `write-pr-title` and `write-pr-description`. Include repository template sections because GitHub does not apply templates when an explicit body is supplied.
10. For an existing PR whose published diff changed, refresh stale title/body with `gh pr edit PR_NUMBER --title TITLE --body-file BODY_FILE --repo OWNER/REPO` when available. Stop rather than claiming stale metadata was updated.
11. Create the PR against the requested base, preserving the exact published head repo/ref. Use `gh pr create` for forks, cross-repo heads, or head refs the connector cannot encode.

## Mark Ready

1. Find the existing open PR for the branch.
2. If no PR exists, stop.
3. If the PR is already ready, report a no-op.
4. Leave local WIP untouched unless the user explicitly asks to include it; then commit, verify, and push that batch before changing PR state.
5. Do not require a CI marker for readiness. If the user or caller explicitly requested ready plus CI trigger, inspect the pushed PR tip full commit message; if it lacks `#CI` and local `HEAD` matches the pushed tip with a clean worktree, use the configured CI-trigger repair path and resume. Otherwise stop with the clean-checkout requirement.
6. Compare PR title/body freshness against the pushed PR diff, not local-only WIP.
7. Refresh stale metadata when a verified metadata-edit path exists, unless the user explicitly asks to preserve it.
8. Mark ready with `gh pr ready PR_NUMBER --repo OWNER/REPO`.

## Failure Messages

Be explicit about the reason for stopping: unclear mixed scope, empty diff for new PR, mismatched base, unreviewable stack slice, missing push auth, missing PR mutation auth, dirty worktree blocking an explicitly requested CI-trigger repair, diverged local and remote tips, failed verification, or stale metadata without an edit path.
