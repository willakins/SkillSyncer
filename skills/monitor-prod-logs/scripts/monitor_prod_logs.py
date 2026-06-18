#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import contextlib
import dataclasses
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


API_BASE_URL = "https://telemetry.betterstack.com/api/v1"
DEFAULT_SOURCE_ID = "750608"
DEFAULT_SOURCE_NAME = "croft-prod-rails"
DEFAULT_TABLE_NAME = "croft_prod_rails"
DEFAULT_TAIL_URL = "https://telemetry.betterstack.com/team/t98890/tail?s=750608"
DEFAULT_CONNECTION_MINUTES = 30
DEFAULT_CONFIG_PATH = Path.home() / ".config" / "codex" / "monitor-prod-logs" / "connection.json"
DEFAULT_ENV_PATH = Path.home() / ".config" / "codex" / "monitor-prod-logs.env"
REQUEST_ID_REGEX = re.compile(
    r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
    re.IGNORECASE,
)
SQL_DANGEROUS_KEYWORDS = {
    "ALTER",
    "ATTACH",
    "CREATE",
    "DELETE",
    "DETACH",
    "DROP",
    "GRANT",
    "INSERT",
    "KILL",
    "OPTIMIZE",
    "RENAME",
    "REPLACE",
    "REVOKE",
    "SET",
    "SYSTEM",
    "TRUNCATE",
    "UPDATE",
    "USE",
}


class BetterStackError(RuntimeError):
    pass


@dataclasses.dataclass(frozen=True)
class SourceSettings:
    api_token: str
    api_token_env: str
    source_id: str
    source_name: str
    table_name: str
    tail_url: str


@dataclasses.dataclass
class QueryConnection:
    connection_id: str
    host: str
    port: int
    username: str
    password: str
    valid_until: str | None
    created_at: str
    note: str
    data_region: str
    team_ids: list[int]
    source_id: str
    source_name: str
    log_source: str
    archived_log_source: str

    @classmethod
    def from_api_payload(cls, payload: dict[str, Any], *, source_id: str, source_name: str) -> "QueryConnection":
        data = payload["data"]
        attributes = data["attributes"]
        selected_source_name = ""
        selected_log_source = ""
        selected_archived_log_source = ""

        for source in attributes.get("data_sources", []):
            candidate_source_id = str(source.get("source_id", ""))
            candidate_source_name = str(source.get("source_name", ""))
            if candidate_source_id != str(source_id) and candidate_source_name != source_name:
                continue

            selected_source_name = candidate_source_name
            for candidate in source.get("data_sources", []):
                if candidate.startswith("remote(") and candidate.endswith("_logs)"):
                    selected_log_source = candidate
                elif candidate.startswith("s3Cluster(") and candidate.endswith("_s3)"):
                    selected_archived_log_source = candidate

            if selected_log_source:
                break

        if not selected_log_source:
            raise BetterStackError(
                "Could not find a Better Stack log data source for "
                f"source id {source_id}. Check BETTERSTACK_SOURCE_ID and source access."
            )

        return cls(
            connection_id=str(data["id"]),
            host=attributes["host"],
            port=int(attributes.get("port", 443)),
            username=attributes["username"],
            password=attributes["password"],
            valid_until=attributes.get("valid_until"),
            created_at=attributes.get("created_at", ""),
            note=attributes.get("note", ""),
            data_region=attributes.get("data_region", ""),
            team_ids=[int(team_id) for team_id in attributes.get("team_ids", [])],
            source_id=str(source_id),
            source_name=selected_source_name or source_name,
            log_source=selected_log_source,
            archived_log_source=selected_archived_log_source,
        )

    @classmethod
    def from_disk(cls, payload: dict[str, Any]) -> "QueryConnection":
        archived_log_source = payload.get("archived_log_source") or derive_archived_log_source(payload.get("log_source", ""))
        return cls(
            connection_id=str(payload["connection_id"]),
            host=payload["host"],
            port=int(payload["port"]),
            username=payload["username"],
            password=payload["password"],
            valid_until=payload.get("valid_until"),
            created_at=payload.get("created_at", ""),
            note=payload.get("note", ""),
            data_region=payload.get("data_region", ""),
            team_ids=[int(team_id) for team_id in payload.get("team_ids", [])],
            source_id=str(payload["source_id"]),
            source_name=payload.get("source_name", ""),
            log_source=payload["log_source"],
            archived_log_source=archived_log_source,
        )

    def to_disk(self) -> dict[str, Any]:
        return {
            "connection_id": self.connection_id,
            "host": self.host,
            "port": self.port,
            "username": self.username,
            "password": self.password,
            "valid_until": self.valid_until,
            "created_at": self.created_at,
            "note": self.note,
            "data_region": self.data_region,
            "team_ids": self.team_ids,
            "source_id": self.source_id,
            "source_name": self.source_name,
            "log_source": self.log_source,
            "archived_log_source": self.archived_log_source,
        }

    def is_expired(self) -> bool:
        if not self.valid_until:
            return False

        return utc_now() >= parse_iso8601(self.valid_until)


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.UTC)


