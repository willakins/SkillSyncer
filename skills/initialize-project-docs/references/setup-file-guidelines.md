# Setup File Guidelines

Use these guidelines when creating the initial setup files for a project. Prefer project-specific facts from the repository over generic templates.

## README.md

Include:

- Name: Use the repo directory, package name, app name, or explicit product name.
- Purpose: One concrete sentence describing what the project does.
- Status: Include only if it helps avoid misrepresentation, such as "early scaffold", "prototype", or "internal tool".
- Prerequisites: Pull from manifests and tool files, such as `package.json`, `pyproject.toml`, `Gemfile`, `go.mod`, `Cargo.toml`, `Dockerfile`, `.tool-versions`, `.nvmrc`, or `mise.toml`.
- Setup: Commands that can be justified from the repo. Prefer package-manager commands that match the lockfile.
- Usage: Run/development command, entrypoint, or how to open the artifact.
- Testing: Commands from scripts/configs. Do not invent a test suite.
- Configuration: Explain env files and required variables only when present or documented.
- Project structure: Top-level directories with one-line purposes.
- Docs: Link to `docs/README.md`.
- License: Match the license file or package metadata.

Avoid:

- Marketing-copy heroes.
- Badges unless the repo already uses them or CI/project URLs exist.
- Fake screenshots, unsupported roadmap promises, and claims like "production-ready" without evidence.
- Long explanations of obvious package-manager commands.

## AGENTS.md

Include only repository-local instructions:

- What the project is trying to become.
- Where route files, feature code, domain code, shared utilities, tests, docs, data, and server code belong.
- What docs to read before changing major areas.
- Validation commands, including "run the narrowest relevant checks" if full commands do not exist yet.
- Rules for updating docs when architecture, persistence, public APIs, or workflows change.
- Project-specific implementation preferences.

Avoid:

- Repeating generic agent safety or personality rules.
- Making docs a task journal.
- Listing commands that do not exist.
- Over-constraining future implementation before the project has chosen a framework.

## .gitignore

Start with common patterns:

```gitignore
# OS and editor files
.DS_Store
Thumbs.db
.idea/
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json

# Logs and local environment
*.log
.env
.env.*
!.env.example
!.env.*.example

# Temporary files
tmp/
temp/
*.tmp
*.swp
```

Add ecosystem patterns only when the repo uses that ecosystem:

```gitignore
# JavaScript / TypeScript
node_modules/
.expo/
.next/
.nuxt/
dist/
build/
coverage/
.turbo/

# Python
__pycache__/
*.py[cod]
.pytest_cache/
.mypy_cache/
.ruff_cache/
.venv/
venv/

# Ruby
.bundle/
vendor/bundle/
log/
coverage/

# Go
bin/
coverage.out

# Rust
target/

# Java / Kotlin
.gradle/
build/
out/

# Swift / Xcode
DerivedData/
*.xcuserstate
```

Do not ignore:

- Lockfiles such as `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `Cargo.lock`, `poetry.lock`, or `Gemfile.lock`, unless the project has a documented package-specific reason.
- Source code, migrations, seeds, docs, fixtures, public assets, or generated files that the repo already tracks intentionally.
- `.env.example` or other sample config files.

## LICENSE

Licensing affects downstream usage. Use this order:

1. Preserve an existing `LICENSE`, `LICENSE.md`, `NOTICE`, package metadata license, or user-stated license.
2. If the user asked for a specific license, create the canonical license text for that license and insert the correct year and owner.
3. If the project is clearly a private/internal project and the user asked to proceed without choosing a license, use a conservative all-rights-reserved notice instead of an open-source license.
4. If no license intent or owner is clear, ask one concise question before creating the file.

For an MIT license, use the current year and the repository owner, package author, organization, or user-provided owner. If none is reliable, ask.

## docs/README.md

Make the docs index a map, not a second README:

- Explain what belongs in `docs/`.
- Link each doc with one sentence about when to read it.
- State which docs must be updated when changing architecture, APIs, persistence, product flow, or tests.

Example:

```markdown
# Documentation

This folder contains enduring project context and source-of-truth decisions.

- [Architecture](architecture.md): source boundaries and data flow.
- [Development](development.md): local setup, commands, and conventions.
- [Testing](testing.md): test strategy and validation commands.
```

## Starter Docs

Create starter docs only when useful:

- `architecture.md`: Source layout, runtime boundaries, data flow, integration points.
- `development.md`: Local prerequisites, setup, scripts, troubleshooting.
- `testing.md`: Test layers, commands, fixtures, gaps.
- `deployment.md`: Environments, release steps, hosting, secrets.
- `decisions.md`: Lightweight architecture decision log for choices that should not be rediscovered.
- `data.md`: Dataset sources, schemas, privacy, refresh process.
- `api.md`: Public API contracts or service boundaries.
- `workflow.md`: Repeated non-code process or content workflow.

Each starter doc should contain specific facts already known plus a short "Current gaps" section if the area is intentionally not implemented yet.

## Validation Checklist

Before finishing:

- Confirm every command in README or docs maps to a script, config, or established tool in the repo.
- Confirm every linked file exists.
- Confirm `.gitignore` does not hide files that should be tracked.
- Confirm license owner/year are correct or clearly called out as needing user input.
- Run `git diff --check`.
