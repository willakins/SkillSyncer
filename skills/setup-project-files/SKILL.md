---
name: setup-project-files
description: Create or refresh source files for young software projects. Use for "setup project files", "initialize this app", "scaffold the repo", "create initial structure", or aligning a young codebase with README, docs, manifests, and AGENTS instructions.
---

# Setup Project Files

**UTILITY SKILL. INVOKES:** repo inventory, docs, package scripts. **FOR SINGLE OPERATIONS:** source scaffolding.

## USE FOR:

- "setup the project files"
- "initialize this app"
- "scaffold the repo"
- "create the initial structure"
- "make this early repo follow sound architecture"

## DO NOT USE FOR:

- Docs-only setup; use `initialize-project-docs`.
- Electron shell creation; use `initialize-electron-app`.
- Branch planning, PR publishing, CI repair, or reviews.
- Feature work after project structure already exists.

## Workflow

1. Inventory with `rg --files`; read README, AGENTS, docs, manifests, config, lockfiles, source, and tests.
2. Infer purpose, runtime, surfaces, and risks. Ask one question only when structure hinges on the answer.
3. Choose structure using [Architecture Principles](references/architecture-principles.md) and [Project Archetypes](references/project-archetypes.md). Prefer project vocabulary over generic buckets.
4. Create the smallest useful structure: entrypoint or composition root, config, pure domain modules, edge adapters, and focused tests.
5. Keep docs consistent; use `initialize-project-docs` only when onboarding docs are also missing.
6. Validate available commands, new scripts, and `git diff --check`; reread for placeholders, imports, and path drift.

## Guardrails

- No templates, empty folders, unrelated scripts, or aspirational docs.
- Preserve user files and existing conventions.
- Put side effects at edges and pure decisions in core/domain/shared modules.
- Centralize config parsing and validation.

## Examples:

- In scope: "scaffold this CLI repo after reading the README."
- Out of scope: "create README and AGENTS only."

## Troubleshooting:

If no validation commands exist, run smoke checks and report the gap.

## Final Response

Summarize the inferred shape, files changed, validation performed, and assumptions.
