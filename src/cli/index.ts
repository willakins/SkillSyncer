#!/usr/bin/env node
import {
  cloneRepository,
  createSyncPlan,
  exportLocalOnlySkills,
  GitCommandError,
  getRepositoryStatus,
  installRepoSkills,
  pullRepository,
  publishSkillChanges,
  resolveConfiguredSkillPaths,
  resolveInputPath,
  resolveSkillConflicts,
  resolveSkillsRootFromLibraryPath,
  saveSettings,
  settingsPatchFromInputs,
  syncWorkspace,
  upsertOrganizationLibrary,
  type ExportLocalOnlySkillsResult,
  type InstallRepoSkillsResult,
  type PublishSkillChangesResult,
  type ResolveSkillConflictsResult,
  type ResolvedSkillSyncerSettings,
  type SyncWorkspaceResult
} from "../sync";
import { parseArgs } from "./args";
import type { CliOptions } from "./args";
import { formatPlanSummary } from "./format";

const COMMANDS = new Set([
  "status",
  "import",
  "install",
  "export",
  "pull",
  "publish",
  "sync",
  "resolve",
  "clone",
  "open",
  "org",
  "config",
  "help"
]);

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

  try {
    return await runCommand(options);
  } catch (error) {
    if (error instanceof GitCommandError) {
      process.stderr.write(`${formatGitError(error)}\n`);
      return 4;
    }

    throw error;
  }
}

