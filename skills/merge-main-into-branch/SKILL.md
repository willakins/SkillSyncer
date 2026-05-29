---
name: merge-main-into-branch
description: Fetch the latest `origin/main`, merge it into the current branch, resolve merge conflicts, finish the merge commit non-interactively, and push the synced branch. Use when a branch or PR is behind `main`, GitHub reports merge conflicts, or the user explicitly asks to merge `origin/main` into the current branch.
---

Use this skill for the full branch-update flow: fetch `origin/main`, merge it into the current branch, resolve conflicts, create the merge commit non-interactively, and push the synced branch.

Read [merge workflow details](references/merge-workflow.md) for source-of-truth checks, conflict rules, safety rules, and output fields.

## Defaults

- Repository and branch: current checkout.
- Remote and merge target: `origin/main`.
- Push target: current branch upstream when one exists.
- Flow: non-interactive, preserve git's prepared merge message, push after success unless the user asks for local-only.

## Preconditions

- Inspect `git status -sb`.
- Require a clean working tree before starting a new merge.
- Stop if detached, not on a named branch, or on `main` without explicit instruction.
- If a merge is already in progress, inspect `MERGE_HEAD` and `MERGE_MSG`; continue only when it is clearly the requested `origin/main` merge.

## Workflow

1. Capture branch name, upstream branch, and merge state.
2. Run `git fetch origin main`.
3. Start `git merge --no-ff --no-commit origin/main`; if already up to date, report that no merge commit was needed.
4. If conflicts exist, prefer `fix-merge-conflicts`; otherwise inspect conflicted files, resolve clear conflicts, ask only for genuinely ambiguous decisions, and verify no unmerged paths or conflict markers remain.
5. Finish with `GIT_EDITOR=true git commit`, updating `MERGE_MSG` first only when the branch workflow requires a CI marker such as `#CI`.
6. Push to the configured upstream when present. If push fails, report the failure and do not claim the remote conflict is fixed.
7. Report branch, merge target, push target, conflict status, resolved files, final merge commit subject, and push status.

## Composition

This skill is intentionally thin. Use `fix-merge-conflicts` for active conflict resolution when available. Do not route the final merge commit through the generic `commit` skill, and do not create a second commit after `fix-merge-conflicts` completes a merge.
