---
name: monitor-prod-logs
description: Inspect Croft production application logs in Better Stack. Use when Codex needs to monitor or debug production logs, search recent errors, trace request IDs, tail matching log lines, inspect Better Stack source or connection metadata, or run read-only ClickHouse SQL against the croft-prod-rails Better Stack source.
---

# Monitor Prod Logs

Use this skill for Croft production log debugging through Better Stack.

The bundled CLI creates short-lived read-only ClickHouse query connections through Better Stack, queries the Croft production source, and cleans temporary connections up automatically. It does not store Better Stack API tokens in the skill.

## Credentials

Before running query commands, make a Better Stack global API token available through one of these env vars:

- `BETTERSTACK_API_TOKEN`
- `BETTERSTACK_GLOBAL_API_TOKEN`
- `BETTERSTACK_TEAM_API_TOKEN` only as a legacy fallback; if Better Stack rejects it, use a global token

The script also loads env files without printing secrets:

- `~/.config/codex/monitor-prod-logs.env`
- `.env.local` and `.env` from the current working directory or its parents
- a file passed with the global `--env-file PATH` option

Override the default Croft source with `BETTERSTACK_SOURCE_ID`, `BETTERSTACK_SOURCE_NAME`, `BETTERSTACK_TABLE_NAME`, or `BETTERSTACK_TAIL_URL` when needed.

## Quick Start

Set a reusable shell variable from any working directory:

```bash
SCRIPT="${CODEX_HOME:-$HOME/.codex}/skills/monitor-prod-logs/scripts/monitor_prod_logs.py"
```

Confirm source metadata:

```bash
python3 "$SCRIPT" source-info
```

Search recent logs:

```bash
python3 "$SCRIPT" recent --minutes 15 --limit 50
python3 "$SCRIPT" errors --minutes 30 --limit 50
python3 "$SCRIPT" request REQUEST_ID --minutes 120
python3 "$SCRIPT" recent --minutes 30 --path-contains "/api/v1/timekeeping" --status 422 --limit 25
python3 "$SCRIPT" tail --level error --contains "Sentry"
```

Use SQL only when helper commands are not enough:

```bash
python3 "$SCRIPT" sql "SELECT count() FROM {{logs}} WHERE dt >= now() - INTERVAL 1 HOUR"
```

## Workflow

1. Start narrow.
   - Use a request ID, error class, path fragment, status code, or known message substring when available.
   - Keep time windows small first, then widen only if the first search misses expected events.
2. Prefer `recent`, `errors`, `request`, or `tail` before raw SQL.
   - These commands parse the raw JSON payload locally and print the useful fields.
   - `recent`, `errors`, and `request` default to `--storage complete`, which combines Better Stack hot logs and archived S3 logs.
   - `tail` defaults to `--storage hot` because it polls newly arriving logs.
   - Use `--storage hot`, `--storage archive`, or `--storage complete` when storage choice matters.
3. Treat time carefully.
   - Better Stack `dt` values are UTC.
   - Use `--minutes` for simple lookbacks.
   - Use `--since` and `--until` with explicit offsets for exact windows, such as `2026-06-18T14:30:00-04:00`.
4. If expected rows are missing, validate coverage before concluding Rails never handled the request.
   - Run a count query grouped by hour or minute.
   - Sample `raw` rows for the same window to verify the source payload shape.
   - Pair log checks with production database state when the question depends on whether a user action committed.
5. Use `schema` before ad-hoc SQL when the Better Stack table shape is unclear.
6. Summarize findings instead of pasting large raw log dumps unless the exact payload matters.

## SQL Placeholders

The `sql` command accepts these placeholders:

- `{{logs}}`: complete log coverage, combining hot and archived logs.
- `{{source}}` or `{{hot_source}}`: Better Stack hot `remote(..._logs)` source.
- `{{archive_source}}`: archived `s3Cluster(..._s3)` source. Filter `_row_type = 1` when using it directly.

Read-only SQL is enforced. Use `SELECT`, `WITH`, `SHOW`, `EXPLAIN`, or `DESCRIBE` statements only.

Examples:

```bash
python3 "$SCRIPT" sql <<'SQL'
SELECT
  toStartOfHour(dt) AS hour,
  count() AS total
FROM {{logs}}
WHERE dt >= now() - INTERVAL 6 HOUR
GROUP BY hour
ORDER BY hour DESC
SQL
```

```bash
python3 "$SCRIPT" sql <<'SQL'
SELECT
  dt,
  JSONExtractString(raw, 'message') AS message
FROM {{logs}}
WHERE dt >= now() - INTERVAL 30 MINUTE
  AND positionCaseInsensitive(raw, '/api/v1/timekeeping') > 0
ORDER BY dt DESC
LIMIT 50
SQL
```

## Connection Commands

Temporary connections are created and removed automatically for one-off queries.

Persist a reusable connection for a longer debugging session:

```bash
python3 "$SCRIPT" connect --valid-for-minutes 480
```

Remove the saved connection and revoke it remotely:

```bash
python3 "$SCRIPT" disconnect
```

Inspect current Better Stack query connections:

```bash
python3 "$SCRIPT" list-connections
```

## Defaults

- Better Stack source id: `750608`
- Better Stack source name: `croft-prod-rails`
- Better Stack table id: `croft_prod_rails`
- Better Stack tail URL: `https://telemetry.betterstack.com/team/t98890/tail?s=750608`
- Temporary query connections default to `30` minutes
- Saved connection file: `~/.config/codex/monitor-prod-logs/connection.json`

## Notes

- `source-info` hides the source ingestion token unless `--include-source-token` is passed.
- Connection passwords are temporary Better Stack query credentials; saved connection files are written with `0600` permissions.
- Better Stack exposes recent logs through `remote(..._logs)` and retained historical logs through `s3Cluster(..._s3)`. Archived log rows require `_row_type = 1`.
- `tail` is polling-based, not a websocket live tail. Use the Better Stack tail URL for the native browser experience.
