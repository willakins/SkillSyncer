---
name: croft-fix-sentry-bug-pr
description: Investigate a Croft production bug from a Sentry issue URL or issue identifier and carry it through to a clean draft PR. Use when the user asks for an end-to-end flow such as "make a draft PR to fix this bug" and wants Codex to inspect Sentry, use the production read-only replica as needed, identify the logical root cause, make a short fix plan, implement the fix in logical commits, open or refresh a draft PR, and review the branch until clean.
---

# Croft Fix Sentry Bug PR

Turn a production bug report into a reviewed draft PR by composing focused skills instead of reimplementing their workflows.

Read [bug PR workflow](references/bug-pr-workflow.md) for detailed investigation, implementation, PR, and review rules.

## Skills To Compose

- `$read-sentry-bug-reports` for issue evidence, impact, and likely cause.
- `$read-croft-prod-db` only when production data is needed to validate or narrow the diagnosis.
- `$implement-in-logical-commits` for intentional commit slices.
- `$draft-pr-for-branch` to open or refresh the draft PR.
- `$review-branch-until-clean` after the draft PR exists.

## Preconditions

- Default to the current branch unless the user asks otherwise.
- Require a clear branch scope before commit-producing work.
- Stop for mixed unrelated changes, missing Sentry access, unavailable required replica access, or materially uncertain root cause.

## Workflow

1. Read the Sentry issue and separate facts from inference.
2. Inspect implicated code, relevant models, and `db/schema.rb` before changing data-sensitive code.
3. Use production read-only data only for focused confirmation questions, and redact sensitive data in the final explanation.
4. Form a short diagnosis: what fails, why, the minimal fix, and what verification proves it.
5. Share a concise implementation plan before substantial edits.
6. Implement through `$implement-in-logical-commits`, adding targeted regression coverage when testable.
7. Open a draft PR through `$draft-pr-for-branch`.
8. Run `$review-branch-until-clean`; if it changes the branch materially, refresh PR metadata through `$draft-pr-for-branch`.

## Output

Return the bug summary, root cause, commit list, checks run, PR URL, and residual risk. Do not claim the issue is fully fixed while review findings or unverified risk remain.
