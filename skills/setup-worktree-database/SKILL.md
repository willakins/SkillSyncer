---
name: setup-worktree-database
description: Create isolated local PostgreSQL databases for a new Rails git worktree. Use after creating a Rails worktree or when a worktree still points at shared development/test databases; runs the bundled setup script to write local env files, copy local seed databases, and link shared VS Code tasks.
---

# Setup Worktree Database

**UTILITY SKILL. INVOKES:** bundled Python script, git, local Postgres. **FOR SINGLE OPERATIONS:** per-worktree DB, env, and VS Code task setup.

Use after creating a Rails worktree, before Rails, specs, Spring, Sidekiq, or VS Code terminals run there.

## USE FOR:

- New local Rails worktrees needing isolated `development` and `test` databases.
- Croft/backburner worktrees seeded from another local worktree.
- Repairing worktrees whose env files still point at shared databases.

## DO NOT USE FOR:

- Creating git worktrees, planning branches, or starting app servers.
- Non-Rails repos or remote database setup.
- Copying from staging, demo, production, or non-local databases.
- Dropping, resetting, or overwriting databases.

## Workflow

1. Pick the source worktree. Default to the one that created the target unless the user names another.
2. Resolve `scripts/setup_worktree_database.py` relative to this skill directory.
3. Run from the source worktree:

```bash
python3 <resolved-skill-dir>/scripts/setup_worktree_database.py \
  --source-worktree <source> --worktree <target>
```

4. Read the JSON summary. Stop on warnings about env or VS Code task files not ignored by git.
5. Restart stale Rails, Spring, VS Code, or worker processes for the target.

## Guardrails

- Use `--dry-run` for preview.
- Use `--force-env` or `--force-vscode-task` only after explicit approval.
- Existing target databases are skipped; temporary dumps are removed.

## Examples

- Preview: `python3 <script> --worktree ../new-worktree --dry-run`
- Explicit source: `python3 <script> --source-worktree /path/to/croft --worktree /path/to/backburner-4 --db-prefix croft`

See [script behavior](references/script-behavior.md) for naming defaults, JSON fields, and command options.
