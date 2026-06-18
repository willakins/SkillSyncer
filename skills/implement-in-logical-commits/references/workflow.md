# Detailed Workflow

## Goal

Turn one implementation task into the smallest set of meaningful commits that:

- truthfully describe what changed
- are easy to review
- leave the branch coherent after each commit
- avoid one giant unstructured implementation commit

## Defaults

- Default `source_branch` to the current branch.
- Default commit subjects to omit `#CI`; include it only when the user explicitly asks to trigger CI, run GitHub Actions, commit with actions, or include a CI marker.
- Prefer one commit for small or tightly coupled work.
- Prefer multiple commits only for real internal checkpoints: prep refactor, data model changes, UI changes, spec repair, or follow-up cleanup.
- If the current branch backs an open PR whose exact head repo/ref has already been resolved, push after each successful commit to that exact repo/ref unless the user asked to keep work local.
- If there is no open PR but the branch tracks an upstream verified as the intended same-name remote head branch, push after each successful commit by default.
- If the tracked upstream has not been verified, require an explicit `git push PUSH_REMOTE HEAD:PUSH_TARGET_REF` target or stop to clarify.

## Source Of Truth

- Read the requested task or plan first.
- Read relevant code before deciding boundaries.
- Inspect whether the current branch already has an upstream or open PR before the first commit.
- If an open PR exists, resolve its exact head repo/ref before any default push.
- If no matching local remote alias exists for the exact PR-head repo, stop and use `enable-remote-publication`.
- Use the staged diff for each commit subject once a slice is staged; otherwise use the exact in-scope local diff.
- Use `write-commit-name` for every commit subject.

## Commit Boundaries

Split by behavior and dependency order, not file type alone.

Good boundaries:

- prep refactor with behavior parity
- new model or service behavior
- controller or view wiring for that behavior
- spec coverage when large enough to review separately
- focused follow-up fix discovered during verification

Bad boundaries:

- one commit each for models, controllers, and views when they are one inseparable behavior
- one commit per file
- unrelated cleanup mixed into functional work
- knowingly broken commits unless explicitly allowed

## Slice Loop

For each slice:

1. Define the exact scope and proof command.
2. Avoid files owned by later slices unless unavoidable.
3. Implement until the slice is coherent.
4. Run the smallest useful specs, lint, or checks.
5. Stage only files belonging to that slice.
6. Generate the subject with `write-commit-name`.
7. Commit without `#CI` unless the prompt explicitly requested Actions triggering, and without amending prior history unless explicitly requested.
8. Push only when the publication target is verified safe.

If a later slice invalidates an earlier assumption, make a new follow-up commit instead of silently rewriting prior commits.

## Final Report

Return a short summary with:

- whether the task used one commit or multiple commits
- final commit subjects in order
- main verification for each slice
- whether each commit was pushed
- whether uncommitted work remains
