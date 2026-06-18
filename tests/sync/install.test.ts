import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { installRepoSkills } from "../../src/sync";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots.length = 0;
});

describe("installRepoSkills", () => {
  it("copies shared-only skills into the local skill tree", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");

    await writeSkill(repoRoot, "repo-only", "from repo");

    const result = await installRepoSkills({ repoRoot, localRoot });

    expect(result.installed.map((skill) => skill.skillName)).toEqual(["repo-only"]);
    expect(result.skipped).toEqual([]);
    await expect(readFile(join(localRoot, "repo-only", "SKILL.md"), "utf8")).resolves.toContain("from repo");
  });

  it("skips existing device skills unless overwrite is explicit", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");

    await writeSkill(repoRoot, "changed", "from repo");
    await writeSkill(localRoot, "changed", "from local");

    const result = await installRepoSkills({
      repoRoot,
      localRoot,
      skillNames: ["changed"]
    });

    expect(result.installed).toEqual([]);
    expect(result.skipped[0]?.reason).toContain("explicit overwrite");
    await expect(readFile(join(localRoot, "changed", "SKILL.md"), "utf8")).resolves.toContain("from local");
  });

  it("backs up overwritten device skills before installing the shared version", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");
    const backupRoot = join(root, "backups");

    await writeSkill(repoRoot, "changed", "from repo");
    await writeSkill(localRoot, "changed", "from local");

    const result = await installRepoSkills({
      repoRoot,
      localRoot,
      backupRoot,
      skillNames: ["changed"],
      overwriteExisting: true
    });

    expect(result.installed.map((skill) => [skill.skillName, skill.overwritten])).toEqual([["changed", true]]);
    expect(result.backupPath).toBeDefined();
    await expect(readFile(join(localRoot, "changed", "SKILL.md"), "utf8")).resolves.toContain("from repo");
    await expect(readFile(join(result.backupPath ?? "", "changed", "SKILL.md"), "utf8")).resolves.toContain("from local");
  });

  it("supports dry runs without copying files or creating backups", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");
    const backupRoot = join(root, "backups");

    await writeSkill(repoRoot, "changed", "from repo");
    await writeSkill(localRoot, "changed", "from local");

    const result = await installRepoSkills({
      repoRoot,
      localRoot,
      backupRoot,
      skillNames: ["changed"],
      overwriteExisting: true,
      dryRun: true
    });

    expect(result.dryRun).toBe(true);
    expect(result.installed).toHaveLength(1);
    expect(result.backupPath).toBeDefined();
    await expect(readFile(join(localRoot, "changed", "SKILL.md"), "utf8")).resolves.toContain("from local");
    await expect(readFile(join(result.backupPath ?? "", "changed", "SKILL.md"), "utf8")).rejects.toThrow();
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
