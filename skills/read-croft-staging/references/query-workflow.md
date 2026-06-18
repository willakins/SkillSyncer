# Query Workflow

Use the DigitalOcean PostgreSQL staging database only for read-only inspection.

## Safety

- Prefer `SELECT`, `WITH ... SELECT`, `SHOW`, or plain `EXPLAIN`.
- Never run write-capable SQL such as `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `DROP`, `CREATE`, `TRUNCATE`, `GRANT`, `REVOKE`, `COPY`, `CALL`, or `DO`.
- Default to aggregates or small samples. Add `ORDER BY` and `LIMIT` unless the task truly needs a full result set.
- Redact or summarize sensitive staging data instead of dumping raw PII into the response.
- Do not store live passwords in this skill. Encoding a password with base64 or similar is not protection.

## Connection Sources

Use one of these setups:

1. `CROFT_STAGING_READONLY_DATABASE_URL` for a dedicated read-only user.
2. `CROFT_STAGING_DATABASE_URL` when the shell already has the full staging URL.
3. `~/.config/croft/staging-db.env` or `/tmp/croft-staging-db.env` containing either full URL env var.
4. `CROFT_STAGING_DB_PASSWORD` plus optional `CROFT_STAGING_DB_USER`, `CROFT_STAGING_DB_HOST`, `CROFT_STAGING_DB_PORT`, `CROFT_STAGING_DB_NAME`, and `CROFT_STAGING_DB_SSLMODE`.

Recommended local secret file shape:

```bash
mkdir -p ~/.config/croft
chmod 700 ~/.config/croft
cat > ~/.config/croft/staging-db.env <<'EOF'
CROFT_STAGING_READONLY_DATABASE_URL='postgresql://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require'
EOF
chmod 600 ~/.config/croft/staging-db.env
```

If only the incident `doadmin` credential is available, use it temporarily, keep it outside the skill, and tell the user to rotate it after the investigation.

## Helper

Run queries through the bundled helper:

```bash
ruby ~/.codex/skills/read-croft-staging/scripts/query_staging_db.rb \
  --sql "select 1"
```

The helper loads local env files, rejects unsafe SQL, checks TCP reachability, sets `default_transaction_read_only=on`, sets a statement timeout, and calls `psql` with `ON_ERROR_STOP`.

Diagnose connection problems without SQL:

```bash
ruby ~/.codex/skills/read-croft-staging/scripts/query_staging_db.rb --diagnose
```

When TCP reachability fails, the helper prints:

```text
your ip: {ip} is not trusted by the database. Please add it as a trusted source
```

Use that exact message in the user-facing summary.

## Useful Staging Checks

Data migration state:

```sql
select version
from data_migrations
where version in ('20260611151257', '20260611214047')
order by version;
```

Agent logo Active Storage metadata:

```sql
with target(external_id) as (
  values
    ('agri-placements-international'),
    ('agri_pro_placements'),
    ('aztec_foreign_labor'),
    ('c-o-c-placement-service'),
    ('croft-agent'),
    ('field-force'),
    ('fresh_harvest_agent'),
    ('malitzlaw'),
    ('national-agriculture-consultants'),
    ('southern_impact'),
    ('wafla'),
    ('western_range_association')
)
select
  target.external_id,
  agent_orgs.id as agent_org_id,
  agent_configs.id as agent_config_id,
  active_storage_attachments.id as attachment_id,
  active_storage_blobs.id as blob_id,
  active_storage_blobs.filename,
  active_storage_blobs.content_type,
  active_storage_blobs.byte_size,
  active_storage_blobs.service_name,
  active_storage_blobs.created_at as blob_created_at
from target
left join agent_orgs on agent_orgs.external_id = target.external_id
left join agent_configs on agent_configs.agent_org_id = agent_orgs.id
left join active_storage_attachments
  on active_storage_attachments.record_type = 'AgentConfig'
  and active_storage_attachments.record_id = agent_configs.id
  and active_storage_attachments.name = 'logo'
left join active_storage_blobs on active_storage_blobs.id = active_storage_attachments.blob_id
order by target.external_id;
```
