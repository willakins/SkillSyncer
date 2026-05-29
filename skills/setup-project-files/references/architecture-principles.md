# Architecture Principles

Use these principles when turning a new project into a coherent codebase. They are derived from Calypso's current architecture, but should be adapted to the project domain rather than copied literally.

## Purpose First

- Name folders after product capabilities and runtime surfaces, not abstract layering alone.
- Keep source boundaries intention-revealing: commands, screens, jobs, providers, persistence, domain, config, and utilities should mean different things.
- Prefer a small structure that can grow cleanly over a large structure full of placeholders.

## Composition Root

- Keep the app entrypoint focused on runtime composition: load config, create clients, connect storage, wire routes/commands/screens/jobs, start the process.
- Move parsing, business decisions, formatting, provider clients, and persistence operations out of the composition root.
- Make startup fail fast for unsupported modes, missing required config, or unavailable providers.

## Configuration

- Centralize environment parsing, defaults, provider selections, and validation.
- Convert raw strings to typed runtime values at the edge.
- Keep default constants near config parsing.
- Expose user-facing error messages for missing or invalid settings.
- Do not let modules read process environment directly unless they are the config module.

## Boundaries And Providers

- Wrap external systems behind narrow interfaces when the project has multiple implementations or a likely swap point.
- Use factories or explicit selection functions to resolve providers.
- Make unsupported provider selections throw at startup.
- Keep provider clients responsible for wire formats and API details.
- Keep provider platform/adapters responsible for translating provider behavior into project concepts.
- Keep shared provider helpers in provider-local `shared/` modules when they are not useful elsewhere.

## Domain And Side Effects

- Put pure rules in domain/core/shared modules.
- Keep side effects at boundaries: HTTP, CLI, desktop shell, database, filesystem, network, engine loop, scheduler, or renderer.
- Pass dependencies into workflows instead of importing global mutable state.
- Make multi-step state changes transactional when partial success would corrupt behavior.
- Check invariants before writes and keep failure paths from recording success.

## Runtime Surfaces

- Treat each surface as a first-class boundary:
  - CLI commands: parse, dispatch, execute, format responses.
  - HTTP APIs and webhooks: verify, parse, authorize, execute.
  - UI screens: route, state, components, services.
  - Games: loop, input, simulation, rendering, assets.
  - Desktop apps: main process, preload/bridge, renderer, OS integration.
  - Background jobs: scheduler orchestration separate from task behavior.
- Keep parsing separate from execution when commands or events will expand.

## Persistence

- Put schema, migrations, queries, and state transitions under a persistence boundary.
- Keep business invariants close to state transitions.
- Use transactions for multi-step changes that must succeed or fail together.
- Prefer explicit functions such as `markThingProcessed` or `recordDeployment` over broad generic query helpers.

## Tests

- Mirror user-visible behavior surfaces: commands, routes, jobs, providers, config, domain, integration.
- Test pure behavior directly and cheaply.
- Test adapters at the boundary with mocked transport or local fixtures.
- Include at least one high-level flow test when the starter structure wires multiple modules together.
- Avoid tests that only assert file existence or implementation wiring unless wiring is the behavior.

## Documentation

- Document the architecture that exists now.
- Keep setup commands and file maps synchronized with actual scripts and manifests.
- Record important invariants and extension points in AGENTS or docs.
- Avoid aspirational docs that imply missing features are implemented.
