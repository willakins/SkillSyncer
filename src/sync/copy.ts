import { cp, mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

export interface CopySkillOptions {
  sourceRoot: string;
  targetRoot: string;
  skillName: string;
  overwrite?: boolean;
  dryRun?: boolean;
}

export interface CopySkillResult {
  sourcePath: string;
  targetPath: string;
  copied: boolean;
}

export async function copySkillDirectory(options: CopySkillOptions): Promise<CopySkillResult> {
  const sourcePath = join(options.sourceRoot, options.skillName);
  const targetPath = join(options.targetRoot, options.skillName);

  if (!(await directoryExists(sourcePath))) {
    throw new Error(`Skill source directory does not exist: ${sourcePath}`);
  }

  if ((await directoryExists(targetPath)) && !options.overwrite) {
    throw new Error(`Skill target already exists: ${targetPath}`);
  }

  if (options.dryRun) {
    return { sourcePath, targetPath, copied: false };
  }

  if (options.overwrite) {
    await rm(targetPath, { recursive: true, force: true });
  }

  await mkdir(options.targetRoot, { recursive: true });
  await cp(sourcePath, targetPath, { recursive: true });

  return { sourcePath, targetPath, copied: true };
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}
