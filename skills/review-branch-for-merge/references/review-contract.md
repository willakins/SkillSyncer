# Review Contract

## Inputs

- Require an explicit review target: branch name or PR number.
- For direct branch reviews with no open PR, default the base branch to `main`.
- If the branch backs an open PR, pin that PR's exact base SHA and head SHA before review.
- If the PR base is only a temporary stack base, keep that as a blocker and resolve the truthful integration base for the actual review diff.

## Source Of Truth

- Read the PR description first when available.
- Review the exact pinned diff for `<review_base>...<exact_pr_head>`.
- Read relevant changed code paths from the exact reviewed head, not whatever branch happens to be checked out.

## Decision Rules

Approve only when all of these are true:

- The main UI flow works correctly, UI is not applicable, or UI could not be tested locally for an environment-only reason and that limitation is reported explicitly.
- The logic makes sense and no actionable correctness gaps were found.
- The code meets the repo's style, extensibility, readability, and domain-separation expectations.

Mark as not ready when any of these are false.

Do not treat missing local seed data, missing browser tooling, or unusable local credentials by themselves as branch correctness failures. Report those as UI limitations instead.

## Output Details

If UI could not be tested locally for an environment-only reason but the branch is still approved, include `UI1 -> general comment -> ...`.

Use:

- `ID -> \`path/to/file.rb:line\` -> review comment` for inline-publishable findings.
- `ID -> general-comment-only -> review comment` when the concern does not map honestly to a changed line.

## Remote Publication

- Never publish without explicit user confirmation.
- Re-check the PR head SHA before publishing.
- Publish only the IDs the user selected.
- Route publication through `../github-publish-review-items/SKILL.md`.
