# CLI

The CLI provides the same core workflow surface as the GUI for users who prefer terminal commands or automation.

The package executable name is `skillsync`.

## Command Principles

- Every mutating command should support `--dry-run`.
- Every command that overwrites local files should show a clear plan first unless a non-interactive flag is supplied.
- Commands should return non-zero exit codes for conflicts, validation failures, git failures, and partial sync failures.
- Machine-readable output should be available with `--json` for automation.

## Commands

```bash
skillsync status
skillsync import
skillsync install
skillsync export <skill-name>
skillsync pull
skillsync publish
skillsync sync
skillsync config
```

The current scaffold implements `status`, `import`, and `install` as preview commands. `export --all` and `export <skill-name>` copy local-only skills into the repository skill tree without overwriting existing repository skills. The other commands are reserved and return a not-implemented response.

### `skillsync status`

Shows configured paths, local-only skills, repo-only skills, changed skills, and invalid skill directories.

### `skillsync import` / `skillsync install`

Previews copying selected skills from the repository skill tree into the local skills directory.

Useful planned flags:

```bash
skillsync import --all
skillsync import <skill-name>
skillsync import --dry-run
skillsync install --all
skillsync install <skill-name>
skillsync install --dry-run
skillsync install --backup
```

`import` should be the user-facing verb for bringing shared skills onto the current computer. `install` can remain as an alias if it reads better in scripts.

### `skillsync export <skill-name>`

Copies a local-only skill into the repository skill tree so it can be reviewed and committed.

```bash
skillsync export --all
skillsync export <skill-name>
skillsync export --all --dry-run
```

The command skips skills that already exist in the repository because those need an overwrite review and, eventually, conflict handling.

### `skillsync pull`

Planned command that will run `git pull` for the repository and then preview which repository skills can be installed or updated locally.

### `skillsync publish`

Planned command that will commit and push exported skill changes. This command should refuse to commit unrelated changes unless the user explicitly selects them.

### `skillsync sync`

Planned command for the common happy path:

1. Pull latest repository changes.
2. Install selected repository updates locally.
3. Export selected local skill changes into the repository.
4. Commit and push selected repository changes.

This command should remain conservative. It should stop when conflicts require user choice.

### `skillsync config`

Planned command to show or update local configuration such as the Codex skills directory, repository skills directory, remote, branch, and backup directory.

## Exit Codes

The exact codes can be finalized as commands gain mutating behavior. Current planned categories:

- `0`: success.
- `1`: general failure.
- `2`: invalid command, invalid options, or reserved command without implementation.
- `3`: sync conflict that needs user choice.
- `4`: git failure.
- `5`: filesystem permission or path failure.

## Development Usage

Run the CLI from source:

```bash
npm run cli:dev -- status
npm run cli:dev -- status --repo-skills-dir ./skills --local-skills-dir ~/.codex/skills
```

Build the CLI:

```bash
npm run cli:build
```
