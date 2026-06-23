---
name: implement-in-logical-commits
description: Implement code changes safely in intentional commits when asked to implement in logical commits, commit as you go, or split work into reviewable batches.
---

# Implement In Logical Commits

**UTILITY SKILL. INVOKES:** git, checks, `write-commit-name`, `enable-remote-publication`.

Read [Detailed workflow](references/workflow.md) before editing.

## USE FOR:

- Implementing a feature, bug fix, or plan in commit batches.
- "Commit as you go" or "split into reviewable commits".
- Natural checkpoints: refactor, behavior, UI, tests, cleanup.

## DO NOT USE FOR:

- Review, planning, or explanation only.
- One already-staged commit with no implementation; use `commit`.
- Draft PRs, CI monitoring, review repair, or branch stacks; use the narrower skill.
- Rewriting, squashing, amending, or rebasing history unless explicitly requested.

## Workflow

1. Inspect the task, repo instructions, status, branch/upstream, and code.
2. Pick the smallest real commit count; prefer one commit for tightly coupled work.
3. Per slice: define scope/check, edit, validate, stage only that slice, use `write-commit-name`, then commit without `#CI` unless the prompt explicitly asks to include a CI marker on that content commit. Use a separate empty `#CI` trigger commit for ordinary requests to trigger CI or run GitHub Actions after the content commit is published.
4. Push only when the PR head or upstream is verified safe; otherwise use `enable-remote-publication` or stop.
5. Report commits, checks, pushes, and uncommitted work.

## Examples

- "Implement this plan in logical commits."
- "Work through the feature and commit as you go."

## Troubleshooting

- Mixed unrelated changes: do not stage; ask if ownership is unclear.
- Broken intermediate state: use fewer commits.
- Bad earlier assumption: add a follow-up commit.
