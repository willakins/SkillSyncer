#!/usr/bin/env python3
import argparse
import json
import os
import statistics
import sys
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "https://api.digitalocean.com"


def token_from_env():
    return os.environ.get("DIGITALOCEAN_ACCESS_TOKEN") or os.environ.get("DIGITALOCEAN_TOKEN")


def require_token():
    token = token_from_env()
    if not token:
        raise SystemExit(
            "Missing DigitalOcean token. Set DIGITALOCEAN_ACCESS_TOKEN locally; "
            "recommended scopes: app:read and monitoring:read."
        )
    return token


def request_json(base_url, path, token, params=None):
    url = base_url.rstrip("/") + path
    if params:
        url += "?" + urlencode(params)
    req = Request(url)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/json")
    try:
        with urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else {}
    except HTTPError as err:
        body = err.read().decode("utf-8", "ignore")
        message = body[:800] if body else err.reason
        raise SystemExit(f"DigitalOcean API HTTP {err.code} for {path}: {message}") from err
    except URLError as err:
        raise SystemExit(f"DigitalOcean API network error for {path}: {err.reason}") from err


def paged_get(base_url, path, token, params=None, collection_key=None):
    page = 1
    results = []
    while True:
        query = dict(params or {})
        query.update({"page": page, "per_page": 200})
        data = request_json(base_url, path, token, query)
        if collection_key:
            items = data.get(collection_key, [])
        else:
            items = next((value for value in data.values() if isinstance(value, list)), [])
        results.extend(items)
        links = data.get("links", {})
        pages = links.get("pages", {}) if isinstance(links, dict) else {}
        if not pages.get("next"):
            return results
        page += 1


def iso(ts):
    return datetime.fromtimestamp(ts, timezone.utc).isoformat().replace("+00:00", "Z")


def value_points(series):
    points = []
    for raw_ts, raw_value in series.get("values", []):
        try:
            points.append((int(float(raw_ts)), float(raw_value)))
        except (TypeError, ValueError):
            continue
    return points


def summarize_series(metric_name, payload):
    result = payload.get("data", {}).get("result", [])
    summaries = []
    for series in result:
        points = value_points(series)
        if not points:
            continue
        values = [value for _, value in points]
        labels = series.get("metric", {})
        component = labels.get("app_component") or labels.get("component") or labels.get("component_name") or "(all)"
        summaries.append(
            {
                "metric": metric_name,
                "component": component,
                "labels": labels,
                "points": len(points),
                "start": iso(points[0][0]),
                "end": iso(points[-1][0]),
                "min": min(values),
                "avg": statistics.fmean(values),
                "max": max(values),
                "latest": values[-1],
            }
        )
    return summaries


def component_rows(app):
    spec = app.get("spec", {})
    rows = []
    for kind in ("services", "workers", "jobs", "static_sites", "functions"):
        for component in spec.get(kind, []) or []:
            rows.append(
                {
                    "type": kind.rstrip("s"),
                    "name": component.get("name"),
                    "instance_count": component.get("instance_count"),
                    "instance_size_slug": component.get("instance_size_slug"),
                    "autoscaling": component.get("autoscaling"),
                }
            )
    return rows


def print_app_list(apps):
    for app in apps:
        print(
            f"{app.get('id')} | {app.get('spec', {}).get('name') or app.get('name')} | "
            f"region={app.get('spec', {}).get('region') or app.get('region', {}).get('slug')} | "
            f"updated={app.get('updated_at')}"
        )


def find_app(base_url, token, app_id=None, app_name=None):
    if app_id:
        return request_json(base_url, f"/v2/apps/{app_id}", token).get("app")
    apps = paged_get(base_url, "/v2/apps", token, {"with_projects": "true"}, "apps")
    if not app_name:
        raise SystemExit("Pass --app-id or --app-name.")
    matches = [
        app for app in apps
        if app_name.lower() in ((app.get("spec", {}).get("name") or app.get("name") or "").lower())
    ]
    if len(matches) != 1:
        print(f"Found {len(matches)} app matches for {app_name!r}:")
        print_app_list(matches)
        raise SystemExit("Use --app-id or a more specific --app-name.")
    return request_json(base_url, f"/v2/apps/{matches[0]['id']}", token).get("app")


