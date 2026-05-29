# Worktree Setup Playbook

Use this reference after the skill is selected.

## Preflight

Collect:

- `git status -sb`
- current branch
- configured remotes
- `git worktree list`
- requested base branch, defaulting to `main`
- ordered planned branch names

Do not discard or overwrite unrelated local work. If the current worktree is dirty, do not reuse it for a new branch.

## Base Update

Update the base branch non-interactively:

```bash
git fetch origin main
git switch main
git pull --ff-only origin main
```

Replace `origin` and `main` consistently when the user requests another remote or base.

## Branch And Worktree Setup

Run `scripts/setup_worktrees.py` from the skill directory. Useful options:

- `--repo <path>` points at the setup repository.
- `--base-ref <branch>` uses the updated base.
- `--workspace-root <path>` overrides the sibling `<repo>-worktrees` default.
- `--use-current-worktree` reuses the current worktree for the first branch when clean and requested.
- `--open-code` opens VS Code for newly created extra worktrees when the CLI exists; avoid it when database setup must run first.

The script verifies the base ref, rejects duplicate branch names, reuses registered worktrees, refuses unregistered existing paths, and prints JSON with `worktrees`, `warnings`, `created_branch`, `created_worktree`, `uses_current_worktree`, and `code_opened`.

## Follow-Up Setup

For every JSON entry where `created_worktree` is true, invoke `setup-worktree-database` with:

- `--source-worktree <original setup worktree>`
- `--worktree <created worktree path>`

Run database/task-link setup before opening editors, starting Rails servers, or assigning workers. Prefer launching editors yourself with `code -n <worktree>` after setup succeeds. If setup blocks, report the branch/path and exact blocker.
