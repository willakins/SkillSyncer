# Triage Workflow

Use this reference after `SKILL.md` routes to `address-codex-concerns`.

## Inputs

Accept findings in this precedence order when multiple sources are provided:

1. Codex JSON review output with `file`, `line` or `range`, `severity`, `message`, and optional `suggestion`.
2. Inline comments in `path/to/file.ext:42: concern text` form.
3. User-written plain text, one concern per line or paragraph.

If a concern is missing a file, line or range, or description, return `invalid input` and ask for the missing field. If no `base_branch` is provided, use `main`. If a provided `base_branch` is not present locally or remotely, stop with `base_branch not found`.

Treat the current branch, current files, and cited lines as the source of truth. Do not trust the prior review text by itself.

## Decision Precedence

1. Core rules.
2. Validation workflow.
3. Validation heuristics.
4. Repair rules.

## Core Rules

- Validate every concern before editing.
- Dismiss concerns that are invalid, speculative, pre-existing, or intentionally changed behavior.
- If a cited file or line range does not exist, mark `needs_user_input` with the observed mismatch.
- Fix only concerns that are valid for this branch.
- Prefer the smallest behavior-preserving change. If several fixes are similar, follow existing local conventions and explain why.
- If correctness depends on product intent not visible in code, stop and ask the user.

## Validation Workflow

1. Normalize the concern list.
   - Expand file references to repo-relative paths.
   - Convert ranges to `start:end`.
   - Deduplicate identical concerns.
   - Assign IDs like `C1`, `C2`, `C3`.
   - If normalization changes meaning, ask before proceeding.

2. Check concern validity.
   - Verify the cited file and line exist.
   - Skip generated or binary targets from `.gitignore`, `build/`, `dist/`, or similar paths. Mark them `invalid` with reason `generated/binary file`.

3. Re-read cited code and surrounding flow.
   - Inspect the diff plus nearby code, specs, and related callers.
   - For skills, templates, or workflow docs, trace the documented control flow as executable behavior.

4. Classify each concern.
   - `code`, `docs`, `workflow`, or `test`.
   - `valid`: real, actionable, introduced by this branch, and worth fixing.
   - `invalid`: wrong, speculative, pre-existing, or intentional.
   - `needs_user_input`: possibly real, but correct resolution depends on intent not visible locally.
   - For workflow or docs concerns that may change intended behavior, use `needs_user_input` and propose a non-destructive change instead of applying it.
   - If valid concerns require incompatible fixes, mark them `needs_user_input` and present both options.

5. Repair one coherent batch.
   - Group related valid concerns only.
   - Keep dismissed concerns out of the patch.
   - Limit automatic repair to one batch per invocation.

6. Verify once.
   - Run the smallest relevant test, linter, CI smoke check, or static command.
   - If verification fails, stop, record logs, mark affected concerns `attempted_fix_failed`, and ask the user before another attempt.

7. Report every concern.

## Validation Heuristics

- Confirm the cited scenario can happen from the current branch state.
- For rerun workflows, check happy path and second-run path.
- For remote/publication workflows, trace shell-git and GitHub-app paths when both are supported.
- For review-loop or automation skills, compare changed guidance against `AGENTS.md` and neighboring skills.
- Do not repair a concern just because a prior review sounded confident.

## Repair Rules

- Keep fixes scoped to validated concerns.
- Preserve existing behavior outside the proven bug.
- Update related guidance when the bug lives in workflow instructions.
- If every concern is invalid, make no code changes and say so clearly.

## Verification Checklist

Choose the smallest useful set:

- Unit tests: `npm test`, `pytest`, `bundle exec rspec`, or local equivalent.
- Linter: ESLint, pylint, rubocop, or local equivalent.
- CI smoke check: relevant GitHub Actions or local script when available.
- Static checks: commands from `CONTRIBUTING.md`; otherwise report `no verification available` and mark `manual-verification-required`.

## Output Format

Return a short Markdown summary plus this table:

```markdown
| Concern ID | File | Line(s) | Type | Status | Action Taken | Notes |
|---|---|---|---|---|---|---|
| C1 | src/index.ts | 42 | code | valid | fixed | Removed unused import |
| C2 | docs/api.md | 15-18 | docs | needs_user_input | proposed change | Workflow intent unclear |
| C3 | build/out.js | 1 | code | invalid | none | Generated file, skipped |
```

The summary should include the status and rationale for each concern, checks run, and any concerns intentionally left unchanged.
