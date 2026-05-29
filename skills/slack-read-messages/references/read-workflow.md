# Slack Read Workflow

## Retrieval Paths

### Plain Channel Read

Use `slack_read_channel` with the resolved `channel_id`. Set `limit` to the requested count or `5`, paginate with `cursor` if needed, and use `response_format: "detailed"`.

### Sender Filter

1. Resolve the person with `slack_search_users`.
2. If multiple user matches are plausible, list candidates.
3. Use `slack_search_public` for public channels and `slack_search_public_and_private` only for private, DM, or explicitly broad private/all-accessible scope.
4. Search with a query like `in:<#CHANNEL_ID> from:<@USER_ID>`, set `context_channel_id` when available, sort newest first, and set `include_context` only when nearby context helps.
5. Paginate until enough matches are found or results are exhausted.

### Reply Count Or Reply Activity

1. Search candidate thread activity with the narrowest appropriate search tool.
2. Use base query `in:<#CHANNEL_ID> is:thread`, set `context_channel_id` when available, sort newest first, and use `after` for reply windows.
3. Treat search results as candidates; deduplicate by thread and prefer entries exposing `Reply count:`.
4. Confirm candidates with `slack_read_thread`, verifying reply count and reply-window activity.
5. Return matching parent messages, optionally with a short latest-reply note.

## Reply Window Mapping

Map natural-language windows to Unix timestamps:

- `hour`: now minus `3600` seconds
- `3 hours`: now minus `10800` seconds
- `8 hours`: now minus `28800` seconds
- `day`: now minus `86400` seconds
- `week`: now minus `604800` seconds

For reply-window requests, filter on reply activity, not only the parent message timestamp. Confirm replies with `slack_read_thread`.

## Output Template

```md
**Slack Messages - #<channel>**
`<dow>. <mon> <day> <HH:MM> <TZ>`
**<sender>**

<message text>

---
```

For thread-filtered results, include reply metadata on a separate line:

```md
Replies: 2 | Latest reply: 2:31 EDT
```

## Example Requests

- `Tell me the last 5 messages sent inside the engineering channel on the Croft workspace.`
- `Show me the last 10 engineering messages by Stuart.`
- `Find engineering threads with at least 3 replies.`
- `Show me engineering threads with replies in the last 8 hours.`
- `Read the last 5 messages in engineering by Will with at least 1 reply in the last day.`
