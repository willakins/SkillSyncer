---
name: github-recent-user-prs
description: Gather recent open, draft, merged, or closed pull requests for the authenticated GitHub user across a current repo, named org, or small repo set. Use when Codex needs read-only PR activity before Airtable reconciliation, weekly shipped-work review, shipped-work summaries, or open-branch follow-up. Do not use to create, review, merge, monitor CI, or edit PRs.
---

# GitHub Recent User PRs

**UTILITY SKILL. INVOKES:** GitHub connector, optional `gh api user`. **READ-ONLY:** PR discovery and normalization.

Read [PR collection details](references/pr-collection.md) when scope is cross-repo, noisy, or feeds another workflow.

## USE FOR:

- Recent open, draft, merged, or closed PR lists for the current GitHub user.
- Prep for Airtable reconciliation, weekly review, shipped-work review, or open-branch follow-up.
- Current repo, named repo/org, or small installed-repo-set discovery.

## DO NOT USE FOR:

- Creating, updating, merging, reviewing, or commenting on PRs.
- CI monitoring, CI repair, commit, push, issue search, or broad GitHub analytics.

## Workflow

1. Resolve scope.
2. Fetch open PRs plus closed/merged PRs from the last 30 days unless overridden.
3. Normalize, de-dupe, and sort by the decision timestamp.
4. Return scope, window, count, and structured PR items.

## Output Contract

Keep repo, number, title, URL, normalized state, draft flag, timestamps, head ref, and base ref. States are `open_draft`, `open_ready`, `merged`, and `closed_unmerged`.

## Troubleshooting

If auth, scope, or data is unavailable, report the blocker and the narrower query needed. Do not invent PRs, repos, or timestamps.

## Examples

- `Use $github-recent-user-prs to gather my recent open and recently closed PRs in this repo.`
- `List my last 20 open or merged PRs across Croft repos.`
