import { contextBridge, ipcRenderer } from "electron";
import type {
  ExportLocalOnlySkillsResult,
  ReplaceLocalSkillsResult,
  RestoreLocalSkillsFromBackupResult,
  SkillBackupSummary,
  SyncPlan
} from "../../sync";

contextBridge.exposeInMainWorld("skillsync", {
  getStatus: (): Promise<SyncPlan> => ipcRenderer.invoke("sync:status"),
  exportLocalOnly: (): Promise<ExportLocalOnlySkillsResult> => ipcRenderer.invoke("sync:export-local-only"),
  replaceLocalFromRepo: (): Promise<ReplaceLocalSkillsResult> => ipcRenderer.invoke("sync:replace-local-from-repo"),
  listBackups: (): Promise<SkillBackupSummary[]> => ipcRenderer.invoke("sync:list-backups"),
  restoreBackup: (backupPath: string): Promise<RestoreLocalSkillsFromBackupResult> =>
    ipcRenderer.invoke("sync:restore-backup", { backupPath })
});
