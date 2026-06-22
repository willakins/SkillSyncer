# Parallel Rails Details

## Bootstrap

- The maintained local launcher is the global `parallel rails s` wrapper installed by the `setup-parallel-rails-command` skill.
- Before starting a server on a fresh machine, verify both dependencies:
  - `command -v zellij`
  - `parallel rails s --help`
- If Zellij is missing on macOS, install it with `brew install zellij`.
- If the wrapper is missing, broken, or not the managed wrapper, run:

```bash
ruby "${CODEX_HOME:-$HOME/.codex}/skills/setup-parallel-rails-command/scripts/install_parallel_rails_command.rb" --ensure-path
```

- The helper script at `scripts/start_server.rb` performs these checks, installs Zellij with Homebrew when possible, installs the wrapper in `$PARALLEL_RAILS_INSTALL_DIR` or `$HOME/.local/bin`, and then delegates to `parallel rails s`.

## Launcher Behavior

- Store state in `tmp/codex/parallel-rails.json`.
- Use Zellij as the terminal workspace.
- Use `http://<worktree>.localhost:<port>` by default, with the worktree name sanitized as a DNS label.
- Choose the first open port starting at `3000`, unless `PORT`, `--port PORT`, or a previous tracked state specifies one.
- Keep Rails pidfiles and logs under `tmp/codex/` so the launcher does not collide with a manually started `tmp/pids/server.pid`.
- Delete stale resurrectable Zellij sessions before starting a fresh layout.
- If a live tracked Zellij session already exists for the same worktree, print the URL and attach instead of starting duplicates.

## Layout

- Left side: focused `Shell` pane occupying the full height.
- The left shell starts Rails silently in the background, redirects Rails output to `tmp/codex/parallel-rails-server-PORT.log`, prints:
  - the app URL,
  - `parallel rails s stop`,
  - a `tail -f` command for the Rails log,
  then leaves an interactive shell prompt.
- Right side: one stacked column with `Sidekiq` at the top, `Tailwind watch` below it, and `Rails console` at the bottom.
- Sidekiq and Tailwind are collapsed by default; Rails console is expanded by default.

## Failure Handling

- If `parallel rails s --help` does not print the managed wrapper usage, reinstall the wrapper with the setup skill before starting.
- If Zellij cannot be installed automatically, report the package-manager command the user should run and stop.
- If Rails exits after startup, inspect the Rails log path printed in the left shell or stored in the generated layout.
- Do not use hidden `nohup`, detached background Rails servers, tmux, or external-terminal fallbacks for this workflow unless the user explicitly asks for a temporary fallback.

## Output

- Start success: the wrapper prints the single URL before handing control to Zellij, such as `http://croft.localhost:3002`.
- Status success: `parallel rails s status` prints `running` or `stopped` plus the tracked session and URL.
- Stop success: `parallel rails s stop` kills/deletes the tracked Zellij session and clears the local state file.
