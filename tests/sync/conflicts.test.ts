import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveSkillConflicts } from "../../src/sync";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots.length = 0;
});

describe("resolveSkillConflicts", () => {
  it("uses the shared library version after backing up the device skill", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");
    const backupRoot = join(root, "backups");

    await writeSkill(repoRoot, "changed", "from shared");
    await writeSkill(localRoot, "changed", "from device");

    const result = await resolveSkillConflicts({
      repoRoot,
      localRoot,
      backupRoot,
      action: "use-library"
    });

    expect(result.installed?.installed.map((skill) => skill.skillName)).toEqual(["changed"]);
    await expect(readFile(join(localRoot, "changed", "SKILL.md"), "utf8")).resolves.toContain("from shared");
    await expect(readFile(join(result.backupPath ?? "", "changed", "SKILL.md"), "utf8")).resolves.toContain("from device");
  });

  it("keeps the device version by exporting it over the shared version with a shared backup", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");
    const backupRoot = join(root, "backups");

    await writeSkill(repoRoot, "changed", "from shared");
    await writeSkill(localRoot, "changed", "from device");

    const result = await resolveSkillConflicts({
      repoRoot,
      localRoot,
      backupRoot,
      action: "keep-device"
    });

    expect(result.exported.map((skill) => skill.skillName)).toEqual(["changed"]);
    await expect(readFile(join(repoRoot, "changed", "SKILL.md"), "utf8")).resolves.toContain("from device");
    await expect(readFile(join(result.backupPath ?? "", "changed", "SKILL.md"), "utf8")).resolves.toContain("from shared");
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
