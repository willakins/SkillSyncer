import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { exportLocalOnlySkills } from "../../src/sync";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots.length = 0;
});

describe("exportLocalOnlySkills", () => {
  it("copies local-only skills into the repository skill tree", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");

    await writeSkill(localRoot, "local-only", "from local");
    await writeSkill(repoRoot, "changed", "from repo");
    await writeSkill(localRoot, "changed", "from local");

    const result = await exportLocalOnlySkills({ repoRoot, localRoot });

    expect(result.exported.map((skill) => skill.skillName)).toEqual(["local-only"]);
    expect(result.skipped).toEqual([]);
    await expect(readFile(join(repoRoot, "local-only", "SKILL.md"), "utf8")).resolves.toContain("from local");
    await expect(readFile(join(repoRoot, "changed", "SKILL.md"), "utf8")).resolves.toContain("from repo");
  });

  it("skips requested skills that cannot be safely exported", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");

    await writeSkill(repoRoot, "shared", "from repo");
    await writeSkill(localRoot, "shared", "from local");

    const result = await exportLocalOnlySkills({
      repoRoot,
      localRoot,
      skillNames: ["shared", "missing"]
    });

    expect(result.exported).toEqual([]);
    expect(result.skipped.map((skill) => skill.skillName)).toEqual(["shared", "missing"]);
  });

  it("supports dry runs without copying files", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");

    await writeSkill(localRoot, "local-only", "from local");

    const result = await exportLocalOnlySkills({ repoRoot, localRoot, dryRun: true });

    expect(result.exported).toHaveLength(1);
    await expect(readFile(join(repoRoot, "local-only", "SKILL.md"), "utf8")).rejects.toThrow();
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
