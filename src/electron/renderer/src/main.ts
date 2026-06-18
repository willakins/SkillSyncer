import "./styles.css";
import type { AuthState, ConnectedOrganization, ConnectedRepo } from "../../../aws/types";
import type { ResolvedSkillSyncerSettings, SkillBackupSummary, SkillPlan, SyncPlan } from "../../../sync";

type AppView = "repos" | "dashboard" | "settings" | "backups";
type Appearance = "graphite" | "paper" | "midnight";

const APPEARANCE_STORAGE_KEY = "skillsyncer.appearance";
const APPEARANCE_LABELS: Record<Appearance, string> = {
  graphite: "Graphite",
  paper: "Paper",
  midnight: "Midnight"
};

const authView = getElement("auth-view");
const appFrame = getElement("app-frame");
const dashboardView = getElement("dashboard-view");
const reposView = getElement("repos-view");
const settingsView = getElement("settings-view");
const backupsView = getElement("backups-view");
const reposNavButton = getElement("repos-nav-button") as HTMLButtonElement;
const dashboardNavButton = getElement("dashboard-nav-button") as HTMLButtonElement;
const settingsNavButton = getElement("settings-nav-button") as HTMLButtonElement;
const backupsNavButton = getElement("backups-nav-button") as HTMLButtonElement;
const signOutButton = getElement("sign-out-button") as HTMLButtonElement;
const signInForm = getElement("sign-in-form") as HTMLFormElement;
const signInEmail = getElement("sign-in-email") as HTMLInputElement;
const signInPassword = getElement("sign-in-password") as HTMLInputElement;
const signUpForm = getElement("sign-up-form") as HTMLFormElement;
const signUpEmail = getElement("sign-up-email") as HTMLInputElement;
const signUpPassword = getElement("sign-up-password") as HTMLInputElement;
const confirmSignUpForm = getElement("confirm-sign-up-form") as HTMLFormElement;
const confirmSignUpEmail = getElement("confirm-sign-up-email") as HTMLInputElement;
const confirmSignUpCode = getElement("confirm-sign-up-code") as HTMLInputElement;
const forgotPasswordForm = getElement("forgot-password-form") as HTMLFormElement;
const forgotPasswordEmail = getElement("forgot-password-email") as HTMLInputElement;
const confirmForgotPasswordForm = getElement("confirm-forgot-password-form") as HTMLFormElement;
const forgotPasswordCode = getElement("forgot-password-code") as HTMLInputElement;
const forgotPasswordNewPassword = getElement("forgot-password-new-password") as HTMLInputElement;
const showSignUpButton = getElement("show-sign-up-button") as HTMLButtonElement;
const showForgotButton = getElement("show-forgot-button") as HTMLButtonElement;
const authStatus = getElement("auth-status");
const syncSummary = getElement("sync-summary");
const refreshCloudButton = getElement("refresh-cloud-button") as HTMLButtonElement;
const cloudSummary = getElement("cloud-summary");
const cloudStatus = getElement("cloud-status");
const repoCount = getElement("repo-count");
const organizationCount = getElement("organization-count");
const repoList = getElement("repo-list");
const organizationList = getElement("organization-list");
const sharedOnlyCount = getElement("shared-only-count");
const deviceOnlyCount = getElement("device-only-count");
const changedCount = getElement("changed-count");
const invalidCount = getElement("invalid-count");
const sameCount = getElement("same-count");
const differenceCount = getElement("difference-count");
const skillList = getElement("skill-list");
const refreshButton = getElement("refresh-button") as HTMLButtonElement;
const installButton = getElement("install-button") as HTMLButtonElement;
const exportButton = getElement("export-button") as HTMLButtonElement;
const replaceButton = getElement("replace-button") as HTMLButtonElement;
const useSharedButton = getElement("use-shared-button") as HTMLButtonElement;
const keepDeviceButton = getElement("keep-device-button") as HTMLButtonElement;
const installSummary = getElement("install-summary");
const exportSummary = getElement("export-summary");
const conflictSummary = getElement("conflict-summary");
const replaceSummary = getElement("replace-summary");
const actionStatus = getElement("action-status");
const libraryName = getElement("library-name");
const libraryState = getElement("library-state");
const libraryDescription = getElement("library-description");
const librarySkillMetadata = getElement("library-skill-metadata");
const sharedSkillList = getElement("shared-skill-list");
const deviceSkillList = getElement("device-skill-list");
const sharedListCount = getElement("shared-list-count");
const deviceListCount = getElement("device-list-count");
const sharedHeadingCount = getElement("shared-heading-count");
const deviceHeadingCount = getElement("device-heading-count");
const appearanceSummary = getElement("appearance-summary");
const appearanceButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-appearance-option]"));
const settingsForm = getElement("settings-form") as HTMLFormElement;
const libraryPathInput = getElement("library-path-input") as HTMLInputElement;
const localPathInput = getElement("local-path-input") as HTMLInputElement;
const backupPathInput = getElement("backup-path-input") as HTMLInputElement;
const gitRemoteInput = getElement("git-remote-input") as HTMLInputElement;
const gitBranchInput = getElement("git-branch-input") as HTMLInputElement;
const settingsFileSummary = getElement("settings-file-summary");
const settingsStatus = getElement("settings-status");
const settingsSaveButton = getElement("settings-save-button") as HTMLButtonElement;
const refreshBackupsButton = getElement("refresh-backups-button") as HTMLButtonElement;
const backupSummary = getElement("backup-summary");
const backupList = getElement("backup-list");

