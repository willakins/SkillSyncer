import { contextBridge, ipcRenderer } from "electron";
import type {
  ReplaceLocalSkillsResult,
  RestoreLocalSkillsFromBackupResult,
  ShareLocalSkillsResult,
  SkillBackupSummary,
  SyncPlan
} from "../../sync";

contextBridge.exposeInMainWorld("skillsync", {
  getStatus: (): Promise<SyncPlan> => ipcRenderer.invoke("sync:status"),
  exportLocalChanges: (): Promise<ShareLocalSkillsResult> => ipcRenderer.invoke("sync:export-local-changes"),
  replaceLocalFromRepo: (): Promise<ReplaceLocalSkillsResult> => ipcRenderer.invoke("sync:replace-local-from-repo"),
  listBackups: (): Promise<SkillBackupSummary[]> => ipcRenderer.invoke("sync:list-backups"),
  restoreBackup: (backupPath: string): Promise<RestoreLocalSkillsFromBackupResult> =>
    ipcRenderer.invoke("sync:restore-backup", { backupPath })
});
