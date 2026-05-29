# AGENTS.md

This file gives repository-local instructions for coding agents working on SkillSyncer.

## Project Purpose

SkillSyncer is intended to make Codex-style agent skills portable across computers and teams. The shared skill collection lives as normal files in this git repository, and the app copies those files into and out of a user's global Codex skills directory.

## Current Scope

The repo currently has an initial TypeScript scaffold with npm, Electron Vite, Vitest, a shared sync planner, a CLI status/preview entrypoint, and an Electron dashboard shell.

Keep the next implementation work focused on:

- Turning preview-only import/export commands into safe mutating copy flows.
- Adding backups before overwriting local skills.
- Adding git pull, status, commit, and push orchestration.
- Persisting user-configured paths.
- Sharing sync logic between the GUI and CLI.

## Source Boundaries

Planned boundaries:

- `skills/`: source-controlled skill files that can be synced to local machines.
- `src/sync/`: filesystem comparison, copy, conflict detection, backups, and git orchestration.
- `src/cli/`: terminal command parsing and CLI presentation.
- `src/electron/`: Electron main process, renderer app, preload boundaries, and desktop-specific integration.
- `docs/`: durable product, architecture, workflow, and development documentation.
- `tests/`: automated tests, currently focused on sync planning.

Do not mix Electron UI code into the sync engine. The CLI and GUI should call the same sync engine so behavior stays consistent.

## Documentation Map

Read these before broad changes:

- `docs/sync-model.md`: before changing file layout, copy behavior, conflict handling, backups, or git sync behavior.
- `docs/architecture.md`: before adding app structure, process boundaries, persistence, or platform integration.
- `docs/cli.md`: before changing terminal commands or flags.
- `docs/gui.md`: before changing the desktop workflow.
- `docs/development.md`: before adding build tooling, package scripts, or validation commands.

Update the relevant doc in the same change when behavior, commands, file layout, or architecture changes.

## Implementation Guidelines

- Prefer TypeScript for app and CLI code unless the project explicitly chooses otherwise later.
- Keep sync operations dry-run capable before they mutate files.
- Treat overwrite behavior as dangerous by default: show diffs or summaries, create backups when replacing local skills, and make destructive actions explicit.
- Use structured filesystem APIs instead of shelling out for file operations.
- Shell out to `git` only through a small wrapper so command behavior, errors, and tests are centralized.
- Make the local skills directory configurable; do not hard-code one user's home path.
- Keep package lockfiles tracked once a package manager is chosen.

## Validation

For documentation-only changes, run:

```bash
git diff --check
```

For code changes, run the narrowest relevant checks, and prefer:

```bash
npm run typecheck
npm test
npm run build
```
