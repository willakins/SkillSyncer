import { contextBridge, ipcRenderer } from "electron";
import type {
  ExportLocalSkillsResult,
  ReplaceLocalSkillsResult,
  RestoreLocalSkillsFromBackupResult,
  SkillBackupSummary,
  SyncPlan
} from "../../sync";

contextBridge.exposeInMainWorld("skillsync", {
  getStatus: (): Promise<SyncPlan> => ipcRenderer.invoke("sync:status"),
  exportLocalChanges: (): Promise<ExportLocalSkillsResult> => ipcRenderer.invoke("sync:export-local-changes"),
  replaceLocalFromRepo: (): Promise<ReplaceLocalSkillsResult> => ipcRenderer.invoke("sync:replace-local-from-repo"),
  listBackups: (): Promise<SkillBackupSummary[]> => ipcRenderer.invoke("sync:list-backups"),
  restoreBackup: (backupPath: string): Promise<RestoreLocalSkillsFromBackupResult> =>
    ipcRenderer.invoke("sync:restore-backup", { backupPath })
});
