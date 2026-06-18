#!/usr/bin/env node
import { createSyncPlan, exportLocalSkills, resolveSkillPaths, type ExportLocalSkillsResult } from "../sync";
import { parseArgs } from "./args";
import { formatPlanSummary } from "./format";

const COMMANDS = new Set(["status", "import", "install", "export", "pull", "publish", "sync", "config", "help"]);

export async function runCli(rawArgs = process.argv.slice(2)): Promise<number> {
  const options = parseArgs(rawArgs);

  if (options.help || options.command === "help") {
    process.stdout.write(`${helpText()}\n`);
    return 0;
  }

  if (!COMMANDS.has(options.command)) {
    process.stderr.write(`Unknown command: ${options.command}\n\n${helpText()}\n`);
    return 2;
  }

  const paths = resolveSkillPaths({
    repoRoot: options.repoRoot,
    localRoot: options.localRoot
  });

  if (options.command === "export" && (options.all || options.skillNames.length > 0)) {
    const result = await exportLocalSkills({
      ...paths,
      skillNames: options.all ? undefined : options.skillNames,
      dryRun: options.dryRun,
      includeChanged: options.includeChanged
    });

    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }

    process.stdout.write(`${formatExportResult(result)}\n`);
    return result.exported.length > 0 || result.skipped.length === 0 ? 0 : 1;
  }

  if (["status", "import", "install", "export"].includes(options.command)) {
    const plan = await createSyncPlan(paths);

    if (options.json) {
      process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
      return 0;
    }

    process.stdout.write(`${formatPlanSummary(plan)}\n`);

    if (options.command !== "status") {
      process.stdout.write("\nUse `skillsync export --all` to copy new local skills, or add `--include-changed` to update existing repository skills from local files.\n");
    }

    return 0;
  }

  process.stdout.write(`${options.command} is part of the planned command surface but is not implemented yet.\n`);
  return 2;
}

function formatExportResult(result: ExportLocalSkillsResult): string {
  const verb = result.dryRun ? "Would export" : "Exported";
  const created = result.exported.filter((skill) => skill.operation === "create").length;
  const updated = result.exported.filter((skill) => skill.operation === "update").length;
  const lines = [
    `${verb} ${result.exported.length} ${result.exported.length === 1 ? "skill" : "skills"} (${created} new, ${updated} changed).`
  ];

  for (const skill of result.exported) {
    lines.push(`  - ${skill.skillName}: ${skill.operation} ${skill.sourcePath} -> ${skill.targetPath}`);
  }

  if (result.skipped.length > 0) {
    lines.push("", `Skipped ${result.skipped.length} ${result.skipped.length === 1 ? "skill" : "skills"}:`);

    for (const skill of result.skipped) {
      lines.push(`  - ${skill.skillName}: ${skill.reason}`);
    }
  }

  return lines.join("\n");
}

function helpText(): string {
  return [
    "Usage: skillsync [command] [options]",
    "",
    "Commands:",
    "  status   Show local and repository skill differences",
    "  import   Preview importing repository skills locally",
    "  install  Alias-style preview for importing repository skills locally",
    "  export   Preview exporting local skills into the repository",
    "",
    "Options:",
    "  --repo-skills-dir <path>   Repository skills directory, defaults to ./skills",
    "  --local-skills-dir <path>  Local Codex skills directory, defaults to ~/.codex/skills",
    "  --all                      Select all eligible skills for export",
    "  --include-changed          Include changed same-name skills when exporting",
    "  --json                     Print machine-readable output",
    "  --dry-run                  Preview supported mutating commands",
    "  -h, --help                 Show this help"
  ].join("\n");
}

runCli().then((exitCode) => {
  process.exitCode = exitCode;
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
