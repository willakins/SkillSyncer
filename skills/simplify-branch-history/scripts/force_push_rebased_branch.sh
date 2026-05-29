#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: force_push_rebased_branch.sh [branch] [remote] [expected_remote_sha]

Force-push the current branch with an explicit lease pinned to the remote SHA
captured before rewriting.

Defaults:
  branch               current branch
  remote               origin
  expected_remote_sha  EXPECTED_REMOTE_SHA from inspect_branch_scope.sh state
USAGE
}

die() {
  echo "error: $*" >&2
  exit 1
}

protected_branch() {
  case "$1" in
    main|master|develop|development|staging|production|release/*) return 0 ;;
    *) return 1 ;;
  esac
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
expected_remote_sha="${3:-}"

[[ -n "$branch" ]] || die "could not determine branch; pass it explicitly"
[[ -n "$remote" ]] || die "remote cannot be blank"
protected_branch "$branch" && die "refusing to force-push protected branch '$branch'"

if [[ "$current_branch" != "$branch" ]]; then
  die "checkout '$branch' before pushing; current branch is '$current_branch'"
fi

git rev-parse --verify --quiet "refs/heads/$branch" >/dev/null || die "local branch '$branch' does not exist"

if [[ -n "$(git status --porcelain)" ]]; then
  git status -sb >&2
  die "working tree must be clean before force-pushing"
fi

state_file="$(git rev-parse --git-path "codex-simplify-branch-history/$(sanitize_branch "$branch").env")"
if [[ -z "$expected_remote_sha" && -f "$state_file" ]]; then
  # shellcheck source=/dev/null
  source "$state_file"
  expected_remote_sha="${EXPECTED_REMOTE_SHA:-}"
fi

[[ -n "$expected_remote_sha" ]] || die "expected remote SHA is required; run inspect_branch_scope.sh before rewriting or pass it as the third argument"

echo "Pushing $branch to $remote with explicit force-with-lease at $expected_remote_sha"
git push "$remote" "HEAD:refs/heads/$branch" "--force-with-lease=refs/heads/$branch:$expected_remote_sha"
