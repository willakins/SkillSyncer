# Project Archetypes

Use these sketches as starting points when choosing files. Adapt names to the actual framework and project vocabulary.

## Node Or Server App

Useful when the project has routes, webhooks, API clients, background work, persistence, or deployment surfaces.

```text
src/
  app.*              # composition root
  config.*           # env parsing, defaults, validation
  routes/            # HTTP route wiring and handlers
  services/          # use-case orchestration
  platform/          # external providers and clients
  db/                # migrations, queries, state transitions
  background_jobs/   # schedulers and task runners
  shared/            # pure domain helpers
  util/              # formatting and low-level helpers
test/
  routes/
  services/
  platform/
  db/
  jobs/
  integration/
```

Use provider factories when there are multiple external implementations. Keep route handlers thin and put core behavior into services or domain modules.

## CLI Or Terminal Tool

Useful when the main surface is command invocation.

```text
src/
  cli.*              # process entrypoint, exit codes
  config.*           # env and config file parsing
  commands/
    parsing/         # argv/text parsing
    registry/        # command lookup
    types/           # one command per file or folder
    services/        # command runtime dependencies
  output/            # formatting, tables, JSON, colors
  platform/          # filesystem, network, shell, APIs
  shared/            # pure rules
test/
  commands/
  output/
  platform/
  integration/
```

Separate parse from execute so commands can be tested without shell side effects. Keep terminal formatting out of domain logic.

## Website Or Web App

Useful for browser apps, dashboards, SaaS tools, content sites, and interactive tools.

```text
src/
  app/ or routes/    # framework route structure
  config/            # runtime and build-time config
  features/          # feature-owned UI, state, services
  components/        # shared visual primitives
  services/          # API clients and app workflows
  domain/            # pure app rules
  assets/            # imported static assets
  styles/            # global theme and tokens
test/
  domain/
  features/
  integration/
  e2e/
```

Prefer feature folders when screens own substantial behavior. Keep visual components reusable only when reuse is real.

## Electron Or Desktop App

Useful when there is a desktop shell, OS integration, and a renderer UI.

```text
src/
  main/              # Electron main process and app lifecycle
  preload/           # narrow IPC bridge
  renderer/          # UI app
  shared/            # types and pure helpers safe for both sides
  platform/          # filesystem, OS, native integrations
test/
  main/
  renderer/
  integration/
```

Keep the preload bridge narrow. Do not expose raw filesystem, shell, or network access directly to renderer code.

## Video Game

Useful for browser canvas, native engines, or custom game loops.

```text
src/
  game.*             # composition root and boot
  engine/            # loop, timing, scene management
  input/             # keyboard, pointer, controller
  simulation/        # pure gameplay state and rules
  rendering/         # sprites, canvas, shaders, camera
  audio/             # sound loading and playback
  assets/            # game assets and manifests
  ui/                # menus, HUD, overlays
test/
  simulation/
  engine/
  integration/
```

Use a proven engine or physics/pathfinding library for established hard problems unless the user requests a from-scratch implementation. Keep simulation testable without rendering.

## Library Or Package

Useful when the project exports reusable code instead of running one app.

```text
src/
  index.*            # public exports
  core/              # main implementation
  adapters/          # optional integrations
  errors.*           # public error types
  internal/          # private helpers
test/
  public-api/
  core/
  adapters/
examples/
```

Keep the public API small and intentional. Add examples only when they compile or run.

## Automation Or Data Project

Useful for scripts, ETL, reports, notebooks, or recurring operational workflows.

```text
src/
  config.*           # inputs, env, paths
  workflows/         # orchestrated jobs
  connectors/        # APIs, databases, files
  transforms/        # pure transformations
  outputs/           # reports, exports, notifications
scripts/             # thin runnable wrappers
test/
  transforms/
  workflows/
  connectors/
```

Keep credentials out of notebooks and scripts. Make transforms deterministic and test them with small fixtures.

## Minimal Project

For tiny projects, use fewer folders.

```text
src/
  index.*
  config.*
  core.*
test/
  core.test.*
```

Grow structure only when a second responsibility appears.
