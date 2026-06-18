import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { join } from "node:path";
import { CloudApiClient } from "../../aws/api";
import { CognitoAuthService, publicSession } from "../../aws/auth";
import { loadAwsAppConfig } from "../../aws/config";
import type { AuthResult, AuthSession, AuthState, AwsAppConfig } from "../../aws/types";
import {
  createSyncPlan,
  exportLocalOnlySkills,
  installRepoSkills,
  listSkillBackups,
  loadSettings,
  replaceLocalSkillsFromRepo,
  resolveConfiguredSkillPaths,
  resolveInputPath,
  resolveSkillConflicts,
  restoreLocalSkillsFromBackup,
  type ConflictResolutionAction,
  saveSettings,
  type SkillSyncerSettings
} from "../../sync";
import { AuthSessionStore } from "./auth-store";

const currentDir = __dirname;
const authSessionStore = new AuthSessionStore();
let awsContextPromise: Promise<AwsContext> | undefined;

interface AwsContext {
  config: AwsAppConfig;
  auth: CognitoAuthService;
  api: CloudApiClient;
}

app.disableHardwareAcceleration();

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 920,
    minHeight: 640,
    title: "SkillSyncer",
    webPreferences: {
      preload: join(currentDir, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;

  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl);
  } else {
    void mainWindow.loadFile(join(currentDir, "../renderer/index.html"));
  }
}

ipcMain.handle("auth:get-state", async (): Promise<AuthState> => {
  return getAuthState();
});

ipcMain.handle("auth:sign-up", async (_event, payload: unknown): Promise<AuthResult> => {
  const context = await loadAwsContext();
  const request = parseEmailPasswordPayload(payload);

  await context.auth.signUp(request);

  return {
    status: "confirmation-required",
    email: request.email
  };
});

ipcMain.handle("auth:confirm-sign-up", async (_event, payload: unknown): Promise<AuthResult> => {
  const context = await loadAwsContext();
  const request = parseEmailCodePayload(payload);

  await context.auth.confirmSignUp(request);

  return {
    status: "code-sent",
    email: request.email
  };
});

ipcMain.handle("auth:sign-in", async (_event, payload: unknown): Promise<AuthResult> => {
  const context = await loadAwsContext();
  const result = await context.auth.signIn(parseEmailPasswordPayload(payload));

  if ("challengeName" in result) {
    return {
      status: "challenge",
      challengeName: result.challengeName,
      session: result.session
    };
  }

  await authSessionStore.save(result);

  return {
    status: "signed-in",
    session: publicSession(result)
  };
});

ipcMain.handle("auth:forgot-password", async (_event, payload: unknown): Promise<AuthResult> => {
  const context = await loadAwsContext();
  const email = parseEmailPayload(payload);

  await context.auth.forgotPassword({ email });

  return {
    status: "code-sent",
    email
  };
});

ipcMain.handle("auth:confirm-forgot-password", async (_event, payload: unknown): Promise<AuthResult> => {
  const context = await loadAwsContext();
  const request = parseConfirmForgotPasswordPayload(payload);

  await context.auth.confirmForgotPassword(request);

  return {
    status: "code-sent",
    email: request.email
  };
});

ipcMain.handle("auth:sign-out", async (): Promise<AuthState> => {
  await authSessionStore.clear();
  return { state: "signed-out" };
});

ipcMain.handle("cloud:list-repos", async () => {
  const { api } = await loadAwsContext();
  const session = await requireSession();

  return api.listRepos(session.accessToken);
});

ipcMain.handle("cloud:list-organizations", async () => {
  const { api } = await loadAwsContext();
  const session = await requireSession();

  return api.listOrganizations(session.accessToken);
});

ipcMain.handle("cloud:list-organization-repos", async (_event, payload: unknown) => {
  const { api } = await loadAwsContext();
  const session = await requireSession();
  const orgId = parseRequiredString(payload, "orgId");

  return api.listOrganizationRepos(session.accessToken, orgId);
});

ipcMain.handle("sync:status", async () => {
  const config = await resolveConfiguredSkillPaths();
  return createSyncPlan(syncPaths(config));
});

ipcMain.handle("sync:export-local-only", async () => {
  const config = await resolveConfiguredSkillPaths();
  return exportLocalOnlySkills(syncPaths(config));
});

ipcMain.handle("sync:install-shared", async () => {
  const config = await resolveConfiguredSkillPaths();
  return installRepoSkills({
    ...syncPaths(config),
    backupRoot: config.backupRoot
  });
});

