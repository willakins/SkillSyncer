#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: create_safety_branch.sh [branch]

Create a deterministic local backup branch for the branch being simplified.
The backup points at the original head captured by inspect_branch_scope.sh when available.
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
[[ -n "$branch" ]] || die "could not determine branch; pass it explicitly"
protected_branch "$branch" && die "refusing to create a rewrite backup for protected branch '$branch'"

git rev-parse --verify --quiet "refs/heads/$branch" >/dev/null || die "local branch '$branch' does not exist"

state_file="$(git rev-parse --git-path "codex-simplify-branch-history/$(sanitize_branch "$branch").env")"
if [[ -f "$state_file" ]]; then
  # shellcheck source=/dev/null
  source "$state_file"
fi

target_sha="${ORIGINAL_HEAD:-$(git rev-parse "$branch^{commit}")}"
git rev-parse --verify --quiet "$target_sha^{commit}" >/dev/null || die "target backup SHA '$target_sha' is not a commit"

backup_branch="backup/$(sanitize_branch "$branch")-pre-simplify-$(git rev-parse --short "$target_sha")"

if git show-ref --verify --quiet "refs/heads/$backup_branch"; then
  existing_sha="$(git rev-parse "$backup_branch^{commit}")"
  [[ "$existing_sha" == "$target_sha" ]] || die "backup branch '$backup_branch' already exists at $existing_sha, expected $target_sha"
  echo "Backup branch already exists: $backup_branch"
else
  git branch "$backup_branch" "$target_sha"
  echo "Created backup branch: $backup_branch"
fi

if [[ -f "$state_file" ]]; then
  printf 'BACKUP_BRANCH=%q\n' "$backup_branch" >> "$state_file"
fi
