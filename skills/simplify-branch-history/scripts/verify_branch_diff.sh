#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: verify_branch_diff.sh [branch]

Verify that the current branch diff matches the snapshot saved by snapshot_branch_diff.sh.
USAGE
}

die() {
  echo "error: $*" >&2
  exit 1
}

sanitize_branch() {
  local value="$1"
  value="${value//\//-}"
  value="${value//[^A-Za-z0-9._-]/-}"
  printf '%s' "$value"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

git rev-parse --git-dir >/dev/null 2>&1 || die "not inside a git repository"

current_branch="$(git branch --show-current)"
branch="${1:-$current_branch}"
[[ -n "$branch" ]] || die "could not determine branch; pass it explicitly"

if [[ "$current_branch" != "$branch" ]]; then
  die "checkout '$branch' before verifying its diff; current branch is '$current_branch'"
fi

if [[ -n "$(git status --porcelain)" ]]; then
  git status -sb >&2
  die "working tree must be clean before verifying branch diff"
fi

state_dir="$(git rev-parse --git-path codex-simplify-branch-history)"
safe_branch="$(sanitize_branch "$branch")"
state_file="$state_dir/${safe_branch}.env"
[[ -f "$state_file" ]] || die "state file not found; run inspect_branch_scope.sh and snapshot_branch_diff.sh first"

# shellcheck source=/dev/null
source "$state_file"

snapshot_file="${DIFF_SNAPSHOT_FILE:-}"
base_ref="${DIFF_SNAPSHOT_BASE_REF:-${BASE_REF:-}}"
[[ -n "$snapshot_file" ]] || die "diff snapshot path missing from state file"
[[ -n "$base_ref" ]] || die "base ref missing from state file"
[[ -f "$snapshot_file" ]] || die "diff snapshot file does not exist: $snapshot_file"
git rev-parse --verify --quiet "$base_ref^{commit}" >/dev/null || die "base ref '$base_ref' is not available"

current_file="$state_dir/${safe_branch}.current.diff"
git diff --binary "$base_ref...$branch" > "$current_file"

if cmp -s "$snapshot_file" "$current_file"; then
  rm -f "$current_file"
  echo "Branch diff matches snapshot."
  exit 0
fi

echo "Branch diff changed after rewrite." >&2
echo "Snapshot: $snapshot_file" >&2
echo "Current:  $current_file" >&2
echo "Inspect with: git diff --no-index --stat '$snapshot_file' '$current_file'" >&2
exit 1
