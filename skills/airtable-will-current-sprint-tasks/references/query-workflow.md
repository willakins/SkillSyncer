# Query Workflow Details

## Known Task Tables

### Eng Backlog

- Table id: `tbla72plmclVzubFK`
- Primary field `User Story`: `fldhdTkF4pHe49FXR`
- Assignee: `fldtQtk4uIltBSQMX`
- Status: `fldwfDWwcGd6mYNlf`
- Priority: `fldI3AG0dG9Z5nBcJ`
- Due By: `fldPZ8dS5ExQU7HZS`
- Pipeline: `fld8YsMFHrwvIYSGc`
- Last Modified: `flda55fUk5D3xdbsX`
- `Current Sprint` choice id: `selUHNw4PDubBHY91`
- `In Staging` choice id: `selhV5P6JXp3cDsHV`
- `In Prod` choice id: `selfgZAl02cgU3AVN`

### Product & Design Backlog

- Table id: `tblL2pcSmw6jbECCi`
- Primary field `User Story`: `fldS8g7c4JsCGj6Up`
- Assignee: `fld4LQ7Bu26Rd2hJv`
- Status: `fld7a0J3c0YuY8eiN`
- Priority: `fld4CxRmrWDk0pgda`
- Due By: `fldqUv0p5Yiewh8Wq`
- Pipeline: `fldJTPzcHLhTk8jDK`
- Last Modified: `fldL0s2rkpor9nCpv`

### Intake

- Table id: `tblhIvGclMmJw6PFm`
- Primary field `User Story`: `fldoOmBw3ZI21LjXt`
- Assignee: `fldArWBVtimhyuuMz`
- Status: `fldDQ6dnbgeUjArlR`
- Priority: `fldPE3XRcgaN2Zfcl`
- Due By: `fldWABuJ4eyERJlZu`
- Pipeline: `fldfzV3wG1xjFAwGO`
- Last Modified: `fldhGywLjFERuPPsz`

## View-Hint Mapping

Use named views as intent hints and reconstruct them.

- `Current Sprint by Assignee`: default to Eng Backlog, pipeline `Current Sprint`, requested/default assignee, and excluded statuses `In Staging` and `In Prod`.
- `By Assignee`: keep the requested/default table, filter locally by assignee, and preserve status/pipeline defaults unless overridden.

If a user names another view and the connector does not expose it, say you are approximating the view from table plus filter semantics.

## Default Eng Backlog Query Shape

```json
{
  "baseId": "appgRWEMtYCttCkjO",
  "tableId": "tbla72plmclVzubFK",
  "fieldIds": [
    "fldhdTkF4pHe49FXR",
    "fldtQtk4uIltBSQMX",
    "fldwfDWwcGd6mYNlf",
    "fldI3AG0dG9Z5nBcJ",
    "fldPZ8dS5ExQU7HZS",
    "fld8YsMFHrwvIYSGc",
    "flda55fUk5D3xdbsX"
  ],
  "filters": {
    "operator": "and",
    "operands": [
      {"operator": "=", "operands": ["fld8YsMFHrwvIYSGc", "selUHNw4PDubBHY91"]},
      {"operator": "!=", "operands": ["fldwfDWwcGd6mYNlf", "selhV5P6JXp3cDsHV"]},
      {"operator": "!=", "operands": ["fldwfDWwcGd6mYNlf", "selfgZAl02cgU3AVN"]}
    ]
  },
  "sort": [{"fieldId": "flda55fUk5D3xdbsX", "direction": "desc"}],
  "pageSize": 3000,
  "viewType": "list"
}
```

## Example Prompts

- `Use defaults and show my current tasks.`
- `Use the same defaults, but include In Staging.`
- `Show Stuart Hinson's current sprint Eng Backlog tasks.`
- `Search Eng Backlog for tasks containing Stripe assigned to Isaiah.`
- `Search Product & Design Backlog for onboarding tasks assigned to Will.`
- `Approximate the By Assignee view in Intake for Brian Wetzel, excluding Will not Complete.`
