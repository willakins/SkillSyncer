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

declare global {
  interface Window {
    skillsync: {
      getAuthState: () => Promise<AuthState>;
      signUp: (request: SignUpRequest) => Promise<AuthResult>;
      confirmSignUp: (request: ConfirmSignUpRequest) => Promise<AuthResult>;
      signIn: (request: SignInRequest) => Promise<AuthResult>;
      forgotPassword: (email: string) => Promise<AuthResult>;
      confirmForgotPassword: (request: ConfirmForgotPasswordRequest) => Promise<AuthResult>;
      signOut: () => Promise<AuthState>;
      listCloudRepos: () => Promise<ConnectedRepo[]>;
      listCloudOrganizations: () => Promise<ConnectedOrganization[]>;
      listCloudOrganizationRepos: (orgId: string) => Promise<ConnectedRepo[]>;
      getStatus: () => Promise<SyncPlan>;
      exportLocalOnly: () => Promise<ExportLocalOnlySkillsResult>;
      installShared: () => Promise<InstallRepoSkillsResult>;
      resolveConflicts: (action: "use-library" | "keep-device") => Promise<ResolveSkillConflictsResult>;
      replaceLocalFromRepo: () => Promise<ReplaceLocalSkillsResult>;
      listBackups: () => Promise<SkillBackupSummary[]>;
      restoreBackup: (backupPath: string) => Promise<RestoreLocalSkillsFromBackupResult>;
      getSettings: () => Promise<ResolvedSkillSyncerSettings>;
      saveSettings: (settings: Partial<SkillSyncerSettings>) => Promise<ResolvedSkillSyncerSettings>;
    };
  }
}

export {};
