import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { listSkillBackups, replaceLocalSkillsFromRepo, restoreLocalSkillsFromBackup } from "../../src/sync";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots.length = 0;
});

describe("replaceLocalSkillsFromRepo", () => {
  it("backs up local skills before replacing them with repo skills", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");
    const backupRoot = join(root, "backups");

    await writeSkill(repoRoot, "repo-one", "from repo one");
    await writeSkill(repoRoot, "repo-two", "from repo two");
    await writeSkill(localRoot, "local-only", "from local");

    const result = await replaceLocalSkillsFromRepo({ repoRoot, localRoot, backupRoot });

    expect(result.imported.map((skill) => skill.skillName)).toEqual(["repo-one", "repo-two"]);
    expect(result.removedLocalSkillNames).toEqual(["local-only"]);
    expect(result.backupPath).toBeDefined();
    await expect(readFile(join(localRoot, "repo-one", "SKILL.md"), "utf8")).resolves.toContain("from repo one");
    await expect(readFile(join(localRoot, "local-only", "SKILL.md"), "utf8")).rejects.toThrow();
    await expect(readFile(join(result.backupPath ?? "", "local-only", "SKILL.md"), "utf8")).resolves.toContain("from local");
  });

  it("supports dry runs without changing local files", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");

    await writeSkill(repoRoot, "repo-only", "from repo");
    await writeSkill(localRoot, "local-only", "from local");

    const result = await replaceLocalSkillsFromRepo({ repoRoot, localRoot, dryRun: true });

    expect(result.dryRun).toBe(true);
    expect(result.imported).toHaveLength(1);
    await expect(readFile(join(localRoot, "local-only", "SKILL.md"), "utf8")).resolves.toContain("from local");
    await expect(readFile(join(localRoot, "repo-only", "SKILL.md"), "utf8")).rejects.toThrow();
  });

  it("refuses to replace local skills from an empty repository skill tree", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");

    await mkdir(repoRoot, { recursive: true });
    await writeSkill(localRoot, "local-only", "from local");

    await expect(replaceLocalSkillsFromRepo({ repoRoot, localRoot })).rejects.toThrow("no valid skills");
    await expect(readdir(localRoot)).resolves.toEqual(["local-only"]);
  });

  it("lists available local skill backups", async () => {
    const root = await createTempRoot();
    const localRoot = join(root, "local-skills");
    const backupRoot = join(root, "backups");

    await writeSkill(join(backupRoot, "skills-old"), "restored", "from backup");
    await mkdir(join(backupRoot, "skills-invalid", "broken"), { recursive: true });

    const backups = await listSkillBackups({ localRoot, backupRoot });

    expect(backups.map((backup) => [backup.name, backup.skillCount, backup.invalidSkillCount]).sort()).toEqual([
      ["skills-invalid", 0, 1],
      ["skills-old", 1, 0]
    ]);
    expect(backups.find((backup) => backup.name === "skills-old")?.skillNames).toEqual(["restored"]);
  });

  it("restores local skills from a backup while backing up the current local state", async () => {
    const root = await createTempRoot();
    const localRoot = join(root, "local-skills");
    const backupRoot = join(root, "backups");
    const backupPath = join(backupRoot, "skills-old");

    await writeSkill(localRoot, "current", "from current local");
    await writeSkill(backupPath, "restored", "from backup");

    const result = await restoreLocalSkillsFromBackup({ localRoot, backupRoot, backupPath });

    expect(result.restoredSkillNames).toEqual(["restored"]);
    expect(result.removedLocalSkillNames).toEqual(["current"]);
    expect(result.safetyBackupPath).toBeDefined();
    await expect(readFile(join(localRoot, "restored", "SKILL.md"), "utf8")).resolves.toContain("from backup");
    await expect(readFile(join(localRoot, "current", "SKILL.md"), "utf8")).rejects.toThrow();
    await expect(readFile(join(result.safetyBackupPath ?? "", "current", "SKILL.md"), "utf8")).resolves.toContain("from current local");
  });
});

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillsyncer-"));
  tempRoots.push(root);
  return root;
}

async function writeSkill(root: string, name: string, contents: string): Promise<void> {
  const skillRoot = join(root, name);
  await mkdir(skillRoot, { recursive: true });
  await writeFile(join(skillRoot, "SKILL.md"), `# ${name}\n\n${contents}\n`);
}