async function runCommand(options: CliOptions): Promise<number> {
  const config = await resolveConfiguredSkillPaths({
    repoRoot: options.repoRoot,
    localRoot: options.localRoot,
    backupRoot: options.backupRoot,
    remote: options.remote,
    branch: options.branch,
    settingsPath: options.settingsFile
  });
  const paths = {
    repoRoot: config.repoRoot,
    localRoot: config.localRoot
  };

  if (options.command === "clone") {
    const url = options.skillNames[0];
    const targetPath = options.targetDir ?? options.skillNames[1];

    if (!url || !targetPath) {
      process.stderr.write("Usage: skillsync clone <git-url> <target-dir>\n");
      return 2;
    }

    const cloneOutput = options.dryRun
      ? `Would clone ${url} into ${targetPath}.`
      : await cloneRepository({
        url,
        targetPath: resolveInputPath(targetPath),
        branch: options.branch
      });
    const skillsPath = await resolveSkillsRootFromLibraryPath(resolveInputPath(targetPath));

    if (!options.dryRun) {
      await saveSettings({
        ...config.settings,
        librarySkillsPath: skillsPath,
        gitRemote: options.remote ?? config.settings.gitRemote,
        gitBranch: options.branch ?? config.settings.gitBranch,
        schemaVersion: 1
      }, config.settingsPath);
    }

    process.stdout.write(`${formatCloneResult(cloneOutput, skillsPath, options.dryRun)}\n`);
    return 0;
  }

  if (options.command === "open") {
    const libraryPath = options.repoRoot ?? options.skillNames[0];

    if (!libraryPath) {
      process.stderr.write("Usage: skillsync open <library-root-or-skills-dir>\n");
      return 2;
    }

    const skillsPath = await resolveSkillsRootFromLibraryPath(resolveInputPath(libraryPath));

    if (!options.dryRun) {
      await saveSettings({
        ...config.settings,
        librarySkillsPath: skillsPath,
        schemaVersion: 1
      }, config.settingsPath);
    }

    process.stdout.write(`${options.dryRun ? "Would open" : "Opened"} shared library skills at ${skillsPath}.\n`);
    return 0;
  }

  if (options.command === "org") {
    return runOrganizationCommand(options, config);
  }

  if (options.command === "config") {
    if (hasConfigUpdates(options)) {
      const patch = settingsPatchFromInputs({
        repoRoot: options.repoRoot,
        localRoot: options.localRoot,
        backupRoot: options.backupRoot,
        remote: options.remote,
        branch: options.branch
      });
      await saveSettings({
        ...config.settings,
        ...patch,
        schemaVersion: 1
      }, config.settingsPath);

      const refreshed = await resolveConfiguredSkillPaths({ settingsPath: config.settingsPath });

      if (options.json) {
        process.stdout.write(`${JSON.stringify(refreshed, null, 2)}\n`);
        return 0;
      }

      process.stdout.write(`${formatConfig(refreshed, "Saved SkillSyncer configuration.")}\n`);
      return 0;
    }

    if (options.json) {
      process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
      return 0;
    }

    process.stdout.write(`${formatConfig(config)}\n`);
    return 0;
  }

  if (["import", "install"].includes(options.command) && (options.all || options.skillNames.length > 0)) {
    const result = await installRepoSkills({
      ...paths,
      skillNames: options.all ? undefined : options.skillNames,
      overwriteExisting: options.overwrite,
      backup: options.backup,
      backupRoot: config.backupRoot,
      dryRun: options.dryRun
    });

    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }

    process.stdout.write(`${formatInstallResult(result)}\n`);
    return result.installed.length > 0 || result.skipped.length === 0 ? 0 : 1;
  }

  if (options.command === "export" && (options.all || options.skillNames.length > 0)) {
    const result = await exportLocalOnlySkills({
      ...paths,
      skillNames: options.all ? undefined : options.skillNames,
      dryRun: options.dryRun
    });

    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }

    process.stdout.write(`${formatExportResult(result)}\n`);
    return result.exported.length > 0 || result.skipped.length === 0 ? 0 : 1;
  }

  if (options.command === "pull") {
    const pullOutput = await pullRepository(paths.repoRoot, {
      remote: config.gitRemote,
      branch: config.gitBranch
    });
    const plan = await createSyncPlan(paths);

    if (options.json) {
      process.stdout.write(`${JSON.stringify({ pullOutput, plan }, null, 2)}\n`);
      return 0;
    }

    process.stdout.write(`${formatPullResult(pullOutput, plan)}\n`);
    return 0;
  }

  if (options.command === "publish") {
    const skillNames = options.all ? await allSharedSkillNames(paths) : options.skillNames;

    if (skillNames.length === 0) {
      process.stderr.write("Choose at least one skill to publish, or pass --all.\n");
      return 2;
    }

    const result = await publishSkillChanges(paths.repoRoot, {
      skillNames,
      message: options.message ?? "Publish skill updates",
      remote: config.gitRemote,
      branch: config.gitBranch
    });

    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }

    process.stdout.write(`${formatPublishResult(result)}\n`);
    return 0;
  }

  if (options.command === "resolve") {
    if (!options.conflictAction) {
      process.stderr.write("Choose a conflict action: --use-library, --keep-device, or --skip.\n");
      return 2;
    }

    const result = await resolveSkillConflicts({
      ...paths,
      action: options.conflictAction,
      skillNames: options.all ? undefined : options.skillNames,
      backupRoot: config.backupRoot,
      dryRun: options.dryRun
    });

    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }

    process.stdout.write(`${formatConflictResult(result)}\n`);
    return result.skipped.length > 0 && result.exported.length === 0 && !result.installed?.installed.length ? 3 : 0;
  }

  if (options.command === "sync") {
    const result = await syncWorkspace({
      ...paths,
      backupRoot: config.backupRoot,
      dryRun: options.dryRun,
      pull: options.pull,
      publish: options.publish,
      remote: config.gitRemote,
      branch: config.gitBranch,
      message: options.message
    });

    if (options.json) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return result.conflicts.length > 0 ? 3 : 0;
    }

    process.stdout.write(`${formatSyncResult(result)}\n`);
    return result.conflicts.length > 0 ? 3 : 0;
  }

  if (["status", "import", "install", "export"].includes(options.command)) {
    const plan = await createSyncPlan(paths);
    const gitStatus = options.command === "status" ? await getRepositoryStatus(paths.repoRoot) : undefined;

    if (options.json) {
      process.stdout.write(`${JSON.stringify(gitStatus ? { plan, gitStatus } : plan, null, 2)}\n`);
      return 0;
    }

    process.stdout.write(`${formatPlanSummary(plan)}\n`);

    if (gitStatus) {
      process.stdout.write(`\n${formatRepositoryStatus(gitStatus)}\n`);
    }

    if (options.command !== "status") {
      process.stdout.write(`\n${hintForPreviewCommand(options.command)}\n`);
    }

    return 0;
  }

  process.stdout.write(`${options.command} is part of the planned command surface but is not implemented yet.\n`);
  return 2;
}

