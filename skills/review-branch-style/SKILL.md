---
name: review-branch-style
description: "Use when asked to review PRs or branches only for style-guide, AGENTS.md architecture, UI consistency, maintainability, shared-pattern, and S* code-quality findings."
---

# Review Branch Style

**UTILITY SKILL. INVOKES:** changed file list or pinned diff, `style-guide.md`, `AGENTS.md`. **FOR SINGLE OPERATIONS:** style/code-quality review only.

Use for style-only PR/branch reviews or the style slice of merge-readiness review.

## DO NOT USE FOR:

- Correctness, security, performance, CI, merge-conflict, or runtime bug review, unless the issue is a documented standards violation.
- Publishing comments, approving PRs, fixing code, full review coordination, or browser UI validation.

## Inputs

- Require changed files or a pinned diff.
- Read `style-guide.md` for changed UI and `AGENTS.md` for architecture rules.

## Workflow

1. Check only standards: visual language, theme/white-label awareness, accessibility basics for new interactions, layer boundaries, readability, reuse, and shared patterns.
2. Raise only material maintainability concerns: wrong-layer UI logic, documented visual violations, weak domain separation, or unrelated hygiene churn.
3. Do not report correctness issues unless they violate documented style or architecture rules.
4. Number findings `S1`, `S2`, ...; prefer `path:line`, otherwise `general-comment-only`.

## Output

- No issues: `Code quality: The code meets the repo's style-guide and code-quality expectations.`
- Issue: `S1 -> \`path/to/file.rb:line\` -> review comment`
- General: `S2 -> general-comment-only -> review comment`

## Examples:

- `S1 -> \`app/views/orders/show.html.erb:42\` -> This hard-coded color bypasses style-guide.md theme tokens.`

## Troubleshooting:

If the diff or standards docs are missing, state the missing input and limit findings to available evidence.
