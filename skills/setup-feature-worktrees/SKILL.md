---
name: setup-feature-worktrees
description: Create planned feature branches and git worktrees from an updated base branch, optionally reusing a clean current worktree, then set up databases/task links through setup-worktree-database. Use when the user already has a branch plan or ordered branch list and wants local git/worktree setup. Do not use for branch planning, implementation, PR publication, CI repair, merge-conflict repair, or database setup alone.
---

# Setup Feature Worktrees

Prepare local worktrees after a branch plan exists. **UTILITY SKILL. INVOKES:** `scripts/setup_worktrees.py`, `setup-worktree-database`, git, optional `code`.

Read [worktree setup playbook](references/worktree-setup.md) before mutating git state.

## USE FOR:

- Direct `$setup-feature-worktrees` requests.
- Creating planned branches/worktrees from updated `main` or another base.
- Setting up extra Rails worktrees with isolated databases and shared task links.

## DO NOT USE FOR:

- Planning branches; use `plan-feature-branches`.
- Implementing or committing; use `implement-in-logical-commits`.
- Delegating existing worktrees; use `delegate-feature-branches`.
- Publishing PRs, monitoring CI, resolving conflicts, or database-only setup.

## Required Behavior

1. Require a branch plan or ordered branch names.
2. Inspect status, current branch, remotes, and worktrees before mutations.
3. Update the base with fetch/switch/pull `--ff-only`; default `main`/`origin`.
4. Run `scripts/setup_worktrees.py` without editor launch; branch from the updated base only.
5. Reuse the current worktree only for the first planned branch and only when clean.
6. For each `created_worktree: true`, invoke `setup-worktree-database` before editors.
7. Then open `code -n <worktree>` when available; report and continue if unavailable.

## Output

Return branch names, paths, reused/created worktrees, database/task-link results, editor status, and blockers.

## Troubleshooting

- Dirty current worktree: do not repurpose it.
- Existing non-worktree path: stop and report it.
- Missing `code`: continue without editor launch.
