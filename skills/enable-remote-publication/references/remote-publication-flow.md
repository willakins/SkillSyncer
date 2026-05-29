# Remote Publication Flow

Use this reference to choose the exact remote publication path before reporting that auth is ready.

## Inputs

Accept an optional `original_task`, such as creating a draft PR, retargeting a PR base, refreshing a title/body, publishing review comments, publishing an approval review, or repairing the latest commit with `#CI`.

Accept optional `push_remote`, `push_target_repo`, `push_target_ref`, and `push_target_source` when another skill already resolved an exact shell-push target. Preserve those values through verification.

If no original task exists, verify generic remote publication and stop after reporting the result.

## Resolve The Target

Read `git remote -v` first.

If a caller supplied `push_remote` and `push_target_ref`, use that exact target as the shell publication path.

If a caller supplied `push_target_repo` and `push_target_ref`, look for a local remote whose fetch or push URL matches that repo. Use that alias if found. If no alias matches and shell push still matters, keep the repo/ref authoritative and guide the user to add or repoint a remote alias for that repo. Do not silently switch to another configured remote.

When there is no caller-supplied target and shell push matters, resolve the branch push remote in this order:

1. `branch.<name>.pushRemote`
2. `remote.pushDefault`
3. the branch upstream remote
4. the sole remote from `git remote -v`, only when exactly one exists

When multiple remotes exist and no push remote or exact target is known, stop and ask which remote should receive the first publication. Do not assume `origin`.

When an upstream exists, confirm that it is the intended remote head for this workflow and that the local branch name matches that remote branch before treating plain `git push` as safe. Otherwise use an explicit `HEAD:<target-head-ref>` only when the target ref is known; if it is not known, clarify before verifying.

## Match The Capability

Shell git push is required whenever the blocked workflow must publish new committed local branch content. GitHub app access can create or mutate a PR only after the branch content is already published.

Use `gh` checks for PR creation, title/body refreshes, draft/ready state changes, or base retargets when the workflow depends on `gh`. Global `gh auth status` is not enough by itself; confirm the exact repo or PR path. For author-owned PR title/body edits or draft-state changes, confirmed authorship can be enough even if base repo permission is read-only. Base retargeting needs the exact `gh pr edit --base` path to be verified.

For GitHub app approval reviews, inline review comments, PR conversation comments, and replies to review threads, check that the needed app tool exists and that the target repo or PR is readable. If no non-mutating permission probe exists, report the path as ready to attempt, not fully verified.

Generic app or connector write access does not prove unrelated `gh` mutations, and `git push --dry-run` does not prove PR creation or review publication.

## Verification Commands

Use the verification command that matches the later real mutation:

- Explicit normal push to known ref: `git push --dry-run <push-remote> HEAD:<push-target-ref>`
- First publication with no upstream: `git push --dry-run <push-remote> HEAD`
- Force-push repair to known ref: `git push --dry-run --force-with-lease <push-remote> HEAD:<push-target-ref>`

For `gh pr create --dry-run`, use it only when the exact head branch is already fully published and the probe will not trigger a git push. Otherwise confirm shell push plus repo-level `gh` access and report PR creation as ready to attempt.

For draft-state changes, verify the matching direction: `gh pr ready` for draft-to-ready and `gh pr ready --undo` for ready-to-draft.

For title/body refreshes, verify the specific subset of `gh pr edit PR_NUMBER --title TITLE --body-file BODY_FILE --repo OWNER/REPO` that the task needs.

For base retargets, verify `gh pr edit PR_NUMBER --base BASE --repo OWNER/REPO`.

If git output fails only because a pager is missing, retry with `git --no-pager ...` before treating it as auth failure.

## Setup Guidance

Prefer read-only checks and user-run setup commands. Do not run auth/bootstrap commands automatically unless the user explicitly asks.

For HTTPS with GitHub CLI, suggest:

```bash
gh auth login
gh auth setup-git
```

For SSH, confirm a usable key exists, have the user add the public key to GitHub, verify SSH auth, then switch the remote to `git@github.com:owner/repo.git` only after SSH works.

If shell push needs an exact PR-head repo with no local remote alias, tell the user to add or repoint a local alias for that repo, then verify against that alias.

## Output

When the path is verified, return:

- remote status
- verification command that succeeded
- working auth path
- one-line resume prompt when `original_task` exists

Example:

```text
Remote publication is working.

Verified with: git push --dry-run fork HEAD
Working path: git push over HTTPS via GitHub CLI credential setup

Reply `continue` if you want me to resume creating the draft PR.
```
