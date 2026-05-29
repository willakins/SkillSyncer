# Merge Resolution Workflow

## Goal

Finish an in-progress merge safely:

- resolve obvious conflicts directly
- ask concise questions only for genuinely ambiguous choices
- preserve the prepared merge message unless a CI marker must be appended
- avoid sweeping unrelated staged changes into the merge commit

## Inspect Merge State

Start from git, not assumptions:

- `git status -sb`
- `git diff --name-only --diff-filter=U`
- `git rev-parse --git-path MERGE_HEAD`
- `git rev-parse --git-path MERGE_MSG`

If `MERGE_HEAD` is absent or no merge is active, stop and say there is nothing to continue.

Review branch intent before editing. Read recent commits, the merge target, and the conflicted areas so resolutions match the branch goal.

## Resolve Conflicts

Read each conflicted file in context. Inspect `ours`, `theirs`, and the merge base when nearby code does not explain intent.

Resolve without asking when the answer is clear:

- one side is a pure rename or formatting change and the other side has the real behavior
- both sides can be combined mechanically without changing meaning
- one side is clearly stale and the other matches current patterns nearby
- the conflict is a straightforward combination of independent additions

Ask the user when the answer is not clear:

- both sides change the same behavior in incompatible ways
- the conflict reflects competing product choices or business rules
- either choice could be valid and the diff does not reveal the intended outcome
- the correct resolution depends on rollout order, compatibility, or external expectations

When asking, use one concise plain-text question per ambiguous decision, summarize the tradeoff briefly, and do not continue the merge until the ambiguity is resolved.

## Stage And Continue

Before continuing:

- search resolved files for conflict markers
- verify no unmerged paths remain
- verify the index does not contain unrelated pre-existing staged paths
- stage only the resolved files

If unrelated staged paths are present, stop and ask the user to preserve or isolate them before continuing.

To add a CI marker, update the first line of `.git/MERGE_MSG` before continuing. Do not use `git commit --amend`; during an in-progress merge that would amend the previous commit rather than the pending merge commit. After the message is correct, run:

```bash
GIT_EDITOR=true git merge --continue
```

If the prepared merge subject already includes a case-insensitive CI marker such as `#CI` or `#ci`, leave it unchanged.

## Report

Return a short summary with:

- whether a merge was in progress
- resolved files
- whether user input was needed
- final merge commit subject
- whether `git merge --continue` completed successfully