ipcMain.handle("sync:replace-local-from-repo", async () => {
  const config = await resolveConfiguredSkillPaths();
  const paths = syncPaths(config);
  const plan = await createSyncPlan(paths);
  const localCount = plan.skills.filter((skill) => skill.local).length;
  const repoCount = plan.skills.filter((skill) => skill.repo?.valid).length;
  const response = await dialog.showMessageBox({
    type: "warning",
    buttons: ["Cancel", "Back up and reset"],
    defaultId: 0,
    cancelId: 0,
    title: "Reset Device Skills",
    message: "Reset this device from the shared library?",
    detail: [
      `This will back up ${localCount} device ${localCount === 1 ? "skill" : "skills"}, clear the current device skills, then load ${repoCount} shared ${repoCount === 1 ? "skill" : "skills"}.`,
      "Device-only changes will only be recoverable from the backup."
    ].join("\n\n")
  });

  if (response.response !== 1) {
    throw new Error("Replace canceled.");
  }

  return replaceLocalSkillsFromRepo({
    ...paths,
    backupRoot: config.backupRoot
  });
});

ipcMain.handle("sync:resolve-conflicts", async (_event, payload: unknown) => {
  const config = await resolveConfiguredSkillPaths();
  const paths = syncPaths(config);
  const action = parseConflictPayload(payload);
  const plan = await createSyncPlan(paths);
  const conflictCount = plan.skills.filter((skill) => skill.classification === "changed-both").length;
  const response = await dialog.showMessageBox({
    type: "warning",
    buttons: ["Cancel", action === "use-library" ? "Use shared versions" : "Keep device versions"],
    defaultId: 0,
    cancelId: 0,
    title: "Resolve Skill Conflicts",
    message: action === "use-library"
      ? "Replace conflicted device skills with shared versions?"
      : "Replace conflicted shared skills with device versions?",
    detail: [
      `This will resolve ${conflictCount} changed ${conflictCount === 1 ? "skill" : "skills"}.`,
      action === "use-library"
        ? "Current device versions will be backed up before they are replaced."
        : "Current shared versions will be backed up before they are replaced."
    ].join("\n\n")
  });

  if (response.response !== 1) {
    throw new Error("Conflict resolution canceled.");
  }

  return resolveSkillConflicts({
    ...paths,
    action,
    backupRoot: config.backupRoot
  });
});

ipcMain.handle("sync:list-backups", async () => {
  const config = await resolveConfiguredSkillPaths();
  return listSkillBackups({
    localRoot: config.localRoot,
    backupRoot: config.backupRoot
  });
});

ipcMain.handle("sync:restore-backup", async (_event, payload: unknown) => {
  const config = await resolveConfiguredSkillPaths();
  const paths = syncPaths(config);
  const backupPath = parseRestorePayload(payload);
  const backups = await listSkillBackups({
    localRoot: paths.localRoot,
    backupRoot: config.backupRoot
  });
  const backup = backups.find((candidate) => candidate.path === backupPath);
  const plan = await createSyncPlan(paths);
  const localCount = plan.skills.filter((skill) => skill.local).length;
  const restoreCount = backup?.skillCount ?? 0;
  const response = await dialog.showMessageBox({
    type: "warning",
    buttons: ["Cancel", "Back up and restore"],
    defaultId: 0,
    cancelId: 0,
    title: "Restore Device Skills Backup",
    message: "Restore this device from the selected backup?",
    detail: [
      `This will back up ${localCount} current device ${localCount === 1 ? "skill" : "skills"}, clear the current device skills, then restore ${restoreCount} ${restoreCount === 1 ? "skill" : "skills"} from the selected backup.`
    ].join("\n\n")
  });

  if (response.response !== 1) {
    throw new Error("Restore canceled.");
  }

  return restoreLocalSkillsFromBackup({
    localRoot: paths.localRoot,
    backupPath,
    backupRoot: config.backupRoot
  });
});

ipcMain.handle("settings:get", async () => {
  return resolveConfiguredSkillPaths();
});

ipcMain.handle("settings:save", async (_event, payload: unknown) => {
  const config = await resolveConfiguredSkillPaths();
  const currentSettings = await loadSettings(config.settingsPath);
  const patch = parseSettingsPayload(payload);

  await saveSettings({
    ...currentSettings,
    ...patch,
    schemaVersion: 1
  }, config.settingsPath);

  return resolveConfiguredSkillPaths({ settingsPath: config.settingsPath });
});

