#!/usr/bin/env python3
"""Create isolated local Postgres databases for a Rails git worktree."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlparse


TEST_ENV_TOKEN = "${TEST_ENV_NUMBER}"
POSTGRES_IDENTIFIER_LIMIT = 63


class SetupError(RuntimeError):
    pass


def run_command(command: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, text=True, capture_output=True)
    if check and result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or "command failed"
        raise SetupError(f"{' '.join(command)}: {detail}")
    return result


def git_root(path: Path) -> Path:
    result = run_command(["git", "-C", str(path), "rev-parse", "--show-toplevel"], check=False)
    if result.returncode == 0:
        return Path(result.stdout.strip()).resolve()
    return path.expanduser().resolve()


def strip_quotes(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
        return value[1:-1]
    return value


def dotenv_value(path: Path, key: str) -> str | None:
    if not path.exists():
        return None

    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line.removeprefix("export ").strip()
        name, separator, value = line.partition("=")
        if separator and name.strip() == key:
            return strip_quotes(value)

    return None


def database_name_from_url(url: str) -> str | None:
    parsed = urlparse(url)
    if parsed.scheme not in {"postgres", "postgresql"}:
        return None

    database = parsed.path.lstrip("/")
    return database or None


def dotenv_database(repo_root: Path, env_name: str) -> str | None:
    value = dotenv_value(repo_root / f".env.{env_name}", "DATABASE_URL")
    if value:
        return database_name_from_url(value)
    return None


def development_database_from_config(repo_root: Path) -> str | None:
    database_yml = repo_root / "config" / "database.yml"
    if not database_yml.exists():
        return None

    in_development = False
    for raw_line in database_yml.read_text().splitlines():
        if re.match(r"^\S.*:\s*$", raw_line):
            in_development = raw_line.strip() == "development:"
            continue
        if in_development:
            match = re.match(r"^\s+database:\s+([^\s#]+)", raw_line)
            if match:
                return match.group(1).strip("\"'")

    return None


def infer_prefix(repo_root: Path) -> str:
    database = development_database_from_config(repo_root)
    if database and database.endswith("_development"):
        return database.removesuffix("_development")
    if database:
        return sanitize_fragment(database)
    return sanitize_fragment(repo_root.name)


def sanitize_fragment(value: str) -> str:
    fragment = re.sub(r"[^a-zA-Z0-9]+", "_", value).strip("_").lower()
    return fragment or "worktree"


def bounded_database_name(prefix: str, label: str, suffix: str) -> str:
    prefix = sanitize_fragment(prefix)
    label = sanitize_fragment(label)
    suffix = sanitize_fragment(suffix)

    if label == prefix:
        candidate = f"{prefix}_{suffix}"
    else:
        candidate = f"{prefix}_{label}_{suffix}"

    if len(candidate) <= POSTGRES_IDENTIFIER_LIMIT:
        return candidate

    digest = hashlib.sha1(label.encode("utf-8")).hexdigest()[:8]
    reserve = len(prefix) + len(suffix) + len(digest) + 3
    max_label_length = max(1, POSTGRES_IDENTIFIER_LIMIT - reserve)
    shortened_label = label[:max_label_length].rstrip("_") or label[:max_label_length]
    return f"{prefix}_{shortened_label}_{digest}_{suffix}"


def all_database_names() -> set[str]:
    result = run_command(["psql", "-d", "postgres", "-Atq", "-c", "SELECT datname FROM pg_database"])
    return {line.strip() for line in result.stdout.splitlines() if line.strip()}


def matching_test_databases(database_names: set[str], test_base: str) -> list[str]:
    pattern = re.compile(rf"^{re.escape(test_base)}(\d*)$")

    def sort_key(database: str) -> tuple[int, str]:
        match = pattern.match(database)
        suffix = match.group(1) if match else ""
        return (int(suffix) if suffix else 1, database)

    return sorted((name for name in database_names if pattern.match(name)), key=sort_key)


def test_suffix(database: str, test_base: str) -> str:
    return database.removeprefix(test_base)


def database_exists(name: str, database_names: set[str]) -> bool:
    return name in database_names


def ensure_development_name(name: str, label: str) -> None:
    if not name.endswith("_development"):
        raise SetupError(f"{label} database {name!r} does not look like a local development database")


def ensure_test_base_name(name: str, label: str) -> None:
    if not name.endswith("_test"):
        raise SetupError(f"{label} test database prefix {name!r} does not look like a local test database prefix")


def write_env_file(path: Path, content: str, *, force: bool, dry_run: bool) -> str:
    if path.exists():
        existing = path.read_text()
        if existing == content:
            return "unchanged"
        if not force:
            raise SetupError(f"{path} already exists with different content; rerun with --force-env to replace it")
        if dry_run:
            return "would_replace"
        path.write_text(content)
        return "replaced"

    if dry_run:
        return "would_create"

    path.write_text(content)
    return "created"


def check_gitignored(repo_root: Path, relative_path: str) -> bool:
    result = run_command(["git", "-C", str(repo_root), "check-ignore", "-q", relative_path], check=False)
    return result.returncode == 0


def default_vscode_tasks_source(source_root: Path, target_root: Path) -> Path | None:
    candidates = [
        source_root.parent / "croft" / ".vscode" / "tasks.json",
        target_root.parent / "croft" / ".vscode" / "tasks.json",
    ]
    if source_root.name == "croft":
        candidates.insert(0, source_root / ".vscode" / "tasks.json")

    seen: set[Path] = set()
    for candidate in candidates:
        resolved = candidate.expanduser().resolve(strict=False)
        if resolved in seen:
            continue
        seen.add(resolved)
        if candidate.exists():
            return resolved

    return None


def setup_vscode_tasks_symlink(
    target_root: Path,
    source_tasks: Path | None,
    *,
    force: bool,
    dry_run: bool,
) -> dict[str, str]:
    target_dir = target_root / ".vscode"
    target_tasks = target_dir / "tasks.json"

    if source_tasks is None:
        return {
            "target": str(target_tasks),
            "status": "missing_source",
        }

    source_tasks = source_tasks.expanduser().resolve(strict=False)
    if not source_tasks.exists():
        return {
            "source": str(source_tasks),
            "target": str(target_tasks),
            "status": "missing_source",
        }

    if target_tasks.exists() or target_tasks.is_symlink():
        try:
            if target_tasks.resolve(strict=False) == source_tasks:
                status = "unchanged" if target_tasks.is_symlink() else "canonical_file"
                return {
                    "source": str(source_tasks),
                    "target": str(target_tasks),
                    "status": status,
                }
        except FileNotFoundError:
            pass

        if not force:
            raise SetupError(
                f"{target_tasks} already exists and is not linked to {source_tasks}; "
                "rerun with --force-vscode-task to replace it"
            )
        if dry_run:
            return {
                "source": str(source_tasks),
                "target": str(target_tasks),
                "status": "would_replace",
            }
        target_tasks.unlink()

    if dry_run:
        return {
            "source": str(source_tasks),
            "target": str(target_tasks),
            "status": "would_create",
        }

    target_dir.mkdir(parents=True, exist_ok=True)
    target_tasks.symlink_to(os.path.relpath(source_tasks, start=target_dir))
    return {
        "source": str(source_tasks),
        "target": str(target_tasks),
        "status": "created",
    }


def clone_database(source: str, target: str, database_names: set[str], *, dry_run: bool) -> dict[str, str]:
    if source == target:
        return {"source": source, "target": target, "status": "same_database"}
    if target in database_names:
        return {"source": source, "target": target, "status": "target_exists"}
    if source not in database_names:
        return {"source": source, "target": target, "status": "missing_source"}
    if dry_run:
        return {"source": source, "target": target, "status": "would_create_and_restore"}

    with tempfile.NamedTemporaryFile(prefix=f"{source}_", suffix=".dump", delete=True) as dump:
        run_command(["pg_dump", "--format=custom", "--no-owner", "--no-privileges", "--dbname", source, "--file", dump.name])
        run_command(["createdb", target])
        database_names.add(target)
        run_command(["pg_restore", "--no-owner", "--no-privileges", "--dbname", target, dump.name])

    return {"source": source, "target": target, "status": "created_and_restored"}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--worktree", default=".", help="Target worktree path. Default: current directory.")
    parser.add_argument("--source-worktree", default=".", help="Existing local worktree to copy data from. Default: current directory.")
    parser.add_argument("--db-prefix", help="Database prefix, such as croft. Default: inferred from source config/database.yml.")
    parser.add_argument("--label", help="Label used in target database names. Default: target worktree directory name.")
    parser.add_argument("--source-db", help="Source development database. Default: source .env.development or config/database.yml.")
    parser.add_argument("--source-test-db-prefix", help="Source test database prefix. Default: source .env.test or <db-prefix>_test.")
    parser.add_argument("--target-db", help="Target development database name. Default: inferred from prefix and label.")
    parser.add_argument("--target-test-db-prefix", help="Target test database prefix. Default: inferred from prefix and label.")
    parser.add_argument("--skip-test-dbs", action="store_true", help="Only set up and copy the development database.")
    parser.add_argument("--skip-vscode-task", action="store_true", help="Do not link .vscode/tasks.json to the shared Croft task.")
    parser.add_argument("--vscode-tasks-source", help="Canonical VS Code tasks.json to symlink. Default: sibling croft/.vscode/tasks.json.")
    parser.add_argument("--force-vscode-task", action="store_true", help="Replace an existing target .vscode/tasks.json when it is not the shared symlink.")
    parser.add_argument("--force-env", action="store_true", help="Replace existing .env.development/.env.test files when their content differs.")
    parser.add_argument("--dry-run", action="store_true", help="Print planned changes without writing files or creating databases.")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        target_root = git_root(Path(args.worktree).expanduser())
        source_root = git_root(Path(args.source_worktree).expanduser())
        prefix = args.db_prefix or infer_prefix(source_root)
        label = args.label or target_root.name

        source_dev_db = args.source_db or dotenv_database(source_root, "development") or development_database_from_config(source_root)
        if not source_dev_db:
            raise SetupError("could not infer source development database")
        target_dev_db = args.target_db or bounded_database_name(prefix, label, "development")

        source_test_template = args.source_test_db_prefix or dotenv_database(source_root, "test") or f"{sanitize_fragment(prefix)}_test"
        source_test_base = source_test_template.replace(TEST_ENV_TOKEN, "")
        target_test_base = args.target_test_db_prefix or bounded_database_name(prefix, label, "test")

        ensure_development_name(source_dev_db, "source")
        ensure_development_name(target_dev_db, "target")
        if not args.skip_test_dbs:
            ensure_test_base_name(source_test_base, "source")
            ensure_test_base_name(target_test_base, "target")

        dev_env_content = f"DATABASE_URL=postgresql:///{target_dev_db}\n"
        test_env_content = f"DATABASE_URL=postgresql:///{target_test_base}{TEST_ENV_TOKEN}\n"

        env_files = {
            ".env.development": write_env_file(target_root / ".env.development", dev_env_content, force=args.force_env, dry_run=args.dry_run),
        }
        if not args.skip_test_dbs:
            env_files[".env.test"] = write_env_file(target_root / ".env.test", test_env_content, force=args.force_env, dry_run=args.dry_run)

        warnings: list[str] = []
        for env_file in env_files:
            if not check_gitignored(target_root, env_file):
                warnings.append(f"{env_file} is not ignored by git in {target_root}")

        vscode_tasks = None
        if not args.skip_vscode_task:
            source_tasks = Path(args.vscode_tasks_source).expanduser() if args.vscode_tasks_source else default_vscode_tasks_source(source_root, target_root)
            vscode_tasks = setup_vscode_tasks_symlink(
                target_root,
                source_tasks,
                force=args.force_vscode_task,
                dry_run=args.dry_run,
            )
            if vscode_tasks["status"] == "missing_source":
                warnings.append("shared VS Code tasks.json was not found; skipped task symlink")
            elif not check_gitignored(target_root, ".vscode/tasks.json"):
                warnings.append(f".vscode/tasks.json is not ignored by git in {target_root}")

        database_names = all_database_names()
        database_copies: list[dict[str, str]] = []
        database_copies.append(clone_database(source_dev_db, target_dev_db, database_names, dry_run=args.dry_run))

        if not args.skip_test_dbs:
            source_test_databases = matching_test_databases(database_names, source_test_base)
            if not source_test_databases:
                warnings.append(f"no source test databases found for prefix {source_test_base}")
            for source_test_db in source_test_databases:
                target_test_db = f"{target_test_base}{test_suffix(source_test_db, source_test_base)}"
                database_copies.append(clone_database(source_test_db, target_test_db, database_names, dry_run=args.dry_run))

        payload = {
            "target_worktree": str(target_root),
            "source_worktree": str(source_root),
            "db_prefix": sanitize_fragment(prefix),
            "label": sanitize_fragment(label),
            "env_files": env_files,
            "vscode_tasks": vscode_tasks,
            "database_copies": database_copies,
            "warnings": warnings,
            "dry_run": args.dry_run,
        }
        print(json.dumps(payload, indent=2))
        return 0
    except SetupError as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
