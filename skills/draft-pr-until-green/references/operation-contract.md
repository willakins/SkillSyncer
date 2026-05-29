# Operation Contract

Use this reference for the detailed behavior behind the compact `SKILL.md`.

## Defaults

- Default `source_branch` to the current branch.
- Default `base_branch` to `main`, unless an existing truthful PR base should be preserved because the PR already targets a different intentional base.
- Keep the PR in draft. Do not mark it ready unless the user explicitly asks.
- Treat the request as authorization for narrow, in-scope code changes and follow-up commits that are directly justified by failing CI.
- Use `draft-pr-for-branch` for publication and PR creation.
- Use `repair-pr-ci-trigger` only when the pushed tip did not trigger CI because the commit message lacks a case-insensitive marker such as `#CI` or `#ci`.
- Use `fix-pr-until-green` for the CI inspection and repair loop after the draft PR exists.

## Preconditions

- Require a clear, reviewable branch scope before opening or refreshing the PR.
- Require a working `git push` path and authenticated `gh` access before entering the CI loop.
- Require targeted local verification before first publish and after each repair round.
- If the branch should be split, restacked, cleaned up, or rebased first, stop and do that through the appropriate skill before opening the PR.
- If a remaining failing check is external, infrastructure-owned, secrets-related, flaky but unrelated, or unrelated to the branch diff, stop after documenting the blocker.

## Verification

- Match local verification to the current diff before first publish.
- After publication, let `fix-pr-until-green` choose the repair-round verification from the observed CI failure.
- Follow repo norms instead of inventing generic checks.
- For Rails repos, prefer targeted `bundle exec rspec` paths and `bundle exec rubocop FILE` for touched files under `app` or `spec`.
- Do not run the full test suite unless the failure surface or repo conventions truly require it.

## Stop Conditions

- Stop before publishing when scope is mixed, branch history is unreviewable, auth is missing, or the base is wrong.
- Stop during repair when two consecutive repair rounds do not make meaningful progress.
- Stop when fixing CI would require broad product changes, unrelated refactors, secrets, infrastructure ownership, or speculative edits not grounded in logs.
- Report the blocker with the last head SHA, failing check name, evidence from logs, and local verification already run.

## Output

Return a short summary with:

- draft PR link
- latest head commit used for the final check
- checks fixed
- local verification run
- whether the draft PR ended green or blocked
- remaining non-actionable failures or follow-up needed
