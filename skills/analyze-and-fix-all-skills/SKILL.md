---
name: analyze-and-fix-all-skills
description: Batch analyze and repair Codex skill evaluation health across installed skill folders. Use when the user says "analyze and fix all skills", "fix every skill", "loop over all skills", "make all skills pass Waza", "repair all Chat Customizations Evaluation diagnostics", or asks to run the analyze-customization-evaluations and fix-customization-evaluation-diagnostics workflow for every Codex skill. Do not use for product code tests or non-skill repositories.
---

# Analyze And Fix All Skills

Coordinate the existing single-skill analysis and repair skills across a full local skills inventory.

**UTILITY SKILL. INVOKES:** `analyze-customization-evaluations`, `fix-customization-evaluation-diagnostics`, Waza CLI, `quick_validate.py`, local skill files.

Read [batch repair workflow](references/batch-repair-workflow.md) for command details, result classification, patch rules, and the final report format.

## Dependencies

Read `analyze-customization-evaluations` for read-only Waza/skill-health analysis and `fix-customization-evaluation-diagnostics` for actionable repair policy. Do not create a separate repair policy here.

## Target Discovery

Use `scripts/list_skill_targets.py` to build the worklist:

```bash
python3 <this-skill>/scripts/list_skill_targets.py --json
```

Defaults include `${CODEX_HOME:-$HOME/.codex}/skills` and `$HOME/.agents/skills`, skip hidden/system directories, and skip plugin cache paths unless explicitly requested. If this coordinator appears in the worklist, process it last.

## Batch Workflow

1. Discover targets and report the count before editing.
2. Locate Waza, run `waza models` when available, and choose an available model.
3. Run analyzer baselines per target root and `waza coverage` when Waza is available.
4. For each skill, run `quick_validate.py`, run `waza check` when available, inspect relevant result JSON, and classify before editing.
5. Record model/session/auth failures as runner blockers; patch only readiness, trigger, behavior, metadata, reference, or token-budget failures.
6. Re-run validation after each patch, using at most two repair passes per skill unless the user asks for deeper iteration.
7. Continue through the worklist when one skill is blocked.

## Patch Rules

- Preserve each skill's purpose and useful workflow details.
- Keep `SKILL.md` compact; move substantial detail into linked `references/*.md`.
- Keep reference files one hop from `SKILL.md`.
- Update `agents/openai.yaml` when UI metadata no longer matches.
- Do not add README, changelog, installation, or process-history files.
- Do not commit changes unless asked.
