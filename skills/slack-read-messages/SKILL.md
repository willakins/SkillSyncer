---
name: slack-read-messages
description: Read, list, and filter Slack messages or threads from a channel. Use when Codex needs to answer requests like "show me the last 5 messages in engineering", "read recent Slack messages from Croft engineering", "find messages by Stuart in #engineering", or "show engineering threads with 2+ replies in the last 3 hours". Default to the Croft Slack workspace, the `#engineering` channel, and the latest 5 matching messages when the user does not specify them.
---

# Slack Read Messages

Use this skill to read recent Slack messages with sensible defaults and optional sender or thread filters.

Read [Slack read workflow](references/read-workflow.md) for retrieval details, reply-window mapping, output template, and examples.

## Read-Only Rule

This skill is strictly read-only. Do not send messages, reply in threads, create drafts, schedule messages, create canvases, or use any Slack write tool. Return results in chat only.

## Defaults

- Workspace: connected Croft workspace unless another available workspace is named.
- Channel: `#engineering` when omitted.
- Count: latest `5` matching messages when omitted.
- Search scope: public channels by default.
- Filters combine with `AND`.

Use private-channel, DM, or all-accessible search only when explicitly requested or after asking for consent.

## Supported Filters

- `channel`: channel name such as `engineering`.
- `count`: number of messages or threads.
- `sender`: person name from phrases like `by Stuart` or `from Will`.
- `min_replies`: thread reply minimum such as `2+ replies`.
- `reply_window`: reply activity in the last `hour`, `3 hours`, `8 hours`, `day`, or `week`.

## Workflow

1. Resolve the channel with `slack_search_channels`; default search is `engineering` with `channel_types: "public_channel"`.
2. Prefer an exact channel match. If none exists, present closest candidates instead of guessing.
3. Choose the narrowest retrieval path:
   - `slack_read_channel` for plain latest messages.
   - `slack_search_users` plus `slack_search_public` for public sender filters.
   - `slack_search_public` plus `slack_read_thread` for public reply-count or reply-window filters.
   - `slack_search_public_and_private` only for explicit private, DM, or broad private/all-accessible scope.
4. Scope searches with `in:<#CHANNEL_ID>` and `context_channel_id` when supported.
5. Return only the requested count, newest first.

## Output Rules

- Use the message-block format in [Slack read workflow](references/read-workflow.md) unless the user asks otherwise.
- Format timestamps in the user's current timezone and derive the correct timezone abbreviation from the message date.
- Keep reactions or reply metadata on a short line only when present.
- Summarize long messages after the opening clause.
- If no messages match, say so and echo the filters used.
- Do not invent channel names, user identities, or reply counts.
- If thread filters cannot be confirmed from `slack_read_thread`, say the result is unverified.
