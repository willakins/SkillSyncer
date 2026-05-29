---
name: fix-all-specs
description: Repair current-branch RSpec failures for prompts like fix all specs or make specs pass; do not use for CI monitoring, non-RSpec tests, PR review, branch splitting, or run-only requests.
---

Fix branch-caused RSpec failures by selecting the affected spec set, repairing real failures, and committing each major repair round.

**UTILITY SKILL. INVOKES:** `bundle exec rspec`, git status/diff, `write-commit-name`, optional `enable-remote-publication`.

Use for end-to-end RSpec repair on the current branch. Default base is `main`; do not run the full suite unless the branch blast radius requires it.

Read [spec repair workflow](references/spec-repair-workflow.md) before running specs or editing code. Read [publication safety](references/publication-safety.md) before committing or pushing.

## DO NOT USE FOR:

- Non-RSpec projects or product test failures outside the current branch.
- CI monitoring or GitHub Actions repair after a PR already exists.
- General code review, branch splitting, or broad correctness review.
- Requests to only run tests, report status, or execute a single command.

## Workflow

1. Inspect `git status -sb`, the branch diff against `main`, and changed files.
2. Build a concrete affected spec list from changed files and nearby dependencies.
3. Run `bundle exec rspec` with explicit spec paths or line numbers.
4. Fix real branch-caused failures, iterating on the narrowest failing subset.
5. Rerun the full affected spec set; widen only when failures prove broader impact.
6. Commit each major repair round intentionally and push only when [publication safety](references/publication-safety.md) says the target is verified.
7. Stop when affected specs are green, the branch must be split, or an environment blocker remains.

## Output

Summarize review base, affected specs, widened scope, repair commits, and final green commands. Use inline code paths.

## Examples

- `fix all specs`
- `make the failing RSpec tests pass for this branch`

## Troubleshooting

If specs cannot run because setup, dependencies, or database state is broken, stop and report the environment blocker. If branch scope is too mixed, use `split-branch-into-stack`.
