#!/usr/bin/env python3
"""Summarize a Waza result JSON and classify common failure modes."""

from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: summarize_waza_result.py <result.json>", file=sys.stderr)
        return 2

    path = Path(sys.argv[1]).expanduser()
    data = json.loads(path.read_text())

    config = data.get("config", {})
    summary = data.get("summary", {})
    print(f"file: {path}")
    print(f"skill: {data.get('skill', 'unknown')}")
    print(f"model_id: {config.get('model_id', 'unknown')}")
    print(f"engine_type: {config.get('engine_type', 'unknown')}")
    print(
        "summary: "
        f"{summary.get('succeeded', 0)}/{summary.get('total_tests', 0)} succeeded, "
        f"{summary.get('errors', 0)} errors"
    )

    classifications: set[str] = set()
    for task in data.get("tasks", []):
        print(f"\n[{task.get('status', 'unknown')}] {task.get('test_id')} - {task.get('display_name')}")
        for run in task.get("runs", []):
            status = run.get("status", "unknown")
            error = run.get("error_msg") or ""
            validations = run.get("validations")
            final_output = (run.get("final_output") or "").strip()

            print(f"  run {run.get('run_number', '?')}: {status}")
            if error:
                print(f"  error: {error}")
            if validations is not None:
                print("  validations: present")
            if final_output:
                print(f"  final_output: {final_output[:500]}")

            classifications.add(classify_run(status, error, validations))

    print("\nclassification:")
    for item in sorted(classifications):
        print(f"- {item}")

    if "model/session failure" in classifications:
        print("\nnext: run `waza models` and rerun with an available model; do not patch triggers first.")
    elif "validation/behavior failure" in classifications:
        print("\nnext: inspect validations/transcripts and patch skill routing or behavior.")

    return 0


def classify_run(status: str, error: str, validations: object) -> str:
    lowered = error.lower()
    if status == "error" and validations is None:
        if "model" in lowered and "not available" in lowered:
            return "model/session failure"
        if "session.create" in lowered or "failed to create session" in lowered:
            return "model/session failure"
    if validations is not None:
        return "validation/behavior failure"
    if status == "passed":
        return "passed"
    return "unclassified failure"


if __name__ == "__main__":
    raise SystemExit(main())
