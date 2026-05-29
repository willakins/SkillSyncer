---
name: enable-remote-publication
description: "Use when Codex must set up or verify GitHub remote publication after a blocked workflow, including git push auth, exact PR-head targets, force-push repair, gh PR mutation auth, app review/comment readiness, or why can't Codex push. Do not use for normal PR creation after auth works, CI monitoring, branch review, generic git help, or local-only commits."
---

# Enable Remote Publication

**UTILITY SKILL. INVOKES:** `git`, `gh`, GitHub app tools. **FOR SINGLE OPERATIONS:** remote auth/readiness checks only.

Read [remote publication flow](references/remote-publication-flow.md) before choosing a push target or verification command.

## USE FOR:

- Auth or remote setup that blocks another skill from publishing.
- Verifying an exact shell push, `gh` PR mutation, or app review/comment path.
- Explaining the next safe setup step when the target cannot yet be verified.

## DO NOT USE FOR:

- Creating, updating, or monitoring PRs once remote publication already works.
- Committing local changes, branch review, CI repair, or Git tutorials.
- Mutating branches, PRs, comments, or reviews during auth setup.

## Examples

- `why can't Codex push this branch?`
- `set up github auth for Codex`

## Workflow

1. Capture `original_task` and any caller-supplied push target.
2. Inspect remotes, upstream, push overrides, `gh auth status`, and credential or SSH state.
3. Preserve exact caller targets; do not fall back to `origin` or upstream unless the reference says it is intended.
4. Identify required capabilities: shell push, `gh` PR mutation, approval review, review comments, or app-only mutation.
5. Verify non-destructively with the matching dry-run or read-only probe. For app-only paths with no non-mutating probe, say "ready to attempt", not verified.
6. If setup is missing, give exact user-run commands. Do not run auth bootstrap unless asked.
7. Report status, verification command, auth path, and a one-line `continue` prompt when `original_task` exists.

## Troubleshooting

If the same check fails twice, explain the blocker instead of retrying. If git only failed because a pager is missing, retry with `git --no-pager`.
