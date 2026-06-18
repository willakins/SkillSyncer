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
skillsync resolve
skillsync clone
skillsync open
skillsync org
skillsync config
```

The current scaffold implements `status`, mutating `import`/`install` for selected shared skills, safe local-only `export`, `pull`, `publish`, conservative `sync`, conflict `resolve`, git-backed `clone`, local `open`, local organization metadata through `org`, and `config`.

### `skillsync status`

Shows configured paths, local-only skills, repo-only skills, changed skills, invalid skill directories, and git status for the shared library checkout. If a `skillsyncer.json` manifest is present, status includes the library name and skill metadata. Invalid manifest errors are shown without blocking plain folder discovery.

### `skillsync import` / `skillsync install`

Copies selected skills from the shared library into the local skills directory. Calling the command without `--all` or skill names still shows the status preview.

Supported flags:

```bash
skillsync import --all
skillsync import <skill-name>
skillsync import --dry-run
skillsync install --all
skillsync install <skill-name>
skillsync install --dry-run
skillsync install --backup
skillsync install <skill-name> --overwrite
skillsync install --all --overwrite --dry-run
```

`import` should be the user-facing verb for bringing shared skills onto the current computer. `install` can remain as an alias if it reads better in scripts.

Shared-only skills are installed directly. Skills that already exist locally are skipped unless `--overwrite` is passed. Overwrite creates a backup by default; `--no-backup` disables that safety guard only for the current command.

### `skillsync export <skill-name>`

Copies a local-only skill into the repository skill tree so it can be reviewed and committed.

```bash
skillsync export --all
skillsync export <skill-name>
skillsync export --all --dry-run
```

The command skips skills that already exist in the repository because those need an overwrite review and, eventually, conflict handling.

### `skillsync pull`

Runs a fast-forward git pull for the shared library and then shows the resulting sync status. It uses the current upstream unless `--remote` and `--branch` are configured or passed.

### `skillsync publish`

Commits and pushes selected shared-library skill directories.

```bash
skillsync publish <skill-name> --message "Publish my skill"
skillsync publish --all -m "Publish skill updates"
```

This command stages selected skill directories only. It does not intentionally include unrelated files outside the selected skill pathspecs.

### `skillsync sync`

Command for the common happy path:

1. Pull latest repository changes.
2. Install selected repository updates locally.
3. Export selected local skill changes into the repository.
4. Commit and push selected repository changes.

This command remains conservative. It stops when conflicts require user choice. By default it pulls, installs shared-only skills, exports local-only skills, and publishes exported skills. Use `--no-pull` or `--no-publish` to skip those steps.

### `skillsync resolve`

Resolves changed-on-both-sides skills only when an explicit action is selected.

```bash
skillsync resolve --all --use-library
skillsync resolve sentry-triage --keep-device
skillsync resolve --all --skip
```

`--use-library` installs the shared version locally after backing up the device version. `--keep-device` exports the device version into the shared library after backing up the shared version.

### `skillsync clone` / `skillsync open`

Connects SkillSyncer to a git-backed or existing local library.

```bash
skillsync clone git@github.com:acme/engineering-skills.git ./engineering-skills
skillsync clone git@github.com:acme/engineering-skills.git --target-dir ./engineering-skills --branch main
skillsync open ./engineering-skills
skillsync open ./engineering-skills/skills
```

`clone` uses local git credentials. `open` stores an existing library root or skills directory. If the selected folder contains `skillsyncer.json`, SkillSyncer resolves `skillsPath` from that manifest.

### `skillsync org`

Stores local organization and library metadata without storing skill contents.

```bash
skillsync org list
skillsync org register-library --organization acme --library-id engineering --name "Engineering"
```

The local organization model supports owners, admins, maintainers, members, viewers, groups, libraries, recommended skills, optional skills, and installed skill tracking in settings.

### `skillsync config`

Shows or updates local configuration such as the Codex skills directory, shared library skills directory, remote, branch, and backup directory.

```bash
skillsync config
skillsync config --library-skills-dir ./skills --local-skills-dir ~/.codex/skills
skillsync config --backup-dir ~/.codex/skillsyncer-backups
skillsync config --remote origin --branch main
```

Settings are stored as JSON in `~/.config/skillsyncer/settings.json` by default. `--settings-file <path>` can be used for tests or alternate profiles.

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
