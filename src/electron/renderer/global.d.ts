import type {
  ReplaceLocalSkillsResult,
  RestoreLocalSkillsFromBackupResult,
  ShareLocalSkillsResult,
  SkillBackupSummary,
  SyncPlan
} from "../../sync";

declare global {
  interface Window {
    skillsync: {
      getStatus: () => Promise<SyncPlan>;
      exportLocalChanges: () => Promise<ShareLocalSkillsResult>;
      replaceLocalFromRepo: () => Promise<ReplaceLocalSkillsResult>;
      listBackups: () => Promise<SkillBackupSummary[]>;
      restoreBackup: (backupPath: string) => Promise<RestoreLocalSkillsFromBackupResult>;
    };
  }
}

export {};
