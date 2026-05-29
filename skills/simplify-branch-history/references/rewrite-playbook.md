# Rewrite Playbook

## Defaults

- Default branch is the current branch.
- Default base is `origin/main`.
- Default remote is `origin`.
- Create a local backup branch before rewriting.
- Push the rewritten branch after validation unless the user asks for local-only cleanup.
- Stop before rewriting protected branches: `main`, `master`, `develop`, `development`, `staging`, `production`, or `release/*`.

## Helper Scripts

Use the bundled scripts for deterministic git operations:

- `scripts/inspect_branch_scope.sh [branch] [remote] [base_branch]`
  Fetches the base branch, verifies the worktree is clean, lists branch-only commits, records the original head and expected remote SHA under `.git/codex-simplify-branch-history/`, and prints the rewrite scope.
- `scripts/create_safety_branch.sh [branch]`
  Creates a deterministic backup branch named from the branch and original head SHA.
- `scripts/snapshot_branch_diff.sh [branch] [remote] [base_branch]`
  Saves the current branch diff against the base before commit rewriting.
- `scripts/verify_branch_diff.sh [branch]`
  Verifies the post-rewrite branch diff still matches the saved snapshot.
- `scripts/force_push_rebased_branch.sh [branch] [remote] [expected_remote_sha]`
  Pushes with an explicit `--force-with-lease` pinned to the remote SHA captured before rewriting.

## Detailed Workflow

1. Inspect state.
   - Run `git status -sb`.
   - Confirm the current branch is the branch to simplify.
   - Run `scripts/inspect_branch_scope.sh`.
   - Stop if the script reports no branch-only commits.
2. Create a backup.
   - Run `scripts/create_safety_branch.sh`.
   - Do not continue if backup creation fails.
3. Rebase onto the base when needed.
   - If the branch is behind `origin/main`, run `git rebase origin/main` or another explicit user-requested base.
   - Resolve conflicts by reading the conflicted files in context.
   - Continue only after `git status --porcelain` is clean.
4. Snapshot the intended final diff.
   - Run `scripts/snapshot_branch_diff.sh` after any base rebase and before squashing or recommitting.
5. Rewrite the branch commits.
   - Use interactive rebase when existing commits are mostly worth preserving and only need squash, fixup, reorder, or reword operations.
   - Prefer `git reset --soft origin/main` plus explicit staged commits when the branch has heavy churn and the final logical commits are clearer than the existing sequence.
   - Name commits by durable behavior, not review process, experiments, or temporary implementation steps.
   - Keep commits reviewable: each commit should build on prior commits and avoid knowingly broken intermediate states when practical.
6. Verify the rewrite.
   - Run `scripts/verify_branch_diff.sh`.
   - Run targeted tests or linters appropriate to the changed files.
   - Inspect `git log --oneline origin/main..HEAD` and ensure the new subjects are accurate.
7. Push.
   - Run `scripts/force_push_rebased_branch.sh`.
   - If the explicit lease fails, fetch and inspect the remote branch before deciding whether to incorporate remote changes or retry.

## Commit Planning

Group commits by stable reviewer concepts:

- schema or data shape changes before model/service behavior
- backend behavior before UI that depends on it
- shared infrastructure before feature-specific callers
- tests with the commit that introduces the covered behavior unless the repo convention separates them

Avoid commit names that describe cleanup process, such as `fix tests`, `address review`, `cleanup`, `wip`, `rebase`, or `squash commits`.

## Safety Notes

- Do not rewrite a dirty working tree.
- Do not use `git reset --hard` unless the user explicitly asks for it and the exact target is verified.
- Do not drop branch commits merely because their subjects look obsolete; verify final diff or patch equivalence.
- Do not fetch immediately before the final force push; use the expected remote SHA captured by `inspect_branch_scope.sh` so the lease detects remote changes made during the rewrite.
