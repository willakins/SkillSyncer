import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { copySkillDirectory, type CopySkillResult } from "./copy";
import { createSyncPlan } from "./plan";
import type { ResolvedSkillPaths } from "./types";

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
  const backupPath = await plannedBackupPath(options.localRoot, options.backupRoot);

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

async function plannedBackupPath(localRoot: string, backupRoot?: string): Promise<string> {
  const root = backupRoot ?? join(dirname(localRoot), "skillsyncer-backups");
  return join(root, `skills-${timestamp()}`);
}

async function directoryHasEntries(path: string): Promise<boolean> {
  try {
    if (!(await stat(path)).isDirectory()) {
      return false;
    }

    return (await readdir(path)).length > 0;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

function timestamp(): string {
  return new Date().toISOString().replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}
