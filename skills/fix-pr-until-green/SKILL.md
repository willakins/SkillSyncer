---
name: fix-pr-until-green
description: Repair an existing pull request's failing GitHub Actions checks until actionable CI passes or a blocker remains. Use when the user explicitly asks to get an existing PR green, fix CI on this PR, repair failing actions until green, run GitHub Actions repair, or keep debugging checks. Do not use to create or publish a new PR, or for ordinary commits that do not request Actions.
---

# Fix PR Until Green

Repair existing PR CI failures until actionable checks pass or a blocker remains.

**UTILITY SKILL. INVOKES:** `gh`, git, targeted local verification, `github:gh-fix-ci`, `repair-pr-ci-trigger` for empty CI trigger commits. **FOR EXISTING PRS ONLY.**

Read [CI repair loop](references/ci-repair-loop.md) before changing code.

## USE FOR:

- "get this PR green"
- "fix the CI actions for this PR"
- "keep repairing failing checks on PR #123"
- "debug GitHub Actions failures until checks pass"

## DO NOT USE FOR:

- Creating, publishing, or marking a draft PR ready; use `draft-pr-for-branch` or `draft-pr-until-green`.
- Monitoring without code repair; use `monitor-ci` or `monitor`.
- Missing secrets, quota, infrastructure outages, or failures unrelated to the branch diff.

## Examples:

- "Get PR #42 green" means inspect that PR, repair actionable CI, and trigger GitHub Actions with an empty `#CI` commit when needed because the prompt explicitly requested a green CI outcome.
- "Open a draft PR, then monitor CI" belongs to `draft-pr-until-green`.

## Workflow

1. Resolve the existing PR and head SHA with `gh pr view`.
2. Inspect checks with `gh pr checks`; use bounded polling if pending.
3. If CI has not run for the latest head, use `repair-pr-ci-trigger` to create an empty `#CI` trigger commit on the PR branch.
4. Read failed Actions logs before editing and identify the exact command, file, assertion, or stack trace.
5. Make the smallest branch-caused repair batch, run only targeted local verification that directly matches the repair, commit and push code without `#CI`, then create an empty `#CI` trigger commit when Actions need to run again.
6. Stop when checks are green or the remaining failure is non-actionable.

## Troubleshooting

- Stop after two repair rounds without meaningful progress.
- Preserve draft state, review state, and PR scope; never auto-merge, rebase, or replace the PR.

## Output

Report PR link, final head SHA, checks fixed, local verification, green or blocked state, and remaining blockers.
