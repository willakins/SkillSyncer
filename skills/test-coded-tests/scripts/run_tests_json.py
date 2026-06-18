#!/usr/bin/env python3
"""Discover a repo test runner, run it, and emit normalized JSON."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from collections import defaultdict
from contextlib import contextmanager
from pathlib import Path
from collections.abc import Iterator
from typing import Any


TEST_FILE_RE = re.compile(
    r"(?P<path>(?:\.?/)?[\w./@-]*(?:spec|test)[\w./@-]*\.(?:rb|js|jsx|ts|tsx|mjs|cjs))"
)


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def load_json(path: Path) -> Any | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def relpath(root: Path, path: str | None) -> str:
    if not path:
        return "unknown"

    candidate = Path(path)
    try:
        if candidate.is_absolute():
            return str(candidate.resolve().relative_to(root))
    except ValueError:
        return str(candidate)

    return str(candidate).removeprefix("./")


def truncate(value: str | None, limit: int = 500) -> str:
    if not value:
        return ""
    compact = re.sub(r"\s+", " ", value).strip()
    if len(compact) <= limit:
        return compact
    return compact[: limit - 3] + "..."


def gemfile_contains(root: Path, needle: str) -> bool:
    gemfile = read_text(root / "Gemfile")
    lockfile = read_text(root / "Gemfile.lock")
    return needle in gemfile or needle in lockfile


def croft_parallel_specs_available(root: Path) -> bool:
    run_specs = root / "bin" / "run-specs"
    rails = root / "bin" / "rails"
    return run_specs.exists() and rails.exists() and "parallel_rspec" in read_text(run_specs)


@contextmanager
def maybe_hide_croft_env_test_database_url(root: Path, plan: dict[str, Any]) -> Iterator[list[str]]:
    if not plan.get("hide_env_test_database_url"):
        yield []
        return

    env_test = root / ".env.test"
    contents = read_text(env_test)
    if "DATABASE_URL" not in contents or "TEST_ENV_NUMBER" not in contents:
        yield []
        return

    hidden = root / f".env.test.codex-disabled-{os.getpid()}"
    if hidden.exists():
        raise RuntimeError(f"Temporary dotenv backup already exists: {hidden}")

    os.replace(env_test, hidden)
    try:
        yield [relpath(root, str(env_test))]
    finally:
        if hidden.exists() and not env_test.exists():
            os.replace(hidden, env_test)


def package_deps(package: dict[str, Any]) -> set[str]:
    deps: set[str] = set()
    for key in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
        value = package.get(key)
        if isinstance(value, dict):
            deps.update(value.keys())
    return deps


def first_message(value: Any) -> str:
    if isinstance(value, list):
        return str(value[0]) if value else ""
    if isinstance(value, str):
        return value
    return ""


def strip_remainder(args: list[str]) -> list[str]:
    if args and args[0] == "--":
        return args[1:]
    return args


def detect_plan(root: Path, extra_args: list[str]) -> dict[str, Any]:
    detected_by: list[str] = []

    if (root / "Gemfile").exists():
        if gemfile_contains(root, "rails"):
            detected_by.append("Gemfile rails")
        if gemfile_contains(root, "rspec") or (root / "spec").exists() or (root / ".rspec").exists():
            detected_by.append("RSpec signals")
        if detected_by and any("RSpec" in item for item in detected_by):
            if croft_parallel_specs_available(root):
                return {
                    "type": "croft_parallel_rspec",
                    "runner": "RAILS_ENV=test bin/rails run specs",
                    "command": ["env", "RAILS_ENV=test", "bin/rails", "run", "specs"] + extra_args,
                    "parser": "generic",
                    "detected_by": detected_by + ["bin/run-specs parallel_rspec"],
                    "rerun_failed_files": True,
                    "hide_env_test_database_url": True,
                }

            report = tempfile.NamedTemporaryFile(prefix="codex-rspec-", suffix=".json", delete=False)
            report.close()
            command = ["bundle", "exec", "rspec", "--format", "json", "--out", report.name] + extra_args
            return {
                "type": "rails_rspec",
                "runner": "rspec",
                "command": command,
                "json_report": report.name,
                "parser": "rspec",
                "detected_by": detected_by,
            }

    package_path = root / "package.json"
    if package_path.exists():
        package = load_json(package_path)
        if not isinstance(package, dict):
            return {
                "type": "npm",
                "runner": "npm",
                "command": ["npm", "test"] + (["--"] + extra_args if extra_args else []),
                "parser": "generic",
                "detected_by": ["package.json"],
            }

        scripts = package.get("scripts") if isinstance(package.get("scripts"), dict) else {}
        test_script = str(scripts.get("test", ""))
        test_script_lower = test_script.lower()
        deps = package_deps(package)
        detected_by.append("package.json")

        if "vitest" in test_script_lower or ("vitest" in deps and not test_script):
            report = tempfile.NamedTemporaryFile(prefix="codex-vitest-", suffix=".json", delete=False)
            report.close()
            runner_args = ["--reporter=json", f"--outputFile={report.name}"]
            if "vitest" in test_script_lower and " run" not in f" {test_script_lower} ":
                runner_args.insert(0, "--run")
            command = ["npm", "test", "--"] + runner_args + extra_args
            return {
                "type": "npm_vitest",
                "runner": "npm test",
                "command": command,
                "json_report": report.name,
                "parser": "jest_like",
                "detected_by": detected_by + ["vitest"],
            }

        if "jest" in test_script_lower or "react-scripts test" in test_script_lower or (
            "jest" in deps and not test_script
        ):
            report = tempfile.NamedTemporaryFile(prefix="codex-jest-", suffix=".json", delete=False)
            report.close()
            runner_args = ["--json", f"--outputFile={report.name}"]
            if "react-scripts test" in test_script_lower:
                runner_args.append("--watchAll=false")
            else:
                runner_args.append("--runInBand")
            command = ["npm", "test", "--"] + runner_args + extra_args
            return {
                "type": "npm_jest",
                "runner": "npm test",
                "command": command,
                "json_report": report.name,
                "parser": "jest_like",
                "detected_by": detected_by + ["jest"],
            }

        command = ["npm", "test"] + (["--"] + extra_args if extra_args else [])
        return {
            "type": "npm",
            "runner": "npm test",
            "command": command,
            "parser": "generic",
            "detected_by": detected_by,
        }

    return {
        "type": "unsupported",
        "runner": None,
        "command": [],
        "parser": "none",
        "detected_by": [],
    }


def run_command(command: list[str], root: Path, timeout: int) -> dict[str, Any]:
    started = time.monotonic()
    try:
        completed = subprocess.run(
            command,
            cwd=root,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=timeout,
            check=False,
        )
        return {
            "exit_code": completed.returncode,
            "stdout": completed.stdout,
            "stderr": completed.stderr,
            "duration_seconds": round(time.monotonic() - started, 3),
            "timed_out": False,
        }
    except FileNotFoundError as error:
        return {
            "exit_code": 127,
            "stdout": "",
            "stderr": str(error),
            "duration_seconds": round(time.monotonic() - started, 3),
            "timed_out": False,
        }
    except subprocess.TimeoutExpired as error:
        return {
            "exit_code": 124,
            "stdout": error.stdout or "",
            "stderr": error.stderr or "",
            "duration_seconds": round(time.monotonic() - started, 3),
            "timed_out": True,
        }


def failed_files_from_output(root: Path, output: str) -> list[str]:
    return sorted({relpath(root, match.group("path")) for match in TEST_FILE_RE.finditer(output)})


def grouped_failures(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in items:
        grouped[item["file"]].append(
            {
                "name": item.get("name") or "",
                "line": item.get("line"),
                "message": truncate(item.get("message")),
            }
        )

    return [
        {"file": file_name, "failed": len(examples), "examples": examples}
        for file_name, examples in sorted(grouped.items())
    ]


def parse_rspec(root: Path, report_path: str) -> dict[str, Any] | None:
    data = load_json(Path(report_path))
    if not isinstance(data, dict):
        return None

    summary = data.get("summary") if isinstance(data.get("summary"), dict) else {}
    failures = []
    for example in data.get("examples", []):
        if not isinstance(example, dict) or example.get("status") != "failed":
            continue
        exception = example.get("exception") if isinstance(example.get("exception"), dict) else {}
        failures.append(
            {
                "file": relpath(root, example.get("file_path")),
                "line": example.get("line_number"),
                "name": example.get("full_description"),
                "message": exception.get("message") or exception.get("class"),
            }
        )

    failed = int(summary.get("failure_count") or len(failures))
    total = summary.get("example_count")
    pending = summary.get("pending_count")
    return {
        "total": total,
        "passed": total - failed - int(pending or 0) if isinstance(total, int) else None,
        "failed": failed,
        "pending": pending,
        "failures": grouped_failures(failures),
    }


def parse_jest_like(root: Path, report_path: str) -> dict[str, Any] | None:
    data = load_json(Path(report_path))
    if not isinstance(data, dict):
        return None

    failures = []
    for result in data.get("testResults", []):
        if not isinstance(result, dict):
            continue
        file_name = relpath(root, result.get("name"))
        assertions = result.get("assertionResults")
        if isinstance(assertions, list):
            for assertion in assertions:
                if not isinstance(assertion, dict) or assertion.get("status") not in ("failed", "error"):
                    continue
                title_parts = assertion.get("ancestorTitles") or []
                if not isinstance(title_parts, list):
                    title_parts = []
                title = " ".join([str(part) for part in title_parts + [assertion.get("title", "")] if part])
                location = assertion.get("location") if isinstance(assertion.get("location"), dict) else {}
                failures.append(
                    {
                        "file": file_name,
                        "line": location.get("line"),
                        "name": title,
                        "message": first_message(assertion.get("failureMessages"))
                        or result.get("message")
                        or result.get("failureMessage"),
                    }
                )
        elif result.get("status") in ("failed", "error"):
            failures.append(
                {
                    "file": file_name,
                    "line": None,
                    "name": result.get("name") or file_name,
                    "message": result.get("message") or result.get("failureMessage"),
                }
            )

    failed = data.get("numFailedTests")
    if not isinstance(failed, int):
        failed = len(failures)

    return {
        "total": data.get("numTotalTests"),
        "passed": data.get("numPassedTests"),
        "failed": failed,
        "pending": data.get("numPendingTests") or data.get("numTodoTests"),
        "failures": grouped_failures(failures),
    }


def parse_generic(root: Path, output: str, exit_code: int) -> dict[str, Any]:
    failed = 0
    total = None
    pending = None

    rspec_match = re.search(r"(\d+)\s+examples?,\s+(\d+)\s+failures?(?:,\s+(\d+)\s+pending)?", output)
    if rspec_match:
        total = int(rspec_match.group(1))
        failed = int(rspec_match.group(2))
        pending = int(rspec_match.group(3) or 0)

    jest_match = re.search(r"Tests:\s+(?:(\d+)\s+failed,\s+)?(?:(\d+)\s+passed,\s+)?(\d+)\s+total", output)
    if jest_match:
        failed = int(jest_match.group(1) or 0)
        passed = int(jest_match.group(2) or 0)
        total = int(jest_match.group(3))
    else:
        passed = None

    files = failed_files_from_output(root, output)
    if exit_code != 0 and failed == 0:
        failed = len(files) if files else 1

    failures = [{"file": file_name, "failed": 1, "examples": []} for file_name in files]
    return {
        "total": total,
        "passed": passed,
        "failed": failed,
        "pending": pending,
        "failures": failures,
    }


def parse_results(root: Path, plan: dict[str, Any], run: dict[str, Any]) -> dict[str, Any]:
    parsed = None
    if plan.get("parser") == "rspec" and plan.get("json_report"):
        parsed = parse_rspec(root, str(plan["json_report"]))
    elif plan.get("parser") == "jest_like" and plan.get("json_report"):
        parsed = parse_jest_like(root, str(plan["json_report"]))

    if parsed is None:
        parsed = parse_generic(root, f"{run['stdout']}\n{run['stderr']}", int(run["exit_code"]))

    status = "timeout" if run["timed_out"] else "failed" if parsed["failed"] else "passed"
    if run["exit_code"] == 127:
        status = "error"

    return {
        "status": status,
        "summary": {
            "total": parsed.get("total"),
            "passed": parsed.get("passed"),
            "failed": parsed.get("failed"),
            "pending": parsed.get("pending"),
            "duration_seconds": run["duration_seconds"],
            "exit_code": run["exit_code"],
        },
        "failures": parsed.get("failures", []),
    }


def cleanup_report(plan: dict[str, Any]) -> None:
    report = plan.get("json_report")
    if not report:
        return
    try:
        Path(str(report)).unlink(missing_ok=True)
    except OSError:
        pass


def maybe_rerun_failed_specs(root: Path, plan: dict[str, Any], run: dict[str, Any], timeout: int) -> dict[str, Any] | None:
    if not plan.get("rerun_failed_files") or run["exit_code"] == 0 or run["timed_out"]:
        return None

    failed_files = failed_files_from_output(root, f"{run['stdout']}\n{run['stderr']}")
    if not failed_files:
        return None

    rerun_command = ["env", "RAILS_ENV=test", "bin/rails", "run", "specs", *failed_files]
    rerun = run_command(rerun_command, root, timeout)
    rerun["command"] = rerun_command
    rerun["failed_files"] = failed_files
    return rerun


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cwd", default=os.getcwd(), help="Repository root to inspect.")
    parser.add_argument("--timeout", type=int, default=1200, help="Test command timeout in seconds.")
    parser.add_argument("--dry-run", action="store_true", help="Detect and print the test plan without running tests.")
    parser.add_argument("test_args", nargs=argparse.REMAINDER, help="Optional test runner args after --.")
    args = parser.parse_args()

    root = Path(args.cwd).resolve()
    extra_args = strip_remainder(args.test_args)
    plan = detect_plan(root, extra_args)

    base = {
        "schema_version": 1,
        "cwd": str(root),
        "environment": {
            "type": plan["type"],
            "runner": plan.get("runner"),
            "command": plan.get("command", []),
            "detected_by": plan.get("detected_by", []),
        },
    }

    if plan["type"] == "unsupported":
        result = {
            **base,
            "status": "not_found",
            "summary": {
                "total": None,
                "passed": None,
                "failed": 0,
                "pending": None,
                "duration_seconds": 0,
                "exit_code": None,
            },
            "failures": [],
            "errors": ["No supported Rails/RSpec or npm test environment found."],
        }
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0

    if args.dry_run:
        result = {
            **base,
            "status": "dry_run",
            "summary": {
                "total": None,
                "passed": None,
                "failed": 0,
                "pending": None,
                "duration_seconds": 0,
                "exit_code": None,
            },
            "failures": [],
            "errors": [],
        }
        print(json.dumps(result, indent=2, sort_keys=True))
        cleanup_report(plan)
        return 0

    try:
        with maybe_hide_croft_env_test_database_url(root, plan) as disabled_env_files:
            run = run_command(plan["command"], root, args.timeout)
            rerun = maybe_rerun_failed_specs(root, plan, run, args.timeout)
        parsed = parse_results(root, plan, rerun or run)
        errors = []
        if parsed["status"] == "error":
            errors.append(truncate((rerun or run)["stderr"]) or "Unable to execute test command.")
        result = {**base, **parsed, "errors": errors}
        if rerun:
            result["rerun"] = {
                "command": rerun["command"],
                "failed_files": rerun["failed_files"],
                "initial_exit_code": run["exit_code"],
                "initial_duration_seconds": run["duration_seconds"],
                "duration_seconds": rerun["duration_seconds"],
                "exit_code": rerun["exit_code"],
            }
        if disabled_env_files:
            result["environment"]["temporarily_disabled_env_files"] = disabled_env_files
        print(json.dumps(result, indent=2, sort_keys=True))
        return 0
    finally:
        cleanup_report(plan)


if __name__ == "__main__":
    sys.exit(main())
