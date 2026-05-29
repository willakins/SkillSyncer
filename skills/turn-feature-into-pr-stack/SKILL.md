---
name: turn-feature-into-pr-stack
description: "Coordinate feature delivery from request to branch/worktree setup, implementation, draft PRs, and CI follow-through. Use when the user wants the whole flow, including branch planning and optional explicit delegation. Do not use for review-only, CI-only, single-step implementation, or branch splitting alone."
---

# Turn Feature Into PR Stack

**COORDINATOR SKILL. INVOKES:** `plan-feature-branches`, `setup-feature-worktrees`, `implement-in-logical-commits`, `draft-pr-until-green`; optionally `delegate-feature-branches`, `split-branch-into-stack`.

## Use For

- Full feature delivery through branch/worktree setup, implementation, draft PRs, and CI.
- Deciding one branch, independent branches, or a stack before work starts.
- Explicitly requested parallel Codex delegation.

## Do Not Use For

- Review, monitoring, CI repair, or publishing an existing PR.
- Known single-branch implementation without orchestration.
- Splitting an already implemented branch; use `split-branch-into-stack`.

## Workflow

1. Plan with `plan-feature-branches`: one branch, independent branches, or stack.
2. Create branches/worktrees from updated `main` with `setup-feature-worktrees`; let it run Rails database setup for new worktrees.
3. Delegate only on explicit request.
4. For each branch, implement with `implement-in-logical-commits`, then publish with `draft-pr-until-green`.
5. Return the plan, worktree map, owners, PR links, CI state, and blockers.

## Defaults

- Default `base_branch` to `main`.
- Prefer one branch unless independent branches clearly improve review.
- Keep the current worktree only when clean.
- Keep PRs draft unless asked otherwise.
- Do not call stacked branches independent PRs.
- Do not skip the planning pass just because the feature request sounds obvious.
- Do not start servers, specs, or workers in a new worktree until database setup completes.

## Example Triggers

- `Use $turn-feature-into-pr-stack to plan, branch, implement, and open draft PRs until green.`
- `Take this feature request, decide one PR or several, and execute the parallel branch flow.`
