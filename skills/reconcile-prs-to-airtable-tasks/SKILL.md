---
name: reconcile-prs-to-airtable-tasks
description: Compare recent GitHub pull requests against Croft Airtable task records and decide which PRs already map to tasks, which PRs need new Airtable tasks, and which matched tasks should be updated. Use when Codex is preparing an Airtable sync, checking backlog coverage for recent coding work, or auditing whether recent PR activity is represented in task tracking.
---

# Reconcile PRs To Airtable Tasks

## Overview

Use this skill to plan the sync before writing anything.

This skill is read-only. Its job is to produce confident `create`, `update`, `skip`, and `needs_review` decisions from a recent PR set and a relevant Airtable task slice.

Read [reconciliation rules](references/reconciliation-rules.md) for matching order, normalization, ambiguity rules, and output fields.

## Inputs

If the caller has not already supplied the datasets, gather them first:

- Use `$github-recent-user-prs` for the PR set.
- Use `$airtable-will-current-sprint-tasks` for the default Airtable task set.

When the sync is about avoiding duplicates, do not rely only on the narrow current-sprint slice. Before declaring a PR unmatched, run a broader verification search against the likely table so you do not recreate an already-completed task.

## Table Defaults

For code PR syncing, prefer these Airtable tables:

- `Eng Backlog`
- `Intake`

Do not automatically treat `Product & Design Backlog` as PR-status-syncable unless the user explicitly asks. Its status model is different and is not a safe default target for GitHub-driven status writes.

## Matching Rules

Use this order:

1. Explicit linkage field, if the Airtable schema exposes a verified GitHub PR URL, PR number, or repo+number field.
2. Exact normalized title match.
3. High-confidence fuzzy title match.
4. Otherwise mark as unresolved.

If you have not checked the Airtable schema yet, do not assume a PR linkage field exists. Inspect the table first. If none exists, fall back to title matching.

## Workflow

1. Gather the PR set.
2. Gather the default Airtable task slice.
3. For each PR that appears unmatched, run a broader Airtable verification search before deciding to create a new task.
4. Match conservatively.
5. Emit a structured action plan for downstream write skills.

## Output Expectations

- Start with counts for `create`, `update`, `skip`, and `needs_review`.
- Keep the explanation terse but specific.
- Preserve record ids, table ids, and PR urls in the working set even if the human summary is shorter.
- Call out every ambiguous item instead of silently skipping it.
