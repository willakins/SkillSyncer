import type {
  ExportLocalSkillsResult,
  ReplaceLocalSkillsResult,
  RestoreLocalSkillsFromBackupResult,
  SkillBackupSummary,
  SyncPlan
} from "../../sync";

declare global {
  interface Window {
    skillsync: {
      getStatus: () => Promise<SyncPlan>;
      exportLocalChanges: () => Promise<ExportLocalSkillsResult>;
      replaceLocalFromRepo: () => Promise<ReplaceLocalSkillsResult>;
      listBackups: () => Promise<SkillBackupSummary[]>;
      restoreBackup: (backupPath: string) => Promise<RestoreLocalSkillsFromBackupResult>;
    };
  }
}

export {};
