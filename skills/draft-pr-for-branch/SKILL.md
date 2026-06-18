---
name: draft-pr-for-branch
description: "Create or update a GitHub PR from the current branch: verify scope, commit only intended work, push with git, generate title/body text, open a draft PR, refresh an existing PR, or mark a draft PR ready. Do not trigger CI with #CI unless the prompt explicitly asks to trigger actions, run GitHub Actions, commit with actions, or include a CI marker."
---

# Draft PR For Branch

**UTILITY SKILL. INVOKES:** `write-commit-name`, `write-pr-title`, `write-pr-description`, `enable-remote-publication`, `repair-pr-ci-trigger`, git, GitHub app/MCP, and `gh`. **FOR:** one current-branch PR operation.

Read [Decision guide](references/decision-guide.md) and [Safety rules](references/safety-rules.md) before commits, pushes, or PR mutations.

## USE FOR:

- "draft/create/open a PR for this branch"
- "commit these changes and make a draft PR"
- "refresh this PR title/body"
- "mark this PR ready for review"

## DO NOT USE FOR:

- CI/review monitoring; use `monitor*` or `draft-pr-until-green`.
- Failing-check repair; use `fix-pr-until-green`.
- Branch splitting; use `split-branch-into-stack`.
- Commit-only, review-comment, or review-decision work.

## Workflow

1. Inspect status, local/base diff, pushed tip, open PR state/base/head ref, and required auth.
2. Stop for mixed scope, wrong base, unreviewable stack history, missing auth, unsafe CI-trigger repair, or unverifiable branch state.
3. For `create_pr`, stage intended files only, verify, use linked authoring skills, push with git, then create/reuse/update the PR. New PRs default to draft.
4. For `mark_ready`, leave WIP alone unless explicitly included, refresh stale metadata when possible, then run `gh pr ready`. Trigger CI only when the prompt or caller explicitly asked to trigger actions, run GitHub Actions, commit with actions, or include a CI marker.
5. Return branch, operation, commit, PR title/link/state, publication path, and checks.

## Examples

- "Draft a PR for this branch."
- "Mark this PR ready for review."

## Troubleshooting

- For auth, dirty WIP, diverged history, stale metadata, or failed verification, stop with the exact blocker and next command.