function formatInstallResult(result: InstallRepoSkillsResult): string {
  const verb = result.dryRun ? "Would install" : "Installed";
  const lines = [
    `${verb} ${result.installed.length} shared ${result.installed.length === 1 ? "skill" : "skills"}.`
  ];

  for (const skill of result.installed) {
    const backupText = skill.backupPath ? ` (backup: ${skill.backupPath})` : "";
    const action = skill.overwritten ? "updated" : "added";
    lines.push(`  - ${skill.skillName}: ${action} ${skill.sourcePath} -> ${skill.targetPath}${backupText}`);
  }

  if (result.skipped.length > 0) {
    lines.push("", `Skipped ${result.skipped.length} ${result.skipped.length === 1 ? "skill" : "skills"}:`);

    for (const skill of result.skipped) {
      lines.push(`  - ${skill.skillName}: ${skill.reason}`);
    }
  }

  return lines.join("\n");
}

function formatExportResult(result: ExportLocalOnlySkillsResult): string {
  const verb = result.dryRun ? "Would export" : "Exported";
  const lines = [
    `${verb} ${result.exported.length} local-only ${result.exported.length === 1 ? "skill" : "skills"}.`
  ];

  for (const skill of result.exported) {
    lines.push(`  - ${skill.skillName}: ${skill.sourcePath} -> ${skill.targetPath}`);
  }

  if (result.skipped.length > 0) {
    lines.push("", `Skipped ${result.skipped.length} ${result.skipped.length === 1 ? "skill" : "skills"}:`);

    for (const skill of result.skipped) {
      lines.push(`  - ${skill.skillName}: ${skill.reason}`);
    }
  }

  return lines.join("\n");
}

function formatPullResult(pullOutput: string, plan: Awaited<ReturnType<typeof createSyncPlan>>): string {
  const lines = [
    pullOutput || "Repository already up to date.",
    "",
    formatPlanSummary(plan),
    "",
    "Use `skillsync install --all --dry-run` to preview safe installs, or omit `--dry-run` to install shared-only skills."
  ];

  return lines.join("\n");
}

function formatPublishResult(result: PublishSkillChangesResult): string {
  if (!result.committed) {
    return result.commitOutput;
  }

  return [
    `Published ${result.skillNames.length} ${result.skillNames.length === 1 ? "skill" : "skills"}.`,
    result.commitOutput,
    result.pushOutput
  ].filter(Boolean).join("\n");
}

function formatConflictResult(result: ResolveSkillConflictsResult): string {
  const lines = [
    `${result.dryRun ? "Would resolve" : "Resolved"} conflicts with action ${result.action}.`
  ];

  if (result.installed) {
    lines.push(formatInstallResult(result.installed));
  }

  if (result.exported.length > 0) {
    lines.push(`Kept ${result.exported.length} device ${result.exported.length === 1 ? "version" : "versions"} in the shared library.`);

    for (const skill of result.exported) {
      const backupText = skill.backupPath ? ` (shared backup: ${skill.backupPath})` : "";
      lines.push(`  - ${skill.skillName}: ${skill.sourcePath} -> ${skill.targetPath}${backupText}`);
    }
  }

  if (result.skipped.length > 0) {
    lines.push(`Skipped ${result.skipped.length} ${result.skipped.length === 1 ? "conflict" : "conflicts"}:`);

    for (const skill of result.skipped) {
      lines.push(`  - ${skill.skillName}: ${skill.reason}`);
    }
  }

  return lines.filter(Boolean).join("\n");
}

