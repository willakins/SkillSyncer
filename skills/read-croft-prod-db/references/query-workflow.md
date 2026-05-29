# Query Workflow

Use the read-only DigitalOcean replica node `db-ro-postgresql-nyc3-18224` in the `croft-prod` cluster. Never target the primary.

## Safety

- Prefer `SELECT`, `WITH ... SELECT`, `SHOW`, or plain `EXPLAIN`.
- Never run write-capable SQL such as `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, `CREATE`, `TRUNCATE`, `GRANT`, `REVOKE`, `COPY`, `CALL`, or `DO`.
- Default to aggregates or small samples. Add `ORDER BY` and `LIMIT` unless the task truly needs a full result set.
- Redact or summarize sensitive production data instead of dumping raw PII into the response.

## Connection Sources

Use one of these setups:

1. `CROFT_REPLICA_DATABASE_CONNECTION_POOL_URL` when the shell already has the full replica URL.
2. `--service db-ro-postgresql-nyc3-18224` for explicit one-off helper queries.
3. `croft-ro ...` for direct shell access when that local wrapper exists.
4. `CROFT_READ_ONLY_PGSERVICE` or legacy `PGSERVICE` only when it points at a read-only service.

Keep secrets in shell config, `~/.pg_service.conf`, or another local secret store, never in a repo.

## Helper

Run queries through the bundled helper:

```bash
ruby ~/.codex/skills/read-croft-prod-db/scripts/query_prod_replica.rb \
  --service db-ro-postgresql-nyc3-18224 \
  --sql "select 1"
```

The helper chooses the replica URL first, then `--service`, then read-only service env vars; rejects obviously unsafe SQL; checks TCP reachability; sets `default_transaction_read_only=on`; sets a statement timeout; and calls `psql` with `ON_ERROR_STOP`.

Diagnose connection problems without SQL:

```bash
ruby ~/.codex/skills/read-croft-prod-db/scripts/query_prod_replica.rb \
  --service db-ro-postgresql-nyc3-18224 \
  --diagnose
```

If `tcp_reachable=false`, the failure is before authentication or SQL execution. Check VPN/network access, DigitalOcean trusted sources/firewall rules, or whether `~/.pg_service.conf` points at a stale host.

When TCP reachability fails, the helper prints:

```text
your ip: {ip} is not trusted by the database. Please add it as a trusted source
```

Use that exact message in the user-facing summary.

## Examples

Count rows:

```bash
ruby ~/.codex/skills/read-croft-prod-db/scripts/query_prod_replica.rb \
  --service db-ro-postgresql-nyc3-18224 \
  --sql "select count(*) as open_job_orders from job_orders where status = 'open'"
```

Sample records as CSV:

```bash
ruby ~/.codex/skills/read-croft-prod-db/scripts/query_prod_replica.rb \
  --service db-ro-postgresql-nyc3-18224 \
  --format csv \
  --sql "select id, external_id, created_at from employer_orgs order by created_at desc limit 25"
```

Validate a query without executing it:

```bash
ruby ~/.codex/skills/read-croft-prod-db/scripts/query_prod_replica.rb \
  --dry-run \
  --service db-ro-postgresql-nyc3-18224 \
  --sql "select count(*) from workers"
```
