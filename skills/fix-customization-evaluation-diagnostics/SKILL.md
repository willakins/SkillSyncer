---
name: fix-customization-evaluation-diagnostics
description: Diagnose and repair Waza or VS Code Chat Customizations Evaluation failures for Codex skills. Use when the user mentions "waza evaluation failed", "Chat Customizations Evaluations", "/fix-customization-evaluation-diagnostics", "fix diagnostics", failed trigger tests, unavailable models, token budget failures, orphaned references, or asks to make a skill pass Waza. Prefer moving detail into references.
---

# Fix Customization Evaluation Diagnostics

**UTILITY SKILL. INVOKES:** Waza CLI, `quick_validate.py`, local skill files. **FOR SINGLE OPERATIONS:** result triage, skill patching, validation.

Read [diagnostic playbook](references/diagnostic-playbook.md) when interpreting a result JSON or patching a skill.

## USE FOR:

- "waza evaluation failed"
- "Chat Customizations Evaluations"
- "fix diagnostics"
- "make this skill pass Waza"

## DO NOT USE FOR:

- Product test failures unrelated to skills.
- General code review.
- Creating a new non-evaluation skill.

## Workflow

1. Get the Waza result JSON path or locate the newest file under VS Code's `ms-vscode.vscode-chat-customizations-evaluations/results/`.
2. Run `scripts/summarize_waza_result.py <result.json>` when a result file exists.
3. Run `waza models` and `waza check <skill-path>` when the Waza binary is available.
4. Classify the failure before editing:
   - model/session error: report model/config issue; do not patch skill content as the primary fix.
   - Waza readiness error: patch `SKILL.md`, links, references, or metadata.
   - trigger/behavior failure: patch frontmatter triggers, body routing, eval expectations, or references.
5. Keep `SKILL.md` compact. Move substantial guidance into `references/` and link it from `SKILL.md`.
6. Validate with `quick_validate.py`, `waza check`, and runnable evals using an available model.

## Troubleshooting:

- If result errors before validations, fix runner/model config first.

## Examples:

- Result says unavailable model -> report runner config; do not patch triggers first.
- `waza check` says token budget -> move detail into linked references.
- Positive trigger failed -> patch frontmatter triggers and body routing.
