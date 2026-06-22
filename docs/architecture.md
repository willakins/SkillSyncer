# Architecture

SkillSyncer is an Electron app scaffold with a CLI that share one sync engine. The sync engine owns filesystem comparison behavior so the GUI and CLI do not drift.

## Core Concepts

- Repository skill tree: the source-controlled skills stored in this repo under `skills/`.
- Local skills directory: the user's global Codex skills directory, expected to default to `~/.codex/skills` and remain configurable.
- Sync operation: a planned set of file changes from one side to the other.
- Dry run: a sync operation preview that lists additions, updates, removals, conflicts, and backups without changing files.
- Replace local operation: a guarded import path that backs up the local skills directory, deletes it, and recreates it from valid repository skills.
- Restore backup operation: a guarded recovery path that backs up the current local skills directory, deletes it, and recreates it from a selected backup.

## Current Source Layout

```text
src/
|-- sync/
|   |-- compare.ts
|   |-- copy.ts
|   |-- git.ts
|   |-- index.ts
|   |-- paths.ts
|   |-- plan.ts
|   `-- replace.ts
|-- cli/
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

## Runtime Boundaries

The renderer should not directly access arbitrary filesystem paths or run git commands. It should request operations through the Electron main process, which delegates to the shared sync engine.

The CLI can call the sync engine directly because it is already running in a trusted terminal process.

## Git Integration

Git is represented by a wrapper module. It currently supports status, fast-forward pull, and committing/pushing selected or pending skill directories when the current branch has an upstream. The wrapper runs git non-interactively with a timeout so UI callers receive errors instead of hanging on credential or remote prompts. It should grow to:

- Detect repository status.
- Pull from the configured remote.
- Show pending changes.
- Handle branch, remote, authentication, and divergence states more explicitly.

The sync engine should not hide git failures. It should return actionable errors for authentication problems, uncommitted changes, merge conflicts, and missing remotes.

## Platform Targets

The first desktop targets are macOS and Arch Linux. Avoid platform-specific assumptions in shared sync code. Keep shell behavior, path expansion, file permissions, and packaging logic isolated behind small adapters when needed.

## Persistence

No persistence layer exists yet. Expected settings include:

- Local skills directory path.
- Repository skills directory path.
- Backup directory path.
- Preferred git remote and branch.
- Last successful sync metadata.

Settings should be human-readable when possible and should not store secrets.