def parse_iso8601(value: str) -> dt.datetime:
    parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=dt.UTC)
    return parsed.astimezone(dt.UTC)


def iso8601_in_future(minutes: int) -> str:
    return (utc_now() + dt.timedelta(minutes=minutes)).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def dotenv_candidates(explicit_env_file: str | None) -> list[Path]:
    if explicit_env_file:
        return [Path(explicit_env_file).expanduser()]

    paths = [DEFAULT_ENV_PATH]
    cwd = Path.cwd().resolve()
    for directory in [cwd, *cwd.parents]:
        paths.append(directory / ".env.local")
        paths.append(directory / ".env")
        if directory == Path.home().resolve():
            break

    return paths


def parse_dotenv_line(line: str) -> tuple[str, str] | None:
    stripped = line.strip()
    if not stripped or stripped.startswith("#"):
        return None

    if stripped.startswith("export "):
        stripped = stripped[len("export ") :].strip()

    if "=" not in stripped:
        return None

    key, value = stripped.split("=", 1)
    key = key.strip()
    value = value.strip()
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
        return None

    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        value = value[1:-1]
    elif " #" in value:
        value = value.split(" #", 1)[0].rstrip()

    return key, value


def load_env_files(explicit_env_file: str | None) -> None:
    seen: set[Path] = set()
    for path in dotenv_candidates(explicit_env_file):
        path = path.expanduser()
        if path in seen or not path.exists():
            continue

        seen.add(path)
        for line in path.read_text(encoding="utf-8").splitlines():
            parsed = parse_dotenv_line(line)
            if not parsed:
                continue

            key, value = parsed
            os.environ.setdefault(key, value)


def first_env(*names: str) -> tuple[str | None, str | None]:
    for name in names:
        value = os.environ.get(name)
        if value:
            return value, name

    return None, None


def get_settings() -> SourceSettings:
    api_token, token_env = first_env(
        "BETTERSTACK_API_TOKEN",
        "BETTERSTACK_GLOBAL_API_TOKEN",
        "BETTERSTACK_TEAM_API_TOKEN",
    )
    if not api_token:
        raise BetterStackError(
            "Set BETTERSTACK_API_TOKEN or BETTERSTACK_GLOBAL_API_TOKEN to a Better Stack global API token. "
            f"You can also put it in {DEFAULT_ENV_PATH}."
        )

    return SourceSettings(
        api_token=api_token,
        api_token_env=token_env or "",
        source_id=os.environ.get("BETTERSTACK_SOURCE_ID", DEFAULT_SOURCE_ID),
        source_name=os.environ.get("BETTERSTACK_SOURCE_NAME", DEFAULT_SOURCE_NAME),
        table_name=os.environ.get("BETTERSTACK_TABLE_NAME", DEFAULT_TABLE_NAME),
        tail_url=os.environ.get("BETTERSTACK_TAIL_URL", DEFAULT_TAIL_URL),
    )


def config_path_from_args(args: argparse.Namespace) -> Path:
    return Path(getattr(args, "config_path", DEFAULT_CONFIG_PATH)).expanduser()


def sql_quote(value: str) -> str:
    return "'" + value.replace("\\", "\\\\").replace("'", "''") + "'"


def derive_archived_log_source(log_source: str) -> str:
    match = re.fullmatch(r"remote\((.+)_logs\)", log_source)
    if not match:
        return ""

    return f"s3Cluster(primary, {match.group(1)}_s3)"


def strip_sql_comments(sql: str) -> str:
    without_block_comments = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    lines = [line for line in without_block_comments.splitlines() if not line.lstrip().startswith("--")]
    return "\n".join(lines).strip()


def strip_sql_string_literals(sql: str) -> str:
    return re.sub(r"'(?:''|[^'])*'", "''", sql)


def validate_read_only_sql(sql: str) -> None:
    cleaned_sql = strip_sql_comments(sql).rstrip()
    if cleaned_sql.endswith(";"):
        cleaned_sql = cleaned_sql[:-1].rstrip()

    if ";" in cleaned_sql:
        raise BetterStackError("Only one read-style SQL statement is allowed.")

    match = re.match(r"([A-Za-z]+)", cleaned_sql)
    keyword = match.group(1).upper() if match else ""
    if keyword not in {"SELECT", "WITH", "SHOW", "EXPLAIN", "DESCRIBE"}:
        raise BetterStackError(f"Only read-style SQL is allowed; got {keyword or 'unknown'}.")

    sql_without_strings = strip_sql_string_literals(cleaned_sql)
    for dangerous_keyword in SQL_DANGEROUS_KEYWORDS:
        if re.search(rf"\b{dangerous_keyword}\b", sql_without_strings, flags=re.IGNORECASE):
            raise BetterStackError(f"SQL keyword {dangerous_keyword} is not allowed.")


