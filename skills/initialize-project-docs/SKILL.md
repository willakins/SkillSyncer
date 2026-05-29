---
name: initialize-project-docs
description: Create or refresh the initial project setup and onboarding files for a repository, including README.md, AGENTS.md, .gitignore, LICENSE, and a docs/ folder. Use when Codex needs to bootstrap a new project, fill missing repo basics, make a young project easier to understand, establish agent instructions, or normalize core documentation for software, data, design, operations, research, or other project categories.
---

# Initialize Project Docs

## Overview

Use this workflow to create durable project identity, onboarding, and setup files. Make the files specific to the repository in front of you, preserve existing intent, and avoid generic filler.

Read [setup file guidelines](references/setup-file-guidelines.md) before choosing file contents, docs folder shape, `.gitignore` patterns, or license handling.

## Workflow

1. Inventory the project before writing:
   - Run `python3 <skill-dir>/scripts/project_inventory.py <repo-root>` for a compact summary.
   - Read existing `README*`, `AGENTS.md`, `.gitignore`, `LICENSE*`, `docs/README.md`, package manifests, build files, and any docs referenced from them.
   - Use `rg --files` to understand source layout and major technologies.
2. Decide the project category and maturity:
   - Software app, library, data/science, design/content, operations/process, research, education, or mixed.
   - New scaffold, working prototype, production app, internal tool, public open-source project, or private project.
3. Create or update the core set:
   - `README.md`
   - `AGENTS.md`
   - `.gitignore`
   - `LICENSE` or a clearly named license/notice file
   - `docs/README.md` plus a small set of enduring starter docs when the project needs them
4. Cross-link the files:
   - README points to `docs/README.md` for deeper docs.
   - AGENTS points agents to the docs they should read before broad changes.
   - docs index names each doc's purpose and source-of-truth boundaries.
5. Validate:
   - Run `git diff --check`.
   - Run relevant formatting or markdown checks if already available in the repo.
   - Re-read generated files for false claims, placeholder text, broken links, and stale commands.

## File Standards

Keep these rules in the main workflow:

- Preserve existing custom sections unless they are clearly wrong or duplicated.
- Prefer accurate short docs over exhaustive aspirational docs.
- Do not invent product claims, production status, security posture, API stability, install commands, or deployment processes.
- Mark uncertain setup commands as "likely" only in your reasoning; do not write uncertainty into finished docs unless it is useful to the reader.
- Do not ignore lockfiles, migrations, documentation, source assets, or example env files in `.gitignore`.
- Treat licensing as user-significant. Reuse an existing license signal from package metadata or an existing file. If no license/owner is clear, ask one concise question or create a visibly conservative private-project notice only when the user asked you to proceed without more input.

## Final Response

Summarize which files were created or updated, call out any license assumption or unresolved input, and list validation performed. Keep the response concise.
