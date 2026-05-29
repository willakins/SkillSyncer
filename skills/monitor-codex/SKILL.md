---
name: monitor-codex
description: Ensure Codex review is requested for the current pull request head and monitor Codex review results or concerns. Use when the user asks to request, watch, or monitor Codex review, or when another monitoring workflow needs the Codex-review half.
---

# Monitor Codex

Request or confirm Codex review for the current PR head, then watch for a clean Codex outcome or actionable concerns. This skill is observational by default; it edits code only when repair is explicitly authorized.

Read [Codex review workflow](references/codex-review-workflow.md) for request evidence, stale request handling, concern normalization, acknowledgements, and clean-outcome rules.

## Defaults

- Default `pr` to the current branch's PR.
- Require an open PR; if none exists, return Codex monitoring as `blocked`.
- Track review-request evidence per PR head SHA.
- In normal mode, ensure exactly one Codex review request for the current head before polling.
- In ready-transition mode, do not post the initial `@codex review`; wait for PR description `eyes`.
- Do not treat old comments, old reviews, or previous-head comments as current-head evidence.
- `eyes` means Codex started or acknowledged work; it is not a clean result.
- Use `github-publish-pr-comment` for manual request comments.
- Use `address-codex-concerns` only when repair is authorized.

## Review Request Check

1. Resolve repo, PR number, PR URL, and current head SHA.
2. Reuse request evidence already recorded for this head during the run.
3. In ready-transition mode, inspect PR description reactions and wait briefly for automatic review signal.
4. In normal mode, inspect exact top-level `@codex review` comments. Treat a comment with `eyes > 0` as current-head evidence only when it belongs to the current head.
5. If normal mode still lacks evidence, publish one top-level comment with exactly `@codex review` and record the comment id or URL.
6. If the request remains unacknowledged after a bounded wait, follow stale-request handling in [Codex review workflow](references/codex-review-workflow.md).

## Concern Monitoring

1. Poll PR comments and reviews after request evidence exists; do not post duplicate requests while Codex is in progress.
2. Fetch thread-aware review data before declaring the head clean. Prefer `github:gh-address-comments` when available; otherwise use its script or GitHub GraphQL `reviewThreads`.
3. Normalize Codex output with the linked workflow.
4. If repair is not authorized, report candidate concerns and stop.
5. If repair is authorized, pass validated current-branch concerns to `address-codex-concerns`.
6. Acknowledge fixed concerns only after the fix commit is pushed. Do not mark invalid concerns resolved just to quiet the PR.
7. If invalid concerns are dismissed or disagreed with, request or wait for at most one fresh Codex pass on the same head before returning `blocked`.

## Output

Return PR link, monitored head SHA, request evidence source, Codex state (`requested`, `in_progress`, `clean`, `concerns_found`, or `blocked`), clean evidence when clean, concerns found, repair status, and latest head SHA if it changed.
