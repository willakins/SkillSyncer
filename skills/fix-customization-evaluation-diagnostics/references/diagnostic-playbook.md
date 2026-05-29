# Diagnostic Playbook

Use this reference to reproduce VS Code's "fix diagnostics" behavior from Codex.

## Inputs To Collect

- Waza result JSON path, usually under:
  `/home/will/.config/Code/User/globalStorage/ms-vscode.vscode-chat-customizations-evaluations/results/`
- Skill path, usually `/home/will/.codex/skills/<skill-name>`.
- `waza models` output.
- `waza check <skill-path>` output.
- The current `SKILL.md`, `agents/openai.yaml`, and any linked references.

## Result JSON Triage

Run:

```bash
python3 <skill-dir>/scripts/summarize_waza_result.py <result.json>
```

Classify before editing:

- **Model/session failure:** Result `runs[].status` is `error`, `validations` is null, and `error_msg` says a model is unavailable or session creation failed. Fix the eval runner model/config. Do not treat this as a trigger failure.
- **Positive trigger failure:** The agent did not invoke the skill or did not follow expected behavior for an in-scope prompt. Improve frontmatter trigger text and body routing.
- **Negative trigger failure:** The skill fired or changed behavior for an out-of-scope prompt. Add clearer exclusions to frontmatter/body.
- **Readiness failure:** `waza check` reports token budget, orphaned references, links, frontmatter, metadata, or complexity issues. Patch the skill structure.
- **Behavior failure:** The skill loaded, but output or file changes were wrong. Patch workflow instructions, references, or scripts.

## Model Fixes

Run:

```bash
waza models
```

If result JSON uses an unavailable model such as `claude-sonnet-4.6`, rerun Waza with an available model:

```bash
waza run <skill-name-or-eval> --model auto
waza run <skill-name-or-eval> --model gpt-5-mini
waza run <skill-name-or-eval> --model gpt-4.1
```

If the VS Code button keeps forcing an unavailable Copilot model, report that it is an evaluation-runner configuration problem and use the Waza CLI path from Codex instead.

## Waza Readiness Fixes

Run:

```bash
waza check <skill-path>
```

Common fixes:

- **Token budget:** Keep `SKILL.md` short; move detailed content into linked `references/*.md`.
- **Orphaned reference:** Link the reference with normal Markdown, such as `[Details](references/details.md)`.
- **Missing triggers:** Put clear trigger phrases in frontmatter `description`; body triggers are too late for routing.
- **Negative trigger risk:** Add "Do not use for..." exclusions to frontmatter/body.
- **Metadata drift:** Regenerate or edit `agents/openai.yaml` so display name, short description, and default prompt match the skill.
- **Over-specificity:** Avoid machine-specific paths unless the skill is intentionally local-only.

## Skill Patch Rules

- Preserve user intent and existing useful details.
- Move long detail into references rather than deleting it.
- Keep all reference files one hop from `SKILL.md`.
- Do not add README, changelog, or installation docs to skill folders.
- Use scripts only for deterministic repeatable tasks.

## Validation Order

1. Run `quick_validate.py <skill-path>`.
2. Run `waza check <skill-path>`.
3. If evals exist and the model is available, run `waza run <skill-name-or-eval> --model <available-model>`.
4. Reopen the latest result JSON and confirm failures are real validation failures, not session creation errors.
5. Final answer should separate: fixed skill content, runner/config blockers, validations run, and any remaining eval command the user must rerun.
