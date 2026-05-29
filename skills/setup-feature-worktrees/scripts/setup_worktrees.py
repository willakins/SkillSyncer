#!/usr/bin/env python3
"""
Set up one or more feature branches across the current worktree plus optional extra worktrees.

Example:
    setup_worktrees.py feature/foo-api feature/foo-ui --repo /path/to/repo --use-current-worktree --open-code
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path


class CommandError(RuntimeError):
    pass


def run_command(command: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, text=True, capture_output=True)
    if check and result.returncode != 0:
        stderr = result.stderr.strip()
        stdout = result.stdout.strip()
        detail = stderr or stdout or "command failed"
        raise CommandError(f"{' '.join(command)}: {detail}")
    return result


def git(repo_root: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return run_command(["git", "-C", str(repo_root), *args], check=check)


def resolve_repo_root(repo: Path) -> Path:
    result = git(repo, "rev-parse", "--show-toplevel")
    return Path(result.stdout.strip()).resolve()


def ensure_ref_exists(repo_root: Path, ref_name: str) -> None:
    git(repo_root, "rev-parse", "--verify", ref_name)


def current_worktree_clean(repo_root: Path) -> bool:
    status = git(repo_root, "status", "--short").stdout.strip()
    return not status


def current_branch(repo_root: Path) -> str:
    return git(repo_root, "branch", "--show-current").stdout.strip()


def local_branch_exists(repo_root: Path, branch_name: str) -> bool:
    result = git(repo_root, "show-ref", "--verify", "--quiet", f"refs/heads/{branch_name}", check=False)
    return result.returncode == 0


def parse_worktrees(repo_root: Path) -> list[dict[str, str]]:
    lines = git(repo_root, "worktree", "list", "--porcelain").stdout.splitlines()
    entries: list[dict[str, str]] = []
    entry: dict[str, str] = {}

    for line in [*lines, ""]:
        if not line:
            if entry:
                entries.append(entry)
                entry = {}
            continue

        key, _, value = line.partition(" ")
        entry[key] = value

    return entries


def branch_to_worktree_path(entries: list[dict[str, str]]) -> dict[str, Path]:
    mapping: dict[str, Path] = {}

    for entry in entries:
        raw_branch = entry.get("branch")
        worktree = entry.get("worktree")
        if not raw_branch or not worktree:
            continue
        branch_name = raw_branch.removeprefix("refs/heads/")
        mapping[branch_name] = Path(worktree).resolve()

    return mapping


def path_fragment(branch_name: str) -> str:
    return branch_name.replace("/", "__")


def open_code_window(code_binary: str | None, worktree_path: Path) -> bool:
    if not code_binary:
        return False

    run_command([code_binary, "-n", str(worktree_path)])
    return True


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("branches", nargs="+", help="Feature branches to prepare. The first branch uses the current worktree when --use-current-worktree is set.")
    parser.add_argument("--repo", default=".", help="Repository root or any path inside the repository.")
    parser.add_argument("--base-ref", default="main", help="Git ref each branch should start from. Default: main")
    parser.add_argument("--workspace-root", help="Directory for extra worktrees. Default: sibling <repo>-worktrees directory.")
    parser.add_argument("--use-current-worktree", action="store_true", help="Use the current worktree for the first branch in the list.")
    parser.add_argument("--open-code", action="store_true", help="Open VS Code for each newly created extra worktree.")
    parser.add_argument("--dry-run", action="store_true", help="Print the planned mapping without mutating git state.")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        repo_root = resolve_repo_root(Path(args.repo).expanduser())
        ensure_ref_exists(repo_root, args.base_ref)

        if len(set(args.branches)) != len(args.branches):
            raise CommandError("branch names must be unique")

        worktree_entries = parse_worktrees(repo_root)
        branch_paths = branch_to_worktree_path(worktree_entries)
        workspace_root = Path(args.workspace_root).expanduser().resolve() if args.workspace_root else repo_root.parent / f"{repo_root.name}-worktrees"
        code_binary = shutil.which("code") if args.open_code else None

        if args.use_current_worktree and not current_worktree_clean(repo_root):
            raise CommandError("current worktree is dirty; clean it before reusing it for a new branch")

        summary: list[dict[str, object]] = []
        warnings: list[str] = []

        branch_names = list(args.branches)
        primary_branch = branch_names.pop(0) if args.use_current_worktree else None

        if args.open_code and not code_binary:
            warnings.append("VS Code CLI `code` was not found; extra worktrees were created without opening editor windows")

        if primary_branch:
            existing_primary_path = branch_paths.get(primary_branch)
            if existing_primary_path and existing_primary_path != repo_root:
                raise CommandError(f"branch {primary_branch!r} is already checked out in {existing_primary_path}")

            primary_created = False
            primary_switched = False

            if args.dry_run:
                current_branch_name = current_branch(repo_root)
                primary_created = not local_branch_exists(repo_root, primary_branch)
                primary_switched = current_branch_name != primary_branch
            else:
                current_branch_name = current_branch(repo_root)
                if current_branch_name == primary_branch:
                    primary_switched = False
                elif local_branch_exists(repo_root, primary_branch):
                    git(repo_root, "switch", primary_branch)
                    primary_switched = True
                else:
                    git(repo_root, "switch", "-c", primary_branch, args.base_ref)
                    primary_created = True
                    primary_switched = True

            summary.append(
                {
                    "branch": primary_branch,
                    "path": str(repo_root),
                    "uses_current_worktree": True,
                    "created_branch": primary_created,
                    "created_worktree": False,
                    "switched_branch": primary_switched,
                    "code_opened": False,
                }
            )

        for branch_name in branch_names:
            existing_path = branch_paths.get(branch_name)
            desired_path = workspace_root / path_fragment(branch_name)
            created_worktree = False
            created_branch = False
            code_opened = False
            target_path = desired_path

            if existing_path:
                target_path = existing_path
                if existing_path != desired_path:
                    warnings.append(f"branch {branch_name!r} already has worktree {existing_path}; reusing it instead of {desired_path}")
            else:
                if desired_path.exists():
                    raise CommandError(f"target worktree path already exists and is not registered: {desired_path}")

                if not args.dry_run:
                    desired_path.parent.mkdir(parents=True, exist_ok=True)
                    if local_branch_exists(repo_root, branch_name):
                        git(repo_root, "worktree", "add", str(desired_path), branch_name)
                    else:
                        git(repo_root, "worktree", "add", "-b", branch_name, str(desired_path), args.base_ref)
                        created_branch = True
                    created_worktree = True
                    code_opened = args.open_code and open_code_window(code_binary, desired_path)
                else:
                    created_worktree = True
                    created_branch = not local_branch_exists(repo_root, branch_name)
                    code_opened = args.open_code and code_binary is not None

            summary.append(
                {
                    "branch": branch_name,
                    "path": str(target_path),
                    "uses_current_worktree": False,
                    "created_branch": created_branch,
                    "created_worktree": created_worktree,
                    "switched_branch": False,
                    "code_opened": code_opened,
                }
            )

        payload = {
            "repo_root": str(repo_root),
            "base_ref": args.base_ref,
            "workspace_root": str(workspace_root),
            "dry_run": args.dry_run,
            "code_cli_found": code_binary is not None,
            "worktrees": summary,
            "warnings": warnings,
        }
        print(json.dumps(payload, indent=2))
        return 0
    except CommandError as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
