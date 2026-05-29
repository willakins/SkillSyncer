# Bug PR Workflow

## Investigation Rules

- Prefer a code-level explanation over a pure symptom restatement.
- Use production data to confirm hypotheses, not to replace code reasoning.
- If the bug points to bad data plus a code gap, fix the recurring code issue first and call out any separate one-off data repair.
- If the Sentry event is stale or noisy, focus on the newest representative events and the highest-signal reproduction path.
- Do not overfit to one production row if the code path suggests a broader logic problem.

## Detailed Workflow

1. Read the bug from Sentry and extract symptoms, impact, evidence, and likely cause.
2. Read implicated code paths plus `db/schema.rb` and relevant models before changing data-sensitive code.
3. Use `$read-croft-prod-db` only for focused row counts, record shape, or production edge-case confirmation.
4. Write a short diagnosis that states what fails, why it fails, the minimal fix, and the verification path.
5. Share a short implementation plan before substantial edits.
6. Implement through `$implement-in-logical-commits`, adding focused regression coverage when testable.
7. Open or refresh the draft PR through `$draft-pr-for-branch`.
8. Run `$review-branch-until-clean` after the draft PR exists.
9. Refresh PR metadata if review-driven repairs changed the branch materially.

## Implementation Rules

- Keep fixes minimal and behavior-focused.
- Preserve existing repo standards for specs, RuboCop, and branch hygiene.
- Prefer regression coverage that proves the bug path is now handled.
- If the fix requires a migration, follow Croft migration rules and keep production-read investigation separate from write operations.

## PR Rules

- The draft PR should exist before the final review-until-clean loop completes, because that loop may push repair commits onto the same PR.
- After review-driven repair commits, refresh PR metadata if it has gone stale.
- Do not claim the issue is fully fixed if unresolved review findings or unverified risk remain.
