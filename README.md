# SkillSyncer

SkillSyncer is an Electron desktop app and command-line tool scaffold for syncing Codex-style agent skills between a git repository and a user's local global skills directory.

## Status

This repository has an initial TypeScript project structure. It currently includes:

- A shared sync planner that compares shared skills with device skills.
- A provider boundary for local-directory and git-backed skill libraries.
- Optional `skillsyncer.json` manifest discovery and validation.
- Embedded Cognito login and AWS metadata API client architecture.
- CDK infrastructure for Cognito, API Gateway, DynamoDB metadata, and Lambda routes.
- Local organization/library metadata in settings.
- A CLI entrypoint with `status`, mutating `import`/`install`, safe local-only `export`, `pull`, `publish`, `sync`, `resolve`, `clone`, `open`, `org`, and `config`.
- An Electron dashboard that displays shared/device skill lists, shows difference counts, installs shared-only skills, resolves conflicts, and can share device-only skills.
- A settings view with Graphite, Paper, and Midnight appearance options plus persisted sync paths and git defaults.
- A guarded reset-device flow that backs up device skills before loading all shared skills.
- A backup restore flow that can load a previous local skills backup back into place.
- Vitest coverage for the sync planner, provider planning, settings, manifest loading, conflict resolution, workflow sync, install backups, export, replace/restore, and CLI parsing.
- A tracked `skills/` directory for repository-owned skill files.

Richer selective GUI update flows, side-by-side conflict review, hosted organization services, GitHub pull request publication, and packaged desktop releases are still future work.

## Problem

Agent skills are useful when they live on the computer where the coding agent runs, but that makes them difficult to move between machines or share across a team. SkillSyncer treats the shared skill collection as a git repository and provides safer workflows for copying skills into and out of the local global Codex skills folder.

## Workflows

### Install or update local skills

1. Pull the latest skill files from git.
2. Show which local skills will be added, changed, or removed.
3. Copy the selected skills into the configured local skills directory.
4. Preserve or back up local-only skills before overwriting them.

### Publish local skills back to the repository

1. Inspect the local skills directory for new or changed skills.
2. Copy selected skill files into the repository's tracked skill tree.
3. Review the git diff.
4. Commit and push the changes so another machine or teammate can pull them.

## Components

- Electron desktop app: dashboard for guided import/update/export flows.
- CLI executable: repeatable terminal commands for status and sync previews.
- Sync engine: shared logic used by both the GUI and CLI for path discovery, file comparison, copy operations, conflict checks, and git integration.
- Git-backed skills directory: plain files committed to the repo, without a separate database.

## Repository Layout

Current layout:

```text
.
|-- README.md
|-- AGENTS.md
|-- package.json
|-- package-lock.json
|-- docs/
|   |-- README.md
|   |-- architecture.md
|   |-- cli.md
|   |-- development.md
|   |-- gui.md
|   `-- sync-model.md
|-- skills/
|   `-- README.md
|-- src/
|   |-- cli/
|   |-- electron/
|   |   |-- main/
|   |   |-- preload/
|   |   `-- renderer/
|   `-- sync/
`-- tests/
    |-- cli/
    `-- sync/
```

`skills/` is the source-controlled skill tree. It should contain skill directories with `SKILL.md`, not generated exports or opaque archives.

## Development

Install dependencies:

```bash
npm install
```

Run the Electron app in development:

```bash
npm run dev
```

Run the CLI in development:

```bash
npm run cli:dev -- status
```

Synthesize the AWS backend:

```bash
npm run cdk:synth
```

Validate the project:

```bash
npm run typecheck
npm test
npm run build
```

Prerequisites:

- Node.js for the Electron app and CLI.
- Git for pulling, committing, and pushing skills.
- A configured local Codex skills directory, expected to default to `~/.codex/skills` and remain user-configurable.

## Documentation

Start with [docs/README.md](docs/README.md). The docs define the architecture, sync model, GUI behavior, CLI command surface, and development conventions.

## License

SkillSyncer is licensed under the MIT License. See [LICENSE](LICENSE).
