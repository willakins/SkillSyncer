# Report Details

## Metrics

- Line totals come from local git history on the repository default branch using `git log --use-mailmap --numstat --no-renames`.
- Merged PRs are counted for the PR author through GitHub GraphQL.
- Approved PRs are counted for the reviewer, deduped to one approved PR per reviewer per pull request.
- The recent window is 6 months by default; override it with `--months N`.
- Bots are excluded unless `--include-bots` is passed.

## Identity Mapping

The script collapses obvious git-author and GitHub-login aliases. If rows still split, pass `--identity-map PATH` with YAML like:

```yaml
users:
  will-akins:
    github_logins:
      - willakins
    git_authors:
      - Will Akins <willakins23@gmail.com>
      - willakins <willakins23@gmail.com>
```

## Caveats

- Line counts come from the local clone. Without `--fetch`, stale remote refs can undercount newest changes.
- `--repo OWNER/NAME` changes the GitHub metadata source, but git line stats still come from the local checkout. Use it only when the local checkout and GitHub repo intentionally match.
- Binary file numstat entries are counted as zero added and zero deleted.
- Very large repositories may take time because the script paginates all pull requests and overflow review pages.

## Troubleshooting

- If `gh auth status` fails, authenticate GitHub CLI before running the report.
- If `origin/<default-branch>` is missing, the script falls back to the local default branch name.
- If aliases are still split, rerun with `--show-aliases`, build an identity map, then rerun the requested table, CSV, or JSON output.
