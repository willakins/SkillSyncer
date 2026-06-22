import "./styles.css";
import type { ShareLocalSkillsResult, SkillBackupSummary, SkillPlan, SyncPlan } from "../../../sync";

type AppView = "dashboard" | "settings" | "backups";
type Appearance = "graphite" | "paper" | "midnight";

const APPEARANCE_STORAGE_KEY = "skillsyncer.appearance";
const APPEARANCE_LABELS: Record<Appearance, string> = {
  graphite: "Graphite",
  paper: "Paper",
  midnight: "Midnight"
};

const dashboardView = getElement("dashboard-view");
const settingsView = getElement("settings-view");
const backupsView = getElement("backups-view");
const dashboardNavButton = getElement("dashboard-nav-button") as HTMLButtonElement;
const settingsNavButton = getElement("settings-nav-button") as HTMLButtonElement;
const backupsNavButton = getElement("backups-nav-button") as HTMLButtonElement;
const syncSummary = getElement("sync-summary");
const sharedOnlyCount = getElement("shared-only-count");
const deviceOnlyCount = getElement("device-only-count");
const changedCount = getElement("changed-count");
const invalidCount = getElement("invalid-count");
const sameCount = getElement("same-count");
const differenceCount = getElement("difference-count");
const skillList = getElement("skill-list");
const refreshButton = getElement("refresh-button") as HTMLButtonElement;
const exportButton = getElement("export-button") as HTMLButtonElement;
const replaceButton = getElement("replace-button") as HTMLButtonElement;
const exportSummary = getElement("export-summary");
const replaceSummary = getElement("replace-summary");
const actionStatus = getElement("action-status");
const confirmationModal = getElement("confirmation-modal");
const confirmationTitle = getElement("confirmation-title");
const confirmationDetail = getElement("confirmation-detail");
const confirmationCancelButton = getElement("confirmation-cancel-button") as HTMLButtonElement;
const confirmationConfirmButton = getElement("confirmation-confirm-button") as HTMLButtonElement;
const sharedSkillList = getElement("shared-skill-list");
const deviceSkillList = getElement("device-skill-list");
const sharedListCount = getElement("shared-list-count");
const deviceListCount = getElement("device-list-count");
const sharedHeadingCount = getElement("shared-heading-count");
const deviceHeadingCount = getElement("device-heading-count");
const appearanceSummary = getElement("appearance-summary");
const appearanceButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-appearance-option]"));
const refreshBackupsButton = getElement("refresh-backups-button") as HTMLButtonElement;
const backupSummary = getElement("backup-summary");
const backupList = getElement("backup-list");

let currentPlan: SyncPlan | undefined;
let currentBackups: SkillBackupSummary[] = [];
let busy = false;
let busyDepth = 0;
let pendingConfirmation: ((confirmed: boolean) => void) | undefined;
let previouslyFocusedElement: HTMLElement | undefined;

applyAppearance(readAppearance());
showView("dashboard");

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

refreshButton.addEventListener("click", () => {
  void loadStatus();
});

exportButton.addEventListener("click", () => {
  void exportLocalChanges();
});

replaceButton.addEventListener("click", () => {
  void replaceLocalSkills();
});

refreshBackupsButton.addEventListener("click", () => {
  void loadBackups();
});

confirmationCancelButton.addEventListener("click", () => {
  resolveConfirmation(false);
});

confirmationConfirmButton.addEventListener("click", () => {
  resolveConfirmation(true);
});

document.addEventListener("keydown", (event) => {
  if (!confirmationModal.hidden && event.key === "Escape") {
    resolveConfirmation(false);
  }
});

for (const button of appearanceButtons) {
  button.addEventListener("click", () => {
    applyAppearance(readAppearanceOption(button));
  });
}

void loadStatus();
void loadBackups();

async function loadStatus(options: { showBusy?: boolean } = {}): Promise<void> {
  const showBusy = options.showBusy ?? true;

  if (showBusy) {
    setBusy(true);
    skillList.replaceChildren(emptyState("Loading status"));
  }

  try {
    const plan = await window.skillsync.getStatus();

    currentPlan = plan;
    renderPlan(plan);
    renderControls();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    skillList.replaceChildren(emptyState(message));
  } finally {
    if (showBusy) {
      setBusy(false);
    }
  }
}

