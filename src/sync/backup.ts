import { readdir, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export function defaultBackupRoot(localRoot: string): string {
  return join(dirname(localRoot), "skillsyncer-backups");
}

export function resolveBackupRoot(localRoot: string, backupRoot?: string): string {
  return backupRoot ? resolve(backupRoot) : defaultBackupRoot(localRoot);
}

export function plannedBackupPath(localRoot: string, backupRoot?: string, prefix = "skills"): string {
  return join(resolveBackupRoot(localRoot, backupRoot), `${prefix}-${timestamp()}`);
}

export async function directoryHasEntries(path: string): Promise<boolean> {
  try {
    if (!(await stat(path)).isDirectory()) {
      return false;
    }

    return (await readdir(path)).length > 0;
  } catch (error) {
    if (isMissingPathError(error)) {
      return false;
    }

    throw error;
  }
}

export async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch (error) {
    if (isMissingPathError(error)) {
      return false;
    }

    throw error;
  }
}

function timestamp(): string {
  return new Date().toISOString().replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
}

function isMissingPathError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
