---
name: repo-contribution-report
description: Use this skill when asked to count or rank contributors in a GitHub repo by lines added/deleted, merged PRs, approved PRs, or recent/all-time activity using local git history plus GitHub PR metadata. Do not use for PR creation, CI repair, code review, recent PR listing, or generic git stats.
---

# Repo Contribution Report

**UTILITY SKILL. INVOKES:** bundled Ruby script, local git, GitHub CLI. **FOR SINGLE OPERATIONS:** read-only reports for one GitHub repo checkout.

Read [report details](references/report-details.md) for metrics, identity maps, caveats, and troubleshooting.

## USE FOR:

- "who contributed the most lines in this repo?"
- "report merged and approved PR counts"
- "rank contributors over the last 6 months"
- "export contribution stats as CSV or JSON"

## DO NOT USE FOR:

- Recent PR listing without line totals; use `github-recent-user-prs`.
- CI monitoring or repair.
- Creating commits, branches, or pull requests.
- Organization-wide reporting without local checkouts.

## Workflow

1. Confirm the target is a local git checkout and `gh auth status` works.
2. Resolve `scripts/repo_contribution_report.rb` relative to this skill and run it with `workdir` set to the target repo.
3. Use `--fetch` for current/latest numbers when `origin/<default-branch>` may be stale.
4. Summarize table rows for questions; use CSV or JSON for exportable output.

## Command

```bash
ruby <skill-dir>/scripts/repo_contribution_report.rb [options]
```

## Options

- `--repo OWNER/NAME`
- `--format table|csv|json`
- `--months N`
- `--sort recent|all|name`
- `--show-aliases`
- `--include-bots`
- `--identity-map PATH`
- `--fetch`

## Examples

- Recent table: `--months 6 --sort recent`
- Alias audit export: `--format csv --show-aliases`
