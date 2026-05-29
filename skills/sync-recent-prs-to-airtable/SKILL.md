---
name: sync-recent-prs-to-airtable
description: End-to-end sync of recent GitHub pull requests into Croft Airtable task tracking. Use when Codex needs to gather the user's recent open and recently closed PRs, compare them against Airtable tasks, create missing task records, and update existing Airtable task status so the board matches recent coding work.
---

# Sync Recent PRs To Airtable

## Overview

Use this as the orchestration skill for the workflow.

Keep the building blocks separate:

- `$github-recent-user-prs` gathers PR activity.
- `$reconcile-prs-to-airtable-tasks` decides what to create, update, skip, or review.
- `$airtable-create-croft-task` creates missing task records.
- `$sync-airtable-task-status-from-prs` updates matched Airtable records.

## Default Behavior

Sync these PR buckets by default:

- open draft PRs
- open non-draft PRs
- recently merged PRs

Include recently closed-unmerged PRs in the report, but do not automatically create or rewrite Airtable tasks from those unless the user explicitly asks.

## Workflow

1. Gather recent PRs with `$github-recent-user-prs`.
2. Reconcile PRs against Airtable tasks with `$reconcile-prs-to-airtable-tasks`.
3. Create missing Airtable tasks for high-confidence `create` items with `$airtable-create-croft-task`.
4. Update matched Airtable tasks for `update` items with `$sync-airtable-task-status-from-prs`.
5. Return a concise sync summary with creates, updates, skips, and manual-review items.

## Create Rules

When creating a missing Airtable task from a PR, default the task name to the PR title unless the reconciliation step identified a better normalized title.

Use these creation defaults:

- `open_draft` -> create with `Status: In Progress`
- `open_ready` -> create with `Status: Needs Code Review`
- `merged` -> create with `Status: In Prod` and `Pipeline: Completed`

Do not create a task for `closed_unmerged` by default.

## Safety Rules

- Do not create a record when the reconciliation result is ambiguous.
- Do not create a record until you have performed the broader duplicate check described in `$reconcile-prs-to-airtable-tasks`.
- Do not downgrade an existing Airtable status.
- Do not mark tasks `Will not Complete` solely from a closed-unmerged PR.
- If the caller says `dry run`, stop after reconciliation and report the planned actions without writing.

## Output Expectations

Keep the final response action-oriented:

- how many tasks were created
- how many existing tasks were updated
- which PRs were skipped intentionally
- which items still need human review

When writes occur, include enough detail for the user to see which PR titles were affected, but do not dump raw Airtable payloads unless asked.

## Example Prompts

- `Use $sync-recent-prs-to-airtable to sync my recent GitHub PRs into Croft Airtable.`
- `Use $sync-recent-prs-to-airtable as a dry run so I can review which tasks would be created or updated.`
