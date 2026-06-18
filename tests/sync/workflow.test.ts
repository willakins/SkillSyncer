import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { syncWorkspace } from "../../src/sync";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots.length = 0;
});

describe("syncWorkspace", () => {
  it("installs shared-only skills and exports device-only skills without conflicts", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");

    await writeSkill(repoRoot, "shared-only", "from shared");
    await writeSkill(localRoot, "device-only", "from device");

    const result = await syncWorkspace({
      repoRoot,
      localRoot,
      pull: false,
      publish: false
    });

    expect(result.conflicts).toEqual([]);
    expect(result.installed.installed.map((skill) => skill.skillName)).toEqual(["shared-only"]);
    expect(result.exported.exported.map((skill) => skill.skillName)).toEqual(["device-only"]);
    await expect(readFile(join(localRoot, "shared-only", "SKILL.md"), "utf8")).resolves.toContain("from shared");
    await expect(readFile(join(repoRoot, "device-only", "SKILL.md"), "utf8")).resolves.toContain("from device");
  });

  it("stops before mutating when changed skills need conflict choices", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");

    await writeSkill(repoRoot, "changed", "from shared");
    await writeSkill(localRoot, "changed", "from device");

    const result = await syncWorkspace({
      repoRoot,
      localRoot,
      pull: false,
      publish: false
    });

    expect(result.conflicts).toEqual(["changed"]);
    await expect(readFile(join(localRoot, "changed", "SKILL.md"), "utf8")).resolves.toContain("from device");
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
