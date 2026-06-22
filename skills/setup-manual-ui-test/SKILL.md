---
name: setup-manual-ui-test
description: Set up a local manual UI testing environment for this Rails app by finding suitable existing local records when possible, seeding realistic fallback records only when needed, generating an authorized login entry link, starting or reusing the local app, and returning detailed step-by-step manual test instructions. Use when a user asks to manually test a UI flow, create test data for browser QA, verify a page in the Rails app, or get a link into an authenticated Croft UI state.
---

# Setup Manual UI Test

## Contract

Create a safe local manual UI test setup for a specific Rails UI flow. The final response must include:

- The existing or seeded records and IDs needed to understand the test state.
- Whether existing records were reused or synthetic records were created.
- An authorized entry URL, preferably a one-time `/auth/login/:token` link.
- The exact page or flow where testing begins.
- Step-by-step manual test instructions with expected results.
- Any cleanup or reset notes.
- Verification performed, including whether the local server was started or reused, the running URL, and whether an in-app browser tab was opened.

Do not run against production, staging, demo, or shared databases unless the user explicitly asks and the repo guidance allows it. Prefer development or test-like local records.

## Core Workflow

1. Identify the UI flow and entry point.
   - Read the route, controller, component/view, model, and `db/schema.rb` entries that govern the page.
   - Identify the account role and tenant scope required to authorize the page.
2. Choose a data strategy.
   - Prefer reusing existing local records when they already exercise the requested UI state.
   - Search for the needed tenant, account role, domain records, child records, and edge cases before creating new records.
   - Seed only when the local database does not contain a suitable scenario or the user asks for isolated synthetic data.
3. Choose a seed strategy only if existing records are insufficient.
   - Prefer a Rails runner script using app models/services.
   - In this repo, factories are available in development and test; use them for local-only seed setup when they encode required invariants.
   - Put ad hoc scenario scripts in `tmp/manual_ui_tests/` unless updating this skill's reusable script is the task.
4. Create data only when needed.
   - Create the minimum realistic tenant, account, domain records, and child records needed for the UI to render meaningful states.
   - Label synthetic records clearly with `Manual UI Test` in names or emails.
5. Create an authorized link.
   - Prefer `LoginTokens::Issuer.call` with a relative `redirect_path`.
   - Include `employer_org_id` in employer redirect paths so the login token controller sets the employer org cookie.
   - Build the full URL from the local app host plus `auth_login_path(token:)`.
6. Start or reuse the local app.
   - Prefer the `start-rails-server` skill when available; it owns this repo's `parallel rails s` workflow and bootstraps Zellij/the wrapper on fresh machines.
   - Otherwise run `parallel rails s` from the Rails app root in a visible Codex app terminal/PTY so the user can manage the Zellij session and stop the stack themselves.
   - Do not use `nohup`, background shell jobs, or silent detached `bin/rails server` starts for manual UI testing unless the user explicitly asks for that fallback.
   - Capture the URL printed by `parallel rails s`. If the stack may already be running, use `parallel rails s status` and return the tracked URL.
7. Open the entry URL in the Codex app when possible.
   - Prefer the Browser plugin / in-app browser tools for local web targets and open the generated `login_url` directly.
   - If browser tools are not available in the current session, say so and return the link for the user to open manually.
8. Return manual instructions.
   - Start with the link.
   - Include the account identity, existing or seeded records, and exact test steps.
   - State expected visual/behavioral outcomes at each step.

## Bundled Script

For a ready-made Croft worker-profile job-orders scenario:

```bash
APP_HOST="http://<worktree>.localhost:<port>" # Use the URL printed by `parallel rails s`.
bin/rails runner "${CODEX_HOME:-$HOME/.codex}/skills/setup-manual-ui-test/scripts/croft_manual_ui_seed.rb" \
  --scenario worker-profile-job-orders \
  --host "$APP_HOST"
```

By default, the script first looks for an existing local worker who has at least three job-order employments in one employer org with a verified employer account. It creates a login token for that existing scenario and seeds synthetic `Manual UI Test` records only if no suitable records exist.

Use `--reuse-only` to fail instead of seeding when no existing scenario is found. Use `--force-seed` when isolated synthetic records are preferred.

The script prints JSON with `login_url`, `setup_mode`, record IDs, and manual test steps. Read or adapt it before using it for a different UI surface.

## References

Read [references/croft-rails-manual-ui-test.md](references/croft-rails-manual-ui-test.md) when working in this Rails app. It documents Croft-specific authorization, login-token links, seed record patterns, server setup, and how to write useful manual UI instructions.
