import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { directoryExists, directoryHasEntries, plannedBackupPath, resolveBackupRoot } from "./backup";
import { copySkillDirectory, type CopySkillResult } from "./copy";
import { readSkillTree } from "./compare";
import { createSyncPlan } from "./plan";
import type { ResolvedSkillPaths, SkillSnapshot } from "./types";

export interface ReplaceLocalSkillsOptions extends ResolvedSkillPaths {
  backupRoot?: string;
  dryRun?: boolean;
}

export interface ReplacedLocalSkill extends CopySkillResult {
  skillName: string;
}

export interface SkippedReplaceSkill {
  skillName: string;
  reason: string;
}

export interface ReplaceLocalSkillsResult {
  dryRun: boolean;
  backupPath?: string;
  imported: ReplacedLocalSkill[];
  removedLocalSkillNames: string[];
  skipped: SkippedReplaceSkill[];
}

export interface ListSkillBackupsOptions {
  localRoot: string;
  backupRoot?: string;
}

export interface SkillBackupSummary {
  name: string;
  path: string;
  modifiedAt: string;
  skillNames: string[];
  skillCount: number;
  invalidSkillCount: number;
}

export interface RestoreLocalSkillsFromBackupOptions {
  localRoot: string;
  backupPath: string;
  backupRoot?: string;
  dryRun?: boolean;
}

export interface RestoreLocalSkillsFromBackupResult {
  dryRun: boolean;
  backupPath: string;
  safetyBackupPath?: string;
  restoredSkillNames: string[];
  removedLocalSkillNames: string[];
}

export async function replaceLocalSkillsFromRepo(
  options: ReplaceLocalSkillsOptions
): Promise<ReplaceLocalSkillsResult> {
  const plan = await createSyncPlan(options);
  const repoSkills = plan.skills
    .filter((skill) => skill.repo?.valid)
    .map((skill) => skill.name)
    .sort();
  const removedLocalSkillNames = plan.skills
    .filter((skill) => skill.local)
    .map((skill) => skill.name)
    .sort();
  const skipped = plan.skills
    .filter((skill) => skill.repo && !skill.repo.valid)
    .map((skill) => ({
      skillName: skill.name,
      reason: "Repository skill is invalid and was not imported."
    }));
  const backupPath = plannedBackupPath(options.localRoot, options.backupRoot);

  if (repoSkills.length === 0) {
    throw new Error("Repository skills directory has no valid skills. Local skills were not replaced.");
  }

  if (options.dryRun) {
    return {
      dryRun: true,
      backupPath,
      imported: repoSkills.map((skillName) => ({
        skillName,
        sourcePath: join(options.repoRoot, skillName),
        targetPath: join(options.localRoot, skillName),
        copied: false
      })),
      removedLocalSkillNames,
      skipped
    };
  }

  const backedUp = await directoryHasEntries(options.localRoot);

  if (backedUp) {
    await mkdir(dirname(backupPath), { recursive: true });
    await cp(options.localRoot, backupPath, { recursive: true });
  }

  await rm(options.localRoot, { recursive: true, force: true });
  await mkdir(options.localRoot, { recursive: true });

  const imported: ReplacedLocalSkill[] = [];

  for (const skillName of repoSkills) {
    const result = await copySkillDirectory({
      sourceRoot: options.repoRoot,
      targetRoot: options.localRoot,
      skillName,
      overwrite: false
    });

    imported.push({ skillName, ...result });
  }

  return {
    dryRun: false,
    backupPath: backedUp ? backupPath : undefined,
    imported,
    removedLocalSkillNames,
    skipped
  };
}

export async function listSkillBackups(options: ListSkillBackupsOptions): Promise<SkillBackupSummary[]> {
  const root = resolveBackupRoot(options.localRoot, options.backupRoot);

  if (!(await directoryExists(root))) {
    return [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  const backups = await Promise.all(entries
    .filter((entry) => entry.isDirectory())
    .map(async (entry) => {
      const path = join(root, entry.name);
      const [stats, skills] = await Promise.all([
        stat(path),
        readSkillTree(path)
      ]);
      const skillSnapshots = [...skills.values()];
      const skillNames = skillSnapshots
        .filter((skill) => skill.valid)
        .map((skill) => skill.name)
        .sort();

      return {
        name: entry.name,
        path,
        modifiedAt: stats.mtime.toISOString(),
        skillNames,
        skillCount: skillNames.length,
        invalidSkillCount: skillSnapshots.filter((skill) => !skill.valid).length
      };
    }));

  return backups.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
}

export async function restoreLocalSkillsFromBackup(
  options: RestoreLocalSkillsFromBackupOptions
): Promise<RestoreLocalSkillsFromBackupResult> {
  const backupRoot = resolveBackupRoot(options.localRoot, options.backupRoot);
  const backupPath = resolve(options.backupPath);

  ensureBackupPathIsAllowed(backupRoot, backupPath);

  if (!(await directoryHasEntries(backupPath))) {
    throw new Error(`Backup directory is empty or missing: ${backupPath}`);
  }

  const backupSkills = await readSkillTree(backupPath);
  const restoredSkillNames = skillNamesFromSnapshots(backupSkills);
  const localSkills = await readSkillTree(options.localRoot);
  const removedLocalSkillNames = skillNamesFromSnapshots(localSkills);
  const safetyBackupPath = plannedBackupPath(options.localRoot, options.backupRoot, "pre-restore");

  if (options.dryRun) {
    return {
      dryRun: true,
      backupPath,
      safetyBackupPath,
      restoredSkillNames,
      removedLocalSkillNames
    };
  }

  const backedUp = await directoryHasEntries(options.localRoot);

  if (backedUp) {
    await mkdir(dirname(safetyBackupPath), { recursive: true });
    await cp(options.localRoot, safetyBackupPath, { recursive: true });
  }

  await rm(options.localRoot, { recursive: true, force: true });
  await mkdir(dirname(options.localRoot), { recursive: true });
  await cp(backupPath, options.localRoot, { recursive: true });

  return {
    dryRun: false,
    backupPath,
    safetyBackupPath: backedUp ? safetyBackupPath : undefined,
    restoredSkillNames,
    removedLocalSkillNames
  };
}

function skillNamesFromSnapshots(skills: Map<string, SkillSnapshot>): string[] {
  return [...skills.values()]
    .filter((skill) => skill.valid)
    .map((skill) => skill.name)
    .sort();
}

function ensureBackupPathIsAllowed(backupRoot: string, backupPath: string): void {
  const resolvedRoot = resolve(backupRoot);
  const relativePath = relative(resolvedRoot, backupPath);

  if (relativePath === "" || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`Backup path is outside the configured backup directory: ${backupPath}`);
  }
}
