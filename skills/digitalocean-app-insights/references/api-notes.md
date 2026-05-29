# DigitalOcean API Notes

Use these notes for read-only App Platform investigations. Verify against official docs when changing endpoint behavior.

## Authentication

Use a bearer token in the `Authorization` header:

```text
Authorization: Bearer $DIGITALOCEAN_ACCESS_TOKEN
```

DigitalOcean examples often use `DIGITALOCEAN_TOKEN`; this skill accepts both. Do not print token values.

## Scopes

Relevant read scopes:

- `app:read`: list/retrieve apps, app health, app instances, deployments, deployment logs, app events.
- `monitoring:read`: app CPU, memory, restart, alert metrics.
- `database:read`: managed database metadata.
- `kubernetes:read`: DOKS metadata, not cluster credentials.
- `kubernetes:access_cluster`: kubeconfig/cluster access. Ask explicitly before using.

DigitalOcean also supports `api:read`, equivalent to all read scopes. Prefer narrower custom scopes.

## App Platform Endpoints

Base URL: `https://api.digitalocean.com`

- `GET /v2/apps`: list apps. Required scope: `app:read`.
- `GET /v2/apps/{app_id}`: app spec and current app metadata. Required scope: `app:read`.
- `GET /v2/apps/{app_id}/health`: current health, CPU, and memory utilization by component. Required scope: `app:read`.
- `GET /v2/apps/{app_id}/instances`: app instances. Required scope: `app:read`.
- `GET /v2/apps/{app_id}/deployments`: recent deployments. Required scope: `app:read`.
- `GET /v2/apps/{app_id}/events`: app events. Required scope: `app:read`.

App specs usually include component arrays such as `services`, `workers`, `jobs`, `static_sites`, and `functions`. Components commonly expose `name`, `instance_count`, `instance_size_slug`, and sometimes `autoscaling`.

## Monitoring Endpoints

All require `monitoring:read`. Query parameters:

- `app_id`: app UUID.
- `app_component`: optional component name.
- `start`: Unix timestamp at beginning of window.
- `end`: Unix timestamp at end of window.

Endpoints:

- `GET /v2/monitoring/metrics/apps/memory_percentage`
- `GET /v2/monitoring/metrics/apps/cpu_percentage`
- `GET /v2/monitoring/metrics/apps/restart_count`

Metric responses are Prometheus-like and usually include `data.result[]` series with `metric` labels and `values` arrays shaped as `[unix_timestamp, "value"]`.

## Investigation Output

Good summaries include:

- App id/name/region/default ingress.
- Component name, type, instance count, size slug, autoscaling config.
- Health status and current CPU/memory utilization by component.
- Metric window and timezone.
- Memory max/avg/latest per component.
- CPU max/avg/latest per component.
- Restart count max/latest or total increase per component.
- Recent deployment timestamps in the same window.
- Clear statement of whether memory pressure is observed or not observed.

Avoid overclaiming. Say “consistent with memory pressure” only when memory is high and sustained, or high memory aligns with restarts/health problems.
