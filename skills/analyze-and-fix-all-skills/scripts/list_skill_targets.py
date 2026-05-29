#!/usr/bin/env python3
"""List Codex skill directories for batch analysis and repair."""

from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path


FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---", re.DOTALL)


@dataclass(frozen=True)
class SkillTarget:
    name: str
    path: Path
    root: Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("roots", nargs="*", type=Path, help="Skill roots to scan.")
    parser.add_argument("--json", action="store_true", help="Emit JSON instead of text.")
    parser.add_argument("--include-hidden", action="store_true", help="Include hidden directories.")
    parser.add_argument(
        "--include-plugin-cache",
        action="store_true",
        help="Include skills under .codex/plugins/cache when a provided root reaches them.",
    )
    parser.add_argument(
        "--name",
        action="append",
        default=[],
        help="Only include this frontmatter name or directory name. Repeatable.",
    )
    parser.add_argument(
        "--exclude",
        action="append",
        default=[],
        help="Exclude this frontmatter name or directory name. Repeatable.",
    )
    args = parser.parse_args()

    roots = [root.expanduser() for root in args.roots] or default_roots()
    targets = discover_targets(
        roots,
        include_hidden=args.include_hidden,
        include_plugin_cache=args.include_plugin_cache,
        include_names=set(args.name),
        exclude_names=set(args.exclude),
    )

    if args.json:
        print(
            json.dumps(
                [
                    {
                        "name": target.name,
                        "path": str(target.path),
                        "root": str(target.root),
                    }
                    for target in targets
                ],
                indent=2,
            )
        )
        return 0

    for target in targets:
        print(f"{target.path}\t{target.name}")
    return 0


def default_roots() -> list[Path]:
    codex_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex")).expanduser()
    candidates = [
        codex_home / "skills",
        Path.home() / ".agents" / "skills",
    ]
    return [path for path in candidates if path.exists()]


def discover_targets(
    roots: list[Path],
    *,
    include_hidden: bool,
    include_plugin_cache: bool,
    include_names: set[str],
    exclude_names: set[str],
) -> list[SkillTarget]:
    targets: list[SkillTarget] = []
    seen: set[Path] = set()

    for root in roots:
        root = root.expanduser().resolve()
        if not root.exists():
            continue

        skill_dirs = [root] if (root / "SKILL.md").is_file() else sorted(root.glob("*/SKILL.md"))
        for skill_file in skill_dirs:
            skill_dir = skill_file.parent if skill_file.name == "SKILL.md" else skill_file
            if skill_dir in seen:
                continue
            if should_skip(skill_dir, root, include_hidden, include_plugin_cache):
                continue

            name = skill_name(skill_dir / "SKILL.md") or skill_dir.name
            if include_names and name not in include_names and skill_dir.name not in include_names:
                continue
            if name in exclude_names or skill_dir.name in exclude_names:
                continue

            seen.add(skill_dir)
            targets.append(SkillTarget(name=name, path=skill_dir, root=root))

    return sorted(targets, key=lambda target: (target.name, str(target.path)))


def should_skip(skill_dir: Path, root: Path, include_hidden: bool, include_plugin_cache: bool) -> bool:
    if not include_hidden:
        try:
            relative_parts = skill_dir.relative_to(root).parts
        except ValueError:
            relative_parts = skill_dir.parts
        if any(part.startswith(".") for part in relative_parts):
            return True

    if not include_plugin_cache:
        normalized = str(skill_dir)
        if "/.codex/plugins/cache/" in normalized:
            return True

    return not (skill_dir / "SKILL.md").is_file()


def skill_name(skill_file: Path) -> str | None:
    text = skill_file.read_text(encoding="utf-8", errors="replace")
    match = FRONTMATTER_RE.search(text)
    if not match:
        return None

    for line in match.group(1).splitlines():
        if line.startswith("name:"):
            return line.split(":", 1)[1].strip().strip("\"'")
    return None


if __name__ == "__main__":
    raise SystemExit(main())
