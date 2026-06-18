export const SKILL_MANIFEST_FILE = "SKILL.md";
export const LIBRARY_MANIFEST_FILE = "skillsyncer.json";

export type SkillClassification =
  | "repo-only"
  | "local-only"
  | "same"
  | "changed-both"
  | "invalid-skill-directory";

export type FileChangeType = "repo-only" | "local-only" | "different";

export interface ResolvedSkillPaths {
  repoRoot: string;
  localRoot: string;
}

export type LibrarySkillVisibility = "recommended" | "optional" | "hidden";

export interface LibrarySkillMetadata {
  description?: string;
  tags: string[];
  visibility: LibrarySkillVisibility;
}

export interface LibraryManifest {
  schemaVersion: 1;
  name: string;
  description?: string;
  skillsPath: string;
  skills: Record<string, LibrarySkillMetadata>;
}

export interface LibraryManifestSummary {
  path?: string;
  valid: boolean;
  errors: string[];
  manifest?: LibraryManifest;
}

export interface SkillFileSnapshot {
  relativePath: string;
  hash: string;
  size: number;
}

export interface SkillSnapshot {
  name: string;
  rootPath: string;
  valid: boolean;
  missingManifest: boolean;
  files: SkillFileSnapshot[];
}

export interface SkillFileChange {
  relativePath: string;
  changeType: FileChangeType;
}

export interface SkillPlan {
  name: string;
  classification: SkillClassification;
  repo?: SkillSnapshot;
  local?: SkillSnapshot;
  metadata?: LibrarySkillMetadata;
  fileChanges: SkillFileChange[];
}

export interface SyncPlan {
  repoRoot: string;
  localRoot: string;
  library?: LibraryManifestSummary;
  skills: SkillPlan[];
  totals: Record<SkillClassification, number>;
}
