import { contextBridge, ipcRenderer } from "electron";
import type {
  ExportLocalOnlySkillsResult,
  GitStatus,
  PublishSkillChangesResult,
  ReplaceLocalSkillsResult,
  SyncPlan
} from "../../sync";

contextBridge.exposeInMainWorld("skillsync", {
  getStatus: (): Promise<SyncPlan> => ipcRenderer.invoke("sync:status"),
  exportLocalOnly: (): Promise<ExportLocalOnlySkillsResult> => ipcRenderer.invoke("sync:export-local-only"),
  replaceLocalFromRepo: (): Promise<ReplaceLocalSkillsResult> => ipcRenderer.invoke("sync:replace-local-from-repo"),
  getGitStatus: (): Promise<GitStatus> => ipcRenderer.invoke("git:status"),
  publishSkills: (skillNames: string[], message: string): Promise<PublishSkillChangesResult> =>
    ipcRenderer.invoke("git:publish-skills", { skillNames, message })
});
