import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { SKILL_MANIFEST_FILE, type SkillFileChange, type SkillFileSnapshot, type SkillSnapshot } from "./types";

export async function readSkillTree(rootPath: string): Promise<Map<string, SkillSnapshot>> {
  if (!(await directoryExists(rootPath))) {
    return new Map();
  }

  const entries = await readdir(rootPath, { withFileTypes: true });
  const skills = new Map<string, SkillSnapshot>();
  const skillEntries = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .sort((left, right) => left.name.localeCompare(right.name));
  const snapshots = await Promise.all(skillEntries.map((entry) => readSkillSnapshot(rootPath, entry.name)));

  for (const skill of snapshots) {
    skills.set(skill.name, skill);
  }

  return skills;
}

export async function readSkillSnapshot(parentPath: string, skillName: string): Promise<SkillSnapshot> {
  const rootPath = join(parentPath, skillName);
  const files = await readFiles(rootPath);
  const missingManifest = !files.some((file) => file.relativePath === SKILL_MANIFEST_FILE);

  return {
    name: skillName,
    rootPath,
    valid: !missingManifest,
    missingManifest,
    files
  };
}

export function compareSkillFiles(repo: SkillSnapshot, local: SkillSnapshot): SkillFileChange[] {
  const repoFiles = new Map(repo.files.map((file) => [file.relativePath, file]));
  const localFiles = new Map(local.files.map((file) => [file.relativePath, file]));
  const allPaths = [...new Set([...repoFiles.keys(), ...localFiles.keys()])].sort();

  return allPaths.flatMap<SkillFileChange>((relativePath) => {
    const repoFile = repoFiles.get(relativePath);
    const localFile = localFiles.get(relativePath);

    if (!repoFile) {
      return [{ relativePath, changeType: "local-only" as const }];
    }

    if (!localFile) {
      return [{ relativePath, changeType: "repo-only" as const }];
    }

    if (repoFile.hash !== localFile.hash || repoFile.size !== localFile.size) {
      return [{ relativePath, changeType: "different" as const }];
    }

    return [];
  });
}

async function readFiles(rootPath: string, relativeRoot = ""): Promise<SkillFileSnapshot[]> {
  const currentPath = relativeRoot ? join(rootPath, relativeRoot) : rootPath;
  const entries = await readdir(currentPath, { withFileTypes: true });
  const snapshotGroups = await Promise.all(entries.sort((left, right) => left.name.localeCompare(right.name)).map(async (entry) => {
    const relativePath = relativeRoot ? `${relativeRoot}/${entry.name}` : entry.name;
    const fullPath = join(rootPath, relativePath);

    if (entry.isDirectory()) {
      return readFiles(rootPath, relativePath);
    }

    if (!entry.isFile()) {
      return [];
    }

    const contents = await readFile(fullPath);
    return [{
      relativePath,
      hash: createHash("sha256").update(contents).digest("hex"),
      size: contents.byteLength
    }];
  }));

  return snapshotGroups.flat();
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
