---
name: review-branch-ui
description: Validate the main changed user-facing UI flow for a PR or branch with agent-browser. Use for UI review slices in merge-readiness reviews. Do not use for logic/style review, CI repair, PR publication, or branches with no UI.
---

# Review Branch UI

**REVIEW SKILL. INVOKES:** agent-browser, local app server, git checkout checks. **OUTPUT ONLY:** UI review result.

Use when the user asks for the UI portion of a branch or PR review, or when a merge-readiness review delegates the UI slice. Read [review protocol](references/review-protocol.md) for detailed procedure.

## Inputs

- Exact target checkout, or pinned PR head SHA and matching worktree.
- Main changed UI flow, or enough PR context to identify it.
- Expected account type for authenticated flows.

## DO NOT USE FOR:

- Logic, correctness, style, architecture, or CI reviews.
- Publishing review comments or creating PRs.
- No UI changes; return `UI: Not applicable.`

## Workflow

1. Verify local `HEAD` matches the pinned target. If the running app serves different code and cannot be repointed, report untested.
2. If no user-facing UI changed, stop with `UI: Not applicable.`
3. Check `agent-browser` availability before relying on it.
4. For auth, find a local account and validate credentials through the app auth path, not hashes.
5. Test the main happy path from the real entrypoint, including interactions and DOM changes.
6. Return only UI output. Use `UI* -> general comment -> ...` for failures or environment blockers.

## Examples

`UI: The main changed flow works correctly in agent-browser.`

`UI: The main changed flow could not be tested in agent-browser because ...`

## Troubleshooting

If browser tooling, data, credentials, or server state block testing, report that exact blocker and do not infer pass/fail.
