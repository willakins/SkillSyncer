---
name: read-sentry-bug-reports
description: Read Sentry issue URLs, short IDs, numeric IDs, event IDs, or recent production errors. Use to summarize impact, evidence, frequency, cause, and next steps from read-only Sentry data.
---

# Read Sentry Bug Reports

**UTILITY SKILL. INVOKES:** Sentry plugin or read-only Sentry API/CLI. **FOR:** issue lookup, event review, incident notes.

Turn Sentry data into concise incident notes. Stay read-only, redact sensitive data, and separate facts from inference. Read [Sentry reporting guide](references/sentry-reporting.md) for the field checklist.

## USE FOR:

- Sentry issue URL, short ID, numeric issue ID, or event ID.
- Recent unresolved errors for a project, environment, or time window.
- Summaries of impact, frequency, evidence, cause, and next steps.

## DO NOT USE FOR:

- Non-Sentry logs, CI failures, analytics, or general debugging without Sentry evidence.
- Code fixes, PRs, issue-status changes, or other mutations.
- Full stack-trace, payload, secret, IP, or full-email dumps.

## Workflow

1. Resolve the target and ambiguity.
2. Confirm read-only access. Prefer the Sentry plugin; if a token is needed, ask the user to set it locally.
3. Fetch only useful details: issue, recent events, and one representative event if needed.
4. Report `Summary`, `Impact`, `Evidence`, `Likely cause`, and `Next steps`; say if no results are found.

## Troubleshooting

- Missing access: report the blocker and stop.
- Weak evidence: mark the cause uncertain.
- Multiple issues: rank by recency or volume.

## Examples

- `Use $read-sentry-bug-reports to summarize ABC-123.`
- `Review latest unresolved production Sentry bugs in checkout.`
