---
name: github-publish-pr-comment
description: Publish a top-level pull request conversation comment to GitHub for a specific PR, after confirming the exact repo and PR target and keeping the comment body limited to the selected review item text.
---

# GitHub Publish PR Comment

Use this skill when the user wants to publish a general PR comment that should appear in the pull request conversation rather than on a specific file line.

Do not use this skill for inline or file-line review comments. Use `github-publish-inline-review-comment` for those.

## Inputs

- Require `repo_full_name`.
- Require `pr_number`.
- Require the exact comment body to publish.

## Workflow

1. Resolve the exact target from explicit user input or trusted local context.
   - `repo_full_name` must be an `owner/repo` string.
   - `pr_number` must identify a pull request in that repo, not a general issue.
   - If the repo, PR number, or intended target is ambiguous, ask before posting.
2. Confirm the target before posting by checking PR metadata when the GitHub app or `gh` can read it.
   - Verify at least the repo, PR number, title, and open/closed state.
   - If metadata cannot be read, only proceed when the user explicitly supplied the repo and PR number.
3. Use the GitHub app MCP issue-comment creation tool for the write when available.
   - If that tool is unavailable, use `gh pr comment` against the confirmed repo and PR.
   - Do not use review-submission APIs for a top-level PR conversation comment.
4. Publish exactly the supplied comment body.
   - Do not add wrapper text like `Publishing comment ...`.
   - Do not add unrelated review summaries.
   - Do not edit, summarize, reformat, or prefix the comment body.
5. If the write result is unclear, check the PR conversation for the exact body before retrying.
   - Do not retry blindly; avoid duplicate comments.
6. Return a short success or failure status.

## Output

- Success:
  - `Published a top-level PR comment to PR #123.`
- Failure:
  - `Could not publish the top-level PR comment to PR #123: ...`