let currentPlan: SyncPlan | undefined;
let currentBackups: SkillBackupSummary[] = [];
let currentSettings: ResolvedSkillSyncerSettings | undefined;
let currentRepos: ConnectedRepo[] = [];
let currentOrganizations: ConnectedOrganization[] = [];
let busy = false;

applyAppearance(readAppearance());
showView("repos");

reposNavButton.addEventListener("click", () => {
  showView("repos");
});

dashboardNavButton.addEventListener("click", () => {
  showView("dashboard");
});

settingsNavButton.addEventListener("click", () => {
  showView("settings");
});

backupsNavButton.addEventListener("click", () => {
  showView("backups");
  void loadBackups();
});

signOutButton.addEventListener("click", () => {
  void signOut();
});

signInForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void signIn();
});

signUpForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void signUp();
});

confirmSignUpForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void confirmSignUp();
});

forgotPasswordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void sendPasswordReset();
});

confirmForgotPasswordForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void confirmPasswordReset();
});

showSignUpButton.addEventListener("click", () => {
  showAuthPanel("sign-up");
});

showForgotButton.addEventListener("click", () => {
  showAuthPanel("forgot");
});

for (const button of document.querySelectorAll<HTMLButtonElement>("[data-auth-target]")) {
  button.addEventListener("click", () => {
    showAuthPanel(button.dataset.authTarget ?? "sign-in");
  });
}

refreshButton.addEventListener("click", () => {
  void loadStatus();
});

refreshCloudButton.addEventListener("click", () => {
  void loadCloudWorkspace();
});

installButton.addEventListener("click", () => {
  void installSharedSkills();
});

exportButton.addEventListener("click", () => {
  void exportLocalOnlySkills();
});

useSharedButton.addEventListener("click", () => {
  void resolveConflicts("use-library");
});

keepDeviceButton.addEventListener("click", () => {
  void resolveConflicts("keep-device");
});

replaceButton.addEventListener("click", () => {
  void replaceLocalSkills();
});

refreshBackupsButton.addEventListener("click", () => {
  void loadBackups();
});

for (const button of appearanceButtons) {
  button.addEventListener("click", () => {
    applyAppearance(readAppearanceOption(button));
  });
}

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void saveSettings();
});

void initializeApp();

