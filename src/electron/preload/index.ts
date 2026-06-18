import { contextBridge, ipcRenderer } from "electron";
import type {
  AuthResult,
  AuthState,
  ConfirmForgotPasswordRequest,
  ConfirmSignUpRequest,
  ConnectedOrganization,
  ConnectedRepo,
  SignInRequest,
  SignUpRequest
} from "../../aws/types";
import type {
  ExportLocalOnlySkillsResult,
  InstallRepoSkillsResult,
  ReplaceLocalSkillsResult,
  ResolveSkillConflictsResult,
  ResolvedSkillSyncerSettings,
  RestoreLocalSkillsFromBackupResult,
  SkillBackupSummary,
  SkillSyncerSettings,
  SyncPlan
} from "../../sync";

contextBridge.exposeInMainWorld("skillsync", {
  getAuthState: (): Promise<AuthState> => ipcRenderer.invoke("auth:get-state"),
  signUp: (request: SignUpRequest): Promise<AuthResult> => ipcRenderer.invoke("auth:sign-up", request),
  confirmSignUp: (request: ConfirmSignUpRequest): Promise<AuthResult> =>
    ipcRenderer.invoke("auth:confirm-sign-up", request),
  signIn: (request: SignInRequest): Promise<AuthResult> => ipcRenderer.invoke("auth:sign-in", request),
  forgotPassword: (email: string): Promise<AuthResult> => ipcRenderer.invoke("auth:forgot-password", { email }),
  confirmForgotPassword: (request: ConfirmForgotPasswordRequest): Promise<AuthResult> =>
    ipcRenderer.invoke("auth:confirm-forgot-password", request),
  signOut: (): Promise<AuthState> => ipcRenderer.invoke("auth:sign-out"),
  listCloudRepos: (): Promise<ConnectedRepo[]> => ipcRenderer.invoke("cloud:list-repos"),
  listCloudOrganizations: (): Promise<ConnectedOrganization[]> => ipcRenderer.invoke("cloud:list-organizations"),
  listCloudOrganizationRepos: (orgId: string): Promise<ConnectedRepo[]> =>
    ipcRenderer.invoke("cloud:list-organization-repos", { orgId }),
  getStatus: (): Promise<SyncPlan> => ipcRenderer.invoke("sync:status"),
  exportLocalOnly: (): Promise<ExportLocalOnlySkillsResult> => ipcRenderer.invoke("sync:export-local-only"),
  installShared: (): Promise<InstallRepoSkillsResult> => ipcRenderer.invoke("sync:install-shared"),
  resolveConflicts: (action: "use-library" | "keep-device"): Promise<ResolveSkillConflictsResult> =>
    ipcRenderer.invoke("sync:resolve-conflicts", { action }),
  replaceLocalFromRepo: (): Promise<ReplaceLocalSkillsResult> => ipcRenderer.invoke("sync:replace-local-from-repo"),
  listBackups: (): Promise<SkillBackupSummary[]> => ipcRenderer.invoke("sync:list-backups"),
  restoreBackup: (backupPath: string): Promise<RestoreLocalSkillsFromBackupResult> =>
    ipcRenderer.invoke("sync:restore-backup", { backupPath }),
  getSettings: (): Promise<ResolvedSkillSyncerSettings> => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings: Partial<SkillSyncerSettings>): Promise<ResolvedSkillSyncerSettings> =>
    ipcRenderer.invoke("settings:save", settings)
});
