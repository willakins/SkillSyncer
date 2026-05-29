# Parallel Rails Details

## Launcher Behavior

- Store state in `tmp/codex/parallel-rails.json`.
- Prefer Zellij when installed so the working shell and all three service processes stay inside one selectable terminal workspace.
- Keep the working shell selected and visually larger than the service panes.
- Fall back to `tmux` in VS Code terminals when Zellij is unavailable.
- Outside VS Code, open external terminal windows when neither Zellij nor `tmux` is selected.
- If a stale state file exists, the launcher cleans it up.
- If a live tracked stack already exists for the same worktree, return its URL instead of starting duplicates.

## Failure Handling

- If Zellij fails to launch, report the launcher error and suggest `--mode tmux` or `--mode external` as a temporary fallback.
- If `tmux` is missing when forcing `--mode tmux`, tell the user to install it with `sudo pacman -S --needed tmux`.
- If no supported external terminal is available outside VS Code, report that `alacritty` or `kitty` is required unless `PARALLEL_RAILS_TERMINAL` is set.

## Output

- Success: the single URL printed by the script, such as `http://backburner-3.localhost:3004`
- Failure: a short error that points to the relevant log file
