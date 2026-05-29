import { copySkillDirectory, type CopySkillResult } from "./copy";
import { createSyncPlan } from "./plan";
import type { ResolvedSkillPaths, SkillClassification } from "./types";

export interface ExportLocalOnlySkillsOptions extends ResolvedSkillPaths {
  skillNames?: string[];
  dryRun?: boolean;
}

export interface ExportedSkill extends CopySkillResult {
  skillName: string;
}

export interface SkippedExportSkill {
  skillName: string;
  classification?: SkillClassification;
  reason: string;
}

export interface ExportLocalOnlySkillsResult {
  dryRun: boolean;
  exported: ExportedSkill[];
  skipped: SkippedExportSkill[];
}

export async function exportLocalOnlySkills(
  options: ExportLocalOnlySkillsOptions
): Promise<ExportLocalOnlySkillsResult> {
  const plan = await createSyncPlan(options);
  const requestedNames = new Set(options.skillNames);
  const selectedSkills = options.skillNames?.length
    ? options.skillNames.map((skillName) => plan.skills.find((skill) => skill.name === skillName) ?? skillName)
    : plan.skills.filter((skill) => skill.classification === "local-only");

  const exported: ExportedSkill[] = [];
  const skipped: SkippedExportSkill[] = [];

  for (const selectedSkill of selectedSkills) {
    if (typeof selectedSkill === "string") {
      skipped.push({
        skillName: selectedSkill,
        reason: "Skill was not found in either skill directory."
      });
      continue;
    }

    if (requestedNames.size > 0 && !requestedNames.has(selectedSkill.name)) {
      continue;
    }

    if (selectedSkill.classification !== "local-only") {
      skipped.push({
        skillName: selectedSkill.name,
        classification: selectedSkill.classification,
        reason: "Only local-only skills can be exported without an overwrite review."
      });
      continue;
    }

    const result = await copySkillDirectory({
      sourceRoot: options.localRoot,
      targetRoot: options.repoRoot,
      skillName: selectedSkill.name,
      dryRun: options.dryRun,
      overwrite: false
    });

    exported.push({
      skillName: selectedSkill.name,
      ...result
    });
  }

  return {
    dryRun: Boolean(options.dryRun),
    exported,
    skipped
  };
}
