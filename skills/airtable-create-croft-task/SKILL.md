---
name: airtable-create-croft-task
description: Create Croft Airtable tasks with defaults for Will Akins in Eng Backlog Current Sprint, low priority, and a current-sprint-by-assignee view hint. Use when Codex needs to create a new Airtable task and the caller provides the task name, with optional overrides for assignee, status, priority, pipeline, table, or other task fields.
---

# Croft Airtable Task Creation

Use this skill to create task-like records in the Croft Airtable base. The caller must provide `name`; if it is missing or blank, ask before creating anything.

Read [create workflow details](references/create-workflow.md) for overrideable parameters, known task tables, view-hint behavior, request shape, and examples.

## Defaults

- Base: `Croft` -> `appgRWEMtYCttCkjO`
- Table: `Eng Backlog` -> `tbla72plmclVzubFK`
- Assignee: `Will Akins` -> `usr6eB31TRW0oMiY5`
- View hint: `Current Sprint by Assignee (2 weeks)`
- Priority: `Low`
- Status: `To Do`
- Pipeline: `Current Sprint`

Treat these as defaults, not hard-coded limits. Allow caller overrides for table, assignee, priority, status, pipeline, due date, acceptance criteria, tags, and requester.

## Connector Behavior

- The Airtable connector does not expose view names or view ids.
- Treat `view_hint` as semantic intent only.
- The connector rejected collaborator-field filtering in testing, so resolve assignee ids locally before writing.
- Use `typecast: true` when creating records.

## Workflow

1. Resolve the base and table. Use known mappings first; inspect schema for unknown tables with `mcp__codex_apps__airtable._list_tables_for_base`.
2. Resolve the assignee. Default to Will. For another person, fetch a light table slice and match collaborator id, email, then case-insensitive display name. Ask if not confident.
3. Build fields. Always set the table primary field from `name`; add defaults or overrides for assignee, priority, status, and pipeline; add optional fields only when provided.
4. Create the record with `mcp__codex_apps__airtable._create_records_for_table`.
5. Confirm what was created in a clean summary.

## Field And Output Rules

- Do not create blank or placeholder-only records.
- Use the requested table's verified primary field.
- Add `Due By` and `Acceptance Criteria` only when provided.
- Start with a one-line confirmation naming the task and table.
- Include effective assignee, priority, status, pipeline, view hint, and record id when returned.
- Mention when a named view was approximated.
- Do not dump raw schema or irrelevant field ids.
