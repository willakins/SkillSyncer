---
name: draft-pr-until-green
description: Create or refresh a draft PR, then repair actionable CI until green or blocked. Use only when the prompt explicitly asks to run or repair CI/GitHub Actions, such as "open a draft PR and get CI green", "commit with actions", or "publish this branch and fix failing checks". Not for draft-only, existing-PR CI-only, review, ready, merge, or rebase requests.
---

**UTILITY SKILL. INVOKES:** `draft-pr-for-branch`, `fix-pr-until-green`. **FOR:** draft PR plus CI repair.

Read [Operation contract](references/operation-contract.md) before publishing, CI repair, or blocker reports.

## USE FOR:

- "open a draft PR and get CI green"
- "publish this branch and fix failing checks"
- "make a draft PR, then keep repairing CI until it passes"

## DO NOT USE FOR:

- Draft-only PR publication; use `draft-pr-for-branch`.
- CI repair on an existing PR; use `fix-pr-until-green`.
- Review, ready, merge, rebase, split, or cleanup-only work.

## Workflow

1. Inspect status, diffs, PR state, push path, and `gh` auth.
2. Run narrow local verification only when it is quick and directly matches the current diff; leave full spec coverage to GitHub Actions.
3. Use `draft-pr-for-branch`; capture PR number, URL, draft state, and head SHA.
4. Trigger CI with an empty `#CI` commit after publication because this skill requires explicit CI/Actions authorization; if the original prompt was draft-only, stop and route to `draft-pr-for-branch`.
5. Hand the PR to `fix-pr-until-green`; preserve draft state.
6. Report PR link, final head SHA, fixed checks, verification, green/blocked status, and blockers.

## Troubleshooting

- Stop before publication for unclear scope, mixed work, wrong base, split/restack needs, missing push auth, or missing `gh`.
- Stop for external, secret, quota, infrastructure, unrelated, or two no-progress repair rounds.
- Do not mark ready, merge, rebase, auto-approve, or duplicate `fix-pr-until-green`.

## Examples

- Trigger: "Open a draft PR for this branch and keep fixing CI until it passes."
- Anti-trigger: "This PR already exists; just inspect the failing action logs."