def metric_payload(base_url, token, metric, app_id, component, start, end):
    params = {"app_id": app_id, "start": str(start), "end": str(end)}
    if component:
        params["app_component"] = component
    return request_json(base_url, f"/v2/monitoring/metrics/apps/{metric}", token, params)


def command_list_apps(args):
    token = require_token()
    apps = paged_get(args.base_url, "/v2/apps", token, {"with_projects": "true"}, "apps")
    if args.json:
        print(json.dumps({"apps": apps}, indent=2, sort_keys=True))
    else:
        print_app_list(apps)


def command_inspect(args):
    token = require_token()
    app = find_app(args.base_url, token, app_id=args.app_id, app_name=args.app_name)
    app_id = app["id"]
    end = int(time.time())
    start = end - int(args.hours * 3600)

    health = request_json(args.base_url, f"/v2/apps/{app_id}/health", token)
    deployments = request_json(args.base_url, f"/v2/apps/{app_id}/deployments", token, {"page": 1, "per_page": 10})
    instances = request_json(args.base_url, f"/v2/apps/{app_id}/instances", token)
    metrics = {}
    for metric in ("memory_percentage", "cpu_percentage", "restart_count"):
        metrics[metric] = metric_payload(args.base_url, token, metric, app_id, args.component, start, end)

    output = {
        "app": app,
        "components": component_rows(app),
        "window": {"start": iso(start), "end": iso(end), "hours": args.hours},
        "health": health,
        "instances": instances,
        "deployments": deployments,
        "metric_summaries": {
            metric: summarize_series(metric, payload)
            for metric, payload in metrics.items()
        },
    }

    if args.json:
        output["raw_metrics"] = metrics
        print(json.dumps(output, indent=2, sort_keys=True))
        return

    name = app.get("spec", {}).get("name") or app.get("name")
    print(f"App: {name} ({app_id})")
    print(f"Window: {output['window']['start']} to {output['window']['end']} ({args.hours:g}h)")
    print("")
    print("Components:")
    for row in output["components"]:
        print(
            f"  {row['type']} {row['name']}: count={row['instance_count']} "
            f"size={row['instance_size_slug']} autoscaling={json.dumps(row['autoscaling'], sort_keys=True)}"
        )
    print("")
    for metric, summaries in output["metric_summaries"].items():
        print(metric + ":")
        if not summaries:
            print("  no series returned")
            continue
        for summary in summaries:
            print(
                f"  {summary['component']}: latest={summary['latest']:.2f} "
                f"avg={summary['avg']:.2f} max={summary['max']:.2f} "
                f"points={summary['points']}"
            )
    print("")
    recent = deployments.get("deployments", [])[:5]
    print("Recent deployments:")
    for deployment in recent:
        print(
            f"  {deployment.get('id')} status={deployment.get('phase')} "
            f"created={deployment.get('created_at')} updated={deployment.get('updated_at')}"
        )


def build_parser():
    parser = argparse.ArgumentParser(description="Read-only DigitalOcean App Platform insight helper")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    subparsers = parser.add_subparsers(dest="command", required=True)

    list_apps = subparsers.add_parser("list-apps")
    list_apps.add_argument("--json", action="store_true")
    list_apps.set_defaults(func=command_list_apps)

    inspect = subparsers.add_parser("inspect")
    target = inspect.add_mutually_exclusive_group(required=True)
    target.add_argument("--app-id")
    target.add_argument("--app-name")
    inspect.add_argument("--component", help="Optional App Platform component name")
    inspect.add_argument("--hours", type=float, default=6)
    inspect.add_argument("--json", action="store_true")
    inspect.set_defaults(func=command_inspect)

    return parser


def main():
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
