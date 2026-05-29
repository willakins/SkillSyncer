#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: inspect_branch_scope.sh [branch] [remote] [base_branch]

Fetch the base branch, inspect commits on the branch that are not on the base,
and store rewrite state for later helper scripts.

Defaults:
  branch      current branch
  remote      origin
  base_branch main
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
base_branch="${3:-main}"

[[ -n "$branch" ]] || die "could not determine branch; pass it explicitly"
[[ -n "$remote" ]] || die "remote cannot be blank"
[[ -n "$base_branch" ]] || die "base branch cannot be blank"
protected_branch "$branch" && die "refusing to rewrite protected branch '$branch'"

git rev-parse --verify --quiet "refs/heads/$branch" >/dev/null || die "local branch '$branch' does not exist"

if [[ -n "$(git status --porcelain)" ]]; then
  git status -sb >&2
  die "working tree must be clean before inspecting rewrite scope"
fi

git fetch "$remote" "+refs/heads/${base_branch}:refs/remotes/${remote}/${base_branch}" >/dev/null
base_ref="${remote}/${base_branch}"
git rev-parse --verify --quiet "$base_ref^{commit}" >/dev/null || die "base ref '$base_ref' is not available after fetch"

original_head="$(git rev-parse "$branch^{commit}")"
merge_base="$(git merge-base "$base_ref" "$branch")"
unique_count="$(git rev-list --count "$base_ref..$branch")"
from_fork_count="$(git rev-list --count "$merge_base..$branch")"
plus_count="$(git cherry "$base_ref" "$branch" | awk '$1 == "+" { count++ } END { print count + 0 }')"
minus_count="$(git cherry "$base_ref" "$branch" | awk '$1 == "-" { count++ } END { print count + 0 }')"

remote_sha="$(git ls-remote --heads "$remote" "$branch" | awk 'NR == 1 { print $1 }')"

state_dir="$(git rev-parse --git-path codex-simplify-branch-history)"
mkdir -p "$state_dir"
state_file="$state_dir/$(sanitize_branch "$branch").env"
inspected_at="$(date -u +%Y%m%dT%H%M%SZ)"

{
  printf 'BRANCH=%q\n' "$branch"
  printf 'REMOTE=%q\n' "$remote"
  printf 'BASE_BRANCH=%q\n' "$base_branch"
  printf 'BASE_REF=%q\n' "$base_ref"
  printf 'MERGE_BASE=%q\n' "$merge_base"
  printf 'ORIGINAL_HEAD=%q\n' "$original_head"
  printf 'EXPECTED_REMOTE_SHA=%q\n' "$remote_sha"
  printf 'INSPECTED_AT_UTC=%q\n' "$inspected_at"
} > "$state_file"

echo "Branch: $branch"
echo "Base: $base_ref"
echo "Merge base: $merge_base"
echo "Original head: $original_head"
if [[ -n "$remote_sha" ]]; then
  echo "Expected remote SHA for lease: $remote_sha"
else
  echo "Expected remote SHA for lease: none found for $remote/$branch"
fi
echo "State file: $state_file"
echo
echo "Commits reachable from $branch and not from $base_ref: $unique_count"
echo "Commits from merge-base range $merge_base..$branch: $from_fork_count"
echo "Patch-equivalent commits already on $base_ref: $minus_count"
echo "Patch-unique commits: $plus_count"
echo

if [[ "$unique_count" -eq 0 ]]; then
  echo "No branch-only commits to simplify."
  exit 0
fi

echo "Branch-only commits:"
git log --reverse --date=short --pretty=format:'  %h %ad %s' "$base_ref..$branch"
echo
echo
echo "Patch equivalence against $base_ref (+ unique, - equivalent already upstream):"
git cherry -v "$base_ref" "$branch" | sed 's/^/  /'
echo
echo "Changed files:"
git diff --name-status "$base_ref...$branch" | sed 's/^/  /'
