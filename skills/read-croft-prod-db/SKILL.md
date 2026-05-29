---
name: read-croft-prod-db
description: Safely inspect Croft production records through the read-only DigitalOcean PostgreSQL replica. Use for live Croft data questions, Sentry validation against prod rows, row counts or samples, schema-backed relationship checks, or safe read-only SQL. Do not use for writes, migrations, local dev/test DBs, non-Croft databases, or secret retrieval.
---

# Read Croft Prod DB

**UTILITY SKILL. INVOKES:** Rails schema/model files, bundled Ruby `psql` helper, read-only DigitalOcean replica. **FOR SINGLE OPERATIONS:** narrow production data inspection and plain-language summaries.

Read [query workflow](references/query-workflow.md) before querying.

## USE FOR:

- "check Croft prod data"
- "validate this Sentry issue against production rows"
- "count or sample records in the Croft replica"
- "inspect schema relationships before a safe SELECT"

## DO NOT USE FOR:

- Database writes, migrations, maintenance, data repair, or primary DB access.
- Local dev/test DB work, non-Croft databases, broad exports, or raw PII dumps.
- Guessing schema without reading `db/schema.rb` and relevant `app/models`.

## Workflow

1. Inspect `db/schema.rb` and relevant models before non-trivial SQL.
2. Write the smallest useful `SELECT`, `WITH ... SELECT`, `SHOW`, or plain `EXPLAIN`; prefer counts and `LIMIT`.
3. Run `scripts/query_prod_replica.rb` with `--service db-ro-postgresql-nyc3-18224`.
4. Summarize counts, key IDs, date ranges, or anomalies, redacting sensitive values.

## Errors

If TCP fails, report the helper's exact `your ip: ... is not trusted...` line and stop before SQL. If the task requires writes or PII, refuse that part and offer a safe aggregate or read-only alternative.

## Examples

- In scope: count recent Croft production rows, then sample non-sensitive IDs through the replica.
- Out of scope: update production rows; refuse the write and offer read-only verification.
