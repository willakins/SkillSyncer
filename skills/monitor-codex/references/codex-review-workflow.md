# Codex Review Workflow

## Review Request Evidence

Track evidence per head:

```text
codex_review_requests[HEAD_SHA] = {
  source: ready_description_eyes | existing_comment_eyes | posted_comment,
  evidence: PR description reaction count or comment id/url,
  observed_at: timestamp
}
```

Ready-transition mode:

```bash
gh api -H "Accept: application/vnd.github+json" \
  repos/OWNER/REPO/issues/PR_NUMBER \
  --jq '{id, updated_at, eyes: .reactions.eyes}'
```

Poll every 15 to 30 seconds for up to 2 minutes. Treat `eyes > previous_eyes_count` as strongest evidence when a baseline is known, otherwise treat `eyes > 0` as evidence. If no signal appears, keep monitoring and recheck once after CI settles.

Normal mode:

```bash
gh api -H "Accept: application/vnd.github+json" \
  repos/OWNER/REPO/issues/PR_NUMBER/comments \
  --jq '.[] | select(.body == "@codex review") | {id, created_at, eyes: .reactions.eyes, html_url}'
```

## Stale Request Handling

If a current-head `@codex review` request has `eyes: 0` after a bounded wait and thread-aware polling finds no current-head Codex review output, concerns, or clean signal, delete it:

```bash
gh api -X DELETE repos/OWNER/REPO/issues/comments/COMMENT_ID
```

Then publish one replacement top-level PR comment with exactly `@codex review` and record its id or URL. Do not leave multiple unacknowledged requests for the same head. If the replacement also remains unacknowledged after another bounded wait, return `blocked` unless the caller explicitly asks to keep retrying.

## Clean Outcome

Clean means one of:

- Codex leaves an approval-style review for the current head.
- Codex reacts with thumbs-up to the current-head review request or ready-review surface and no new current-head concern appears after that reaction.
- A fresh current-head Codex review pass completes after the latest request and a thread-aware scan finds no unresolved Codex concerns.

Not clean:

- PR description has only `eyes` evidence.
- Codex has a `COMMENTED` review, inline comment, or top-level concrete concern that still exists on the latest head.
- The agent classified a concern as invalid but has not obtained a fresh clean Codex outcome.

## Concern Normalization

Include unresolved, non-outdated review threads from Codex or automation reviewers. Include top-level PR comments or review bodies from Codex that describe concrete concerns. Ignore approvals, status-only comments, duplicate summaries, resolved threads, and old-head comments.

When a valid concern is fixed and pushed, add a thumbs-up reaction to the original comment and resolve the review thread if a `reviewThread.id` exists. For top-level comments or review bodies without a resolvable thread, add the reaction when possible and report that there is no GitHub thread to resolve.
