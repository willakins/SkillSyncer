import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  type IpcMainInvokeEvent,
  type MessageBoxOptions,
  type MessageBoxReturnValue
} from "electron";
import { join } from "node:path";
import {
  createSyncPlan,
  exportLocalSkills,
  listSkillBackups,
  replaceLocalSkillsFromRepo,
  restoreLocalSkillsFromBackup,
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

ipcMain.handle("sync:export-local-changes", async () => {
  const paths = resolveSkillPaths();
  return exportLocalSkills({ ...paths, includeChanged: true });
});

ipcMain.handle("sync:replace-local-from-repo", async (event) => {
  const paths = resolveSkillPaths();
  const plan = await createSyncPlan(paths);
  const localCount = plan.skills.filter((skill) => skill.local).length;
  const repoCount = plan.skills.filter((skill) => skill.repo?.valid).length;
  const response = await showWindowMessageBox(event, {
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

  return replaceLocalSkillsFromRepo(paths);
});

ipcMain.handle("sync:list-backups", async () => {
  const paths = resolveSkillPaths();
  return listSkillBackups({ localRoot: paths.localRoot });
});

ipcMain.handle("sync:restore-backup", async (event, payload: unknown) => {
  const paths = resolveSkillPaths();
  const backupPath = parseRestorePayload(payload);
  const backups = await listSkillBackups({ localRoot: paths.localRoot });
  const backup = backups.find((candidate) => candidate.path === backupPath);
  const plan = await createSyncPlan(paths);
  const localCount = plan.skills.filter((skill) => skill.local).length;
  const restoreCount = backup?.skillCount ?? 0;
  const response = await showWindowMessageBox(event, {
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
    backupPath
  });
});

async function showWindowMessageBox(
  event: IpcMainInvokeEvent,
  options: MessageBoxOptions
): Promise<MessageBoxReturnValue> {
  const parentWindow = BrowserWindow.fromWebContents(event.sender);

  if (!parentWindow) {
    return dialog.showMessageBox(options);
  }

  parentWindow.show();
  parentWindow.focus();
  return dialog.showMessageBox(parentWindow, options);
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
