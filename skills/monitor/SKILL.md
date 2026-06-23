---
name: monitor
description: Monitor existing pushed branches or pull requests by coordinating mergeability, review feedback, Codex review, gated GitHub Actions trigger commits, and CI status until every target is stable or truly blocked; `not_ready` is only an interim checkpoint while monitoring continues. Use when the user says "monitor", "watch this PR", "watch the PRs", "commit and monitor", "monitor until green and clean", asks to keep polling comments/checks/conflicts, or when another skill needs coordinated PR or pushed-branch monitoring; in drive-to-merge-ready mode, trigger PR-visible remote CI with an empty `#CI` commit only after feedback is handled and Codex is clean.
---

# Monitor

Coordinate PR monitoring through:

- `monitor-merge-conflicts` for mergeability and base-branch conflicts.
- GitHub metadata checks, the GitHub connector, or `gh` for issue comments, reviews, unresolved review threads, requested changes, requested reviewers, PR metadata, and detailed CI logs.
- Dedicated GitHub skills for bounded feedback or CI subtasks when available, while this skill keeps responsibility for the overall loop.
- `monitor-codex` for Codex review request evidence, clean outcome evidence, and concerns.
- `monitor-ci` for GitHub Actions status and explicitly authorized CI repair.

Read [monitor contract](references/monitor-contract.md) for mode rules, delegation context, polling behavior, feedback handling, subagent use, and stable/blocked definitions.

## Defaults

- Default to the current branch's PR when no PR number or URL is provided.
- If the user asks to monitor multiple PRs, maintain a watch set and process each PR against the same gates.
- Monitor the latest pushed PR head SHA.
- Drive PRs toward merge-ready by default. This is mutating for merge conflicts, review feedback, validated Codex concerns, and clearly branch-caused CI failures when repair is authorized.
- Prefer gated CI: do not trigger remote Actions until the current code-bearing head has handled feedback and a clean Codex outcome. Let GitHub Actions run the full specs.
- In drive-to-merge-ready mode, after the Codex/feedback gates, trigger the repo `CI` workflow with an empty commit whose subject contains `#CI`, then push it to the exact PR head branch so the PR checks surface shows the run. Observe-only mode skips this trigger. Do not put `#CI` on code repair commits unless the prompt explicitly asks for a CI marker on that code commit.
- Actions reruns/cancellations and missing-marker repairs outside the gated trigger path require prompt language such as trigger actions, run GitHub Actions, commit with actions, get checks green, or include a CI marker. Standalone drive-to-merge-ready monitoring already authorizes clear branch-caused CI repairs after the gated trigger has run; commit those repairs without `#CI`, then restart Codex and the gated empty-commit CI trigger loop.
- Treat explicit observe-only, report-only, no-edit, no-push, or no-repair wording as observe-only.
- Check merge conflicts and review feedback before Codex or CI monitoring.
- Refresh feedback every polling cycle and before any long CI wait; do not run repeated CI-only polls while comments, reviews, threads, or requested changes are stale.
- Codex review request, clean Codex outcome, resolved actionable feedback, and passing required CI are required PR gates; CI green alone is not enough.

## Workflow

1. Resolve the target PRs or pushed branch, head branch, current head SHA, base branch, watch set, and repair mode. Inspect `git status --short` before edits and use separate worktrees when monitoring multiple PRs or when the current checkout is not already on the target branch.
2. Run `monitor-merge-conflicts`. If conflict repair pushes a merge commit, restart on the new head; if blocked, stop before CI/Codex polling.
3. Refresh feedback for the current head: issue comments, review submissions, unresolved threads, requested changes, requested reviewers, and pending Codex feedback. Apply clear fixes, respond to intentionally skipped feedback when appropriate, and restart from mergeability after any code-bearing push.
4. Run `monitor-codex` for the current code-bearing head before any extended CI watch. If concern repair pushes a code-bearing commit, restart from mergeability.
5. After Codex is clean and actionable feedback is handled, skip broad local coded-test runs. Run only fast, targeted local checks that directly match repairs already made and are necessary to avoid obvious churn; GitHub Actions is the source of truth for specs.
6. In drive-to-merge-ready mode, if required CI is not already passing in the PR checks surface for the current code-bearing tree, create an empty trigger commit after the Codex/feedback gates with `git commit --allow-empty -m "Trigger CI #CI"` and push it to the exact PR head branch. Record both the Codex-clean code-bearing SHA and the pushed trigger SHA. In observe-only mode, report the missing trigger as a checkpoint instead of committing or pushing.
7. Run `monitor-ci` for the push-triggered CI run in gated mode. While CI is pending, keep refreshing feedback and mergeability. If remote CI fails, inspect the failure. For branch-caused code repairs, commit and push the repair without `#CI`, run only targeted local verification when it is quick and directly relevant, restart Codex review, then create and push a fresh empty `#CI` trigger commit only after the new code-bearing head is clean.
8. Restart from mergeability whenever a code repair commit, merge-conflict repair, feedback repair, Codex repair, or external push changes the code-bearing head.
9. Stop only after a fresh full poll shows stable state or true blockage. Red or pending required CI is `not_ready` while polling continues; do not end the monitor run solely because the PR is unmergeable, blocked by failed checks, or waiting on replacement CI after a repair.

## Output

Return PR/branch target, latest code-bearing head SHA, latest pushed head SHA, merge-conflict status, feedback status and last refresh time, targeted local verification when run, empty `#CI` trigger commit evidence when performed, CI status, Codex request and clean-outcome evidence, repair mode, repairs made or skipped, comments posted, and blockers or follow-up.
