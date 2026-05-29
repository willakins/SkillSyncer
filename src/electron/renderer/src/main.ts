import "./styles.css";
import type { GitStatus, SkillPlan, SyncPlan } from "../../../sync";

const pathSummary = getElement("path-summary");
const repoOnlyCount = getElement("repo-only-count");
const localOnlyCount = getElement("local-only-count");
const changedCount = getElement("changed-count");
const invalidCount = getElement("invalid-count");
const sameCount = getElement("same-count");
const skillList = getElement("skill-list");
const refreshButton = getElement("refresh-button") as HTMLButtonElement;
const exportButton = getElement("export-button") as HTMLButtonElement;
const replaceButton = getElement("replace-button") as HTMLButtonElement;
const publishButton = getElement("publish-button") as HTMLButtonElement;
const commitMessageInput = getElement("commit-message") as HTMLInputElement;
const exportSummary = getElement("export-summary");
const replaceSummary = getElement("replace-summary");
const gitSummary = getElement("git-summary");
const actionStatus = getElement("action-status");
const repoSkillList = getElement("repo-skill-list");
const localSkillList = getElement("local-skill-list");
const repoListCount = getElement("repo-list-count");
const localListCount = getElement("local-list-count");

let currentPlan: SyncPlan | undefined;
let currentGitStatus: GitStatus | undefined;
let lastExportedSkillNames: string[] = [];
let busy = false;

refreshButton.addEventListener("click", () => {
  void loadStatus();
});

exportButton.addEventListener("click", () => {
  void exportLocalOnlySkills();
});

replaceButton.addEventListener("click", () => {
  void replaceLocalSkills();
});

publishButton.addEventListener("click", () => {
  void publishExportedSkills();
});

void loadStatus();

async function loadStatus(): Promise<void> {
  setBusy(true);
  skillList.replaceChildren(emptyState("Loading status"));

  try {
    const [plan, gitStatus] = await Promise.all([
      window.skillsync.getStatus(),
      window.skillsync.getGitStatus().catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        gitSummary.textContent = message;
        return undefined;
      })
    ]);

    currentPlan = plan;
    currentGitStatus = gitStatus;
    renderPlan(plan);
    renderGitStatus(gitStatus);
    renderControls();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    skillList.replaceChildren(emptyState(message));
  } finally {
    setBusy(false);
  }
}

function renderPlan(plan: SyncPlan): void {
  pathSummary.textContent = `${plan.repoRoot} -> ${plan.localRoot}`;
  repoOnlyCount.textContent = String(plan.totals["repo-only"]);
  localOnlyCount.textContent = String(plan.totals["local-only"]);
  changedCount.textContent = String(plan.totals["changed-both"]);
  invalidCount.textContent = String(plan.totals["invalid-skill-directory"]);
  sameCount.textContent = `${plan.totals.same} unchanged`;
  renderInventory(plan);

  const notableSkills = plan.skills.filter((skill) => skill.classification !== "same");

  if (notableSkills.length === 0) {
    skillList.replaceChildren(emptyState("No differences found"));
    return;
  }

  skillList.replaceChildren(...notableSkills.map(renderSkill));
}

function renderInventory(plan: SyncPlan): void {
  const repoSkills = plan.skills.filter((skill) => skill.repo).sort(sortSkills);
  const localSkills = plan.skills.filter((skill) => skill.local).sort(sortSkills);

  repoListCount.textContent = `${repoSkills.length} ${repoSkills.length === 1 ? "skill" : "skills"}`;
  localListCount.textContent = `${localSkills.length} ${localSkills.length === 1 ? "skill" : "skills"}`;
  repoSkillList.replaceChildren(...renderCompactSkillList(repoSkills, "No repository skills found"));
  localSkillList.replaceChildren(...renderCompactSkillList(localSkills, "No local skills found"));
}

async function exportLocalOnlySkills(): Promise<void> {
  setBusy(true);
  actionStatus.textContent = "Exporting local-only skills";

  try {
    const result = await window.skillsync.exportLocalOnly();
    lastExportedSkillNames = result.exported.map((skill) => skill.skillName);
    actionStatus.textContent = `Exported ${result.exported.length} ${result.exported.length === 1 ? "skill" : "skills"} to the repository.`;
    await loadStatus();
  } catch (error) {
    actionStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setBusy(false);
    renderControls();
  }
}

