---
name: write-pr-description
description: Draft a GitHub pull request description or PR body from an exact branch or PR diff. Use for requests like "write a PR description/body", including normal PRs and bug-fix PRs; do not use for PR titles, commit messages, reviews, release notes, CI repair, or PR publication workflows unless those workflows explicitly delegate body drafting.
---

Use this skill when the user asks for a PR description, pull request body, or a body draft for a branch or existing PR.

Do not use this skill for PR titles, commit names, code review, release notes, changelogs, creating or publishing PRs, marking PRs ready, monitoring CI, or fixing branches.

Before drafting, read [PR body rules](references/pr-body-rules.md). Follow those rules for section structure, bug-fix formatting, Sentry links, legal/regulatory citations, testing notes, large diffs, and examples.

## Workflow

1. Pin the source of truth before reading changed files.
   - Existing PR request: use the PR's exact current remote diff and metadata.
   - Current branch request: use the exact branch diff the user wants described.
   - Ambiguous published-PR plus local-WIP state: ask a brief follow-up before mixing remote PR changes with unpublished local changes.
2. Preserve required sections from `.github/pull_request_template.md` when it exists, because GitHub will not apply the template when a PR is created with an explicit body.
3. Infer the goal, behavior changes, DB/schema/data changes, likely affected workflow, independent merge safety, and testing coverage from the diff before asking follow-up questions.
4. Use the bug-fix format when the user says the PR is a bug fix or the diff clearly shows a targeted bug fix. If a bug-fix body needs a Sentry URL and none is available, stop and ask for it.
5. If legal, regulatory, tax, immigration, employment, or government-program rules materially motivate the change, verify a current authoritative source before citing it.

## Output Contract

- Return only the final PR description as raw Markdown, with no commentary before or after it.
- Make `## Context` the first section unless the repository template requires another first section.
- Include `## Summary`, `## Independent Merge Safety`, and `## Testing`.
- Include `## Behavior Change` for normal PRs.
- Include `## Root Problem` and `## Solution` for bug fixes.
- Include `## DB Changes`, `## Key Files Changed`, and `## Related PRs / Follow-ups` only under the conditions in the reference.
- Mark merge-safety checkboxes truthfully from the diff.
- Do not invent testing coverage. Explicitly state whether all new behavior is covered by system specs, and list any behavior that was not covered by system specs.