async function initializeApp(): Promise<void> {
  try {
    renderAuthState(await window.skillsync.getAuthState());
  } catch (error) {
    renderSignedOut(error instanceof Error ? error.message : String(error));
  }
}

function renderAuthState(state: AuthState): void {
  if (state.state === "signed-in") {
    authView.hidden = true;
    appFrame.hidden = false;
    cloudSummary.textContent = state.session.email
      ? `Signed in as ${state.session.email}`
      : `Signed in as ${state.session.username}`;
    showView("repos");
    void loadSettings();
    void loadCloudWorkspace();
    void loadStatus();
    void loadBackups();
    return;
  }

  renderSignedOut(state.state === "unconfigured" ? state.message : undefined);
}

function renderSignedOut(message?: string): void {
  appFrame.hidden = true;
  authView.hidden = false;
  showAuthPanel("sign-in");
  authStatus.textContent = message ?? "";
}

async function signIn(): Promise<void> {
  setAuthBusy(true);
  authStatus.textContent = "Signing in";

  try {
    const result = await window.skillsync.signIn({
      email: signInEmail.value,
      password: signInPassword.value
    });

    if (result.status === "signed-in") {
      signInPassword.value = "";
      renderAuthState({ state: "signed-in", session: result.session });
      return;
    }

    authStatus.textContent = result.status === "challenge"
      ? `Sign-in challenge is not implemented yet: ${result.challengeName}`
      : "Sign-in did not complete.";
  } catch (error) {
    authStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setAuthBusy(false);
  }
}

async function signUp(): Promise<void> {
  setAuthBusy(true);
  authStatus.textContent = "Creating account";

  try {
    await window.skillsync.signUp({
      email: signUpEmail.value,
      password: signUpPassword.value
    });
    confirmSignUpEmail.value = signUpEmail.value;
    signUpPassword.value = "";
    showAuthPanel("confirm");
    authStatus.textContent = "Check your email for the confirmation code.";
  } catch (error) {
    authStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setAuthBusy(false);
  }
}

async function confirmSignUp(): Promise<void> {
  setAuthBusy(true);
  authStatus.textContent = "Confirming account";

  try {
    await window.skillsync.confirmSignUp({
      email: confirmSignUpEmail.value,
      code: confirmSignUpCode.value
    });
    showAuthPanel("sign-in");
    signInEmail.value = confirmSignUpEmail.value;
    authStatus.textContent = "Account confirmed. Sign in to continue.";
  } catch (error) {
    authStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setAuthBusy(false);
  }
}

async function sendPasswordReset(): Promise<void> {
  setAuthBusy(true);
  authStatus.textContent = "Sending reset code";

  try {
    await window.skillsync.forgotPassword(forgotPasswordEmail.value);
    authStatus.textContent = "Check your email for the reset code.";
  } catch (error) {
    authStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setAuthBusy(false);
  }
}

async function confirmPasswordReset(): Promise<void> {
  setAuthBusy(true);
  authStatus.textContent = "Setting new password";

  try {
    await window.skillsync.confirmForgotPassword({
      email: forgotPasswordEmail.value,
      code: forgotPasswordCode.value,
      password: forgotPasswordNewPassword.value
    });
    forgotPasswordNewPassword.value = "";
    showAuthPanel("sign-in");
    signInEmail.value = forgotPasswordEmail.value;
    authStatus.textContent = "Password updated. Sign in to continue.";
  } catch (error) {
    authStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setAuthBusy(false);
  }
}

async function signOut(): Promise<void> {
  await window.skillsync.signOut();
  currentRepos = [];
  currentOrganizations = [];
  renderSignedOut();
}