def ensure_parent_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def write_connection_config(path: Path, connection: QueryConnection) -> None:
    ensure_parent_dir(path)
    path.write_text(json.dumps(connection.to_disk(), indent=2) + "\n", encoding="utf-8")
    os.chmod(path, 0o600)


def load_connection_config(path: Path) -> QueryConnection | None:
    if not path.exists():
        return None

    payload = json.loads(path.read_text(encoding="utf-8"))
    return QueryConnection.from_disk(payload)


def delete_connection_config(path: Path) -> None:
    if path.exists():
        path.unlink()


def auth_header_for_token(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def basic_auth_header(username: str, password: str) -> dict[str, str]:
    raw = f"{username}:{password}".encode("utf-8")
    encoded = base64.b64encode(raw).decode("ascii")
    return {"Authorization": f"Basic {encoded}"}


def api_request(
    *,
    method: str,
    url: str,
    token: str,
    payload: dict[str, Any] | None = None,
    extra_headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    headers = {
        "Accept": "application/json",
        "User-Agent": "codex-monitor-prod-logs/1.0",
        **auth_header_for_token(token),
    }

    if extra_headers:
        headers.update(extra_headers)

    data: bytes | None = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(url=url, method=method.upper(), headers=headers, data=data)

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = response.read()
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise BetterStackError(f"Better Stack API {method.upper()} {url} failed with HTTP {error.code}: {body}") from error
    except urllib.error.URLError as error:
        raise BetterStackError(f"Could not reach Better Stack API: {error}") from error

    if not body:
        return {}

    try:
        return json.loads(body.decode("utf-8"))
    except json.JSONDecodeError as error:
        raise BetterStackError(f"Better Stack API returned non-JSON response: {body[:200]!r}") from error


def clickhouse_request(connection: QueryConnection, sql: str) -> str:
    validate_read_only_sql(sql)

    netloc = connection.host if connection.port == 443 else f"{connection.host}:{connection.port}"
    query_url = f"https://{netloc}?{urllib.parse.urlencode({'output_format_pretty_row_numbers': '0'})}"
    request = urllib.request.Request(
        url=query_url,
        method="POST",
        headers={
            "Accept": "*/*",
            "Content-Type": "text/plain",
            "User-Agent": "codex-monitor-prod-logs/1.0",
            **basic_auth_header(connection.username, connection.password),
        },
        data=sql.encode("utf-8"),
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise BetterStackError(f"Better Stack query failed with HTTP {error.code}: {body}") from error
    except urllib.error.URLError as error:
        raise BetterStackError(f"Could not reach Better Stack ClickHouse endpoint: {error}") from error


def query_rows(connection: QueryConnection, sql: str) -> list[dict[str, Any]]:
    sql = sql.strip()
    if not sql.upper().endswith("FORMAT JSONEACHROW"):
        sql = f"{sql}\nFORMAT JSONEachRow"

    output = clickhouse_request(connection, sql)
    rows: list[dict[str, Any]] = []
    for line in output.splitlines():
        line = line.strip()
        if not line:
            continue
        rows.append(json.loads(line))

    return rows


def fetch_source_metadata(settings: SourceSettings) -> dict[str, Any]:
    return api_request(
        method="GET",
        url=f"{API_BASE_URL}/sources/{settings.source_id}",
        token=settings.api_token,
    )


def fetch_connections(settings: SourceSettings) -> dict[str, Any]:
    return api_request(
        method="GET",
        url=f"{API_BASE_URL}/connections?per_page=100",
        token=settings.api_token,
    )


def create_connection(settings: SourceSettings, *, valid_for_minutes: int, note: str) -> QueryConnection:
    source_metadata = fetch_source_metadata(settings)
    source_attributes = source_metadata["data"]["attributes"]
    payload = {
        "client_type": "clickhouse",
        "team_ids": [int(source_attributes["team_id"])],
        "data_region": source_attributes["data_region"],
        "valid_until": iso8601_in_future(valid_for_minutes),
        "note": note,
    }
    response = api_request(
        method="POST",
        url=f"{API_BASE_URL}/connections",
        token=settings.api_token,
        payload=payload,
    )
    return QueryConnection.from_api_payload(response, source_id=settings.source_id, source_name=settings.source_name)


def delete_connection(settings: SourceSettings, connection_id: str) -> None:
    api_request(
        method="DELETE",
        url=f"{API_BASE_URL}/connections/{connection_id}",
        token=settings.api_token,
    )


@contextlib.contextmanager
def managed_connection(
    settings: SourceSettings,
    *,
    config_path: Path,
    keep_connection: bool = False,
    valid_for_minutes: int = DEFAULT_CONNECTION_MINUTES,
    note: str = "Codex monitor-prod-logs temporary query connection",
) -> QueryConnection:
    config_connection = load_connection_config(config_path)
    if config_connection and config_connection.source_id == settings.source_id and not config_connection.is_expired():
        yield config_connection
        return

    if config_connection and config_connection.is_expired():
        delete_connection_config(config_path)

    connection = create_connection(settings, valid_for_minutes=valid_for_minutes, note=note)
    if keep_connection:
        write_connection_config(config_path, connection)

    try:
        yield connection
    finally:
        if not keep_connection:
            with contextlib.suppress(BetterStackError):
                delete_connection(settings, connection.connection_id)


def nested_get(payload: dict[str, Any], *keys: str) -> Any:
    current: Any = payload
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def first_present(*values: Any) -> Any:
    for value in values:
        if value is not None and value != "":
            return value
    return None


def parse_log_payload(raw: str) -> dict[str, Any]:
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {}

    return parsed if isinstance(parsed, dict) else {}


def derive_request_id(payload: dict[str, Any], raw: str) -> str | None:
    candidates = [
        payload.get("request_id"),
        nested_get(payload, "request", "id"),
        nested_get(payload, "attributes", "request_id"),
        nested_get(payload, "attributes", "http.request_id"),
        nested_get(payload, "context", "http", "request_id"),
        nested_get(payload, "event", "http_response_sent", "request_id"),
        nested_get(payload, "event", "http_request_received", "request_id"),
        nested_get(payload, "event", "job_performed", "request_id"),
    ]

    for candidate in candidates:
        if isinstance(candidate, str) and candidate:
            return candidate

    match = REQUEST_ID_REGEX.search(raw)
    return match.group(0) if match else None


def derive_status(payload: dict[str, Any]) -> int | None:
    value = first_present(
        nested_get(payload, "event", "http_response_sent", "status"),
        nested_get(payload, "context", "http", "status"),
        nested_get(payload, "attributes", "http.status_code"),
        payload.get("status"),
    )
    if value is None:
        return None

    with contextlib.suppress(TypeError, ValueError):
        return int(value)

    return None


def summarize_row(row: dict[str, Any]) -> dict[str, Any]:
    raw = row.get("raw", "")
    payload = parse_log_payload(raw)
    message = first_present(payload.get("message"), payload.get("body"), payload.get("log"))
    level = first_present(payload.get("level"), payload.get("severity"), payload.get("severity_text"))
    path = first_present(
        nested_get(payload, "context", "http", "path"),
        nested_get(payload, "attributes", "url.path"),
        nested_get(payload, "attributes", "http.route"),
        payload.get("path"),
    )
    method = first_present(
        nested_get(payload, "context", "http", "method"),
        nested_get(payload, "attributes", "http.method"),
        payload.get("method"),
    )

    return {
        "dt": row.get("dt") or payload.get("dt") or payload.get("timestamp"),
        "level": str(level).lower() if level is not None else None,
        "message": message if message is not None else (raw if not payload else None),
        "host": first_present(
            nested_get(payload, "context", "system", "hostname"),
            nested_get(payload, "context", "system", "host"),
            nested_get(payload, "attributes", "host.name"),
            payload.get("host"),
        ),
        "pid": first_present(nested_get(payload, "context", "system", "pid"), payload.get("pid")),
        "thread_id": first_present(nested_get(payload, "context", "runtime", "thread_id"), payload.get("thread_id")),
        "runtime_file": nested_get(payload, "context", "runtime", "file"),
        "runtime_line": nested_get(payload, "context", "runtime", "line"),
        "request_id": derive_request_id(payload, raw),
        "method": method,
        "path": path,
        "http_host": first_present(nested_get(payload, "context", "http", "host"), nested_get(payload, "attributes", "http.host")),
        "status": derive_status(payload),
        "duration_ms": first_present(
            nested_get(payload, "event", "http_response_sent", "duration_ms"),
            nested_get(payload, "attributes", "duration_ms"),
        ),
        "payload": payload,
        "raw": raw,
    }


def matches_filters(summary: dict[str, Any], args: argparse.Namespace) -> bool:
    levels = getattr(args, "level", None) or []
    if levels:
        level = (summary.get("level") or "").lower()
        if level not in {item.lower() for item in levels}:
            return False

    request_id = getattr(args, "request_id", None)
    if request_id and summary.get("request_id") != request_id:
        return False

    path_contains = getattr(args, "path_contains", None)
    if path_contains:
        path = summary.get("path") or ""
        if path_contains.lower() not in str(path).lower():
            return False

    status = getattr(args, "status", None)
    if status is not None and summary.get("status") != status:
        return False

    haystacks = [
        str(summary.get("message") or ""),
        str(summary.get("raw") or ""),
        str(summary.get("path") or ""),
    ]
    for term in getattr(args, "contains", None) or []:
        if not any(term.lower() in haystack.lower() for haystack in haystacks):
            return False

    return True


def selected_log_sources(connection: QueryConnection, storage: str) -> list[tuple[str, str]]:
    if storage == "hot":
        return [("hot", connection.log_source)]

    if storage == "archive":
        if not connection.archived_log_source:
            raise BetterStackError("This Better Stack connection did not expose an archived S3 log source.")
        return [("archive", connection.archived_log_source)]

    if storage != "complete":
        raise BetterStackError(f"Unknown log storage selection: {storage}.")

    sources = [("hot", connection.log_source)]
    if connection.archived_log_source:
        sources.append(("archive", connection.archived_log_source))

    return sources


def complete_logs_relation_sql(connection: QueryConnection) -> str:
    selects = [f"SELECT dt, raw FROM {connection.log_source}"]
    if connection.archived_log_source:
        selects.append(f"SELECT dt, raw FROM {connection.archived_log_source} WHERE _row_type = 1")

    return "(\n" + "\nUNION ALL\n".join(selects) + "\n)"


def json_string_equals(path: str, value: str) -> str:
    return f"lower(JSONExtractString(raw, {sql_quote(path)})) = {sql_quote(value.lower())}"


def json_int_equals(path: str, value: int) -> str:
    return f"JSONExtract(raw, {sql_quote(path)}, 'Nullable(Int64)') = {int(value)}"


def compact_json_string_match(key: str, value: str) -> str:
    compact = f'"{key}":"{value}"'
    spaced = f'"{key}": "{value}"'
    return (
        f"(positionCaseInsensitive(raw, {sql_quote(compact)}) > 0 "
        f"OR positionCaseInsensitive(raw, {sql_quote(spaced)}) > 0)"
    )


def level_predicate(levels: list[str]) -> str:
    predicates = []
    for level in levels:
        level_value = level.lower()
        predicates.extend(
            [
                json_string_equals("level", level_value),
                json_string_equals("severity", level_value),
                json_string_equals("severity_text", level_value),
                compact_json_string_match("level", level_value),
                compact_json_string_match("severity", level_value),
                compact_json_string_match("severity_text", level_value),
            ]
        )

    return "(" + " OR ".join(predicates) + ")"


def status_predicate(status: int) -> str:
    status_value = int(status)
    return (
        "("
        + " OR ".join(
            [
                json_int_equals("status", status_value),
                json_int_equals("event.http_response_sent.status", status_value),
                json_int_equals("context.http.status", status_value),
                json_int_equals("attributes.http.status_code", status_value),
                f"position(raw, {sql_quote(f'\"status\":{status_value}')}) > 0",
                f"position(raw, {sql_quote(f'\"status\": {status_value}')}) > 0",
            ]
        )
        + ")"
    )


def build_time_predicates(args: argparse.Namespace, *, since_dt: str | None = None) -> list[str]:
    predicates = []
    if since_dt:
        predicates.append(f"dt > parseDateTime64BestEffort({sql_quote(since_dt)})")
    elif getattr(args, "since", None):
        predicates.append(f"dt >= parseDateTime64BestEffort({sql_quote(args.since)})")
    else:
        predicates.append(f"dt >= now() - INTERVAL {int(args.minutes)} MINUTE")

    if getattr(args, "until", None):
        predicates.append(f"dt <= parseDateTime64BestEffort({sql_quote(args.until)})")

    return predicates


def build_recent_sql(connection: QueryConnection, args: argparse.Namespace, *, ascending: bool = False, since_dt: str | None = None) -> str:
    predicates = build_time_predicates(args, since_dt=since_dt)

    if getattr(args, "request_id", None):
        predicates.append(f"positionCaseInsensitive(raw, {sql_quote(args.request_id)}) > 0")

    if getattr(args, "path_contains", None):
        predicates.append(f"positionCaseInsensitive(raw, {sql_quote(args.path_contains)}) > 0")

    if getattr(args, "status", None) is not None:
        predicates.append(status_predicate(int(args.status)))

    for term in getattr(args, "contains", None) or []:
        predicates.append(f"positionCaseInsensitive(raw, {sql_quote(term)}) > 0")

    levels = getattr(args, "level", None) or []
    if levels:
        predicates.append(level_predicate(levels))

    order = "ASC" if ascending else "DESC"
    where_clause = " AND ".join(predicates)
    selects = []
    for source_kind, source_name in selected_log_sources(connection, getattr(args, "storage", "complete")):
        source_predicates = [where_clause]
        if source_kind == "archive":
            source_predicates.insert(0, "_row_type = 1")
        selects.append(
            f"""
SELECT dt, raw
FROM {source_name}
WHERE {" AND ".join(source_predicates)}
""".strip()
        )

    relation_sql = "\nUNION ALL\n".join(selects)
    sql_limit = min(max(int(args.limit) * 3, int(args.limit)), 5000)

    return f"""
SELECT dt, raw
FROM (
{relation_sql}
)
ORDER BY dt {order}
LIMIT {sql_limit}
""".strip()


def public_summary(row: dict[str, Any], *, include_raw: bool = False) -> dict[str, Any]:
    keys = [
        "dt",
        "level",
        "message",
        "host",
        "pid",
        "thread_id",
        "runtime_file",
        "runtime_line",
        "request_id",
        "method",
        "path",
        "http_host",
        "status",
        "duration_ms",
    ]
    payload = {key: row.get(key) for key in keys if row.get(key) is not None}
    if include_raw:
        payload["raw"] = row.get("raw")
        payload["payload"] = row.get("payload")
    return payload


def print_summary_rows(rows: list[dict[str, Any]], *, show_raw: bool = False, quiet_empty: bool = False) -> None:
    if not rows:
        if not quiet_empty:
            print("No matching logs.")
        return

    for row in rows:
        headline_parts = [
            row.get("dt") or "-",
            (row.get("level") or "-").upper(),
        ]

        if row.get("status") is not None:
            headline_parts.append(f"status={row['status']}")

        if row.get("method"):
            headline_parts.append(str(row["method"]))

        if row.get("path"):
            headline_parts.append(str(row["path"]))

        if row.get("request_id"):
            headline_parts.append(f"req={row['request_id']}")

        print(" ".join(str(part) for part in headline_parts if part))

        message = row.get("message")
        if message:
            print(f"  {message}")

        detail_parts = []
        if row.get("host"):
            detail_parts.append(f"host={row['host']}")
        if row.get("pid") is not None:
            detail_parts.append(f"pid={row['pid']}")
        if row.get("thread_id") is not None:
            detail_parts.append(f"thread={row['thread_id']}")
        if row.get("duration_ms") is not None:
            detail_parts.append(f"duration_ms={row['duration_ms']}")
        if row.get("runtime_file"):
            runtime_line = row.get("runtime_line")
            suffix = f":{runtime_line}" if runtime_line is not None else ""
            detail_parts.append(f"runtime={row['runtime_file']}{suffix}")
        if detail_parts:
            print("  " + " ".join(detail_parts))

        if show_raw:
            print(f"  raw={row['raw']}")


def parse_recent_results(rows: list[dict[str, Any]], args: argparse.Namespace) -> list[dict[str, Any]]:
    summaries = [summarize_row(row) for row in rows]
    return [summary for summary in summaries if matches_filters(summary, args)][: int(args.limit)]


def read_sql_from_args(args: argparse.Namespace) -> str:
    if args.query:
        return args.query
    if args.file:
        return Path(args.file).read_text(encoding="utf-8")
    if not sys.stdin.isatty():
        return sys.stdin.read()
    raise BetterStackError("Provide SQL as an argument, with --file, or via stdin.")


def resolve_sql(sql: str, connection: QueryConnection) -> str:
    resolved = sql.replace("{{logs}}", complete_logs_relation_sql(connection))
    resolved = resolved.replace("{{source}}", connection.log_source)
    resolved = resolved.replace("{{hot_source}}", connection.log_source)
    if "{{archive_source}}" in resolved:
        if not connection.archived_log_source:
            raise BetterStackError("This Better Stack connection did not expose an archived S3 log source.")
        resolved = resolved.replace("{{archive_source}}", connection.archived_log_source)
    validate_read_only_sql(resolved)
    return resolved


def command_source_info(args: argparse.Namespace) -> int:
    settings = get_settings()
    metadata = fetch_source_metadata(settings)
    attributes = metadata["data"]["attributes"]
    payload = {
        "source_id": settings.source_id,
        "configured_source_name": settings.source_name,
        "configured_table_name": settings.table_name,
        "tail_url": settings.tail_url,
        "source_name": attributes.get("name"),
        "platform": attributes.get("platform"),
        "team_id": attributes.get("team_id"),
        "team_name": attributes.get("team_name"),
        "data_region": attributes.get("data_region"),
        "logs_retention": attributes.get("logs_retention") or attributes.get("retention"),
        "metrics_retention": attributes.get("metrics_retention"),
        "ingesting_paused": attributes.get("ingesting_paused"),
        "ingesting_host": attributes.get("ingesting_host"),
        "created_at": attributes.get("created_at"),
        "updated_at": attributes.get("updated_at"),
        "api_token_env": settings.api_token_env,
    }

    if args.include_source_token:
        payload["source_token"] = attributes.get("token")

    print(json.dumps(payload, indent=2))
    return 0


def command_list_connections(args: argparse.Namespace) -> int:
    settings = get_settings()
    payload = fetch_connections(settings)
    rows = []
    for item in payload.get("data", []):
        attributes = item.get("attributes", {})
        rows.append(
            {
                "connection_id": item.get("id"),
                "note": attributes.get("note"),
                "created_at": attributes.get("created_at"),
                "valid_until": attributes.get("valid_until"),
                "host": attributes.get("host"),
                "data_region": attributes.get("data_region"),
                "team_ids": attributes.get("team_ids"),
                "team_names": attributes.get("team_names"),
                "created_by": attributes.get("created_by"),
            }
        )

    print(json.dumps(rows, indent=2))
    return 0


def command_connect(args: argparse.Namespace) -> int:
    settings = get_settings()
    config_path = config_path_from_args(args)
    connection = create_connection(
        settings,
        valid_for_minutes=args.valid_for_minutes,
        note=args.note,
    )
    write_connection_config(config_path, connection)

    print(
        json.dumps(
            {
                "saved_to": str(config_path),
                "connection_id": connection.connection_id,
                "host": connection.host,
                "valid_until": connection.valid_until,
                "source_name": connection.source_name,
                "log_source": connection.log_source,
                "archived_log_source": connection.archived_log_source,
            },
            indent=2,
        )
    )
    return 0


def command_disconnect(args: argparse.Namespace) -> int:
    settings = get_settings()
    config_path = config_path_from_args(args)
    config_connection = load_connection_config(config_path)
    connection_id = args.connection_id or (config_connection.connection_id if config_connection else None)

    if not connection_id:
        raise BetterStackError("No connection id provided and no saved connection config exists.")

    delete_connection(settings, connection_id)
    if config_connection and config_connection.connection_id == connection_id:
        delete_connection_config(config_path)

    print(json.dumps({"deleted_connection_id": connection_id, "config_removed": not config_path.exists()}, indent=2))
    return 0


def command_schema(args: argparse.Namespace) -> int:
    settings = get_settings()
    config_path = config_path_from_args(args)

    with managed_connection(
        settings,
        config_path=config_path,
        keep_connection=args.keep_connection,
        valid_for_minutes=args.valid_for_minutes,
        note="Codex monitor-prod-logs schema inspection",
    ) as connection:
        sql = f"DESCRIBE TABLE {connection.log_source} FORMAT TSV"
        print(clickhouse_request(connection, sql), end="")

    return 0


def command_sql(args: argparse.Namespace) -> int:
    settings = get_settings()
    config_path = config_path_from_args(args)
    raw_sql = read_sql_from_args(args)

    with managed_connection(
        settings,
        config_path=config_path,
        keep_connection=args.keep_connection,
        valid_for_minutes=args.valid_for_minutes,
        note="Codex monitor-prod-logs raw SQL query",
    ) as connection:
        sql = resolve_sql(raw_sql, connection)
        print(clickhouse_request(connection, sql), end="")

    return 0


def run_recent_like(args: argparse.Namespace) -> int:
    settings = get_settings()
    config_path = config_path_from_args(args)

    with managed_connection(
        settings,
        config_path=config_path,
        keep_connection=args.keep_connection,
        valid_for_minutes=args.valid_for_minutes,
        note=f"Codex monitor-prod-logs {args.command} query",
    ) as connection:
        rows = query_rows(connection, build_recent_sql(connection, args))
        summaries = parse_recent_results(rows, args)

    if args.json:
        print(json.dumps([public_summary(summary, include_raw=args.show_raw) for summary in summaries], indent=2))
    else:
        print_summary_rows(summaries, show_raw=args.show_raw)

    return 0


def command_request(args: argparse.Namespace) -> int:
    return run_recent_like(args)


def command_recent(args: argparse.Namespace) -> int:
    return run_recent_like(args)


def command_errors(args: argparse.Namespace) -> int:
    if not args.level:
        args.level = ["error", "fatal"]
    return run_recent_like(args)


def command_tail(args: argparse.Namespace) -> int:
    settings = get_settings()
    config_path = config_path_from_args(args)
    last_seen_dt: str | None = None

    with managed_connection(
        settings,
        config_path=config_path,
        keep_connection=args.keep_connection,
        valid_for_minutes=max(args.valid_for_minutes, args.minutes + 5),
        note="Codex monitor-prod-logs tail session",
    ) as connection:
        iterations = 1 if args.once else None
        completed = 0

        while iterations is None or completed < iterations:
            rows = query_rows(connection, build_recent_sql(connection, args, ascending=True, since_dt=last_seen_dt))
            summaries = parse_recent_results(rows, args)

            if args.json:
                if summaries:
                    print(json.dumps([public_summary(summary, include_raw=args.show_raw) for summary in summaries], indent=2))
            else:
                print_summary_rows(summaries, show_raw=args.show_raw, quiet_empty=not args.once)

            if rows:
                last_seen_dt = rows[-1].get("dt") or last_seen_dt

            completed += 1
            if iterations is not None and completed >= iterations:
                break

            time.sleep(args.poll_seconds)

    return 0


def positive_int(value: str) -> int:
    parsed = int(value)
    if parsed <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return parsed


def add_connection_options(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--keep-connection", action="store_true", help="Persist the generated query connection to the config file.")
    parser.add_argument(
        "--valid-for-minutes",
        type=positive_int,
        default=DEFAULT_CONNECTION_MINUTES,
        help="Lifetime for a new Better Stack query connection.",
    )
    parser.add_argument(
        "--config-path",
        default=str(DEFAULT_CONFIG_PATH),
        help="Path to the saved Better Stack query connection config.",
    )


def add_common_recent_filters(parser: argparse.ArgumentParser, *, storage_default: str = "complete") -> None:
    parser.add_argument("--minutes", type=positive_int, default=30, help="Look back this many minutes.")
    parser.add_argument("--since", help="Start of an exact time window. Prefer ISO 8601 with timezone offset.")
    parser.add_argument("--until", help="End of an exact time window. Prefer ISO 8601 with timezone offset.")
    parser.add_argument("--limit", type=positive_int, default=50, help="Maximum number of rows to print.")
    parser.add_argument(
        "--storage",
        choices=["complete", "hot", "archive"],
        default=storage_default,
        help="Which Better Stack log storage to query. 'complete' combines hot and archived logs.",
    )
    parser.add_argument(
        "--level",
        action="append",
        choices=["trace", "debug", "info", "warn", "warning", "error", "fatal", "unknown"],
        help="Filter to one or more log levels.",
    )
    parser.add_argument("--contains", action="append", help="Filter by message, path, or raw JSON substring.")
    parser.add_argument("--path-contains", help="Filter to logs whose parsed HTTP path contains this substring.")
    parser.add_argument("--status", type=int, help="Filter to parsed HTTP response status.")
    parser.add_argument("--show-raw", action="store_true", help="Print the raw JSON payload for each log.")
    parser.add_argument("--json", action="store_true", help="Print parsed rows as JSON.")
    add_connection_options(parser)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Inspect Croft production Better Stack logs.")
    parser.add_argument("--env-file", help="Load Better Stack settings from this env file before reading the environment.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    source_info_parser = subparsers.add_parser("source-info", help="Show Better Stack source metadata for Croft production.")
    source_info_parser.add_argument("--include-source-token", action="store_true", help="Include the source ingestion token in the output.")
    source_info_parser.set_defaults(func=command_source_info)

    list_connections_parser = subparsers.add_parser("list-connections", help="List active Better Stack query connections.")
    list_connections_parser.set_defaults(func=command_list_connections)

    connect_parser = subparsers.add_parser("connect", help="Create and save a reusable Better Stack query connection.")
    connect_parser.add_argument(
        "--valid-for-minutes",
        type=positive_int,
        default=8 * 60,
        help="Lifetime for the saved Better Stack query connection.",
    )
    connect_parser.add_argument(
        "--note",
        default="Codex monitor-prod-logs saved connection",
        help="Human-readable note stored on the Better Stack connection.",
    )
    connect_parser.add_argument(
        "--config-path",
        default=str(DEFAULT_CONFIG_PATH),
        help="Path to the saved Better Stack query connection config.",
    )
    connect_parser.set_defaults(func=command_connect)

    disconnect_parser = subparsers.add_parser("disconnect", help="Delete a saved Better Stack query connection.")
    disconnect_parser.add_argument("--connection-id", help="Delete this connection id instead of the saved config connection.")
    disconnect_parser.add_argument(
        "--config-path",
        default=str(DEFAULT_CONFIG_PATH),
        help="Path to the saved Better Stack query connection config.",
    )
    disconnect_parser.set_defaults(func=command_disconnect)

    schema_parser = subparsers.add_parser("schema", help="Describe the Better Stack hot log table.")
    add_connection_options(schema_parser)
    schema_parser.set_defaults(func=command_schema)

    sql_parser = subparsers.add_parser("sql", help="Run read-only SQL against the Croft Better Stack log source.")
    sql_parser.add_argument("query", nargs="?", help="SQL query string. Use {{logs}}, {{source}}, or {{archive_source}} placeholders.")
    sql_parser.add_argument("--file", help="Read SQL from a file instead of the CLI argument.")
    add_connection_options(sql_parser)
    sql_parser.set_defaults(func=command_sql)

    recent_parser = subparsers.add_parser("recent", help="Show recent production logs with optional filters.")
    add_common_recent_filters(recent_parser)
    recent_parser.set_defaults(func=command_recent)

    errors_parser = subparsers.add_parser("errors", help="Show recent error and fatal production logs.")
    add_common_recent_filters(errors_parser)
    errors_parser.set_defaults(func=command_errors)

    request_parser = subparsers.add_parser("request", help="Trace one request id through recent production logs.")
    request_parser.add_argument("request_id", help="Request id to trace.")
    add_common_recent_filters(request_parser)
    request_parser.set_defaults(func=command_request)

    tail_parser = subparsers.add_parser("tail", help="Poll for new production logs that match the filters.")
    add_common_recent_filters(tail_parser, storage_default="hot")
    tail_parser.add_argument("--poll-seconds", type=positive_int, default=5, help="Seconds between poll iterations.")
    tail_parser.add_argument("--once", action="store_true", help="Run a single poll iteration and exit.")
    tail_parser.set_defaults(func=command_tail)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    load_env_files(args.env_file)

    try:
        return args.func(args)
    except BetterStackError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("Interrupted.", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
