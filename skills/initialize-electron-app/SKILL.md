---
name: initialize-electron-app
description: Create and configure Electron desktop app repos. Use for initializing Electron, adding Electron/Vite/TypeScript desktop shell, main/preload/renderer structure, secure IPC, or macOS/Linux desktop support. Triggers include "initialize this Electron repo", "initalize this electron repo", "scaffold an Electron app", and "add Electron". Do not use for web-only apps.
---

# Initialize Electron App

**UTILITY SKILL.** INVOKES: `setup-project-files` first; also `initialize-project-docs` if docs are missing.

Read [Electron scaffold](references/electron-scaffold.md) before writing config/scripts or debugging launch failures.

## Baseline

Created May 29, 2026 with Electron `42.3.0`. Each use: run `npm view electron version`; if newer, update this baseline and changed Electron guidance before finishing.

## USE FOR:

- "initialize this Electron repo"
- "initalize this electron repo"
- "scaffold an Electron app"
- "add Electron to this project"
- macOS/Linux desktop setup.

## DO NOT USE FOR:

- Web-only apps.
- Packaging-only work.
- General repo layout without Electron.

## Workflow

1. Preserve package manager/lockfile, renderer framework, and module format. Default to npm + TypeScript + Electron Vite + vanilla renderer.
2. Create runnable `src/electron/main`, `src/electron/preload`, `src/electron/renderer`, and focused tests.
3. Main owns windows, IPC, OS/filesystem. Preload exposes narrow `contextBridge`. Renderer has no Node, shell, git, or raw filesystem.
4. Add scripts: `dev`, `preview`, `build`, `typecheck`, `test`. Linux: clear `ELECTRON_RUN_AS_NODE`; add GPU args only if needed.
5. Update README, AGENTS, docs, and `.gitignore` for verified files/commands.

## Examples:

- "initialize this electron repo" -> scaffold app, scripts, tests, docs.

## Troubleshooting

Run typecheck, tests, build, and dev smoke when GUI exists. Report blockers: install failure, missing Electron `path.txt`, ESM/CommonJS mismatch, `ELECTRON_RUN_AS_NODE=1`, or Wayland/GPU crash.