async function loadCloudWorkspace(): Promise<void> {
  setBusy(true);
  cloudStatus.textContent = "Loading cloud libraries";
  repoList.replaceChildren(emptyState("Loading repos"));
  organizationList.replaceChildren(emptyState("Loading organizations"));

  try {
    const [repos, organizations] = await Promise.all([
      window.skillsync.listCloudRepos(),
      window.skillsync.listCloudOrganizations()
    ]);

    currentRepos = repos;
    currentOrganizations = organizations;
    renderCloudWorkspace();
    cloudStatus.textContent = "";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    cloudStatus.textContent = message;
    repoList.replaceChildren(emptyState(message));
    organizationList.replaceChildren(emptyState(message));
  } finally {
    setBusy(false);
  }
}

function renderCloudWorkspace(): void {
  repoCount.textContent = `${currentRepos.length} ${currentRepos.length === 1 ? "repo" : "repos"}`;
  organizationCount.textContent = `${currentOrganizations.length} ${currentOrganizations.length === 1 ? "organization" : "organizations"}`;
  repoList.replaceChildren(...(currentRepos.length ? currentRepos.map(renderRepoCard) : [emptyState("No connected repos found")]));
  organizationList.replaceChildren(...(currentOrganizations.length ? currentOrganizations.map(renderOrganizationCard) : [emptyState("No organizations found")]));
}

async function loadSettings(): Promise<void> {
  try {
    currentSettings = await window.skillsync.getSettings();
    renderSettings(currentSettings);
  } catch (error) {
    settingsStatus.textContent = error instanceof Error ? error.message : String(error);
  }
}

async function loadStatus(): Promise<void> {
  setBusy(true);
  skillList.replaceChildren(emptyState("Loading status"));

  try {
    const plan = await window.skillsync.getStatus();

    currentPlan = plan;
    renderPlan(plan);
    renderControls();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    skillList.replaceChildren(emptyState(message));
  } finally {
    setBusy(false);
  }
}

async function loadBackups(): Promise<void> {
  setBusy(true);
  backupList.replaceChildren(emptyState("Loading backups"));

  try {
    currentBackups = await window.skillsync.listBackups();
    renderBackups();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    backupList.replaceChildren(emptyState(message));
  } finally {
    setBusy(false);
  }
}

function renderPlan(plan: SyncPlan): void {
  const sharedSkills = plan.skills.filter((skill) => skill.repo).sort(sortSkills);
  const deviceSkills = plan.skills.filter((skill) => skill.local).sort(sortSkills);
  const notableSkills = plan.skills.filter((skill) => skill.classification !== "same");

  syncSummary.textContent = `${sharedSkills.length} shared ${sharedSkills.length === 1 ? "skill" : "skills"} and ${deviceSkills.length} on this device`;
  sharedOnlyCount.textContent = String(plan.totals["repo-only"]);
  deviceOnlyCount.textContent = String(plan.totals["local-only"]);
  changedCount.textContent = String(plan.totals["changed-both"]);
  invalidCount.textContent = String(plan.totals["invalid-skill-directory"]);
  sameCount.textContent = String(plan.totals.same);
  differenceCount.textContent = `${notableSkills.length} ${notableSkills.length === 1 ? "difference" : "differences"}`;
  renderLibraryMetadata(plan);
  renderInventory(sharedSkills, deviceSkills);

  if (notableSkills.length === 0) {
    skillList.replaceChildren(emptyState("No differences found"));
    return;
  }

  skillList.replaceChildren(...notableSkills.map(renderDifference));
}

