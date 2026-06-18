export interface AwsAppConfig {
  region: string;
  userPoolId: string;
  userPoolClientId: string;
  apiBaseUrl: string;
}

export interface AuthSession {
  username: string;
  email?: string;
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
}

export interface PublicAuthSession {
  username: string;
  email?: string;
  expiresAt: string;
}

export type AuthState =
  | { state: "unconfigured"; message: string }
  | { state: "signed-out" }
  | { state: "signed-in"; session: PublicAuthSession };

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest extends SignInRequest {}

export interface ConfirmSignUpRequest {
  email: string;
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ConfirmForgotPasswordRequest {
  email: string;
  code: string;
  password: string;
}

export type AuthResult =
  | { status: "signed-in"; session: PublicAuthSession }
  | { status: "challenge"; challengeName: string; session?: string }
  | { status: "confirmation-required"; email: string }
  | { status: "code-sent"; email: string };

export interface ConnectedRepo {
  repoId: string;
  displayName: string;
  cloneUrl: string;
  provider: "github" | "gitlab" | "self-hosted" | "other";
  defaultBranch?: string;
  orgId?: string;
  capabilities: RepoCapabilities;
}

export interface RepoCapabilities {
  canRead: boolean;
  canInstall: boolean;
  canExport: boolean;
  canPublish: boolean;
  canReplaceLocal: boolean;
}

export interface ConnectedOrganization {
  orgId: string;
  displayName: string;
  role: "owner" | "admin" | "maintainer" | "member" | "viewer";
  repoCount: number;
}
