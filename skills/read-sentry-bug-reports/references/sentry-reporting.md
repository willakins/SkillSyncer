# Sentry Reporting Guide

Use the smallest useful Sentry dataset. For a short ID, resolve the issue ID before fetching details. For an event ID, fetch the event first and connect it to the parent issue when possible. For recent-bugs requests, list unresolved issues for the requested project, environment, and time window.

## Facts To Capture

- Issue title, short ID, status, and level.
- First seen, last seen, total event count, and recent frequency.
- Environment, release, culprit, transaction, URL, or route when present.
- Top tags that clarify scope or affected users.
- The most relevant exception type and message.

## Output

Return a compact report:

- `Summary`: one or two plain-language sentences.
- `Impact`: environment, release, frequency, and affected workflow or users.
- `Evidence`: title, short ID, timestamps, culprit or route, and key error text.
- `Likely cause`: the most plausible cause, clearly marked as inference when needed.
- `Next steps`: short, specific debugging or mitigation actions.

## Reporting Rules

- Redact PII such as full emails, IPs, auth tokens, and request payload secrets.
- Do not dump raw stack traces unless the user explicitly asks for them.
- Quote only the most relevant error text.
- If several issues are requested, rank them by recency or volume and summarize each briefly.