function renderLibraryMetadata(plan: SyncPlan): void {
  const manifest = plan.library?.manifest;

  if (!plan.library?.valid) {
    libraryName.textContent = "Invalid Library Manifest";
    libraryState.textContent = "Needs review";
    libraryDescription.textContent = plan.library?.errors.join(" ") || "The library manifest could not be read.";
    librarySkillMetadata.textContent = "Plain folder discovery remains available.";
    return;
  }

  if (!manifest) {
    libraryName.textContent = "Plain Skill Folder";
    libraryState.textContent = "No manifest";
    libraryDescription.textContent = "No library manifest loaded.";
    librarySkillMetadata.textContent = "0 recommended skills, 0 optional skills";
    return;
  }

  const skillMetadata = Object.values(manifest.skills);
  const recommendedCount = skillMetadata.filter((skill) => skill.visibility === "recommended").length;
  const optionalCount = skillMetadata.filter((skill) => skill.visibility === "optional").length;
  const tags = [...new Set(skillMetadata.flatMap((skill) => skill.tags))].sort();

  libraryName.textContent = manifest.name;
  libraryState.textContent = plan.library.path ?? "Manifest loaded";
  libraryDescription.textContent = manifest.description ?? "No description provided.";
  librarySkillMetadata.textContent = [
    `${recommendedCount} recommended ${recommendedCount === 1 ? "skill" : "skills"}`,
    `${optionalCount} optional ${optionalCount === 1 ? "skill" : "skills"}`,
    tags.length > 0 ? `tags: ${tags.join(", ")}` : "no tags"
  ].join(", ");
}

function renderInventory(sharedSkills: SkillPlan[], deviceSkills: SkillPlan[]): void {
  sharedListCount.textContent = String(sharedSkills.length);
  deviceListCount.textContent = String(deviceSkills.length);
  sharedHeadingCount.textContent = `${sharedSkills.length} ${sharedSkills.length === 1 ? "skill" : "skills"}`;
  deviceHeadingCount.textContent = `${deviceSkills.length} ${deviceSkills.length === 1 ? "skill" : "skills"}`;
  sharedSkillList.replaceChildren(...renderSkillTable(sharedSkills, "No shared skills found"));
  deviceSkillList.replaceChildren(...renderSkillTable(deviceSkills, "No device skills found"));
}

async function installSharedSkills(): Promise<void> {
  setBusy(true);
  actionStatus.textContent = "Installing shared-only skills on this device";

  try {
    const result = await window.skillsync.installShared();
    actionStatus.textContent = `Installed ${result.installed.length} shared ${result.installed.length === 1 ? "skill" : "skills"} on this device.`;
    await loadStatus();
  } catch (error) {
    actionStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setBusy(false);
    renderControls();
  }
}

async function exportLocalOnlySkills(): Promise<void> {
  setBusy(true);
  actionStatus.textContent = "Sharing device-only skills";

  try {
    const result = await window.skillsync.exportLocalOnly();
    actionStatus.textContent = `Shared ${result.exported.length} ${result.exported.length === 1 ? "skill" : "skills"} from this device.`;
    await loadStatus();
  } catch (error) {
    actionStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setBusy(false);
    renderControls();
  }
}

async function resolveConflicts(action: "use-library" | "keep-device"): Promise<void> {
  setBusy(true);
  actionStatus.textContent = action === "use-library"
    ? "Replacing conflicted device skills with shared versions"
    : "Replacing conflicted shared skills with device versions";

  try {
    const result = await window.skillsync.resolveConflicts(action);
    const changedCount = result.installed?.installed.length ?? result.exported.length;
    actionStatus.textContent = `Resolved ${changedCount} ${changedCount === 1 ? "conflict" : "conflicts"}.`;
    await loadStatus();
    await loadBackups();
  } catch (error) {
    actionStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setBusy(false);
    renderControls();
  }
}

async function saveSettings(): Promise<void> {
  setBusy(true);
  settingsStatus.textContent = "Saving settings";

  try {
    currentSettings = await window.skillsync.saveSettings({
      librarySkillsPath: libraryPathInput.value,
      localSkillsPath: localPathInput.value,
      backupPath: backupPathInput.value,
      gitRemote: gitRemoteInput.value,
      gitBranch: gitBranchInput.value
    });
    renderSettings(currentSettings);
    settingsStatus.textContent = "Settings saved.";
    await loadStatus();
    await loadBackups();
  } catch (error) {
    settingsStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setBusy(false);
    renderControls();
  }
}

