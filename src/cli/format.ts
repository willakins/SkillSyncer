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
    `Repo skills:  ${plan.repoRoot}`,
    `Local skills: ${plan.localRoot}`,
    "",
    "Summary:",
    `  Repo only: ${plan.totals["repo-only"]}`,
    `  Local only: ${plan.totals["local-only"]}`,
    `  Changed: ${plan.totals["changed-both"]}`,
    `  Same: ${plan.totals.same}`,
    `  Invalid: ${plan.totals["invalid-skill-directory"]}`
  ];

  const notableSkills = plan.skills.filter((skill) => skill.classification !== "same");

  if (notableSkills.length === 0) {
    lines.push("", "No skill differences found.");
    return lines.join("\n");
  }

  lines.push("", "Skills:");

  for (const skill of notableSkills) {
    const changeCount = skill.fileChanges.length;
    const suffix = changeCount === 1 ? "change" : "changes";
    lines.push(`  - ${skill.name}: ${CLASSIFICATION_LABELS[skill.classification]} (${changeCount} ${suffix})`);
  }

  return lines.join("\n");
}
