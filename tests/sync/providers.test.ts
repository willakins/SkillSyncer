import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalDirectoryProvider, createSyncPlanFromProvider } from "../../src/sync";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots.length = 0;
});

describe("library providers", () => {
  it("creates the same sync plan through a local directory provider", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");
    const provider = createLocalDirectoryProvider({
      skillsRoot: repoRoot,
      displayName: "Test library"
    });

    await writeSkill(repoRoot, "repo-only", "from repo");
    await writeSkill(localRoot, "local-only", "from local");

    const plan = await createSyncPlanFromProvider(provider, localRoot);

    expect(plan.repoRoot).toBe(repoRoot);
    expect(plan.localRoot).toBe(localRoot);
    expect(plan.skills.map((skill) => [skill.name, skill.classification])).toEqual([
      ["local-only", "local-only"],
      ["repo-only", "repo-only"]
    ]);
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