async function replaceLocalSkills(): Promise<void> {
  setBusy(true);
  actionStatus.textContent = "Resetting this device from the shared library";

  try {
    const result = await window.skillsync.replaceLocalFromRepo();
    actionStatus.textContent = `Loaded ${result.imported.length} shared ${result.imported.length === 1 ? "skill" : "skills"} after replacing ${result.removedLocalSkillNames.length} device ${result.removedLocalSkillNames.length === 1 ? "skill" : "skills"}.`;
    await loadStatus();
    await loadBackups();
  } catch (error) {
    actionStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setBusy(false);
    renderControls();
  }
}

async function restoreBackup(backupPath: string): Promise<void> {
  setBusy(true);
  actionStatus.textContent = "Restoring this device from backup";

  try {
    const result = await window.skillsync.restoreBackup(backupPath);
    actionStatus.textContent = `Restored ${result.restoredSkillNames.length} ${result.restoredSkillNames.length === 1 ? "skill" : "skills"} from backup after replacing ${result.removedLocalSkillNames.length} current device ${result.removedLocalSkillNames.length === 1 ? "skill" : "skills"}.`;
    await loadStatus();
    await loadBackups();
  } catch (error) {
    actionStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setBusy(false);
    renderControls();
  }
}

function renderControls(): void {
  const sharedOnlyCountValue = currentPlan?.totals["repo-only"] ?? 0;
  const localOnlyCountValue = currentPlan?.totals["local-only"] ?? 0;
  const conflictCountValue = currentPlan?.totals["changed-both"] ?? 0;
  const sharedSkillCount = currentPlan?.skills.filter((skill) => skill.repo?.valid).length ?? 0;
  installSummary.textContent = `${sharedOnlyCountValue} shared-only ${sharedOnlyCountValue === 1 ? "skill" : "skills"}`;
  installButton.disabled = busy || sharedOnlyCountValue === 0;
  exportSummary.textContent = `${localOnlyCountValue} device-only ${localOnlyCountValue === 1 ? "skill" : "skills"}`;
  exportButton.textContent = `Share ${localOnlyCountValue} device-only ${localOnlyCountValue === 1 ? "skill" : "skills"}`;
  exportButton.disabled = busy || localOnlyCountValue === 0;
  conflictSummary.textContent = `${conflictCountValue} changed ${conflictCountValue === 1 ? "skill" : "skills"}`;
  useSharedButton.disabled = busy || conflictCountValue === 0;
  keepDeviceButton.disabled = busy || conflictCountValue === 0;
  replaceSummary.textContent = `${sharedSkillCount} shared ${sharedSkillCount === 1 ? "skill" : "skills"}`;
  replaceButton.disabled = busy || sharedSkillCount === 0;
  refreshBackupsButton.disabled = busy;
  settingsSaveButton.disabled = busy;

  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-restore-backup-path]")) {
    button.disabled = busy;
  }
}

function renderSettings(settings: ResolvedSkillSyncerSettings): void {
  settingsFileSummary.textContent = settings.settingsPath;
  libraryPathInput.value = settings.repoRoot;
  localPathInput.value = settings.localRoot;
  backupPathInput.value = settings.backupRoot;
  gitRemoteInput.value = settings.gitRemote ?? "";
  gitBranchInput.value = settings.gitBranch ?? "";
}

function renderBackups(): void {
  backupSummary.textContent = `${currentBackups.length} ${currentBackups.length === 1 ? "backup" : "backups"}`;

  if (currentBackups.length === 0) {
    backupList.replaceChildren(emptyState("No backups are currently saved."));
    renderControls();
    return;
  }

  backupList.replaceChildren(...currentBackups.map(renderBackupCard));
  renderControls();
}

