---
name: airtable-will-current-sprint-tasks
description: Query and summarize Croft Airtable task tables with defaults for Will Akins in Eng Backlog Current Sprint while excluding In Staging and In Prod. Use when Codex needs to look up tasks by assignee, status, search text, alternate Croft task tables, or semantic Airtable views such as "By assignee" or "Current Sprint".
---

# Croft Airtable Task Lookup

Use this skill to query task-like tables in the Croft Airtable base. Treat the Will/current-sprint setup as defaults, not hard-coded limits.

Read [query workflow details](references/query-workflow.md) for table ids, field ids, query shapes, view-hint mapping, and examples.

## Defaults

- Base: `Croft` -> `appgRWEMtYCttCkjO`
- Table: `Eng Backlog` -> `tbla72plmclVzubFK`
- Assignee: `Will Akins` -> `usr6eB31TRW0oMiY5`
- View hint: `Current Sprint by Assignee`
- Pipeline filter: `Current Sprint`
- Excluded statuses: `In Staging`, `In Prod`
- Sort: `Last Modified desc`

Allow caller overrides for base, table, view hint, assignee, search text, included/excluded statuses, pipeline, sort, and page size.

## Connector Behavior

- Airtable view names and ids are not exposed; reconstruct views from table and filter semantics.
- Collaborator-field filtering was rejected in testing, so filter assignees locally from `collaboratorInfoById`.
- Use Airtable-side filters only for known reliable fields such as default Eng Backlog `Pipeline` and `Status`.

## Workflow

1. Resolve the base and table. Use known task-table mappings; inspect unknown schemas before choosing fields.
2. Pick a tight field list: primary, assignee, status, priority, due date, pipeline, and last modified when available.
3. Build the initial Airtable query. Use the default Eng Backlog query shape in [query workflow details](references/query-workflow.md) for default requests.
4. Resolve assignee ids locally by exact collaborator id, exact email, then case-insensitive display name.
5. Translate choice ids to labels from `columnsById[field_id].typeOptions.choices`.
6. Apply local filters in order: assignee, search text, include statuses, exclude statuses, then pipeline when not already enforced in Airtable.
7. Return the result, skipping blank-title rows and grouping by status unless the user asks for a flat list.

## Output Rules

- Start with a one-line summary naming assignee, table, and effective filters.
- Render each task as title, priority, due date, and useful pipeline context.
- Mention approximated Airtable views in one short note.
- Do not dump raw Airtable ids or field names in the final output.
- If no rows match, say so and echo the effective filters.
