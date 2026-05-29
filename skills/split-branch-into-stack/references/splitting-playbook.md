# Splitting Playbook

## Recommended Commands

Prefer:

- `git switch`
- `git switch -c`
- `git branch`
- `git worktree add`
- `git cherry-pick`
- `git restore --source=<branch> -- <path>`
- `git add <path>`
- `git commit`

Use `git worktree add` when the split is large or multiple parallel worktrees make reasoning easier. After each new Rails worktree, call `setup-worktree-database` with the original source worktree as `--source-worktree` and the new slice worktree path as `--worktree`.

## Branch And PR Guidance

- Local linked branches may be stacked on top of one another.
- Default review guidance assumes opened PRs are reviewed against `main`.
- If the user wants opened PRs from the split, only open slices that stay isolated and truthful against `main`; otherwise keep later slices local until earlier slices land.
- If a slice is only useful as scaffolding and would not be truthful by itself, keep it local or combine it with the dependent slice.

## Example Output

```md
## Slice Plan

1. `job-order-fallbacks`
   - Goal: add the model/service fallback needed to avoid crashes and keep the lower slice correct
   - Why first: later UI and rollup changes depend on this read/write behavior being safe

2. `job-order-worker-id-rollup`
   - Goal: align the missing worker ID modal and summary rollup with the new fallback behavior
   - Why second: it builds on the fallback contract from slice 1

3. `job-order-pr-workflow-docs`
   - Goal: document the mergeable-slice workflow in the PR template, repo docs, and AGENTS guidance
   - Why last: docs-only slice with no runtime dependency

## Verification

- `job-order-fallbacks`: targeted model/service/request specs
- `job-order-worker-id-rollup`: targeted rollup and needs-attention specs
- `job-order-pr-workflow-docs`: manual doc review
```

Use companion skills `write-commit-name`, `write-pr-title`, and `write-pr-description` when commit names, PR titles, or PR bodies are needed.
