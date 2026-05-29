import type {
  ExportLocalOnlySkillsResult,
  GitStatus,
  PublishSkillChangesResult,
  ReplaceLocalSkillsResult,
  SyncPlan
} from "../../sync";

declare global {
  interface Window {
    skillsync: {
      getStatus: () => Promise<SyncPlan>;
      exportLocalOnly: () => Promise<ExportLocalOnlySkillsResult>;
      replaceLocalFromRepo: () => Promise<ReplaceLocalSkillsResult>;
      getGitStatus: () => Promise<GitStatus>;
      publishSkills: (skillNames: string[], message: string) => Promise<PublishSkillChangesResult>;
    };
  }
}

export {};
