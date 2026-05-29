---
name: delegate-feature-branches
description: Assign planned feature branches with existing worktrees to Codex sub-agents for parallel implementation and draft PR publication. Use when a branch plan and worktree map already exist and the user asks for delegation, workers, sub-agents, or parallel Codex execution. Do not use for planning, worktree setup, single-branch work, or monitoring-only requests.
---

# Delegate Feature Branches

**UTILITY SKILL. INVOKES:** multi-agent workers, `implement-in-logical-commits`, `draft-pr-until-green`.

## USE FOR:

- `Use $delegate-feature-branches ...`
- Assigning each planned worktree to a sub-agent.
- Parallel implementation across already planned branches.
- Existing plan includes branch, worktree, goal, and validation.

## DO NOT USE FOR:

- Planning or splitting branches; use `plan-feature-branches`.
- Creating worktrees; use `setup-feature-worktrees`.
- Single-branch work; use `implement-in-logical-commits`.
- Monitoring only; use `monitor`, `monitor-ci`, or `draft-pr-until-green`.

## Workflow

1. Keep one branch with the main agent unless told otherwise; assign one worker per extra branch.
2. Give each worker: worktree, branch, goal, scope, validation, and completion contract.
3. Tell workers not to revert others' work and to adapt to concurrent changes.
4. Spawn workers in parallel, then keep the local branch moving.
5. Collect PR links, CI state, commits, validation, and blockers.

## Examples

```text
You own branch <branch> in <worktree>.
Goal: <goal>
Scope: <files>
Validation: <commands>
Use $implement-in-logical-commits, then $draft-pr-until-green. Return PR link, CI state, commits, validation, blockers.
```

## Troubleshooting

- Push/auth/PR failure: capture the exact blocker; do not publish that branch.
- Branch conflict: stop the affected worker; report files and branches.
- Not independently reviewable: do not publish; report reason and regrouping.

## Output

Return short Markdown with branch-owner map, worktrees, PR/CI state, validation, commits, and blockers.