function formatSyncResult(result: SyncWorkspaceResult): string {
  if (result.conflicts.length > 0) {
    return [
      `Sync stopped for ${result.conflicts.length} ${result.conflicts.length === 1 ? "conflict" : "conflicts"}.`,
      ...result.conflicts.map((skillName) => `  - ${skillName}`),
      "Resolve conflicts with `skillsync resolve --use-library`, `--keep-device`, or `--skip`."
    ].join("\n");
  }

  const lines = [
    result.dryRun ? "Sync preview complete." : "Sync complete.",
    result.pullOutput ? `Pulled: ${result.pullOutput}` : "Pull: no changes pulled.",
    `${result.dryRun ? "Would install" : "Installed"} ${result.installed.installed.length} shared ${result.installed.installed.length === 1 ? "skill" : "skills"}.`,
    `${result.dryRun ? "Would export" : "Exported"} ${result.exported.exported.length} device ${result.exported.exported.length === 1 ? "skill" : "skills"}.`
  ];

  if (result.published) {
    lines.push(result.published.committed ? "Published exported skills." : result.published.commitOutput);
  }

  return lines.join("\n");
}

function formatCloneResult(cloneOutput: string, skillsPath: string, dryRun: boolean): string {
  return [
    cloneOutput,
    `${dryRun ? "Would configure" : "Configured"} shared library skills: ${skillsPath}`
  ].filter(Boolean).join("\n");
}

function formatRepositoryStatus(status: Awaited<ReturnType<typeof getRepositoryStatus>>): string {
  if (!status.isRepository) {
    return "Git: not a git repository";
  }

  const remote = status.upstream ? ` tracking ${status.upstream}` : "";
  const divergence = status.diverged
    ? `, diverged (${status.ahead} ahead, ${status.behind} behind)`
    : status.ahead > 0
      ? `, ${status.ahead} ahead`
      : status.behind > 0
        ? `, ${status.behind} behind`
        : "";
  const conflicts = status.hasMergeConflicts ? ", merge conflicts present" : "";
  const cleanliness = status.clean ? "clean" : `${status.entries.length} changed git ${status.entries.length === 1 ? "entry" : "entries"}`;

  return `Git: ${status.branchName ?? "unknown branch"}${remote}, ${cleanliness}${divergence}${conflicts}`;
}

async function runOrganizationCommand(options: CliOptions, config: ResolvedSkillSyncerSettings): Promise<number> {
  const subcommand = options.skillNames[0] ?? "list";

  if (subcommand === "list") {
    const organizations = config.settings.organizations ?? {};

    if (options.json) {
      process.stdout.write(`${JSON.stringify(organizations, null, 2)}\n`);
      return 0;
    }

    const entries = Object.values(organizations);

    if (entries.length === 0) {
      process.stdout.write("No organizations configured.\n");
      return 0;
    }

    process.stdout.write(`${entries.map((organization) => {
      return `${organization.displayName} (${organization.id}): ${Object.keys(organization.libraries).length} ${Object.keys(organization.libraries).length === 1 ? "library" : "libraries"}`;
    }).join("\n")}\n`);
    return 0;
  }

  if (subcommand !== "register-library") {
    process.stderr.write("Usage: skillsync org register-library --organization <id> --library-id <id> [--name <display-name>]\n");
    return 2;
  }

  if (!options.organizationId || !options.libraryId) {
    process.stderr.write("Registering an organization library requires --organization and --library-id.\n");
    return 2;
  }

  const organizations = upsertOrganizationLibrary(config.settings.organizations, {
    organizationId: options.organizationId,
    libraryId: options.libraryId,
    displayName: options.displayName,
    skillsPath: config.repoRoot,
    recommendedSkills: config.settings.organizations?.[options.organizationId]?.libraries[options.libraryId]?.recommendedSkills
  });

  const saved = await saveSettings({
    ...config.settings,
    organizations,
    schemaVersion: 1
  }, config.settingsPath);

  if (options.json) {
    process.stdout.write(`${JSON.stringify(saved.organizations?.[options.organizationId], null, 2)}\n`);
    return 0;
  }

  process.stdout.write(`Registered ${options.libraryId} for organization ${options.organizationId}.\n`);
  return 0;
}

function formatConfig(config: ResolvedSkillSyncerSettings, prefix?: string): string {
  const lines = [
    ...(prefix ? [prefix, ""] : []),
    "SkillSyncer configuration",
    `Settings file:          ${config.settingsPath}`,
    `Shared library skills:  ${config.repoRoot}`,
    `Device skills:          ${config.localRoot}`,
    `Backup directory:       ${config.backupRoot}`,
    `Git remote:             ${config.gitRemote ?? "(upstream default)"}`,
    `Git branch:             ${config.gitBranch ?? "(current branch)"}`
  ];

  return lines.join("\n");
}

