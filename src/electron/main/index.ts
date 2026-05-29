import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { join } from "node:path";
import {
  createSyncPlan,
  exportLocalOnlySkills,
  getGitStatus,
  publishSkillChanges,
  replaceLocalSkillsFromRepo,
  resolveSkillPaths
} from "../../sync";

const currentDir = __dirname;

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

ipcMain.handle("sync:status", async () => {
  const paths = resolveSkillPaths();
  return createSyncPlan(paths);
});

ipcMain.handle("sync:export-local-only", async () => {
  const paths = resolveSkillPaths();
  return exportLocalOnlySkills(paths);
});

ipcMain.handle("sync:replace-local-from-repo", async () => {
  const paths = resolveSkillPaths();
  const plan = await createSyncPlan(paths);
  const localCount = plan.skills.filter((skill) => skill.local).length;
  const repoCount = plan.skills.filter((skill) => skill.repo?.valid).length;
  const response = await dialog.showMessageBox({
    type: "warning",
    buttons: ["Cancel", "Back up and replace"],
    defaultId: 0,
    cancelId: 0,
    title: "Replace Local Skills",
    message: "Replace all local skills with repository skills?",
    detail: [
      `This will back up ${localCount} local ${localCount === 1 ? "skill" : "skills"}, delete the local skills directory, then import ${repoCount} repository ${repoCount === 1 ? "skill" : "skills"}.`,
      "Changed or local-only skills will only be recoverable from the backup."
    ].join("\n\n")
  });

  if (response.response !== 1) {
    throw new Error("Replace canceled.");
  }

  return replaceLocalSkillsFromRepo(paths);
});

ipcMain.handle("git:status", async () => {
  const paths = resolveSkillPaths();
  return getGitStatus(paths.repoRoot, ["."]);
});

ipcMain.handle("git:publish-skills", async (_event, payload: unknown) => {
  const paths = resolveSkillPaths();
  const { skillNames, message } = parsePublishPayload(payload);

  return publishSkillChanges(paths.repoRoot, {
    skillNames,
    message
  });
});

function parsePublishPayload(payload: unknown): { skillNames: string[]; message: string } {
  if (!payload || typeof payload !== "object") {
    throw new Error("Publish request must include skill names and a commit message.");
  }

  const { skillNames, message } = payload as { skillNames?: unknown; message?: unknown };

  if (!Array.isArray(skillNames) || !skillNames.every((skillName) => typeof skillName === "string")) {
    throw new Error("Publish request skill names must be strings.");
  }

  if (typeof message !== "string") {
    throw new Error("Publish request commit message must be a string.");
  }

  return { skillNames, message };
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
