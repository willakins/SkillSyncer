#!/usr/bin/env python3
"""Analyze local skill folders and recent Waza result JSON files."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

DEFAULT_SKILLS_ROOT = Path.home() / ".codex" / "skills"
DEFAULT_RESULTS_DIR = (
    Path.home()
    / ".config/Code/User/globalStorage/ms-vscode.vscode-chat-customizations-evaluations/results"
)
LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")


def main() -> int:
    skills_root = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else DEFAULT_SKILLS_ROOT
    results_dir = Path(sys.argv[2]).expanduser() if len(sys.argv) > 2 else DEFAULT_RESULTS_DIR

    print(f"skills_root: {skills_root}")
    print(f"results_dir: {results_dir}")
    print()

    analyze_skills(skills_root)
    print()
    analyze_results(results_dir)
    return 0


def analyze_skills(root: Path) -> None:
    skill_files = sorted(p for p in root.glob("*/SKILL.md") if "/.system/" not in str(p))
    print(f"skills_found: {len(skill_files)}")
    for skill_file in skill_files:
        text = skill_file.read_text(errors="replace")
        skill_dir = skill_file.parent
        references = sorted((skill_dir / "references").glob("*.md")) if (skill_dir / "references").exists() else []
        linked_refs = {skill_dir / href for href in LINK_RE.findall(text) if href.startswith("references/")}
        orphan_refs = [p for p in references if p not in linked_refs]
        name = frontmatter_value(text, "name") or skill_dir.name
        description = frontmatter_value(text, "description") or ""
        rough_tokens = max(1, len(re.findall(r"\S+", text)))
        flags = []
        if rough_tokens > 500:
            flags.append(f"token-risk~{rough_tokens}")
        if references and orphan_refs:
            flags.append(f"orphan-refs={len(orphan_refs)}")
        if len(description.split()) < 12:
            flags.append("short-description")
        if not (skill_dir / "agents/openai.yaml").exists():
            flags.append("missing-openai-yaml")
        print(f"- {name}: refs={len(references)} rough_tokens={rough_tokens} flags={','.join(flags) or 'none'}")


def analyze_results(results_dir: Path) -> None:
    result_files = sorted(results_dir.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)[:10]
    print(f"recent_results: {len(result_files)}")
    for path in result_files:
        data = json.loads(path.read_text())
        config = data.get("config", {})
        summary = data.get("summary", {})
        classifications = sorted({classify_run(run) for task in data.get("tasks", []) for run in task.get("runs", [])})
        print(
            f"- {path.name}: skill={data.get('skill')} model={config.get('model_id')} "
            f"success={summary.get('succeeded', 0)}/{summary.get('total_tests', 0)} "
            f"class={','.join(classifications) or 'none'}"
        )


def frontmatter_value(text: str, key: str) -> str | None:
    if not text.startswith("---"):
        return None
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None
    for line in parts[1].splitlines():
        if line.startswith(f"{key}:"):
            return line.split(":", 1)[1].strip().strip('"')
    return None


def classify_run(run: dict) -> str:
    error = (run.get("error_msg") or "").lower()
    if run.get("status") == "error" and run.get("validations") is None:
        if "model" in error and "not available" in error:
            return "model/session-blocker"
        if "failed to create session" in error:
            return "session-blocker"
    if run.get("validations") is not None:
        return "validation-result"
    return run.get("status") or "unknown"


if __name__ == "__main__":
    raise SystemExit(main())
