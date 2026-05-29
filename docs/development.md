# Development

This project uses npm, TypeScript, Electron Vite, and Vitest. The current app is an initial scaffold with a shared sync planner, CLI status previews, local-only export support, replace-local support, and an Electron dashboard.

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
npm run build
git diff --check
```

## Next Implementation Tasks

1. Add safe mutating import/update flows around `src/sync/copy.ts`.
2. Add selective overwrite backups before updating individual local skills.
3. Add git pull orchestration and broader git state handling.
4. Add persistent settings for repository path, local skills path, backup path, remote, and branch.
5. Add CLI integration tests for command behavior and exit codes.
6. Add Electron UI checks for the core install/update/export/replace flow.
7. Add packaging checks for macOS and Arch Linux.

## Development Rules

- Keep docs accurate as commands are added.
- Do not document a script until it exists in the package manifest.
- Keep generated app builds out of git.
- Keep skill source files in git.
- Do not ignore package lockfiles.
- Prefer small, testable sync modules over embedding filesystem behavior in UI components.