function syncPaths(config: { repoRoot: string; localRoot: string }): { repoRoot: string; localRoot: string } {
  return {
    repoRoot: config.repoRoot,
    localRoot: config.localRoot
  };
}

async function loadAwsContext(): Promise<AwsContext> {
  awsContextPromise ??= loadAwsAppConfig().then((config) => ({
    config,
    auth: new CognitoAuthService(config),
    api: new CloudApiClient(config)
  }));

  return awsContextPromise;
}

async function getAuthState(): Promise<AuthState> {
  try {
    const session = await loadFreshSession();

    return session
      ? { state: "signed-in", session: publicSession(session) }
      : { state: "signed-out" };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("AWS is not configured.")) {
      return {
        state: "unconfigured",
        message: error.message
      };
    }

    throw error;
  }
}

async function requireSession(): Promise<AuthSession> {
  const session = await loadFreshSession();

  if (!session) {
    throw new Error("Sign in before loading cloud repositories.");
  }

  return session;
}

async function loadFreshSession(): Promise<AuthSession | undefined> {
  const session = await authSessionStore.load();

  if (!session) {
    return undefined;
  }

  if (new Date(session.expiresAt).getTime() > Date.now() + 60_000) {
    return session;
  }

  if (!session.refreshToken) {
    await authSessionStore.clear();
    return undefined;
  }

  const { auth } = await loadAwsContext();
  const refreshed = await auth.refresh(session.refreshToken);

  await authSessionStore.save({
    ...refreshed,
    username: refreshed.username || session.username,
    email: refreshed.email || session.email,
    refreshToken: refreshed.refreshToken ?? session.refreshToken
  });

  return authSessionStore.load();
}

function parseRestorePayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new Error("Restore request must include a selected backup.");
  }

  const { backupPath } = payload as { backupPath?: unknown };

  if (typeof backupPath !== "string" || backupPath.trim() === "") {
    throw new Error("Restore request must include a selected backup.");
  }

  return backupPath;
}

function parseConflictPayload(payload: unknown): ConflictResolutionAction {
  if (!payload || typeof payload !== "object") {
    throw new Error("Conflict resolution request must include an action.");
  }

  const { action } = payload as { action?: unknown };

  if (action === "use-library" || action === "keep-device") {
    return action;
  }

  throw new Error("Conflict resolution action must be use-library or keep-device.");
}

function parseSettingsPayload(payload: unknown): Partial<SkillSyncerSettings> {
  if (!payload || typeof payload !== "object") {
    throw new Error("Settings request must include path settings.");
  }

  const record = payload as Record<string, unknown>;
  const patch: Partial<SkillSyncerSettings> = {};

  if ("librarySkillsPath" in record) {
    patch.librarySkillsPath = optionalResolvedPath(record.librarySkillsPath);
  }

  if ("localSkillsPath" in record) {
    patch.localSkillsPath = optionalResolvedPath(record.localSkillsPath);
  }

  if ("backupPath" in record) {
    patch.backupPath = optionalResolvedPath(record.backupPath);
  }

  if ("gitRemote" in record) {
    patch.gitRemote = optionalString(record.gitRemote);
  }

  if ("gitBranch" in record) {
    patch.gitBranch = optionalString(record.gitBranch);
  }

  return patch;
}

function parseEmailPasswordPayload(payload: unknown): { email: string; password: string } {
  return {
    email: parseRequiredString(payload, "email"),
    password: parseRequiredString(payload, "password")
  };
}

function parseEmailCodePayload(payload: unknown): { email: string; code: string } {
  return {
    email: parseRequiredString(payload, "email"),
    code: parseRequiredString(payload, "code")
  };
}

function parseEmailPayload(payload: unknown): string {
  return parseRequiredString(payload, "email");
}

function parseConfirmForgotPasswordPayload(payload: unknown): { email: string; code: string; password: string } {
  return {
    email: parseRequiredString(payload, "email"),
    code: parseRequiredString(payload, "code"),
    password: parseRequiredString(payload, "password")
  };
}

function parseRequiredString(payload: unknown, key: string): string {
  if (!payload || typeof payload !== "object") {
    throw new Error(`Request must include ${key}.`);
  }

  const value = (payload as Record<string, unknown>)[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Request must include ${key}.`);
  }

  return value.trim();
}

function optionalResolvedPath(value: unknown): string | undefined {
  const input = optionalString(value);

  return input ? resolveInputPath(input) : undefined;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error("Settings values must be strings.");
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : undefined;
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
