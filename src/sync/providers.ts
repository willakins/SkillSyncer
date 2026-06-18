import { readSkillTree } from "./compare";
import { copySkillDirectory, type CopySkillResult } from "./copy";
import {
  getRepositoryStatus,
  pullRepository,
  publishSkillChanges,
  type PublishSkillChangesOptions,
  type PublishSkillChangesResult,
  type RepositoryStatus
} from "./git";
import type { SkillSnapshot } from "./types";

export type LibraryProviderType = "local-directory" | "git";

export interface LibraryProvider {
  id: string;
  type: LibraryProviderType;
  displayName: string;
  skillsRoot: string;
  resolveLocalCache: () => Promise<string>;
  refresh: () => Promise<void>;
  readSkillTree: () => Promise<Map<string, SkillSnapshot>>;
  exportSkill: (skillName: string, options?: LibraryProviderExportOptions) => Promise<CopySkillResult>;
  getStatus?: () => Promise<RepositoryStatus>;
  publish?: (options: PublishSkillChangesOptions) => Promise<PublishSkillChangesResult>;
}

export interface LibraryProviderExportOptions {
  sourceRoot: string;
  dryRun?: boolean;
  overwrite?: boolean;
}

export interface LocalDirectoryProviderOptions {
  id?: string;
  displayName?: string;
  skillsRoot: string;
}

export interface GitLibraryProviderOptions extends LocalDirectoryProviderOptions {
  remote?: string;
  branch?: string;
}

export function createLocalDirectoryProvider(options: LocalDirectoryProviderOptions): LibraryProvider {
  return {
    id: options.id ?? "local-library",
    type: "local-directory",
    displayName: options.displayName ?? "Local skill library",
    skillsRoot: options.skillsRoot,
    resolveLocalCache: async () => options.skillsRoot,
    refresh: async () => undefined,
    readSkillTree: () => readSkillTree(options.skillsRoot),
    exportSkill: (skillName, exportOptions) => copySkillDirectory({
      sourceRoot: requiredSourceRoot(exportOptions),
      targetRoot: options.skillsRoot,
      skillName,
      dryRun: exportOptions?.dryRun,
      overwrite: exportOptions?.overwrite
    })
  };
}

export function createGitLibraryProvider(options: GitLibraryProviderOptions): LibraryProvider {
  const localProvider = createLocalDirectoryProvider({
    id: options.id ?? "git-library",
    displayName: options.displayName ?? "Git skill library",
    skillsRoot: options.skillsRoot
  });

  return {
    ...localProvider,
    type: "git",
    refresh: async () => {
      await pullRepository(options.skillsRoot, {
        remote: options.remote,
        branch: options.branch
      });
    },
    getStatus: () => getRepositoryStatus(options.skillsRoot),
    publish: (publishOptions) => publishSkillChanges(options.skillsRoot, {
      ...publishOptions,
      remote: publishOptions.remote ?? options.remote,
      branch: publishOptions.branch ?? options.branch
    })
  };
}

function requiredSourceRoot(options?: LibraryProviderExportOptions): string {
  if (!options?.sourceRoot) {
    throw new Error("Library export requires a source skill directory.");
  }

  return options.sourceRoot;
}
