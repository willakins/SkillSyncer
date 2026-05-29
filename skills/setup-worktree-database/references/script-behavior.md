# Script Behavior

## Defaults

- Infer the app database prefix from `config/database.yml` development database, such as `croft_development` to `croft`.
- Name target databases from the target worktree directory name, sanitized for Postgres:
  - `croft` becomes `croft_development` and `croft_test${TEST_ENV_NUMBER}`.
  - `backburner-3` becomes `croft_backburner_3_development` and `croft_backburner_3_test${TEST_ENV_NUMBER}`.
- Preserve Rails parallel test suffixes by writing `.env.test` with `${TEST_ENV_NUMBER}`.
- Copy every existing source test database matching the source test prefix, such as `croft_test`, `croft_test2`, and later numbered databases.
- Link only the target worktree's `.vscode/tasks.json` to the canonical `croft/.vscode/tasks.json` when that shared task file exists.

## JSON Summary

- `env_files`: `.env.development` and `.env.test` status, such as `created`, `unchanged`, or `would_create`.
- `vscode_tasks`: symlink status for `.vscode/tasks.json`, including `created`, `unchanged`, `missing_source`, or `would_replace`.
- `database_copies`: development and test database copy results, including `created_and_restored`, `target_exists`, `same_database`, or `would_create_and_restore`.
- `warnings`: non-ignored env/task files, missing optional source test databases, or missing shared VS Code tasks.

## Force Flags

- `--force-env` replaces existing `.env.development` or `.env.test` files whose content differs.
- `--force-vscode-task` replaces an existing target `.vscode/tasks.json` that is not already linked to the shared task file.
- Do not use either force flag without explicit user approval.
