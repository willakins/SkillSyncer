import { cp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { plannedBackupPath } from "./backup";
import { copySkillDirectory, type CopySkillResult } from "./copy";
import { installRepoSkills, type InstallRepoSkillsResult } from "./install";
import { createSyncPlan } from "./plan";
import type { ResolvedSkillPaths, SkillPlan } from "./types";

export type ConflictResolutionAction = "use-library" | "keep-device" | "skip";

export interface ResolveSkillConflictsOptions extends ResolvedSkillPaths {
  action: ConflictResolutionAction;
  skillNames?: string[];
  backupRoot?: string;
  dryRun?: boolean;
}

export interface ResolvedDeviceConflictSkill extends CopySkillResult {
  skillName: string;
  backupPath?: string;
}

export interface ResolveSkillConflictsResult {
  dryRun: boolean;
  action: ConflictResolutionAction;
  backupPath?: string;
  installed?: InstallRepoSkillsResult;
  exported: ResolvedDeviceConflictSkill[];
  skipped: { skillName: string; reason: string }[];
}

export async function resolveSkillConflicts(
  options: ResolveSkillConflictsOptions
): Promise<ResolveSkillConflictsResult> {
  const plan = await createSyncPlan(options);
  const selected = selectConflicts(plan.skills, options.skillNames);

  if (options.action === "skip") {
    return {
      dryRun: Boolean(options.dryRun),
      action: options.action,
      exported: [],
      skipped: selected.map((skill) => ({
        skillName: skill.name,
        reason: "Conflict was skipped."
      }))
    };
  }

  if (options.action === "use-library") {
    const installed = await installRepoSkills({
      ...options,
      skillNames: selected.map((skill) => skill.name),
      overwriteExisting: true,
      backup: true
    });

    return {
      dryRun: Boolean(options.dryRun),
      action: options.action,
      backupPath: installed.backupPath,
      installed,
      exported: [],
      skipped: installed.skipped.map((skill) => ({
        skillName: skill.skillName,
        reason: skill.reason
      }))
    };
  }

  const backupPath = selected.length > 0 ? plannedBackupPath(options.localRoot, options.backupRoot, "library") : undefined;
  const exported: ResolvedDeviceConflictSkill[] = [];

  if (backupPath && !options.dryRun) {
    await mkdir(backupPath, { recursive: true });

    for (const skill of selected) {
      await cp(join(options.repoRoot, skill.name), join(backupPath, skill.name), { recursive: true });
    }
  }

  for (const skill of selected) {
    const result = await copySkillDirectory({
      sourceRoot: options.localRoot,
      targetRoot: options.repoRoot,
      skillName: skill.name,
      overwrite: true,
      dryRun: options.dryRun
    });

    exported.push({
      skillName: skill.name,
      backupPath,
      ...result
    });
  }

  return {
    dryRun: Boolean(options.dryRun),
    action: options.action,
    backupPath,
    exported,
    skipped: []
  };
}

function selectConflicts(skills: SkillPlan[], skillNames?: string[]): SkillPlan[] {
  const requestedNames = new Set(skillNames);
  const conflicts = skills.filter((skill) => skill.classification === "changed-both");

  if (!skillNames?.length) {
    return conflicts;
  }

  const selected = conflicts.filter((skill) => requestedNames.has(skill.name));
  const missing = skillNames.filter((skillName) => !selected.some((skill) => skill.name === skillName));

  if (missing.length > 0) {
    throw new Error(`Requested skills are not changed on both sides: ${missing.join(", ")}`);
  }

  return selected;
}
