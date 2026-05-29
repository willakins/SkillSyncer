# Electron Scaffold Reference

Use this reference when implementing the scaffold, writing package scripts/config, or debugging Electron launch failures.

## Baseline Versions

This reference was written for Electron `42.3.0`, Electron Vite `5.0.0`, Vite `8.0.14`, TypeScript `6.0.3`, npm `11.14.1`, and Node.js `26.2.0`.

At task start, run:

```bash
npm view electron version
npm view electron-vite version
npm view vite version
npm view typescript version
```

If Electron is newer than `42.3.0`, update the baseline in `SKILL.md` and this reference. If the newer Electron version changes recommended main/preload format, security defaults, scripts, packaging, or validation, update those sections before finishing.

## Package Setup

Respect existing package-manager signals:

- `pnpm-lock.yaml` -> pnpm
- `yarn.lock` -> yarn
- `package-lock.json` -> npm
- no lockfile -> npm unless the user asked otherwise

For a fresh vanilla TypeScript scaffold:

```bash
npm install --save-dev electron electron-vite vite typescript vitest @types/node
```

Add React, Vue, Svelte, or another renderer framework only when the repo already uses it or the user requests it.

## Recommended Scripts

Adapt command prefixes for pnpm/yarn when needed.

```json
{
  "main": "out/main/index.js",
  "scripts": {
    "dev": "env -u ELECTRON_RUN_AS_NODE electron-vite dev",
    "preview": "env -u ELECTRON_RUN_AS_NODE electron-vite preview",
    "build": "npm run typecheck && electron-vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

On Linux/Wayland or CI-like desktops, add Electron args only if needed:

```json
{
  "dev": "env -u ELECTRON_RUN_AS_NODE ELECTRON_CLI_ARGS='[\"--disable-gpu\",\"--disable-features=Vulkan\"]' electron-vite dev"
}
```

## Electron Vite Config

Use explicit entrypoints and keep Electron external in main/preload bundles.

```ts
import { resolve } from "node:path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ["electron"],
        input: resolve(__dirname, "src/electron/main/index.ts"),
        output: { format: "cjs", entryFileNames: "[name].js" }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: ["electron"],
        input: resolve(__dirname, "src/electron/preload/index.ts"),
        output: { format: "cjs", entryFileNames: "[name].js" }
      }
    }
  },
  renderer: {
    root: resolve(__dirname, "src/electron/renderer"),
    build: {
      rollupOptions: {
        input: resolve(__dirname, "src/electron/renderer/index.html")
      }
    }
  }
});
```

CommonJS output for main/preload is a stable default because Electron's runtime module is CommonJS-oriented. If the existing repo uses ESM for Electron main/preload, preserve that format and verify runtime imports directly.

## Main, Preload, Renderer

Main process:

- create BrowserWindow instances
- register IPC handlers
- own native dialogs, filesystem, shell, git, and OS integration
- call pure/domain services for business rules

Preload:

- expose narrow named methods with `contextBridge`
- avoid exposing raw filesystem, shell, network, git, or arbitrary IPC

Renderer:

- render UI only
- call preload methods instead of Node APIs

Use these BrowserWindow defaults unless the app has a documented reason not to:

```ts
webPreferences: {
  preload: join(__dirname, "../preload/index.js"),
  contextIsolation: true,
  nodeIntegration: false
}
```

## Starter Layout

```text
src/
|-- electron/
|   |-- main/index.ts
|   |-- preload/index.ts
|   `-- renderer/
|       |-- index.html
|       |-- global.d.ts
|       `-- src/
|           |-- main.ts
|           `-- styles.css
tests/
```

Add `src/shared/`, `src/domain/`, or project-specific feature folders only when there is real shared logic to place there.

## Validation

Run:

```bash
npm run typecheck
npm test
npm run build
```

Smoke `npm run dev` when a GUI session is available. If no GUI session exists, say so. If Electron starts the renderer dev server but the desktop window fails, report the exact stdout/stderr blocker.

## Troubleshooting

- `ELECTRON_RUN_AS_NODE=1`: clear it in dev/preview scripts.
- Missing `node_modules/electron/path.txt`: rerun package install or `npx install-electron --no`.
- ESM/CommonJS import failure in main/preload: switch main/preload output to CommonJS or preserve ESM and test imports explicitly.
- Linux Wayland/Vulkan/GPU crash: try `--disable-gpu`, `--disable-features=Vulkan`, or `app.disableHardwareAcceleration()`.
- macOS quarantine: inspect `xattr -l node_modules/electron/dist/Electron.app`.
- Windows launch issues: check antivirus locks, path length, and native build tools.

## Gitignore

Do not ignore lockfiles. Add generated Electron/Node output:

```gitignore
node_modules/
out/
dist/
build/
release/
coverage/
*.log
.env
.env.*
!.env.example
!.env.*.example
```
