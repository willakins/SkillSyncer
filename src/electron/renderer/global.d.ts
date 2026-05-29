import type {
  ExportLocalOnlySkillsResult,
  ReplaceLocalSkillsResult,
  RestoreLocalSkillsFromBackupResult,
  SkillBackupSummary,
  SyncPlan
} from "../../sync";

declare global {
  interface Window {
    skillsync: {
      getStatus: () => Promise<SyncPlan>;
      exportLocalOnly: () => Promise<ExportLocalOnlySkillsResult>;
      replaceLocalFromRepo: () => Promise<ReplaceLocalSkillsResult>;
      listBackups: () => Promise<SkillBackupSummary[]>;
      restoreBackup: (backupPath: string) => Promise<RestoreLocalSkillsFromBackupResult>;
    };
  }
}

export {};
