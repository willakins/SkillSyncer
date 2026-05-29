# PR Body Rules

Use these rules after `SKILL.md` routes a request to `write-pr-description`.

## Source Of Truth

- If the request targets an existing PR, read that PR's exact current diff and metadata first; do not draft from local-only work that is not on the PR.
- If the request targets the current branch, read the exact branch diff the user wants to describe rather than blindly using whatever local changes happen to be present.
- If the current branch already backs an open PR but local commits or worktree changes differ from the published PR tip, do not silently mix local-only WIP into a PR-scoped description.
- Read changed files and provided PR context only after pinning the diff source.
- When `.github/pull_request_template.md` exists, preserve its required sections in the generated body because GitHub will not apply the template when a PR is created with an explicit `body`.
- Infer the high-level goal, behavior changes, likely DB changes, and testing coverage from the diff before asking follow-up questions.
- If the PR diff is larger than 2,000 lines, add `## Key Files Changed` before `## Testing`.

## Writing Rules

- Write in plain, direct prose.
- Keep sections short and high signal.
- Describe behavior changes, not a file-by-file changelog.
- Start the first real paragraph from the affected user's or operator's point of view whenever the diff supports it.
- For technical fixes, include a concrete before/after workflow example in the first section when it makes the problem clearer.
- Do not invent testing coverage. If system specs were not written for a behavior, say so plainly.
- Include `## Related PRs / Follow-ups` only when linked-PR, dependency, or follow-up context helps the reviewer.
- Do not add generic subheaders like `Verification:` or `Local testing:` by default.
- Do not include the literal phrase `I ran the following checks:`.
- Do not dump long command lines unless the user explicitly asks for exact commands.
- Do not mention lint passes, syntax checks, or local environment blockers unless the user asks or they materially change reviewer risk.

## Legal And Regulatory Context

- If the PR changes behavior because of a legal, regulatory, tax, immigration, employment, or government-program rule, look for authoritative source URLs in the user request, issue/PR context, commit messages, docs, tests, or changed code comments.
- When legal/regulatory context is material, verify the current official source before citing it. Prefer official government or agency pages, statutes, regulations, agency handbooks, or official forms over blogs, vendor summaries, or stale snapshots.
- Weave reliable source links into `## Context`, `## Root Problem`, `## Solution`, or `## Behavior Change`; do not create a separate source section.
- Keep source references short and reviewer-useful. Do not quote long passages.
- Do not cite a source unless it directly supports the changed behavior or reviewer motivation.

## Output Format

- Return raw Markdown only.
- Do not wrap the full response in a fenced code block unless the user explicitly asks for that.
- Do not add commentary before or after the Markdown draft.
- When mentioning files, use inline code paths like `` `app/models/worker.rb` ``. Do not emit local filesystem links.
- Keep the merge-safety checklist text aligned with `.github/pull_request_template.md` when present.

## Bug-Fix Format

Use this structure for bug fixes:

```md
Fixes this bug [Sentry](<SENTRY_URL>).

## Context

<High-level explanation from the affected user's or operator's point of view. Describe the broken workflow and why fixing it matters before implementation details.>

## Summary

<High-level goal of the PR.>

## Root Problem

<What was wrong before this PR.>

## Solution

<What this PR changes to fix it.>

## Independent Merge Safety

- [ ] This PR targets its real integration base branch, not a temporary parent-slice or stack-preserving review base.
- [ ] This PR is safe to merge into that integration base branch by itself.
- [ ] This PR does not rely on a future PR for correctness, passing tests, or avoiding regressions.

## Testing

- All new behavior covered by system specs: Yes/No
- System specs were not added for:
  - <behavior 1>
```

Bug-fix rules:

- Replace `<SENTRY_URL>` with the actual URL so the output starts with `Fixes this bug [Sentry](https://...).`.
- If the user does not provide the Sentry URL and it cannot be found in PR context, stop and ask for it.
- Add `## Related PRs / Follow-ups` only when there is reviewer-useful context.
- Mark merge-safety checkboxes truthfully. If the branch targets a temporary parent-slice base or is not safe to merge by itself, do not mark the checklist as satisfied.
- If no system-spec gaps remain, omit `System specs were not added for:`.
- If the PR is larger than 2,000 lines, insert `## Key Files Changed` before `## Testing`.

## Normal PR Format

Use this structure for non-bug-fix PRs:

```md
## Context

<High-level explanation from the affected user's or operator's point of view. Describe the workflow need and why the change matters before implementation details.>

## Summary

<High-level goal of the PR.>

## Behavior Change

<What changes after this PR lands.>

## DB Changes

<Only include this section when there are DB/schema/data changes.>

## Independent Merge Safety

- [ ] This PR targets its real integration base branch, not a temporary parent-slice or stack-preserving review base.
- [ ] This PR is safe to merge into that integration base branch by itself.
- [ ] This PR does not rely on a future PR for correctness, passing tests, or avoiding regressions.

## Testing

- All new behavior covered by system specs: Yes/No
- System specs were not added for:
  - <behavior 1>
```

Normal rules:

- Omit `## DB Changes` entirely when there are no DB changes.
- Include source links naturally in `## Context` or `## Behavior Change` when authoritative legal/regulatory sources are relevant.
- In `## Context`, explain the reason for the change before describing the behavior change.
- In `## Testing`, explicitly say whether all new behavior is covered by system specs.
- List every behavior that did not get a system spec.
- If the list is empty, omit `System specs were not added for:`.
- If the PR is larger than 2,000 lines, insert `## Key Files Changed` before `## Testing`.
- In `## Key Files Changed`, include only the most important files for review. Each bullet should name the file and explain the meaningful change in one short sentence.

## Examples

Bug fix:

```md
Fixes this bug [Sentry](https://sentry.example/issues/123456).

## Context

Legacy direct job orders can still produce employments without a current member-employer contact, which breaks the repair flow for missing worker IDs and hides affected workers from the recovery UI.

## Summary

Prevent legacy direct job orders from breaking the worker ID repair flow when the employment is missing a current member-employer contact.

## Root Problem

Legacy direct job orders could create employments without a member employer contact, but the read path still assumed that contact always existed.

## Solution

Add a fallback to the job order employer org when resolving the worker contact, and update the missing worker ID flow so workers without a current-employer contact still appear in the repair UI.

## Independent Merge Safety

- [x] This PR targets its real integration base branch, not a temporary parent-slice or stack-preserving review base.
- [x] This PR is safe to merge into that integration base branch by itself.
- [x] This PR does not rely on a future PR for correctness, passing tests, or avoiding regressions.

## Testing

- All new behavior covered by system specs: No
- System specs were not added for:
  - The yearly rollup summary counts
```

Normal PR:

```md
## Context

Reviewers need a clear merge-safety contract for slice-based PRs so later follow-up work does not get treated as a hidden prerequisite for correctness.

## Summary

Document and enforce the mergeable-slice PR workflow for opened PRs.

## Behavior Change

Opened PRs now declare independent merge safety in the PR template, and the repo docs explicitly say follow-up PRs are context only and cannot be prerequisites for correctness.

## Independent Merge Safety

- [x] This PR targets its real integration base branch, not a temporary parent-slice or stack-preserving review base.
- [x] This PR is safe to merge into that integration base branch by itself.
- [x] This PR does not rely on a future PR for correctness, passing tests, or avoiding regressions.

## Testing

- All new behavior covered by system specs: No
- System specs were not added for:
  - PR template rendering in GitHub
  - Documentation-only workflow guidance
```
