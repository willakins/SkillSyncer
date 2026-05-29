# Analysis Playbook

Use this reference to emulate VS Code's "analyze" button from Codex. This skill reports evidence and recommendations only; use `fix-customization-evaluation-diagnostics` for repairs.

## Inputs

Collect:

- skills root, usually `/home/will/.codex/skills`
- Waza result directory, usually `/home/will/.config/Code/User/globalStorage/ms-vscode.vscode-chat-customizations-evaluations/results`
- Waza binary path, usually `/home/will/.config/Code/User/globalStorage/ms-vscode.vscode-chat-customizations-evaluations/bin/waza`

## Commands

Run the local summary script first:

```bash
python3 <skill-dir>/scripts/analyze_waza_workspace.py /home/will/.codex/skills /home/will/.config/Code/User/globalStorage/ms-vscode.vscode-chat-customizations-evaluations/results
```

Then run Waza commands when available:

```bash
waza models
waza coverage /home/will/.codex/skills --format markdown
waza check /home/will/.codex/skills/<skill-name>
waza tokens profile /home/will/.codex/skills/<skill-name>/SKILL.md
waza quality /home/will/.codex/skills/<skill-name> --model gpt-5-mini
```

Use an available model from `waza models`; do not rely on defaults if they point to unavailable `claude-sonnet-4.6`.

## What To Report

Group findings by:

- **Runner blockers:** unavailable model, session creation failure, missing auth, missing Waza binary.
- **Readiness:** `waza check` score, token budget, links, orphan references, spec compliance.
- **Trigger coverage:** positive trigger misses, negative trigger overfires, vague frontmatter.
- **Reference hygiene:** useful detail in `SKILL.md` that should move to references, orphaned references, broken links.
- **Eval coverage:** missing `eval.yaml`, stale snapshots, absent positive/negative trigger tests.
- **Quality:** unclear scope, no examples, no troubleshooting, over-specific paths, too much implementation detail in body.

## Severity

- **Blocker:** eval did not run, Waza binary unavailable, model unavailable, invalid skill spec.
- **High:** trigger behavior failed, broken links, token hard limit, missing required metadata.
- **Medium:** missing eval coverage, orphaned refs, vague examples, default model mismatch.
- **Low:** style/readability improvements.

## Output Shape

Return:

```text
Summary
- Skills scanned:
- Result files inspected:
- Blockers:

Findings
- [severity] skill/file: issue. Evidence: ...

Recommended Next Actions
1. ...
```

Do not edit files in analysis mode. If the user asks to fix, switch to `fix-customization-evaluation-diagnostics`.
