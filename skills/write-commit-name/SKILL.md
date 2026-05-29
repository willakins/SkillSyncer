---
name: write-commit-name
description: Draft a short git commit subject from the staged diff when a commit slice is already staged, otherwise from the exact in-scope local diff. Append `#CI` by default unless the requester explicitly wants to keep CI off.
---

Use this skill when the user asks for a commit name, commit subject, or commit message subject line.

Do not use this skill to create commits, edit files, push branches, open PRs, or monitor CI.

## Source of truth

- If files are already staged for the intended commit, base the commit name only on that staged diff.
- Otherwise, base it only on the exact in-scope local changes that belong in the intended commit.
- Read the staged diff or staged file list before proposing a subject when staged changes exist; otherwise read the local diff or changed file list.
- Ignore prior commits, branch names, and planned future work unless they are visible in the staged or in-scope local changes.

## Commit name rules

- Return one short subject line.
- Keep it specific to the main behavior change, not a file list.
- Prefer imperative phrasing.
- Do not add a body unless the user asks for one.
- Append ` #CI` by default.
- Omit ` #CI` only when the user explicitly asks to keep CI from running.

## Writing heuristics

- If the change is a bug fix, lead with `Fix`, `Handle`, `Prevent`, or `Fallback`.
- If the change is a feature, lead with `Add`, `Support`, `Show`, or `Create`.
- If the change is mostly docs or workflow, lead with `Document`, `Clarify`, or `Add`.
- If both code and docs changed, bias toward the code behavior unless the docs are the primary deliverable.

## Output format

- Return only the proposed commit subject line unless the user asks for options.

## Example

`Fix member-employer worker ID fallback #CI`
