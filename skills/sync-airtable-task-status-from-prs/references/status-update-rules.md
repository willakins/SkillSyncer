# Status Update Rules

## Status Order

Treat the code-workflow status order as:

1. `To Do`
2. `In Progress`
3. `Needs Code Review`
4. `In Staging`
5. `Ready for Prod`
6. `In Prod`

## Default Update Shapes

For a merged Eng Backlog task:

```json
{
  "baseId": "appgRWEMtYCttCkjO",
  "tableId": "tbla72plmclVzubFK",
  "typecast": true,
  "records": [
    {
      "id": "<record_id>",
      "fields": {
        "Status": "In Prod",
        "Pipeline": "Completed",
        "Date Pushed to Prod": "<merged_at iso8601>"
      }
    }
  ]
}
```

For an open ready-for-review task:

```json
{
  "baseId": "appgRWEMtYCttCkjO",
  "tableId": "tbla72plmclVzubFK",
  "typecast": true,
  "records": [
    {
      "id": "<record_id>",
      "fields": {
        "Status": "Needs Code Review"
      }
    }
  ]
}
```

## Closed-Unmerged PRs

Closed-unmerged PRs often mean work moved to another branch or PR. Surface those items for manual review unless the caller explicitly wants stronger automation.

## Example Prompts

- `Use $sync-airtable-task-status-from-prs to move matched merged tasks to In Prod.`
- `Use $sync-airtable-task-status-from-prs after reconciliation so Airtable status reflects current PR state.`
