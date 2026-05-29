---
name: start-rails-server
description: Start, reuse, stop, or report the local Rails development stack for the current worktree with separate terminals for Rails server, Tailwind watch, and Sidekiq, using a worktree-specific `.localhost` URL. Use when Codex needs to boot or stop the app locally, avoid port and browser-cookie collisions across multiple worktrees, or give the user the exact local URL for the running branch.
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

1. Run `parallel rails s` from the target Rails app root.
2. Let it attach a Zellij session when available, with a prominent working shell plus smaller selectable service panes for:
   - `bin/rails server`
   - `bin/rails tailwindcss:watch`
   - `bundle exec sidekiq`
3. Let it pick the next free port starting at `3000` when no port is specified.
4. Return the URL printed on stdout. Use that URL instead of `localhost:<port>` so each worktree gets separate browser cookies.

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
- Return `http://<worktree-name>.localhost:<port>` by default, sanitized as a DNS label.
- Keep browser sessions isolated across worktrees by avoiding shared `localhost` cookies.
- Print only the final URL on success so the caller can relay it directly.
