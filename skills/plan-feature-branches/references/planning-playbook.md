# Planning Playbook

Use this reference after the skill is selected.

## Goal

Produce the smallest truthful plan for implementing the feature:

- understand how the feature fits into the app today
- identify affected code paths and risks
- decide whether the work should stay in one branch or split into several independent branches
- define validation for each branch or for the single-branch plan

## Repo Context

Read enough surrounding code to understand the current contract and likely regression surface. For Rails repos, inspect the real app surface:

- routes
- controllers
- models
- schema
- components or presenters
- views
- services and jobs
- adjacent specs

Prefer existing abstractions and local patterns over new structure unless the feature requires it. Note data model, permission, background job, and user-visible workflow boundaries.

## Branch Strategy

Prefer one branch unless multiple branches clearly improve reviewability.

Split into multiple branches only when each branch is independently correct, can start from updated `main`, and can be reviewed truthfully against `main`. Keep migrations with the code that needs them and tests with the behavior they validate.

If one slice only exists to prepare another slice, it is not an independent PR. Say `this is a stack, not a set of independent PRs` when the clean answer is stacked follow-on work.

## Validation

Choose the smallest useful verification surface:

- targeted specs for changed behavior
- lint, typecheck, or build commands when shared contracts changed
- manual UI checks for changed interactive flows
- regression checks around permissions, state transitions, or background jobs

Prefer commands that prove the changed behavior directly.
