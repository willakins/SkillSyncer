---
name: analyze-customization-evaluations
description: Analyze Waza and VS Code Chat Customizations Evaluation health for Codex skills without editing them. Use when the user mentions the VS Code "analyze" button, "analyze skills", "analyze Waza results", skill evaluation health, trigger coverage, token budget, orphaned references, missing evals, model availability, or asks for a report before fixing. Do not use for product code tests.
---

# Analyze Customization Evaluations

**UTILITY SKILL. ANALYSIS ONLY. INVOKES:** Waza CLI, local skill files, result JSON.

Read [analysis playbook](references/analysis-playbook.md) before producing the report.

## USE FOR:

- "analyze" button equivalent.
- "analyze my skills folder"
- "analyze Waza evaluation results"
- "which skills will fail Waza?"
- "show skill evaluation health"

## DO NOT USE FOR:

- Editing skills; use `fix-customization-evaluation-diagnostics`.
- Product test failures.
- Creating new skills.

## Workflow

1. Locate the skills root and newest Waza result JSON files.
2. Run `scripts/analyze_waza_workspace.py [skills-root] [results-dir]`.
3. Run `waza models`, `waza coverage`, and `waza check <skill-path>` for relevant skills.
4. Optionally run `waza quality <skill-path> --model <available-model>`.
5. Report findings only: readiness, triggers, token/reference issues, missing evals, model/session blockers, and recommended next commands.

## Examples:

- Model unavailable in result JSON -> classify as runner config, not trigger failure.
- `waza check` finds orphaned refs -> report link needed.
- Missing eval -> report coverage gap.

## Troubleshooting

- If `waza` is missing, locate the VS Code globalStorage binary before falling back.
- If JSON is malformed, report the file and continue with other results.
- If a model is unavailable, recommend an installed model instead of editing triggers.

## Output

Give a concise table or bullets with evidence, severity, affected file, and next action. Do not patch files unless the user then asks to fix.
