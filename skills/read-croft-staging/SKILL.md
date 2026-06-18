---
name: read-croft-staging
description: Safely inspect Croft staging data through the DigitalOcean PostgreSQL database. Use for staging-only live data questions, deploy or migration verification, Active Storage metadata checks, row counts or samples, schema-backed relationship checks, and safe read-only SQL. Do not use for writes, data repair, production data, local dev/test DBs, non-Croft databases, or secret retrieval.
---

# Read Croft Staging

**UTILITY SKILL. INVOKES:** Rails schema/model files, bundled Ruby `psql` helper, DigitalOcean staging PostgreSQL. **FOR SINGLE OPERATIONS:** narrow staging data inspection and plain-language summaries.

Read [query workflow](references/query-workflow.md) before querying.

## USE FOR:

- "check Croft staging data"
- "did this staging migration run?"
- "inspect staging Active Storage metadata"
- "count or sample staging rows"
- "validate staging deploy state"

## DO NOT USE FOR:

- Database writes, migrations, maintenance, or data repair.
- Production data, local dev/test DB work, non-Croft databases, broad exports, or raw PII dumps.
- Guessing schema without reading `db/schema.rb` and relevant `app/models`.
- Storing or revealing database passwords. Encoded/base64 credentials are still secrets.

## Workflow

1. Inspect `db/schema.rb` and relevant models before non-trivial SQL.
2. Write the smallest useful `SELECT`, `WITH ... SELECT`, `SHOW`, or plain `EXPLAIN`; prefer counts and `LIMIT`.
3. Run `scripts/query_staging_db.rb` with `--sql` or `--file`.
4. Summarize counts, key IDs, date ranges, or anomalies, redacting sensitive values.

## Connection

The helper knows the non-secret DigitalOcean staging defaults:

- host: `db-postgresql-nyc3-99914-do-user-13471786-0.b.db.ondigitalocean.com`
- port: `25060`
- database: `defaultdb`
- sslmode: `require`
- default user: `doadmin`

Keep the password outside the skill. Use `CROFT_STAGING_READONLY_DATABASE_URL`, `CROFT_STAGING_DATABASE_URL`, or a chmod-600 local env file at `~/.config/croft/staging-db.env` or `/tmp/croft-staging-db.env`. Prefer a dedicated read-only database user; if `doadmin` is used for an incident, remind the user to rotate/reset it afterward.

## Errors

If TCP fails, report the helper's exact `your ip: ... is not trusted...` line and stop before SQL. If the task requires writes or PII, refuse that part and offer a safe aggregate or read-only alternative.

## Examples

Diagnose connection:

```bash
ruby ~/.codex/skills/read-croft-staging/scripts/query_staging_db.rb --diagnose
```

Check a data migration:

```bash
ruby ~/.codex/skills/read-croft-staging/scripts/query_staging_db.rb \
  --sql "select version from data_migrations where version = '20260611151257'"
```

Run a prepared SQL file:

```bash
ruby ~/.codex/skills/read-croft-staging/scripts/query_staging_db.rb \
  --file /tmp/check_staging.sql \
  --format csv
```
