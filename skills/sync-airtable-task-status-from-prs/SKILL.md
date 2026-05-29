---
name: sync-airtable-task-status-from-prs
description: Update matched Croft Airtable tasks so their status reflects current GitHub pull request state. Use when Codex already has PR-to-task matches and needs to apply the Airtable write side of the sync, especially for moving tasks forward to In Progress, Needs Code Review, or In Prod without duplicating task creation logic.
---

# Sync Airtable Task Status From PRs

Use this skill only after PRs have already been matched to Airtable records. It updates existing tasks; it does not decide matching and does not create missing records.

Read [status update rules](references/status-update-rules.md) for status order, write shapes, closed-unmerged behavior, and examples.

## Supported Tables

Default to code workflow tables whose status semantics map cleanly to PR state:

- `Eng Backlog`
- `Intake`

Do not automatically update `Product & Design Backlog` from GitHub PR state unless the user explicitly asks.

## Airtable Write Tool

Use `mcp__codex_apps__airtable._update_records_for_table` with `typecast: true`.

Croft defaults:

- Base id: `appgRWEMtYCttCkjO`
- `Eng Backlog` table id: `tbla72plmclVzubFK`
- `Intake` table id: `tblhIvGclMmJw6PFm`

Update by Airtable record id. Do not use upsert.

## State Mapping

- `open_draft` -> minimum status `In Progress`
- `open_ready` -> minimum status `Needs Code Review`
- `merged` -> `In Prod` and `Pipeline: Completed`
- `closed_unmerged` -> no automatic terminal status change

If the table has `Date Pushed to Prod` and the PR has `merged_at`, set that field when moving to `In Prod`.

## Non-Regressive Updates

Do not move a task backward. Use the status order in [status update rules](references/status-update-rules.md). Preserve a more advanced Airtable status, except merged PRs may advance to `In Prod`.

## Workflow

1. Group matched records by Airtable table.
2. Compute the minimum target status for each PR/task pair.
3. Compare current Airtable status with the target and skip no-op or backward updates.
4. Apply only forward-moving changes.
5. Batch updates in groups of 10 or fewer records per Airtable request.

## Output

Report how many matched tasks were updated versus skipped, list manual-review items separately, and say when a more advanced Airtable status was intentionally preserved.
