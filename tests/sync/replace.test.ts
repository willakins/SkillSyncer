import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { replaceLocalSkillsFromRepo } from "../../src/sync";

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
