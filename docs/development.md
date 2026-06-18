# Development

This project uses npm, TypeScript, Electron Vite, and Vitest. The current app is an initial scaffold with a shared sync planner, provider boundary, optional library manifest support, local organization metadata, persisted settings, selective install support with backups, conflict resolution, local-only export support, git clone/pull/publish wrappers, conservative sync orchestration, replace-local and backup-restore support, and an Electron dashboard.

## Stack

- Electron for the desktop app.
- Electron Vite for desktop development and renderer bundling.
- TypeScript for shared sync logic, CLI code, and Electron code.
- Vitest for tests.
- Node.js filesystem APIs for copy and compare operations.
- Git CLI integration behind a small wrapper module.

npm is the package manager. Keep `package-lock.json` tracked.

## Setup

```bash
npm install
```

## Commands

Run the Electron app:

```bash
npm run dev
```

Run the CLI from source:

```bash
npm run cli:dev -- status
```

Synthesize the AWS backend:

```bash
npm run cdk:synth
```

Typecheck:

```bash
npm run typecheck
```

Run tests:

```bash
npm test
```

Build Electron and CLI output:

```bash
npm run build
```

## Validation

Current validation commands:

```bash
npm run typecheck
npm test
npm run cdk:synth
npm run build
git diff --check
```

## Next Implementation Tasks

1. Add selective GUI update/export preview dialogs.
2. Add manual side-by-side conflict review.
3. Add CLI integration tests for command behavior and exit codes.
4. Add Electron UI checks for the core install/update/export/replace/restore flow.
5. Add GitHub-specific pull request publication behind the provider boundary.
6. Add hosted backend/invite flows only when product demand requires them.
7. Add packaging checks for macOS and Arch Linux.

## Development Rules

- Keep docs accurate as commands are added.
- Do not document a script until it exists in the package manifest.
- Keep generated app builds out of git.
- Keep skill source files in git.
- Do not ignore package lockfiles.
- Prefer small, testable sync modules over embedding filesystem behavior in UI components.
