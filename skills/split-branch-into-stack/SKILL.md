---
name: split-branch-into-stack
description: Split one large branch or PR into smaller, correct, iterative branches by inspecting the diff, understanding code dependencies, and using non-interactive git commands to create mergeable slices.
---

Use this skill when the user asks to split one large branch or giant PR into multiple smaller branches or PR-sized slices.

Read [splitting playbook](references/splitting-playbook.md) for recommended commands, branch/PR guidance, verification, and example output.

## Inputs

- Default `source_branch` to the current branch.
- Default `base_branch` to `main`.
- Accept optional desired slice count, file/area constraints, branch prefix, and local-only versus PR-ready output.

## Source Of Truth

- Read `git diff` and `git diff --stat` for `base_branch...source_branch`.
- Read relevant code to understand coupling before splitting.
- Each slice must be correct and mergeable, not a precursor that depends on a later fix.

## Core Rules

- Build the split plan before creating branches.
- Each slice has one clear goal.
- Keep public contract changes together across code and specs.
- Keep tests with the behavior they validate and migrations with code that requires them.
- If a lower slice would crash, fail tests, or misrepresent behavior without an upper slice, move the fix down or combine slices.
- Prefer a behavior-preserving refactor first when it cleanly unlocks later slices.

## Git Safety

- Do not use destructive commands like `git reset --hard`.
- Create a backup branch from `source_branch` before moving committed work.
- Preserve dirty work explicitly before switching branches; a backup branch does not preserve uncommitted changes.
- Avoid interactive `git add -p`; prefer non-interactive commands.
- Do not discard uncommitted changes. Commit them intentionally, keep them out of the split, or stash only with user approval/workflow.

## Workflow

1. Inspect branch diff and dependency boundaries.
2. Write an ordered slice plan with branch name, goal, and dependency rationale.
3. Preserve uncommitted state if present.
4. Create a backup branch from the original source branch.
5. Create the first slice from `base_branch`; create later linked branches from the prior slice when local stacking is requested.
6. Move changes with cherry-pick when commits are separable, explicit file restore/copy when files map cleanly, or `apply_patch` for mixed hunks.
7. Commit each coherent slice, preferably using `write-commit-name`; include `#CI` only when the prompt explicitly asks to trigger CI, trigger actions, run GitHub Actions, commit with actions, or include a CI marker.
8. Run targeted verification for each slice.
9. Summarize branches, goals, key files, verification, review order, and follow-up.
