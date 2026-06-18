import { compareSkillFiles, readSkillTree } from "./compare";
import { readLibraryManifestForSkillsRoot } from "./manifest";
import type { LibraryProvider } from "./providers";
import type { LibraryManifestSummary, ResolvedSkillPaths, SkillClassification, SkillPlan, SkillSnapshot, SyncPlan } from "./types";

export async function createSyncPlan(paths: ResolvedSkillPaths): Promise<SyncPlan> {
  const [repoSkills, localSkills, library] = await Promise.all([
    readSkillTree(paths.repoRoot),
    readSkillTree(paths.localRoot),
    readLibraryManifestForSkillsRoot(paths.repoRoot)
  ]);

  return createSyncPlanFromSkillTrees(paths, repoSkills, localSkills, library);
}

export async function createSyncPlanFromProvider(provider: LibraryProvider, localRoot: string): Promise<SyncPlan> {
  const [repoSkills, localSkills, library] = await Promise.all([
    provider.readSkillTree(),
    readSkillTree(localRoot),
    readLibraryManifestForSkillsRoot(provider.skillsRoot)
  ]);

  return createSyncPlanFromSkillTrees({
    repoRoot: provider.skillsRoot,
    localRoot
  }, repoSkills, localSkills, library);
}

export function createSyncPlanFromSkillTrees(
  paths: ResolvedSkillPaths,
  repoSkills: Map<string, SkillSnapshot>,
  localSkills: Map<string, SkillSnapshot>,
  library?: LibraryManifestSummary
): SyncPlan {
  const skillNames = [...new Set([...repoSkills.keys(), ...localSkills.keys()])].sort();
  const skills = skillNames.map((name) => createSkillPlan(name, repoSkills.get(name), localSkills.get(name), library));
  const totals = createEmptyTotals();

  for (const skill of skills) {
    totals[skill.classification] += 1;
  }

  return {
    repoRoot: paths.repoRoot,
    localRoot: paths.localRoot,
    library,
    skills,
    totals
  };
}

function createSkillPlan(
  name: string,
  repo?: SkillSnapshot,
  local?: SkillSnapshot,
  library?: LibraryManifestSummary
): SkillPlan {
  const metadata = library?.manifest?.skills[name];

  if ((repo && !repo.valid) || (local && !local.valid)) {
    return {
      name,
      classification: "invalid-skill-directory",
      repo,
      local,
      metadata,
      fileChanges: repo && local ? compareSkillFiles(repo, local) : []
    };
  }

  if (repo && !local) {
    return {
      name,
      classification: "repo-only",
      repo,
      metadata,
      fileChanges: repo.files.map((file) => ({ relativePath: file.relativePath, changeType: "repo-only" }))
    };
  }

  if (local && !repo) {
    return {
      name,
      classification: "local-only",
      local,
      metadata,
      fileChanges: local.files.map((file) => ({ relativePath: file.relativePath, changeType: "local-only" }))
    };
  }

  if (!repo || !local) {
    throw new Error(`Unable to compare skill "${name}" because neither side exists.`);
  }

  const fileChanges = compareSkillFiles(repo, local);

  return {
    name,
    classification: fileChanges.length === 0 ? "same" : "changed-both",
    repo,
    local,
    metadata,
    fileChanges
  };
}

function createEmptyTotals(): Record<SkillClassification, number> {
  return {
    "repo-only": 0,
    "local-only": 0,
    same: 0,
    "changed-both": 0,
    "invalid-skill-directory": 0
  };
}