async function publishExportedSkills(): Promise<void> {
  setBusy(true);
  actionStatus.textContent = "Committing and pushing exported skills";

  try {
    const result = await window.skillsync.publishSkills(lastExportedSkillNames, commitMessageInput.value);

    if (result.committed && result.pushed) {
      actionStatus.textContent = `Committed and pushed ${result.skillNames.length} ${result.skillNames.length === 1 ? "skill" : "skills"}.`;
      lastExportedSkillNames = [];
    } else {
      actionStatus.textContent = result.commitOutput;
    }

    await loadStatus();
  } catch (error) {
    actionStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setBusy(false);
    renderControls();
  }
}

async function replaceLocalSkills(): Promise<void> {
  setBusy(true);
  actionStatus.textContent = "Replacing local skills from repository";

  try {
    const result = await window.skillsync.replaceLocalFromRepo();
    const backupNote = result.backupPath ? ` Backup: ${result.backupPath}` : "";
    actionStatus.textContent = `Imported ${result.imported.length} repository ${result.imported.length === 1 ? "skill" : "skills"} after removing ${result.removedLocalSkillNames.length} local ${result.removedLocalSkillNames.length === 1 ? "skill" : "skills"}.${backupNote}`;
    await loadStatus();
  } catch (error) {
    actionStatus.textContent = error instanceof Error ? error.message : String(error);
  } finally {
    setBusy(false);
    renderControls();
  }
}

function renderControls(): void {
  const localOnlyCountValue = currentPlan?.totals["local-only"] ?? 0;
  const repoSkillCount = currentPlan?.skills.filter((skill) => skill.repo?.valid).length ?? 0;
  exportSummary.textContent = `${localOnlyCountValue} local-only ${localOnlyCountValue === 1 ? "skill" : "skills"}`;
  exportButton.textContent = `Export ${localOnlyCountValue} local-only ${localOnlyCountValue === 1 ? "skill" : "skills"}`;
  exportButton.disabled = busy || localOnlyCountValue === 0;
  replaceSummary.textContent = `${repoSkillCount} repository ${repoSkillCount === 1 ? "skill" : "skills"}`;
  replaceButton.disabled = busy || repoSkillCount === 0;

  publishButton.textContent = lastExportedSkillNames.length > 0
    ? `Commit and push ${lastExportedSkillNames.length}`
    : "Commit and push";
  publishButton.disabled = busy || lastExportedSkillNames.length === 0;
}

function renderGitStatus(status: GitStatus | undefined): void {
  if (!status) {
    return;
  }

  currentGitStatus = status;
  const changeCount = status.entries.length;
  gitSummary.textContent = `${status.branchLine} - ${changeCount} skill ${changeCount === 1 ? "change" : "changes"}`;
}

function setBusy(value: boolean): void {
  busy = value;
  refreshButton.disabled = value;
  renderControls();
}

function renderSkill(skill: SkillPlan): HTMLElement {
  const row = document.createElement("article");
  row.className = "skill-row";

  const details = document.createElement("div");
  const name = document.createElement("h3");
  const meta = document.createElement("p");
  const badge = document.createElement("span");

  name.textContent = skill.name;
  meta.textContent = `${skill.fileChanges.length} file ${skill.fileChanges.length === 1 ? "change" : "changes"}`;
  badge.className = `status-badge status-${skill.classification}`;
  badge.textContent = labelFor(skill.classification);

  details.append(name, meta);
  row.append(details, badge);

  return row;
}

function renderCompactSkillList(skills: SkillPlan[], emptyMessage: string): HTMLElement[] {
  if (skills.length === 0) {
    return [compactEmptyState(emptyMessage)];
  }

  return skills.map((skill) => {
    const row = document.createElement("div");
    const name = document.createElement("span");
    const badge = document.createElement("span");

    row.className = "compact-row";
    name.textContent = skill.name;
    badge.className = `status-badge status-${skill.classification}`;
    badge.textContent = labelFor(skill.classification);
    row.append(name, badge);

    return row;
  });
}

function compactEmptyState(message: string): HTMLElement {
  const state = document.createElement("div");
  state.className = "compact-empty";
  state.textContent = message;
  return state;
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
      return "Repo only";
    case "local-only":
      return "Local only";
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
