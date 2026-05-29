---
name: write-pr-title
description: Draft a short, descriptive pull request title when the user asks for a PR title, pull request title, to name this PR, what to call a change, or title options for a branch intended for a PR. Do not use for commit subjects, PR descriptions, release notes, or issue titles.
---

Use this skill when the user asks for a PR title, pull request title, what to call a PR-bound change, or title options for a branch intended for a PR.

## Source of truth

- If the request targets an existing PR, base the title on that PR's exact current remote diff, not local-only WIP.
- If the request targets the current branch, base the title on the exact branch diff the user wants to publish.
- If the current branch already backs an open PR but local commits or worktree changes differ from the published PR tip, do not silently title the PR from that local-only state. Use the remote PR diff for PR-scoped requests, and ask a brief follow-up when a branch-scoped request is ambiguous between the published PR and unpublished local changes.
- Use changed files and the user's stated goal only after pinning the diff source above.
- Prefer the actual behavior change over implementation detail.

## Diff check

1. Identify whether the user is asking about an existing PR, the current branch, or a provided diff.
2. For an existing PR, inspect the PR metadata and remote diff before writing the title.
3. For the current branch, inspect the in-scope branch diff or changed file summary before writing the title.
4. If the user supplied the relevant diff or change summary directly, use that as the source.
5. If the source is ambiguous between published PR state and unpublished local changes, ask one brief follow-up instead of guessing.

## Title rules

- Return one short title unless the user asks for options.
- Use title case.
- Keep it direct and descriptive.
- Do not end with punctuation.
- Avoid vague prefixes like `Updates`, `Various Fixes`, or `Cleanup` unless the diff is truly only cleanup.

## Writing heuristics

- Bug fix titles should usually start with `Fix`, `Prevent`, `Handle`, or `Fallback`.
- Feature titles should usually start with `Add`, `Support`, `Show`, `Allow`, or `Track`.
- Docs or workflow titles should usually start with `Document`, `Clarify`, or `Add`.
- Mention the user-facing surface or workflow when that is clearer than the implementation detail.

## Output format

- Return only the proposed PR title unless the user asks for alternatives.

## Example

`Add Mergeable Slice PR Workflow`

More examples:

- Bug fix: `Fix Employer Worker ID Fallback`
- Docs or workflow: `Document Draft PR Publication Flow`
- Ambiguous branch and PR state: ask whether to title the published PR diff or unpublished local changes.