function renderBackupCard(backup: SkillBackupSummary): HTMLElement {
  const card = document.createElement("article");
  const header = document.createElement("div");
  const titleGroup = document.createElement("div");
  const title = document.createElement("h3");
  const meta = document.createElement("p");
  const restoreButton = document.createElement("button");
  const skillList = document.createElement("ul");
  const invalidText = backup.invalidSkillCount > 0
    ? `, ${backup.invalidSkillCount} invalid ${backup.invalidSkillCount === 1 ? "item" : "items"}`
    : "";

  card.className = "backup-card";
  header.className = "backup-card-header";
  title.textContent = backup.name;
  meta.textContent = `${formatDate(backup.modifiedAt)} - ${backup.skillCount} valid ${backup.skillCount === 1 ? "skill" : "skills"}${invalidText}`;
  restoreButton.className = "button danger-button";
  restoreButton.type = "button";
  restoreButton.textContent = "Restore from backup";
  restoreButton.dataset.restoreBackupPath = backup.path;
  restoreButton.addEventListener("click", () => {
    void restoreBackup(backup.path);
  });
  skillList.className = "backup-skill-list";

  if (backup.skillNames.length === 0) {
    const item = document.createElement("li");
    item.textContent = "No valid skills saved in this backup.";
    skillList.append(item);
  } else {
    for (const skillName of backup.skillNames) {
      const item = document.createElement("li");
      item.textContent = skillName;
      skillList.append(item);
    }
  }

  titleGroup.append(title, meta);
  header.append(titleGroup, restoreButton);
  card.append(header, skillList);

  return card;
}

function renderRepoCard(repo: ConnectedRepo): HTMLElement {
  const card = document.createElement("article");
  const header = document.createElement("div");
  const titleGroup = document.createElement("div");
  const title = document.createElement("h3");
  const meta = document.createElement("p");
  const cloneUrl = document.createElement("p");
  const openButton = document.createElement("button");

  card.className = "cloud-card";
  header.className = "backup-card-header";
  title.textContent = repo.displayName;
  meta.textContent = [
    repo.provider,
    repo.defaultBranch ? `branch: ${repo.defaultBranch}` : undefined,
    repo.orgId ? `org: ${repo.orgId}` : undefined
  ].filter(Boolean).join(" - ");
  cloneUrl.textContent = repo.cloneUrl;
  openButton.className = "button primary-button";
  openButton.type = "button";
  openButton.textContent = "Open workspace";
  openButton.disabled = !repo.capabilities.canRead;
  openButton.addEventListener("click", () => {
    cloudStatus.textContent = `${repo.displayName} selected. Clone or open this repo locally, then configure its skills path in Settings.`;
    showView("dashboard");
  });

  titleGroup.append(title, meta, cloneUrl);
  header.append(titleGroup, openButton);
  card.append(header, capabilityList(repo.capabilities));

  return card;
}

function renderOrganizationCard(organization: ConnectedOrganization): HTMLElement {
  const card = document.createElement("article");
  const title = document.createElement("h3");
  const meta = document.createElement("p");

  card.className = "cloud-card";
  title.textContent = organization.displayName;
  meta.textContent = `${organization.role} - ${organization.repoCount} ${organization.repoCount === 1 ? "repo" : "repos"}`;
  card.append(title, meta);

  return card;
}

function capabilityList(capabilities: ConnectedRepo["capabilities"]): HTMLElement {
  const list = document.createElement("ul");
  const entries = [
    ["Install", capabilities.canInstall],
    ["Export", capabilities.canExport],
    ["Publish", capabilities.canPublish],
    ["Replace local", capabilities.canReplaceLocal]
  ];

  list.className = "capability-list";

  for (const [label, enabled] of entries) {
    const item = document.createElement("li");
    item.textContent = `${label}: ${enabled ? "allowed" : "disabled"}`;
    list.append(item);
  }

  return list;
}

function showView(view: AppView): void {
  reposView.hidden = view !== "repos";
  dashboardView.hidden = view !== "dashboard";
  settingsView.hidden = view !== "settings";
  backupsView.hidden = view !== "backups";
  reposNavButton.setAttribute("aria-current", view === "repos" ? "page" : "false");
  dashboardNavButton.setAttribute("aria-current", view === "dashboard" ? "page" : "false");
  settingsNavButton.setAttribute("aria-current", view === "settings" ? "page" : "false");
  backupsNavButton.setAttribute("aria-current", view === "backups" ? "page" : "false");
}

