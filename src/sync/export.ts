import { copySkillDirectory, type CopySkillResult } from "./copy";
import { createSyncPlan } from "./plan";
import type { ResolvedSkillPaths, SkillClassification } from "./types";

export interface ExportLocalSkillsOptions extends ResolvedSkillPaths {
  skillNames?: string[];
  dryRun?: boolean;
  includeChanged?: boolean;
}

export type ExportSkillOperation = "create" | "update";

export interface ExportedSkill extends CopySkillResult {
  skillName: string;
  classification: SkillClassification;
  operation: ExportSkillOperation;
}

export interface SkippedExportSkill {
  skillName: string;
  classification?: SkillClassification;
  reason: string;
}

export interface ExportLocalSkillsResult {
  dryRun: boolean;
  includeChanged: boolean;
  exported: ExportedSkill[];
  skipped: SkippedExportSkill[];
}

export type ExportLocalOnlySkillsOptions = ExportLocalSkillsOptions;
export type ExportLocalOnlySkillsResult = ExportLocalSkillsResult;

export async function exportLocalSkills(options: ExportLocalSkillsOptions): Promise<ExportLocalSkillsResult> {
  const includeChanged = Boolean(options.includeChanged);
  const plan = await createSyncPlan(options);
  const selectedSkills = options.skillNames?.length
    ? options.skillNames.map((skillName) => plan.skills.find((skill) => skill.name === skillName) ?? skillName)
    : plan.skills.filter((skill) => isEligibleForDefaultExport(skill.classification, includeChanged));

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

    const eligibility = exportEligibility(selectedSkill.classification, includeChanged);

    if (!eligibility.exportable) {
      skipped.push({
        skillName: selectedSkill.name,
        classification: selectedSkill.classification,
        reason: eligibility.reason
      });
      continue;
    }

    const result = await copySkillDirectory({
      sourceRoot: options.localRoot,
      targetRoot: options.repoRoot,
      skillName: selectedSkill.name,
      dryRun: options.dryRun,
      overwrite: eligibility.operation === "update"
    });

    exported.push({
      skillName: selectedSkill.name,
      classification: selectedSkill.classification,
      operation: eligibility.operation,
      ...result
    });
  }

  return {
    dryRun: Boolean(options.dryRun),
    includeChanged,
    exported,
    skipped
  };
}

export async function exportLocalOnlySkills(
  options: ExportLocalOnlySkillsOptions
): Promise<ExportLocalOnlySkillsResult> {
  return exportLocalSkills({ ...options, includeChanged: false });
}

function isEligibleForDefaultExport(classification: SkillClassification, includeChanged: boolean): boolean {
  return classification === "local-only" || (includeChanged && classification === "changed-both");
}

type ExportEligibility =
  | { exportable: true; operation: ExportSkillOperation }
  | { exportable: false; reason: string };

function exportEligibility(classification: SkillClassification, includeChanged: boolean): ExportEligibility {
  switch (classification) {
    case "local-only":
      return { exportable: true, operation: "create" };
    case "changed-both":
      return includeChanged
        ? { exportable: true, operation: "update" }
        : {
            exportable: false,
            reason: "Skill exists in the repository. Re-run export with --include-changed to replace the repository copy from local files."
          };
    case "same":
      return {
        exportable: false,
        reason: "Local and repository copies already match."
      };
    case "repo-only":
      return {
        exportable: false,
        reason: "Skill only exists in the repository and has no local copy to export."
      };
    case "invalid-skill-directory":
      return {
        exportable: false,
        reason: "Skill directory is invalid and was not exported."
      };
  }
}
