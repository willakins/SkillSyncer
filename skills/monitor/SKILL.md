---
name: monitor
description: Monitor existing pushed branches or pull requests by coordinating mergeability, review feedback, Codex review, local test-coded-tests verification, and GitHub Actions status until every target is ready, not_ready, or truly blocked. Use when the user says "monitor", "watch this PR", "watch the PRs", "commit and monitor", "monitor until green and clean", asks to keep polling comments/checks/conflicts, or when another skill needs coordinated PR or pushed-branch monitoring; in drive-to-merge-ready mode, trigger remote CI with one final empty commit whose subject is exactly `Trigger #CI` only after Codex is clean and local tests pass.
---

# Monitor

Coordinate PR monitoring through:

- `monitor-merge-conflicts` for mergeability and base-branch conflicts.
- GitHub metadata checks, the GitHub connector, or `gh` for issue comments, reviews, unresolved review threads, requested changes, requested reviewers, PR metadata, and detailed CI logs.
- Dedicated GitHub skills for bounded feedback or CI subtasks when available, while this skill keeps responsibility for the overall loop.
- `monitor-codex` for Codex review request evidence, clean outcome evidence, and concerns.
- `test-coded-tests` for local coded test discovery and JSON failure summaries before remote Actions.
- `monitor-ci` for GitHub Actions status and explicitly authorized CI repair.

Read [monitor contract](references/monitor-contract.md) for mode rules, delegation context, polling behavior, feedback handling, subagent use, and stable/blocked definitions.

## Defaults

- Default to the current branch's PR when no PR number or URL is provided.
- If the user asks to monitor multiple PRs, maintain a watch set and process each PR against the same gates.
- Monitor the latest pushed PR head SHA.
- Drive PRs toward merge-ready by default. This is mutating for merge conflicts, local test failures, and validated Codex concerns when repair is authorized.
- Prefer local-first CI: do not trigger remote Actions until the current code-bearing head is Codex clean and `test-coded-tests` passes locally.
- In drive-to-merge-ready mode, after the local-first gates, create and push one empty commit with the exact subject `Trigger #CI`. Observe-only mode skips this trigger. Do not put `#CI` on code repair commits before the local-first gates unless the prompt explicitly asks for immediate Actions.
- Actions reruns/cancellations, missing-marker repairs outside the local-first trigger path, and branch-caused CI repair beyond the final trigger require prompt language such as trigger actions, run GitHub Actions, commit with actions, get checks green, or include a CI marker.
- Treat explicit observe-only, report-only, no-edit, no-push, or no-repair wording as observe-only.
- Check merge conflicts and review feedback before Codex or CI monitoring.
- Refresh feedback every polling cycle and before any long CI wait; do not run repeated CI-only polls while comments, reviews, threads, or requested changes are stale.
- Codex review request, clean Codex outcome, resolved actionable feedback, and passing local `test-coded-tests` output are required PR gates; CI green alone is not enough.

## Workflow

1. Resolve the target PRs or pushed branch, head branch, current head SHA, base branch, watch set, and repair mode. Inspect `git status --short` before edits and use separate worktrees when monitoring multiple PRs or when the current checkout is not already on the target branch.
2. Run `monitor-merge-conflicts`. If conflict repair pushes a merge commit, restart on the new head; if blocked, stop before CI/Codex polling.
3. Refresh feedback for the current head: issue comments, review submissions, unresolved threads, requested changes, requested reviewers, and pending Codex feedback. Apply clear fixes, respond to intentionally skipped feedback when appropriate, and restart from mergeability after any code-bearing push.
4. Run `monitor-codex` for the current code-bearing head before any extended CI watch. If concern repair pushes a code-bearing commit, restart from mergeability.
5. After Codex is clean and actionable feedback is handled, run `test-coded-tests` locally for the same code-bearing tree. If tests fail, repair branch-caused failures when authorized, commit and push the repair without `#CI`, then restart from mergeability and Codex review. If repair is not authorized or the failure is ambiguous, return `not_ready` or `blocked` with the JSON failure files.
6. In drive-to-merge-ready mode, if required CI is not already passing for the current code-bearing tree, run `git commit --allow-empty -m "Trigger #CI"` after Codex is clean and local tests pass, then push the empty trigger commit to the exact PR head. Record the Codex-clean, locally tested code-bearing head SHA and the trigger head SHA. In observe-only mode, report the missing trigger instead of creating it.
7. Run `monitor-ci` for the trigger head in local-first mode. While CI is pending, keep refreshing feedback and mergeability. If remote CI fails, inspect the failure. For branch-caused code repairs, commit and push the repair without `#CI`, run `test-coded-tests`, restart Codex review, then create a fresh empty `Trigger #CI` commit only after the new code-bearing head is clean and locally passing.
8. Restart from mergeability whenever a code repair commit, merge-conflict repair, feedback repair, Codex repair, or external push changes the code-bearing head.
9. Stop only after a fresh full poll shows stable state or true blockage. Red or pending required CI is `not_ready` while polling can continue.

## Output

Return PR/branch target, latest code-bearing head SHA, latest pushed head SHA, merge-conflict status, feedback status and last refresh time, local test-coded-tests summary, final empty `Trigger #CI` commit when performed, CI status, Codex request and clean-outcome evidence, repair mode, repairs made or skipped, comments posted, and blockers or follow-up.
