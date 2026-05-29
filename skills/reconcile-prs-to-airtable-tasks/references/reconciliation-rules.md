# Reconciliation Rules

## Title Normalization

Normalize titles conservatively:

- lowercase
- trim whitespace
- collapse repeated spaces
- strip leading `draft:`, `[draft]`, `wip:`, `[wip]`
- strip a leading repo prefix only when it is clearly mechanical
- keep substantive words intact

Do not over-normalize. Avoid fuzzy matches that depend on dropping meaningful nouns or verbs.

## Ambiguity Rules

Mark the result `needs_review` instead of guessing when:

- multiple tasks plausibly match one PR
- one task plausibly matches multiple PRs
- title similarity is weak
- the matched task lives in a non-code workflow table
- the PR is closed-unmerged and the right Airtable outcome is unclear

## Expected Decisions

Produce one decision per PR:

- `create`
- `update`
- `skip`
- `needs_review`

Carry forward:

- PR identity and normalized state
- matched Airtable record id, if any
- matched table name and table id
- matched current Airtable status and pipeline, if any
- reason for the decision

## Example Prompts

- `Use $reconcile-prs-to-airtable-tasks to compare my recent GitHub PRs with current Airtable tasks and tell me what needs to be created or updated.`
- `Use $reconcile-prs-to-airtable-tasks after pulling recent PRs so we can avoid creating duplicate Airtable tasks.`
