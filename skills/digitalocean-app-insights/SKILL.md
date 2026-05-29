---
name: digitalocean-app-insights
description: Investigate DigitalOcean App Platform health, deployments, instance sizing, CPU/memory/restart metrics, and memory pressure using the DigitalOcean API. Use when Codex needs to inspect a DigitalOcean app, diagnose production app resource pressure, correlate Sentry or app symptoms with App Platform metrics, or ask the user for the minimum read-only DigitalOcean token needed for live observability.
---

# DigitalOcean App Insights

Use this skill for read-only DigitalOcean App Platform observability. Prefer the bundled helper, keep credential handling local, and separate observed metrics from inferred causes.

Read [API notes](references/api-notes.md) for endpoint details, scopes, response shapes, Kubernetes follow-up, and output fields.

## Safety Model

Use read-only API access by default. Do not ask the user to paste tokens in chat. Ask them to set `DIGITALOCEAN_ACCESS_TOKEN` locally and confirm; accept `DIGITALOCEAN_TOKEN` as a fallback. Never print tokens or credential-bearing URLs.

If the token is missing or under-scoped, stop and ask for the smallest needed read scope. Do not request write scopes.

## Quick Start

Prefer the bundled helper:

```bash
python3 ~/.codex/skills/digitalocean-app-insights/scripts/do_app_insights.py list-apps
python3 ~/.codex/skills/digitalocean-app-insights/scripts/do_app_insights.py inspect --app-name croft-prod --hours 6
python3 ~/.codex/skills/digitalocean-app-insights/scripts/do_app_insights.py inspect --app-id APP_UUID --component web --hours 24
```

Use `--json` when raw payloads are needed for deeper analysis. Use `--base-url` only for testing.

## Investigation Workflow

1. Resolve the target app by id or exact/partial name. Ask when multiple apps match.
2. Record service names, instance count, size slug, autoscaling settings, active deployment, and recent deployments.
3. Pull recent `memory_percentage`, `cpu_percentage`, and `restart_count`; start with 6h for incidents, 24h for slow-burn memory pressure, and 7d for trends.
4. Inspect app health and instances to spot one hot instance or component.
5. Correlate timestamps with Sentry events, deploys, logs, or database metrics.

## Interpretation

Treat thresholds as heuristics. `>= 90%` memory is immediate pressure or OOM risk; sustained `80-90%` is capacity risk. High memory plus restart increases is consistent with OOM/restart pressure; high memory without restarts may be cache growth, workload shape, small instance size, or normal high watermark.

Use Kubernetes access only when the user explicitly asks and provides access; keep commands read-only.
