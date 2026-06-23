---
name: commit
description: Create one intentional git commit from clear local changes, name it with `write-commit-name`, push only to a safe target, and delegate to `monitor` only after explicit commit-and-monitor requests. Use for single commit, commit-and-push, or local-only requests. Do not use for multi-commit, history rewrite, PR creation, force-push, or monitor-only tasks.
---

# Commit

**UTILITY SKILL. INVOKES:** git status, git diff, git add, git commit, git push, `write-commit-name`. **FOR SINGLE OPERATIONS:** one clear commit.

Read [commit workflow](references/commit-workflow.md) before staging, committing, or pushing.

## USE FOR:

- Single commit, commit-and-push, local-only commit, and commit-and-monitor requests.

## Examples

- `commit these changes`

## DO NOT USE FOR:

- Multiple reviewable commits; use `implement-in-logical-commits`.
- Amend, squash, rebase, force-push, or history rewrite requests.
- Opening PRs without a commit request.
- Monitoring an already-pushed branch without a commit request.
- Ambiguous mixed worktrees where the intended commit scope is unclear.

## Terms

- Clear scope: staged slice or cohesive requested diff.
- Safe target: exact remote/ref verified and authenticated.
- CI trigger: the prompt explicitly asks to run CI, trigger actions, run GitHub Actions, or commit with actions.
- CI marker: the prompt explicitly asks to include a CI marker such as `#CI`.

## Workflow

1. Read `git status --short --branch`.
2. Use staged changes as scope, or stage only the clear in-scope local diff.
3. Do not edit in-scope files during commit prep to reconcile them with older conversation state; the current staged/local diff is the source of truth. If a current hunk appears surprising but is plausibly intentional, leave it unchanged and ask only if it makes the commit scope or behavior genuinely ambiguous.
4. Stop and ask if scope, staged/unstaged overlap, merge state, or push target is ambiguous.
5. Generate the subject with `write-commit-name`; do not add `#CI` unless the prompt explicitly requested a CI marker.
6. Run `git commit -m "SUBJECT"`.
7. Push by default only when the exact remote/ref is safe and authenticated; never force-push.
8. If the user explicitly requested CI but not monitoring, create and push an empty `#CI` trigger commit after a successful push so CI appears in the PR checks surface.
9. If monitoring was explicitly requested, hand off to `monitor` after a successful push.

## Troubleshooting

- Merge conflict, failed commit, missing auth, or unsafe push target: stop and report the blocker.
- No changes: make no commit.
- User asked local-only: skip push.

## Output

Report commit subject, pushed yes/no, push target, checks run or `none`, monitoring summary if requested, and whether uncommitted changes remain.
