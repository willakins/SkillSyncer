#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: snapshot_branch_diff.sh [branch] [remote] [base_branch]

Save the current branch diff against the base before simplifying commits.
Run this after any base rebase and before squash/recommit operations.
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
remote="${2:-origin}"
base_branch="${3:-main}"
[[ -n "$branch" ]] || die "could not determine branch; pass it explicitly"

if [[ "$current_branch" != "$branch" ]]; then
  die "checkout '$branch' before snapshotting its diff; current branch is '$current_branch'"
fi

if [[ -n "$(git status --porcelain)" ]]; then
  git status -sb >&2
  die "working tree must be clean before snapshotting branch diff"
fi

state_dir="$(git rev-parse --git-path codex-simplify-branch-history)"
mkdir -p "$state_dir"
safe_branch="$(sanitize_branch "$branch")"
state_file="$state_dir/${safe_branch}.env"

if [[ -f "$state_file" ]]; then
  # shellcheck source=/dev/null
  source "$state_file"
fi

base_ref="${BASE_REF:-${remote}/${base_branch}}"
git rev-parse --verify --quiet "$base_ref^{commit}" >/dev/null || die "base ref '$base_ref' is not available"

snapshot_file="$state_dir/${safe_branch}.branch.diff"
git diff --binary "$base_ref...$branch" > "$snapshot_file"

{
  printf 'DIFF_SNAPSHOT_FILE=%q\n' "$snapshot_file"
  printf 'DIFF_SNAPSHOT_BASE_REF=%q\n' "$base_ref"
  printf 'DIFF_SNAPSHOT_HEAD=%q\n' "$(git rev-parse "$branch^{commit}")"
} >> "$state_file"

echo "Saved branch diff snapshot: $snapshot_file"
echo "Base: $base_ref"
echo "Head: $(git rev-parse --short "$branch^{commit}")"