async function loadBackups(options: { showBusy?: boolean } = {}): Promise<void> {
  const showBusy = options.showBusy ?? true;

  if (showBusy) {
    setBusy(true);
    backupList.replaceChildren(emptyState("Loading backups"));
  }

  try {
    currentBackups = await window.skillsync.listBackups();
    renderBackups();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    backupList.replaceChildren(emptyState(message));
  } finally {
    if (showBusy) {
      setBusy(false);
    }
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
  renderInventory(sharedSkills, deviceSkills);

  if (notableSkills.length === 0) {
    skillList.replaceChildren(emptyState("No differences found"));
    return;
  }

  skillList.replaceChildren(...notableSkills.map(renderDifference));
}

function renderInventory(sharedSkills: SkillPlan[], deviceSkills: SkillPlan[]): void {
  sharedListCount.textContent = String(sharedSkills.length);
  deviceListCount.textContent = String(deviceSkills.length);
  sharedHeadingCount.textContent = `${sharedSkills.length} ${sharedSkills.length === 1 ? "skill" : "skills"}`;
  deviceHeadingCount.textContent = `${deviceSkills.length} ${deviceSkills.length === 1 ? "skill" : "skills"}`;
  sharedSkillList.replaceChildren(...renderSkillTable(sharedSkills, "No shared skills found"));
  deviceSkillList.replaceChildren(...renderSkillTable(deviceSkills, "No device skills found"));
}

async function exportLocalChanges(): Promise<void> {
  if (!currentPlan) {
    await loadStatus();
  }

  if (!currentPlan) {
    return;
  }

  const newCount = currentPlan.totals["local-only"];
  const changedCount = currentPlan.totals["changed-both"];

  if (newCount + changedCount > 0) {
    const confirmed = await confirmShareChanges(newCount, changedCount);

    if (!confirmed) {
      actionStatus.textContent = "Share canceled.";
      return;
    }
  }

  setBusy(true);
  actionStatus.textContent = "Sharing and publishing device skill changes";

  try {
    const result = await window.skillsync.exportLocalChanges();
    const created = result.exported.filter((skill) => skill.operation === "create").length;
    const updated = result.exported.filter((skill) => skill.operation === "update").length;
    const publishStatus = formatPublishStatus(result.publish);
    actionStatus.textContent = result.exported.length > 0
      ? `Shared ${result.exported.length} ${result.exported.length === 1 ? "skill" : "skills"} from this device (${created} new, ${updated} changed). ${publishStatus}`
      : publishStatus;
  } catch (error) {
    actionStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    await loadStatus({ showBusy: false });
    setBusy(false);
    renderControls();
  }
}

function confirmShareChanges(newCount: number, changedCount: number): Promise<boolean> {
  closeOpenConfirmation();
  previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
  confirmationTitle.textContent = "Share and publish device changes?";
  confirmationDetail.textContent = `This will copy ${newCount} new device ${newCount === 1 ? "skill" : "skills"}, replace ${changedCount} existing shared ${changedCount === 1 ? "skill" : "skills"} with the versions on this device, then commit and push those shared skill changes.`;
  confirmationConfirmButton.textContent = "Share and publish";
  confirmationModal.hidden = false;
  confirmationCancelButton.focus();

  return new Promise((resolve) => {
    pendingConfirmation = resolve;
  });
}

function resolveConfirmation(confirmed: boolean): void {
  const resolve = pendingConfirmation;

  if (!resolve) {
    return;
  }

  pendingConfirmation = undefined;
  confirmationModal.hidden = true;
  previouslyFocusedElement?.focus();
  previouslyFocusedElement = undefined;
  resolve(confirmed);
}

function closeOpenConfirmation(): void {
  if (pendingConfirmation) {
    resolveConfirmation(false);
  }
}

async function replaceLocalSkills(): Promise<void> {
  setBusy(true);
  actionStatus.textContent = "Resetting this device from the shared library";

  try {
    const result = await window.skillsync.replaceLocalFromRepo();
    actionStatus.textContent = `Loaded ${result.imported.length} shared ${result.imported.length === 1 ? "skill" : "skills"} after replacing ${result.removedLocalSkillNames.length} device ${result.removedLocalSkillNames.length === 1 ? "skill" : "skills"}.`;
    await loadStatus({ showBusy: false });
    await loadBackups({ showBusy: false });
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
    await loadStatus({ showBusy: false });
    await loadBackups({ showBusy: false });
  } catch (error) {
    actionStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setBusy(false);
    renderControls();
  }
}

function renderControls(): void {
  const localOnlyCountValue = currentPlan?.totals["local-only"] ?? 0;
  const changedCountValue = currentPlan?.totals["changed-both"] ?? 0;
  const exportableCount = localOnlyCountValue + changedCountValue;
  const sharedSkillCount = currentPlan?.skills.filter((skill) => skill.repo?.valid).length ?? 0;
  exportSummary.textContent = `${localOnlyCountValue} new, ${changedCountValue} changed`;
  exportButton.textContent = exportableCount > 0
    ? `Share ${exportableCount} device ${exportableCount === 1 ? "change" : "changes"}`
    : "Publish shared changes";
  exportButton.disabled = busy || (exportableCount === 0 && sharedSkillCount === 0);
  replaceSummary.textContent = `${sharedSkillCount} shared ${sharedSkillCount === 1 ? "skill" : "skills"}`;
  replaceButton.disabled = busy || sharedSkillCount === 0;
  refreshBackupsButton.disabled = busy;

  for (const button of document.querySelectorAll<HTMLButtonElement>("[data-restore-backup-path]")) {
    button.disabled = busy;
  }
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

function showView(view: AppView): void {
  dashboardView.hidden = view !== "dashboard";
  settingsView.hidden = view !== "settings";
  backupsView.hidden = view !== "backups";
  dashboardNavButton.setAttribute("aria-current", view === "dashboard" ? "page" : "false");
  settingsNavButton.setAttribute("aria-current", view === "settings" ? "page" : "false");
  backupsNavButton.setAttribute("aria-current", view === "backups" ? "page" : "false");
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
  busyDepth = value ? busyDepth + 1 : Math.max(0, busyDepth - 1);
  busy = busyDepth > 0;
  refreshButton.disabled = busy;
  renderControls();
}

function formatPublishStatus(publish: ShareLocalSkillsResult["publish"]): string {
  if (!publish) {
    return "No pending device or shared skill changes to publish.";
  }

  if (!publish.committed) {
    return publish.commitOutput;
  }

  const skillCount = publish.skillNames.length;
  return publish.pushed
    ? `Committed and pushed ${skillCount} shared ${skillCount === 1 ? "skill" : "skills"} to the shared repository.`
    : `Committed ${skillCount} shared ${skillCount === 1 ? "skill" : "skills"} locally, but push did not run.`;
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
    files.textContent = `${skill.fileChanges.length} ${skill.fileChanges.length === 1 ? "change" : "changes"}`;
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
