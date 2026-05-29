---
name: address-codex-concerns
description: Validate and address Codex review concerns on the current branch. Use when asked to triage Codex review findings, inspect review comments, decide which concerns are valid, fix only proven issues, and report each concern. Do not use for general code review, unrelated test failures, or creating new skills.
---

# Address Codex Concerns

**UTILITY SKILL. INVOKES:** git diff, file reads, project tests, linters. **FOR SINGLE OPERATIONS:** validate a provided concern set and repair one coherent valid batch.

Read [triage workflow](references/triage-workflow.md) before editing files.

## USE FOR:

- "address these Codex concerns"
- "fix the valid Codex review findings"
- "check whether these Codex comments are real and fix them"
- Another skill needs a disciplined triage-and-fix pass.

## Examples

- `address these Codex concerns: src/app.ts:42: possible null crash`
- `fix only the valid review findings from this Codex output`

## DO NOT USE FOR:

- General PR review or finding new issues.
- Product test failures without review concerns.
- Creating or repairing skills.
- Ambiguous product-intent changes without asking the user.

## Workflow

1. Normalize provided concerns from JSON, inline `path:line: text`, or plain text.
2. Validate each concern against current branch files, lines, diff, callers, and tests.
3. Classify each as `valid`, `invalid`, or `needs_user_input`.
4. Fix only valid concerns, in one coherent batch, with the smallest behavior-preserving change.
5. Run the smallest useful verification once.
6. Report every concern in the required status table.

## Troubleshooting

- Missing file or line: mark `needs_user_input`; do not guess.
- Generated or binary target: mark `invalid` and point to the source file.
- Failed verification: stop, report logs, and ask before another repair attempt.

## Output

Return a short summary and always include this Markdown table header:

`| Concern ID | File | Line(s) | Type | Status | Action Taken | Notes |`

Do not replace the table with bullets.
