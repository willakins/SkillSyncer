#!/usr/bin/env python3
"""Print a compact inventory for bootstrapping project setup docs."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Iterable


SKIP_DIRS = {
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    "vendor",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    ".next",
    ".nuxt",
    ".expo",
    "dist",
    "build",
    "target",
    "coverage",
}

DOC_NAMES = {
    "readme.md",
    "readme",
    "agents.md",
    ".gitignore",
    "license",
    "license.md",
    "copying",
    "notice",
    "contributing.md",
    "code_of_conduct.md",
}

SIGNAL_FILES = {
    "package.json": "JavaScript / TypeScript",
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "Yarn",
    "package-lock.json": "npm",
    "bun.lockb": "Bun",
    "pyproject.toml": "Python",
    "requirements.txt": "Python",
    "poetry.lock": "Poetry",
    "uv.lock": "uv",
    "Pipfile": "Pipenv",
    "Gemfile": "Ruby",
    "Gemfile.lock": "Bundler",
    "go.mod": "Go",
    "Cargo.toml": "Rust",
    "pom.xml": "Maven",
    "build.gradle": "Gradle",
    "settings.gradle": "Gradle",
    "Dockerfile": "Docker",
    "docker-compose.yml": "Docker Compose",
    "compose.yml": "Docker Compose",
    "Makefile": "Make",
    ".tool-versions": "asdf",
    "mise.toml": "mise",
    ".nvmrc": "Node version",
}


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def iter_files(root: Path, max_depth: int = 4) -> Iterable[Path]:
    root = root.resolve()
    for current, dirs, files in os.walk(root):
        current_path = Path(current)
        depth = len(current_path.relative_to(root).parts)
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS and depth < max_depth)
        for name in sorted(files):
            yield current_path / name


def git_output(root: Path, *args: str) -> str | None:
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=root,
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
        )
    except (OSError, subprocess.CalledProcessError):
        return None
    value = result.stdout.strip()
    return value or None


def read_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeDecodeError):
        return {}


def top_level_tree(root: Path) -> list[str]:
    entries: list[str] = []
    for child in sorted(root.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
        if child.name in SKIP_DIRS:
            continue
        suffix = "/" if child.is_dir() else ""
        entries.append(f"{child.name}{suffix}")
    return entries[:40]


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").expanduser().resolve()
    if not root.exists():
        print(f"error: path does not exist: {root}", file=sys.stderr)
        return 2
    if not root.is_dir():
        print(f"error: path is not a directory: {root}", file=sys.stderr)
        return 2

    files = list(iter_files(root))
    relative_files = [rel(path, root) for path in files]
    root_names = {path.name for path in root.iterdir()}
    lower_root_names = {name.lower() for name in root_names}

    print(f"# Project Inventory: {root.name}")
    print()
    print(f"Root: {root}")

    branch = git_output(root, "branch", "--show-current")
    remote = git_output(root, "remote", "get-url", "origin")
    if branch or remote:
        print()
        print("## Git")
        if branch:
            print(f"- Branch: {branch}")
        if remote:
            print(f"- Origin: {remote}")

    print()
    print("## Existing Setup Files")
    for doc in sorted(DOC_NAMES):
        matches = [name for name in root_names if name.lower() == doc]
        if matches:
            print(f"- {matches[0]}: present")
    if "docs" in root_names:
        docs_files = [path for path in relative_files if path.startswith("docs/")]
        print(f"- docs/: present ({len(docs_files)} files found within scan depth)")
    missing = []
    for required in ("README.md", "AGENTS.md", ".gitignore", "LICENSE", "docs/README.md"):
        required_path = root / required
        if not required_path.exists():
            missing.append(required)
    if missing:
        print("- Missing core files: " + ", ".join(missing))

    print()
    print("## Technology Signals")
    signals = []
    for filename, label in SIGNAL_FILES.items():
        if filename in root_names:
            signals.append((filename, label))
    if signals:
        for filename, label in signals:
            print(f"- {filename}: {label}")
    else:
        print("- No common language/package manager signal files found at repo root")

    package_json = root / "package.json"
    if package_json.exists():
        data = read_json(package_json)
        if data:
            print()
            print("## package.json")
            if data.get("name"):
                print(f"- name: {data['name']}")
            if data.get("description"):
                print(f"- description: {data['description']}")
            if data.get("license"):
                print(f"- license: {data['license']}")
            scripts = data.get("scripts")
            if isinstance(scripts, dict) and scripts:
                print("- scripts:")
                for name, command in sorted(scripts.items()):
                    print(f"  - {name}: {command}")

    env_examples = [
        path for path in relative_files if path.endswith(".env.example") or ".env.example" in path
    ]
    if env_examples:
        print()
        print("## Environment Examples")
        for path in env_examples[:20]:
            print(f"- {path}")

    existing_docs = [
        path
        for path in relative_files
        if path.lower().startswith("docs/") or Path(path).name.lower() in DOC_NAMES
    ]
    if existing_docs:
        print()
        print("## Documentation-Like Files")
        for path in existing_docs[:60]:
            print(f"- {path}")

    print()
    print("## Top-Level Entries")
    for entry in top_level_tree(root):
        print(f"- {entry}")

    if "README.md" not in root_names and "readme.md" not in lower_root_names:
        print()
        print("## Suggested Next Step")
        print("- Create README.md first so all other docs have a project identity to reference.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
