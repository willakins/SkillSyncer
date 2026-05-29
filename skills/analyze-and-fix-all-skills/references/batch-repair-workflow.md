# Batch Repair Workflow

## Command Details

Target discovery:

```bash
python3 <this-skill>/scripts/list_skill_targets.py --json
```

Analyzer baseline:

```bash
python3 <analyzer-skill>/scripts/analyze_waza_workspace.py <skills-root> <results-dir>
waza coverage <skills-root> --format markdown
```

Per-skill validation:

```bash
python3 <validator>/quick_validate.py <skill-path>
waza check <skill-path>
```

Use `command -v waza` first. If missing, check the VS Code global storage path under `ms-vscode.vscode-chat-customizations-evaluations/bin/waza`.

## Classification Rules

- Model/session/auth failures are runner blockers. Record them and continue; do not patch skill content as the primary fix.
- Readiness failures include token budget, broken or orphaned references, metadata drift, malformed frontmatter, and spec compliance issues.
- Trigger failures require frontmatter or routing changes.
- Behavior failures require workflow, reference, or script changes.

Run at most two repair passes per skill unless the user explicitly asks for deeper iteration.

## Final Report

Return:

```text
Summary
- Skills discovered:
- Skills changed:
- Skills clean:
- Blocked:

Changes
- <skill>: <files changed> - <reason>

Validation
- <skill>: quick_validate=<result>, waza_check=<result>, eval=<result or skipped>

Remaining
- <skill/blocker>: <next action>
```

Separate fixed skill defects from runner/config blockers such as unavailable models, missing binaries, or missing Waza authentication.
