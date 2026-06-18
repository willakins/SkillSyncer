---
name: test-coded-tests
description: Discover the current repository's coded test runner, run the tests, and return clean JSON summarizing totals and failed test files. Use when the user asks Codex to run tests, coded tests, specs, RSpec, npm test, or produce machine-readable test failure output for a repo.
---

# Test Coded Tests

## Overview

Use `scripts/run_tests_json.py` from the repository root. It detects Rails/RSpec first, then Node package tests, runs the best available command, captures noisy runner output, and prints one JSON object to stdout. In Croft-style Rails repos that provide `bin/run-specs`, the script must use `RAILS_ENV=test bin/rails run specs` so specs run through the repo's parallel runner against test databases; when an ignored `.env.test` contains a `DATABASE_URL` with `TEST_ENV_NUMBER`, the script temporarily hides that file during the command so `parallel_tests` can assign per-worker database names, then restores it. When the parallel run fails, it reruns only the failed spec files it can extract from the output and reports that rerun in the JSON.

## Workflow

1. Run:

   ```bash
   python3 /home/will/.codex/skills/test-coded-tests/scripts/run_tests_json.py
   ```

2. If the user supplied specific test paths or runner args, pass them after `--`:

   ```bash
   python3 /home/will/.codex/skills/test-coded-tests/scripts/run_tests_json.py -- spec/models/user_spec.rb
   ```

3. Return the JSON output directly when the user asks for machine-readable output. Otherwise summarize the `summary.failed` count and the `failures[].file` entries.

## Detection

- Croft Rails/RSpec: `Gemfile` plus `bin/run-specs` runs `RAILS_ENV=test bin/rails run specs`, which uses `parallel_rspec`, and reruns extracted failed spec files with `RAILS_ENV=test bin/rails run specs FAILED_SPEC_FILES`.
- Generic Rails/RSpec: `Gemfile` plus Rails/RSpec signals runs `bundle exec rspec --format json`.
- Node: `package.json` runs `npm test`; Jest and Vitest projects get JSON reporter flags when detectable.
- Unsupported repos return JSON with `status: "not_found"` instead of prose.

## Output Contract

The script always writes clean JSON to stdout. Key fields:

- `status`: `passed`, `failed`, `error`, `timeout`, `dry_run`, or `not_found`
- `environment.type`: detected runner such as `croft_parallel_rspec`, `rails_rspec`, `npm_jest`, `npm_vitest`, or `npm`
- `rerun`: present when the Croft parallel runner failed and the script reran the extracted failed spec files
- `summary.failed`: failed example/test count
- `failures`: grouped by filename, with example names, line numbers when available, and short messages