function showAuthPanel(panelName: string): void {
  for (const panel of document.querySelectorAll<HTMLElement>("[data-auth-panel]")) {
    panel.hidden = true;
  }

  const target = document.getElementById(`auth-${panelName}-panel`) ?? document.getElementById("auth-sign-in-panel");

  if (target) {
    target.hidden = false;
  }
}

function setAuthBusy(value: boolean): void {
  for (const input of authView.querySelectorAll<HTMLInputElement | HTMLButtonElement>("input, button")) {
    input.disabled = value;
  }
}

function applyAppearance(appearance: Appearance): void {
  document.body.dataset.appearance = appearance;
  localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance);
  appearanceSummary.textContent = APPEARANCE_LABELS[appearance];

  for (const button of appearanceButtons) {
    const active = readAppearanceOption(button) === appearance;
    button.setAttribute("aria-checked", String(active));
  }
}

function readAppearance(): Appearance {
  const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
  return isAppearance(stored) ? stored : "graphite";
}

function readAppearanceOption(button: HTMLButtonElement): Appearance {
  const value = button.dataset.appearanceOption;
  return isAppearance(value) ? value : "graphite";
}

function isAppearance(value: unknown): value is Appearance {
  return value === "graphite" || value === "paper" || value === "midnight";
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function setBusy(value: boolean): void {
  busy = value;
  refreshButton.disabled = value;
  refreshCloudButton.disabled = value;
  renderControls();
}

function renderDifference(skill: SkillPlan): HTMLElement {
  const row = document.createElement("article");
  const details = document.createElement("div");
  const name = document.createElement("h3");
  const meta = document.createElement("p");
  const badge = document.createElement("span");

  row.className = "difference-row";
  name.textContent = skill.name;
  meta.textContent = `${skill.fileChanges.length} ${skill.fileChanges.length === 1 ? "change" : "changes"}`;
  if (skill.metadata) {
    meta.textContent = `${meta.textContent}, ${skill.metadata.visibility}${skill.metadata.tags.length ? `, ${skill.metadata.tags.join(", ")}` : ""}`;
  }
  badge.className = `status-badge status-${skill.classification}`;
  badge.textContent = labelFor(skill.classification);

  details.append(name, meta);
  row.append(details, badge);

  return row;
}

function renderSkillTable(skills: SkillPlan[], emptyMessage: string): HTMLElement[] {
  if (skills.length === 0) {
    return [emptyState(emptyMessage)];
  }

  return skills.map((skill) => {
    const row = document.createElement("div");
    const name = document.createElement("span");
    const files = document.createElement("span");
    const badge = document.createElement("span");

    row.className = "skill-table-row";
    name.textContent = skill.name;
    files.textContent = skill.metadata?.visibility ?? `${skill.fileChanges.length} ${skill.fileChanges.length === 1 ? "change" : "changes"}`;
    badge.className = `status-badge status-${skill.classification}`;
    badge.textContent = labelFor(skill.classification);
    row.append(name, files, badge);

    return row;
  });
}

function sortSkills(left: SkillPlan, right: SkillPlan): number {
  return left.name.localeCompare(right.name);
}

function emptyState(message: string): HTMLElement {
  const state = document.createElement("div");
  state.className = "empty-state";
  state.textContent = message;
  return state;
}

function labelFor(classification: SkillPlan["classification"]): string {
  switch (classification) {
    case "repo-only":
      return "Shared only";
    case "local-only":
      return "Device only";
    case "changed-both":
      return "Changed";
    case "invalid-skill-directory":
      return "Invalid";
    case "same":
      return "Same";
  }
}

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }

  return element;
}
