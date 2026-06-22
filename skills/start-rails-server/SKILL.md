---
name: start-rails-server
description: Start, bootstrap, reuse, stop, or report the local Rails development stack for the current worktree through the global `parallel rails s` Zellij launcher, using a worktree-specific `.localhost` URL. Use when Codex needs to boot or stop the app locally, install the local launcher on a fresh machine, avoid port and browser-cookie collisions across multiple worktrees, or give the user the exact local URL for the running branch.
---

Use this skill when the user asks for the app to be started or stopped locally, for example:

- `start the rails server`
- `boot this branch locally`
- `find an open port and run the app`
- `give me the local URL for this worktree`
- `stop the local Rails server`

## Goal

Start exactly one local development stack for the current worktree and return a reachable worktree-specific `.localhost` URL.

Read [parallel Rails details](references/parallel-rails.md) for command variants, launcher behavior, failure handling, and output rules.

## Workflow

1. Validate that the target directory is a Rails app root with `bin/rails`.
2. Before starting, verify the launcher dependencies:
   - `command -v zellij`
   - `parallel rails s --help`
3. If Zellij is missing, install it with the system package manager. On macOS, use `brew install zellij`.
4. If `parallel rails s --help` fails or does not print the managed wrapper usage, use the `setup-parallel-rails-command` skill or run its installer:

```bash
ruby "${CODEX_HOME:-$HOME/.codex}/skills/setup-parallel-rails-command/scripts/install_parallel_rails_command.rb" --ensure-path
```

5. Run `parallel rails s` from the target Rails app root in a visible terminal/PTY so the user can attach to the Zellij workspace.
6. Let it pick the next free port starting at `3000` when no port is specified.
7. Return the URL printed on stdout. Use that URL instead of `localhost:<port>` so each worktree gets separate browser cookies.

The bundled helper script performs steps 1-4 and then delegates to `parallel rails s`:

```bash
ruby "${CODEX_HOME:-$HOME/.codex}/skills/start-rails-server/scripts/start_server.rb"
```

## Command

Run from the target Rails repo root:

```bash
parallel rails s
```

If the user explicitly wants a specific port, pass it as a bare argument or with `--port`:

```bash
parallel rails s 3107
parallel rails s --port 3107
```

Stop the three terminals for the current worktree:

```bash
parallel rails s stop
```

Check whether the stack is tracked as running:

```bash
parallel rails s status
```

If the user explicitly wants a URL host, pass it through:

```bash
parallel rails s --hostname backburner-3.localhost
```

## Behavior

- Treat the current working directory as the target worktree.
- Require `bin/rails` to exist in that directory.
- Refuse to start a duplicate stack when tracked terminals are already running for the same worktree.
- Start Rails in `development` and bind it to `127.0.0.1`.
- Start Rails inside the focused left Zellij shell, with Rails output redirected to `tmp/codex/parallel-rails-server-PORT.log`.
- Leave the left pane as an interactive shell that prints the server URL, `parallel rails s stop`, and the Rails log tail command.
- Keep the right Zellij column stacked with Sidekiq and Tailwind collapsed and Rails console expanded.
- Return `http://<worktree-name>.localhost:<port>` by default, sanitized as a DNS label.
- Keep browser sessions isolated across worktrees by avoiding shared `localhost` cookies.
- Print only the final URL on success so the caller can relay it directly.
