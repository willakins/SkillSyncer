# Documentation

This folder contains enduring project context for SkillSyncer. It should explain how the product is intended to work, where implementation belongs, and which behavior must stay consistent between the desktop app and CLI.

## Docs Map

- [Architecture](architecture.md): planned process boundaries, source layout, and platform responsibilities.
- [CLI](cli.md): proposed terminal command surface for importing, updating, exporting, and publishing skills.
- [Development](development.md): local development expectations and what still needs to be added once implementation starts.
- [GUI](gui.md): planned Electron desktop workflows and user-facing states.
- [Sync Model](sync-model.md): source-of-truth rules, file layout, conflict handling, backups, and git behavior.

## Update Rules

Update these docs when changing:

- Architecture or source layout: update `architecture.md`.
- CLI commands, flags, or exit behavior: update `cli.md`.
- Desktop workflows, screens, or confirmation behavior: update `gui.md`.
- File copy semantics, conflict handling, backups, or git workflow: update `sync-model.md`.
- Build, test, lint, package, or release commands: update `development.md` and the root `README.md`.
