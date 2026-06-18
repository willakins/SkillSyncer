import { cp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { plannedBackupPath } from "./backup";
import { copySkillDirectory, type CopySkillResult } from "./copy";
import { createSyncPlan } from "./plan";
import type { ResolvedSkillPaths, SkillClassification, SkillPlan } from "./types";

export interface InstallRepoSkillsOptions extends ResolvedSkillPaths {
  skillNames?: string[];
  overwriteExisting?: boolean;
  backup?: boolean;
  backupRoot?: string;
  dryRun?: boolean;
}

export interface InstalledRepoSkill extends CopySkillResult {
  skillName: string;
  overwritten: boolean;
  backupPath?: string;
}

export interface SkippedInstallSkill {
  skillName: string;
  classification?: SkillClassification;
  reason: string;
}

export interface InstallRepoSkillsResult {
  dryRun: boolean;
  backupPath?: string;
  installed: InstalledRepoSkill[];
  skipped: SkippedInstallSkill[];
}

export async function installRepoSkills(options: InstallRepoSkillsOptions): Promise<InstallRepoSkillsResult> {
  const plan = await createSyncPlan(options);
  const selectedSkills = options.skillNames?.length
    ? options.skillNames.map((skillName) => plan.skills.find((skill) => skill.name === skillName) ?? skillName)
    : plan.skills.filter((skill) => {
      return skill.classification === "repo-only" ||
        (options.overwriteExisting && skill.classification === "changed-both");
    });

  const installed: InstalledRepoSkill[] = [];
  const skipped: SkippedInstallSkill[] = [];
  const installableSkills: SkillPlan[] = [];

  for (const selectedSkill of selectedSkills) {
    if (typeof selectedSkill === "string") {
      skipped.push({
        skillName: selectedSkill,
        reason: "Skill was not found in the shared library."
      });
      continue;
    }

    if (!selectedSkill.repo) {
      skipped.push({
        skillName: selectedSkill.name,
        classification: selectedSkill.classification,
        reason: "Skill exists only on this device and cannot be installed from the shared library."
      });
      continue;
    }

    if (!selectedSkill.repo.valid || selectedSkill.classification === "invalid-skill-directory") {
      skipped.push({
        skillName: selectedSkill.name,
        classification: selectedSkill.classification,
        reason: "Shared skill is invalid and was not installed."
      });
      continue;
    }

    if (selectedSkill.classification === "same") {
      skipped.push({
        skillName: selectedSkill.name,
        classification: selectedSkill.classification,
        reason: "Skill is already up to date on this device."
      });
      continue;
    }

    if (selectedSkill.local && !options.overwriteExisting) {
      skipped.push({
        skillName: selectedSkill.name,
        classification: selectedSkill.classification,
        reason: "Device skill already exists; use explicit overwrite to replace it after backup."
      });
      continue;
    }

    installableSkills.push(selectedSkill);
  }

  const overwrittenSkillNames = installableSkills
    .filter((skill) => skill.local)
    .map((skill) => skill.name)
    .sort();
  const backupPath = overwrittenSkillNames.length > 0 && options.backup !== false
    ? plannedBackupPath(options.localRoot, options.backupRoot)
    : undefined;

  if (backupPath && !options.dryRun) {
    await mkdir(backupPath, { recursive: true });

    for (const skillName of overwrittenSkillNames) {
      await cp(join(options.localRoot, skillName), join(backupPath, skillName), { recursive: true });
    }
  }

  for (const skill of installableSkills) {
    const overwritten = Boolean(skill.local);
    const result = await copySkillDirectory({
      sourceRoot: options.repoRoot,
      targetRoot: options.localRoot,
      skillName: skill.name,
      dryRun: options.dryRun,
      overwrite: overwritten
    });

    installed.push({
      skillName: skill.name,
      overwritten,
      backupPath: overwritten ? backupPath : undefined,
      ...result
    });
  }

  return {
    dryRun: Boolean(options.dryRun),
    backupPath,
    installed,
    skipped
  };
}
