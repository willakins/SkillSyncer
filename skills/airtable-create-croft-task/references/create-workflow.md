# Create Workflow Details

## Overrideable Parameters

Allow the caller to override these while keeping defaults for anything omitted:

- `base`
- `table`
- `view_hint`
- `assignee`
- `priority`
- `status`
- `pipeline`
- `due_by`
- `acceptance_criteria`
- `tags`
- `requested_by`

## Known Task Tables

### Eng Backlog

- Table id: `tbla72plmclVzubFK`
- Primary field: `User Story`
- Assignee field: `Assignee`
- Priority field: `Priority`
- Status field: `Status`
- Pipeline field: `Pipeline`
- Due date field: `Due By`
- Acceptance criteria field: `Acceptance Criteria`
- Default assignee id for Will Akins: `usr6eB31TRW0oMiY5`
- Default priority: `Low`
- Default status: `To Do`
- Default pipeline: `Current Sprint`

### Product & Design Backlog

- Table id: `tblL2pcSmw6jbECCi`
- Primary field: `User Story`
- Assignee field: `Assignee`
- Priority field: `Priority`
- Status field: `Status`
- Pipeline field: `Pipeline`
- Due date field: `Due By`
- Acceptance criteria field: `Acceptance Criteria`

### Intake

- Table id: `tblhIvGclMmJw6PFm`
- Primary field: `User Story`
- Assignee field: `Assignee`
- Priority field: `Priority`
- Status field: `Status`
- Pipeline field: `Pipeline`
- Due date field: `Due By`
- Acceptance criteria field: `Acceptance Criteria`

## View-Hint Mapping

Use named views as intent hints and reconstruct them.

- `Current Sprint by Assignee (2 weeks)`: default to Eng Backlog, pipeline `Current Sprint`, requested/default assignee, priority `Low`, and status `To Do`.
- `By Assignee`: keep the requested/default table, assign to the requested/default assignee, and preserve other defaults unless overridden.

If a user names another view and the connector does not expose it, say you are approximating that view through field defaults.

## Default Eng Backlog Create Request

```json
{
  "baseId": "appgRWEMtYCttCkjO",
  "tableId": "tbla72plmclVzubFK",
  "typecast": true,
  "records": [
    {
      "fields": {
        "User Story": "<required name>",
        "Assignee": ["usr6eB31TRW0oMiY5"],
        "Priority": "Low",
        "Status": "To Do",
        "Pipeline": "Current Sprint"
      }
    }
  ]
}
```

## Example Output

```markdown
Created `Add automation codex skills to improve team efficiency` in Eng Backlog.

- Assignee: Will Akins
- Priority: Low
- Status: To Do
- Pipeline: Current Sprint
- View hint applied: Current Sprint by Assignee (2 weeks)
```

## Example Prompts

- `Use defaults and create a task named "Fix worker import validation".`
- `Create an Eng Backlog task for Stuart Hinson named "Review WAFLA billing edge cases".`
- `Create a Product & Design Backlog task named "Prototype onboarding timeline card" with priority High.`
- `Create a task named "Document DS-160 export workflow" and add acceptance criteria about CSV completeness.`
