---
name: setup-parallel-rails-command
description: Install, repair, or verify the user's global `parallel rails s` terminal command. Use when the user asks to set up a cross-machine Rails dev launcher that opens a Zellij session with a focused interactive shell, silent background Rails server, stacked Sidekiq/Tailwind/Rails console panes, an open port, and a worktree-specific `.localhost` subdomain.
---

# Setup Parallel Rails Command

## Overview

Install a global `parallel` wrapper that handles `parallel rails s` for Rails worktrees. This is the setup counterpart to the `start-rails-server` skill: use this skill when the command itself is missing, broken, stale, or needs to be installed on a new machine.

## Workflow

1. Check for an existing matching skill or command before installing:

```bash
rg -n "parallel rails|zellij|tailwindcss:watch|sidekiq" "${CODEX_HOME:-$HOME/.codex}/skills" 2>/dev/null
command -v parallel || true
command -v zellij || true
```

2. If `zellij` is missing, install it with the user's package manager. On macOS, prefer:

```bash
brew install zellij
```

3. Install or repair the wrapper with the bundled installer:

```bash
ruby "${CODEX_HOME:-$HOME/.codex}/skills/setup-parallel-rails-command/scripts/install_parallel_rails_command.rb" --ensure-path
```

Use `--install-dir DIR` when the user wants a specific destination. Use `--force` only after inspecting any existing `parallel` executable at that exact path.

4. Verify the command without starting the app:

```bash
parallel rails s --help
parallel rails s --layout-only
```

Inspect the generated layout path from `--layout-only` when repairing the command. It should include a focused left `Shell` pane, a `stacked=true` right column, and `Rails console` with `expanded=true`.

Do not run bare `parallel rails s` during verification unless the user explicitly wants to open the Zellij workspace.

## Installed Command Contract

- Run from a Rails app root with `bin/rails`.
- `parallel rails s` opens or attaches to a Zellij session for the current worktree.
- It chooses the first open port starting at `3000`, unless `PORT`, a bare port, or `--port PORT` is provided.
- It uses `http://<worktree>.localhost:<port>` by default, with `--hostname HOST` available for overrides.
- The Zellij layout includes a focused left shell that starts Rails server silently in the background, redirects Rails output to `tmp/codex/parallel-rails-server-PORT.log`, prints the server URL, stop command, and log tail command, then leaves an interactive prompt. The right column is stacked with `bundle exec sidekiq`, `bin/rails tailwindcss:watch`, and `bin/rails console` expanded by default.
- The Rails server uses `tmp/codex/parallel-rails-server-PORT.pid`, not `tmp/pids/server.pid`, so it does not collide with a manually started Rails server.
- `parallel rails s status` prints the tracked session and URL for the current worktree.
- `parallel rails s stop` kills the tracked Zellij session for the current worktree.
- Non-Rails `parallel ...` invocations forward to another `parallel` executable on `PATH` when one exists.

## Notes

- Prefer a user-writable install directory that is already on `PATH`.
- If the chosen install directory is not on `PATH`, the installer can append an export line to the current shell rc file with `--ensure-path`.
- Avoid overwriting an unrelated existing `parallel` executable without preserving it or installing the wrapper earlier on `PATH`.
