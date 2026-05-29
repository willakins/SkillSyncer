# Merge Workflow Details

## Source Of Truth

- Read merge state from git, not assumptions.
- Use the current branch and `origin/main` as merge inputs.
- Read the upstream branch from git.
- Read conflicted files in context before resolving them.
- Inspect `ours`, `theirs`, and nearby code when needed.
- Treat git's prepared merge message as source of truth unless the user explicitly asks to change it.

## Obvious Vs Ambiguous Conflicts

Resolve without asking when one side is a pure rename or formatting change, both sides can be combined mechanically, one side is clearly stale, or the conflict is a straightforward union of independent additions.

Ask the user when both sides change the same behavior incompatibly, the conflict reflects competing product choices, either resolution could be valid, or rollout expectations are not visible in the repo.

When input is needed, ask one concise question per ambiguous decision, summarize the tradeoff briefly, and do not continue the merge until it is resolved.

## Safety Rules

- Do not start the merge from a dirty working tree.
- Do not start or push a merge from a detached HEAD.
- Do not continue an in-progress merge unless its target is clearly the requested `origin/main` merge.
- Do not use `git pull` when the task is explicitly fetch plus merge.
- Do not use blanket `--ours` or `--theirs` without reading the files.
- Do not discard unrelated user changes.
- Do not commit conflict resolutions while conflict markers remain or unrelated staged paths are present.
- Do not continue while unmerged files remain.
- Do not use interactive git editors.
- Do not create an empty merge commit when git reports already up to date.
- Do not claim a remote or PR merge conflict is fixed until the merged branch has been pushed or the push blocker is reported.

## Output Fields

Return a short summary with current branch, merge target, push target, conflict status, resolved files, whether input was needed, final merge commit subject, completion state, and push state.
