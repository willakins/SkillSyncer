# PR Collection Details

## Defaults

- Window: last 30 days for closed or merged PRs.
- States: open plus recently closed.
- Drafts: include them.
- Sort: most recently updated first.
- Limit: start around 50 PRs unless the caller asks for more or less.

Caller-provided repo, org, date window, or limit overrides these defaults.

## Scope Resolution

1. Prefer an explicit repo or org from the user.
2. If the user is in a git checkout and the request sounds repo-local, use the current repo first.
3. If the request is cross-repo and scope is not supplied, gather a small installed-repo set and search recent PR activity across it.
4. If results would be noisy across too many repos, narrow the scope and say why.

## Tooling

- Prefer `mcp__codex_apps__github._get_users_recent_prs_in_repo` when the repo is known.
- Prefer `mcp__codex_apps__github._search_prs` for author-scoped repo or org searches.
- Use local `gh` only when the connector cannot answer reliably or when resolving the authenticated login.

Login lookup:

```bash
gh api user --jq .login
```

## Query Rules

- Treat `open` as draft and non-draft PRs.
- Treat `recently closed` as merged plus closed-unmerged PRs.
- Keep merged and closed-unmerged distinct.
- Prefer PRs updated in the window over PRs merely created in the window.

## Normalized Fields

Carry forward:

- `repository_full_name`
- `number`
- `title`
- `url`
- `state`
- `is_draft`
- `created_at`
- `updated_at`
- `closed_at`
- `merged_at`
- `head_ref`
- `base_ref`

Normalize `state` to `open_draft`, `open_ready`, `merged`, or `closed_unmerged`.
