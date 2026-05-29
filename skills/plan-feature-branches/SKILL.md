---
name: plan-feature-branches
description: Plan feature work before implementation by reading the current repo, identifying affected code, and recommending one branch, independent branches, or a stack with validation. Use when asked to plan a feature, decide one PR vs several, or figure out branch breakdown. Do not use to create branches, implement, commit, publish PRs, or monitor CI.
---

# Plan Feature Branches

Plan feature branches before implementation. **PLANNING SKILL. INVOKES:** repository reads and validation design. **FOR SINGLE OPERATIONS:** feature scoping.

Read [planning playbook](references/planning-playbook.md) for the full checklist and output details.

## USE FOR:

- Planning how a requested feature fits into the current app.
- Deciding whether work belongs in one PR, independent PRs, or a stack.
- Identifying likely files, risks, and targeted validation before coding.

## DO NOT USE FOR:

- Creating git branches, worktrees, or delegation prompts.
- Implementing code, committing changes, pushing, or opening PRs.
- Monitoring CI, Codex review, or merge conflicts.
- Planning unrelated roadmaps without repo-specific code context.

## Required Behavior

1. Default `base_branch` to `main`.
2. Read relevant code before planning; do not guess.
3. Restate actor, user flow, entrypoint, state change, and user-visible outcome.
4. Identify affected files or subsystems, existing patterns, data or permission boundaries, and risks.
5. Recommend `one branch`, `multiple independent branches`, or `stacked follow-on work`.
6. Treat a branch as independent only if it can start from updated `main` and be reviewed truthfully by itself.
7. Define the smallest validation commands or manual checks that prove the changed behavior.
8. Ask one concise follow-up if requirements are too unclear to plan responsibly.

## Output

Return a short Markdown plan with feature summary, key repo context, recommended branch strategy, validation, and open questions or risks. For each planned branch include branch name, goal, independence rationale, likely files or subsystems, validation, and sequencing notes.

## Troubleshooting

- If repo context is unavailable or scope is unclear, ask one concise follow-up instead of inventing requirements.

## Examples

- `Plan this feature and tell me whether it should be one PR or several.`
- `Figure out the branch breakdown with validation.`
