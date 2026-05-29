# Commit Workflow

Use this reference after `SKILL.md` routes to the `commit` skill.

## Goal

Create one truthful commit for the intended change set, using the staged diff or exact in-scope local diff as the source of truth. Keep the remote branch in sync by default when the publication target is already safe and authenticated.

## Defaults

- Default to one commit.
- If files are already staged for the intended commit, treat the staged diff as the commit scope.
- If nothing is staged, stage the exact in-scope local changes for this one commit.
- Use `write-commit-name` to generate the subject line.
- Keep the subject exactly as returned by `write-commit-name`, including the default `#CI`, unless the user explicitly asked to keep CI off.
- Push after the commit by default whenever the remote target is already verified as safe for this branch.
- Treat `commit` and `commit these changes` as commit-and-sync unless the user explicitly asks to keep it local.
- If the user explicitly asks to keep the commit local, skip the push.
- Do not amend existing commits unless the user explicitly asks.
- Do not monitor CI, Codex review, or PR comments after a normal commit request.
- When the user explicitly asks to monitor, watch, or keep an eye on the result after committing, finish the commit and push first, then delegate the post-push work to `monitor` with current-head Codex concern repair authorized unless the user explicitly asks to observe only.

## Source Of Truth

- Read `git status --short --branch` first.
- If staged changes exist, read the staged diff or staged file list before naming the commit.
- If nothing is staged, read the exact in-scope local diff or changed file list before staging.
- An in-scope local diff means only the files the user explicitly named or the cohesive change set implied by the request and current branch context. If unrelated edits are present, ask.
- During commit prep, do not edit the in-scope diff to make it match older instructions or stale conversation context. The current local/staged content is authoritative unless the user explicitly asks for a change, a hook fails and requires a fix, or the diff contains an obvious mechanical error such as conflict markers. If a current hunk seems surprising but is plausibly intentional, leave it unchanged; ask only when the commit scope or resulting behavior is genuinely ambiguous.
- Inspect the branch push target before pushing:
  - current branch name
  - tracked upstream when it exists
  - exact PR head target when another workflow already resolved it
  - configured remotes when first publication might be needed
- If push auth or the exact push target is missing, use the local remote-publication setup skill before trying to publish.

## Safe Push Target

A push target is safe only when all are true:

- The remote and ref are known exactly.
- The target matches the current branch intent or an already-known PR head.
- Authentication has been verified by a non-destructive check or a recent successful push/fetch in this workflow.
- The push does not require force, lease-force, branch rename, or publication to a different branch name.

If any condition is uncertain, commit locally, skip push, and report what needs clarification.

## CI And Commit Subject

- `write-commit-name` owns the subject line.
- Keep the returned `#CI` suffix unless the user explicitly asks to keep CI off, skip CI, avoid CI, or preserve a no-CI subject.
- If the user asks for a custom message, use it only when it remains truthful to the staged diff; otherwise explain the mismatch.
- Do not add body text, trailers, sign-offs, or co-author lines unless the user or repo convention explicitly requires them.

## Scope Rules

- Respect an intentionally staged slice.
- If the worktree contains mixed unrelated changes and the intended commit scope is unclear, stop and ask before staging or committing.
- If staged and unstaged changes touch the same files and the intended scope is unclear, stop and ask instead of guessing.
- Do not silently absorb unrelated untracked files into the commit.
- If a merge, rebase, cherry-pick, or revert is in progress, stop and report the state unless the user explicitly asked to complete that operation.
- Treat submodule or Git LFS pointer changes as high-risk scope. Mention them explicitly before committing.
- In multi-repo or git-worktree contexts, commit only in the current repo unless the user names another repo.

## Detailed Workflow

1. Inspect the worktree and branch state.
   - Read `git status --short --branch`.
   - Determine whether the commit scope is already staged.
   - Check for conflict markers, unmerged paths, and in-progress git operations.

2. Resolve the commit scope.
   - If the intended changes are already staged, keep that staged slice.
   - If nothing is staged and the worktree scope is clear, stage only the intended files for this one commit.
   - Do not "clean up" in-scope hunks during this step based on memory of earlier user preferences; staging is a preservation step, not an implementation step.
   - If the scope is mixed or ambiguous, stop and ask.

3. Generate the commit subject.
   - Use `write-commit-name` on the staged diff for this commit.
   - Do not rewrite the subject unless the user explicitly asks for alternatives or CI-off behavior.

4. Create the commit.
   - Use a normal `git commit -m "SUBJECT"` flow.
   - Do not use `git commit -a`.
   - Do not amend or squash.
   - If the commit fails, report the command output and do not push.
   - If a pre-commit hook fails, leave the worktree as-is, report the hook output, and ask before changing code to satisfy the hook.

5. Decide whether to push.
   - If the user asked to keep it local, stop after the local commit.
   - If an exact push target has already been resolved for this branch, push back to that exact remote/ref.
   - Otherwise, if the branch already tracks an upstream and that upstream has been verified as the intended same-name remote head branch for the current local branch, use plain `git push`.
   - Otherwise, if no upstream exists and there is exactly one remote, first publication to the same-name remote branch may use `git push -u REMOTE HEAD` only when that is clearly the intended target.
   - If the push target is unclear, stop after the local commit and say what must be clarified.
   - If push auth is missing, stop and use the remote-publication setup skill before pushing.
   - If the push target is safe and authenticated, do not stop after the local commit; complete the push in the same workflow.
   - If a push partially fails or reports rejected/non-fast-forward, do not retry with force. Report the remote output and ask whether to fetch/rebase/merge.

6. If monitoring was explicitly requested, invoke `monitor`.
   - Pass the pushed branch or PR target and the pushed head SHA when known.
   - Tell `monitor` this is an immediate post-push commit-and-monitor handoff with Codex concern repair authorized unless the user explicitly asked to observe or report only.
   - Do not inline CI or Codex monitoring logic in this skill.
   - Do not authorize CI repair unless the user explicitly asked for CI repair, monitor-until-green repair behavior, or the caller already granted CI repair authority.

7. Report the result.

## Push Safety Rules

- Do not assume an arbitrary tracked upstream is correct without checking that it matches the intended branch publication target.
- Do not push to a different remote branch name unless that exact target is already known.
- Do not force-push in this workflow.
- Do not create a new remote branch on a guessed remote when multiple remotes exist.
- When the branch already backs an open PR and its exact head repo/ref is known, prefer pushing back to that exact target instead of the local branch generic upstream.

## Safety Rules

- Do not commit unrelated pre-existing changes.
- Do not run `git commit -a`.
- Do not stage broad file sets without confirming they belong in this one commit.
- Do not amend, rebase, or rewrite history unless the user explicitly asks.
- Do not push after a failed commit.
- Do not leave a successful local commit unpushed when the skill default safe-push conditions are satisfied.
- Do not start monitoring from this skill directly; delegate to `monitor` when and only when monitoring was explicitly requested.
- Do not claim checks ran if no checks were run.

## Output Format

Return a short plain-text summary that includes:

- final commit subject
- whether the commit was pushed
- push target when applicable
- checks run, or `none`
- when monitoring was requested: the `monitor` summary
- whether uncommitted changes remain

Example:

```text
Committed 1 change.

Commit: Add Mock Confirmation Code UI Hint #CI
Pushed: Yes
Push target: origin/feature/mock-confirmation
Checks run: none
Uncommitted changes remaining: No
```