function hintForPreviewCommand(command: string): string {
  if (command === "export") {
    return "Use `skillsync export --all` or `skillsync export <skill-name>` to copy local-only skills into the shared library.";
  }

  return "Use `skillsync install --all --dry-run` to preview safe installs, or omit `--dry-run` to install shared-only skills.";
}

function hasConfigUpdates(options: CliOptions): boolean {
  return options.repoRoot !== undefined ||
    options.localRoot !== undefined ||
    options.backupRoot !== undefined ||
    options.remote !== undefined ||
    options.branch !== undefined;
}

async function allSharedSkillNames(paths: { repoRoot: string; localRoot: string }): Promise<string[]> {
  const plan = await createSyncPlan(paths);

  return plan.skills
    .filter((skill) => skill.repo?.valid)
    .map((skill) => skill.name)
    .sort();
}

function formatGitError(error: GitCommandError): string {
  const hint = gitErrorHint(error.kind);

  return hint ? `${error.message}\n${hint}` : error.message;
}

function gitErrorHint(kind: GitCommandError["kind"]): string | undefined {
  switch (kind) {
    case "not-git-repository":
      return "Configure a shared library inside a git checkout, or use a local-directory workflow without pull/publish.";
    case "missing-remote":
      return "Check the configured git remote with `skillsync config --remote <name> --branch <branch>`.";
    case "authentication":
      return "Verify your local git credentials, SSH key, or token, then retry.";
    case "merge-conflict":
      return "Resolve the repository merge conflicts before running SkillSyncer again.";
    case "diverged":
      return "The branch cannot fast-forward. Reconcile it with git before publishing or pulling.";
    case "working-tree-dirty":
      return "Commit, stash, or discard unrelated repository changes before pulling.";
    case "unknown":
      return undefined;
  }
}

function helpText(): string {
  return [
    "Usage: skillsync [command] [options]",
    "",
    "Commands:",
    "  status   Show local and repository skill differences",
    "  import   Install selected shared skills locally",
    "  install  Alias for importing selected shared skills locally",
    "  export   Export local-only skills into the shared library",
    "  pull     Pull git changes, then show the resulting skill status",
    "  publish  Commit and push selected shared skill changes",
    "  sync     Pull, install shared-only skills, export local-only skills, and publish exports",
    "  resolve  Resolve changed-on-both-sides skills with an explicit action",
    "  clone    Clone a git-backed library and save it as the active library",
    "  open     Save an existing local library as the active library",
    "  org      List or register local organization library metadata",
    "  config   Show or update saved paths and git defaults",
    "",
    "Options:",
    "  --library-skills-dir <path>  Shared library skills directory, defaults to ./skills",
    "  --repo-skills-dir <path>     Compatibility alias for --library-skills-dir",
    "  --local-skills-dir <path>    Local Codex skills directory, defaults to ~/.codex/skills",
    "  --backup-dir <path>          Backup directory, defaults next to the local skills directory",
    "  --remote <name>              Git remote for pull, push, and saved config",
    "  --branch <name>              Git branch for pull, push, and saved config",
    "  --message, -m <text>         Commit message for publish",
    "  --target-dir <path>          Clone target directory",
    "  --organization <id>          Organization id for org commands",
    "  --library-id <id>            Library id for org commands",
    "  --name <text>                Display name for org commands",
    "  --all                        Select all eligible skills",
    "  --overwrite                  Replace existing device skills after backup during install",
    "  --no-backup                  Disable install overwrite backups",
    "  --no-pull                    Skip git pull during sync",
    "  --no-publish                 Skip publish during sync",
    "  --use-library                Resolve conflicts by installing the shared version",
    "  --keep-device                Resolve conflicts by exporting the device version",
    "  --skip                       Mark selected conflicts as skipped",
    "  --settings-file <path>       Use an alternate settings file",
    "  --json                       Print machine-readable output",
    "  --dry-run                    Preview supported mutating commands",
    "  -h, --help                   Show this help"
  ].join("\n");
}

runCli().then((exitCode) => {
  process.exitCode = exitCode;
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
