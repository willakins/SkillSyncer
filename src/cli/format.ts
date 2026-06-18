import type { SkillClassification, SyncPlan } from "../sync";

const CLASSIFICATION_LABELS: Record<SkillClassification, string> = {
  "repo-only": "repo only",
  "local-only": "local only",
  same: "same",
  "changed-both": "changed",
  "invalid-skill-directory": "invalid"
};

export function formatPlanSummary(plan: SyncPlan): string {
  const lines = [
    "SkillSyncer status",
    `Library:       ${plan.library?.manifest?.name ?? "Plain skill folder"}`,
    `Shared skills: ${plan.repoRoot}`,
    `Local skills:  ${plan.localRoot}`,
    "",
    "Summary:",
    `  Shared only: ${plan.totals["repo-only"]}`,
    `  Local only: ${plan.totals["local-only"]}`,
    `  Changed: ${plan.totals["changed-both"]}`,
    `  Same: ${plan.totals.same}`,
    `  Invalid: ${plan.totals["invalid-skill-directory"]}`
  ];

  const notableSkills = plan.skills.filter((skill) => skill.classification !== "same");

  if (plan.library && !plan.library.valid) {
    lines.push("", "Library manifest errors:", ...plan.library.errors.map((error) => `  - ${error}`));
  }

  if (notableSkills.length === 0) {
    lines.push("", "No skill differences found.");
    return lines.join("\n");
  }

  lines.push("", "Skills:");

  for (const skill of notableSkills) {
    const changeCount = skill.fileChanges.length;
    const suffix = changeCount === 1 ? "change" : "changes";
    const visibility = skill.metadata ? `, ${skill.metadata.visibility}` : "";
    const tags = skill.metadata?.tags.length ? `, tags: ${skill.metadata.tags.join(", ")}` : "";
    lines.push(`  - ${skill.name}: ${CLASSIFICATION_LABELS[skill.classification]} (${changeCount} ${suffix}${visibility}${tags})`);
  }

  return lines.join("\n");
}
