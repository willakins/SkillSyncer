# Architecture

SkillSyncer is an Electron app scaffold with a CLI that share one sync engine. The sync engine owns filesystem comparison behavior so the GUI and CLI do not drift.

## Core Concepts

- Skill library: the configured shared source of skills. The first implementation reads a local `skills/` directory, usually inside a git repository.
- Repository skill tree: compatibility name for the source-controlled skills stored in this repo under `skills/`.
- Local skills directory: the user's global Codex skills directory, expected to default to `~/.codex/skills` and remain configurable.
- Sync operation: a planned set of file changes from one side to the other.
- Dry run: a sync operation preview that lists additions, updates, removals, conflicts, and backups without changing files.
- Replace local operation: a guarded import path that backs up the local skills directory, deletes it, and recreates it from valid repository skills.
- Restore backup operation: a guarded recovery path that backs up the current local skills directory, deletes it, and recreates it from a selected backup.

## Current Source Layout

```text
src/
|-- sync/
|   |-- backup.ts
|   |-- conflicts.ts
|   |-- compare.ts
|   |-- copy.ts
|   |-- git.ts
|   |-- install.ts
|   |-- index.ts
|   |-- manifest.ts
|   |-- organizations.ts
|   |-- paths.ts
|   |-- plan.ts
|   |-- providers.ts
|   |-- replace.ts
|   |-- settings.ts
|   `-- workflow.ts
|-- cli/
|   |-- args.ts
|   |-- format.ts
|   `-- index.ts
`-- electron/
    |-- main/
    |-- preload/
    `-- renderer/
```

The responsibility split is:

- `sync`: no UI dependencies; safe to call from CLI, Electron main, and tests.
- `cli`: command parsing, output formatting, and process exit codes.
- `electron/main`: OS integration, app windows, dialogs, and privileged filesystem calls.
- `electron/preload`: narrow IPC bridge between renderer and main.
- `electron/renderer`: UI screens and local interaction state.
- `aws`: Cognito auth client, runtime AWS config, cloud metadata API client, and public cloud data types.
- `infra`: CDK stack and Lambda handlers for Cognito, API Gateway, DynamoDB metadata, and repo/org authorization.

## Runtime Boundaries

The renderer should not directly access arbitrary filesystem paths or run git commands. It should request operations through the Electron main process, which delegates to the shared sync engine.

The CLI can call the sync engine directly because it is already running in a trusted terminal process.

## Git Integration

Git is represented by a wrapper module. It supports repository status parsing, fast-forward pull, selected skill commit, and push. Commands can use the current upstream or saved remote and branch settings.

The sync engine should not hide git failures. It classifies common failures for authentication problems, dirty working trees, merge conflicts, missing remotes, non-git directories, and divergence.

## Platform Targets

The first desktop targets are macOS and Arch Linux. Avoid platform-specific assumptions in shared sync code. Keep shell behavior, path expansion, file permissions, and packaging logic isolated behind small adapters when needed.

## Persistence

Settings are persisted as a human-readable JSON file, defaulting to `~/.config/skillsyncer/settings.json` unless an alternate settings file is supplied. Saved settings include:

- Local skills directory path.
- Shared library skills directory path.
- Backup directory path.
- Preferred git remote and branch.
- Local organization, group, member, library, and installed-skill metadata.

Settings should not store secrets. Last successful sync metadata is still future work.

## Provider Boundary

`LibraryProvider` defines the shared-library side of the sync model. The local directory provider reads a configured skill tree, and the git provider layers refresh, status, and publish behavior on top of that same tree. Filesystem comparison, install, export, backup, and conflict behavior remain shared so CLI and GUI results stay consistent.

## Organizations

The current implementation stores organization metadata locally in settings. This covers organization ids, members, roles, groups, registered libraries, recommendations, optional skills, and installed skill tracking without storing skill contents in SkillSyncer. A hosted backend, invites, billing, and SSO mappings remain outside this local app scaffold.

## Authenticated Cloud Flow

The desktop app starts on an embedded Cognito login screen. After sign-in, Electron main keeps the Cognito session and calls the AWS metadata API with the access token. The renderer sees only public session state, repos, organizations, and capability flags.
