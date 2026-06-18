import { exportLocalOnlySkills, type ExportLocalOnlySkillsResult } from "./export";
import { pullRepository } from "./git";
import { installRepoSkills, type InstallRepoSkillsResult } from "./install";
import { createSyncPlan } from "./plan";
import { publishSkillChanges, type PublishSkillChangesResult } from "./git";
import type { ResolvedSkillPaths, SyncPlan } from "./types";

export interface SyncWorkspaceOptions extends ResolvedSkillPaths {
  backupRoot?: string;
  dryRun?: boolean;
  pull?: boolean;
  publish?: boolean;
  remote?: string;
  branch?: string;
  message?: string;
}

export interface SyncWorkspaceResult {
  dryRun: boolean;
  pulled: boolean;
  pullOutput?: string;
  before: SyncPlan;
  after: SyncPlan;
  installed: InstallRepoSkillsResult;
  exported: ExportLocalOnlySkillsResult;
  published?: PublishSkillChangesResult;
  conflicts: string[];
}

export async function syncWorkspace(options: SyncWorkspaceOptions): Promise<SyncWorkspaceResult> {
  const before = await createSyncPlan(options);
  const conflicts = before.skills
    .filter((skill) => skill.classification === "changed-both")
    .map((skill) => skill.name);

  if (conflicts.length > 0) {
    return emptySyncResult(options, before, before, conflicts);
  }

  let pullOutput: string | undefined;

  if (options.pull !== false && !options.dryRun) {
    pullOutput = await pullRepository(options.repoRoot, {
      remote: options.remote,
      branch: options.branch
    });
  }

  const postPull = pullOutput ? await createSyncPlan(options) : before;
  const postPullConflicts = postPull.skills
    .filter((skill) => skill.classification === "changed-both")
    .map((skill) => skill.name);

  if (postPullConflicts.length > 0) {
    return emptySyncResult(options, before, postPull, postPullConflicts, pullOutput);
  }

  const installed = await installRepoSkills({
    ...options,
    backupRoot: options.backupRoot,
    dryRun: options.dryRun
  });
  const exported = await exportLocalOnlySkills({
    ...options,
    dryRun: options.dryRun
  });
  const exportedSkillNames = exported.exported.map((skill) => skill.skillName);
  const published = options.publish !== false && exportedSkillNames.length > 0 && !options.dryRun
    ? await publishSkillChanges(options.repoRoot, {
      skillNames: exportedSkillNames,
      message: options.message ?? "Sync skill updates",
      remote: options.remote,
      branch: options.branch
    })
    : undefined;
  const after = await createSyncPlan(options);

  return {
    dryRun: Boolean(options.dryRun),
    pulled: Boolean(pullOutput),
    pullOutput,
    before,
    after,
    installed,
    exported,
    published,
    conflicts: []
  };
}

function emptySyncResult(
  options: SyncWorkspaceOptions,
  before: SyncPlan,
  after: SyncPlan,
  conflicts: string[],
  pullOutput?: string
): SyncWorkspaceResult {
  return {
    dryRun: Boolean(options.dryRun),
    pulled: Boolean(pullOutput),
    pullOutput,
    before,
    after,
    installed: {
      dryRun: Boolean(options.dryRun),
      installed: [],
      skipped: []
    },
    exported: {
      dryRun: Boolean(options.dryRun),
      exported: [],
      skipped: []
    },
    conflicts
  };
}
