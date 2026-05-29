import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSyncPlan } from "../../src/sync";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots.length = 0;
});

describe("createSyncPlan", () => {
  it("classifies repo-only, local-only, same, changed, and invalid skills", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");

    await writeSkill(repoRoot, "shared", "same");
    await writeSkill(localRoot, "shared", "same");
    await writeSkill(repoRoot, "repo-only", "from repo");
    await writeSkill(localRoot, "local-only", "from local");
    await writeSkill(repoRoot, "changed", "repo version");
    await writeSkill(localRoot, "changed", "local version");
    await mkdir(join(repoRoot, "invalid"), { recursive: true });
    await writeFile(join(repoRoot, "invalid", "notes.md"), "missing manifest");

    const plan = await createSyncPlan({ repoRoot, localRoot });

    expect(plan.totals).toEqual({
      "repo-only": 1,
      "local-only": 1,
      same: 1,
      "changed-both": 1,
      "invalid-skill-directory": 1
    });
    expect(plan.skills.map((skill) => [skill.name, skill.classification])).toEqual([
      ["changed", "changed-both"],
      ["invalid", "invalid-skill-directory"],
      ["local-only", "local-only"],
      ["repo-only", "repo-only"],
      ["shared", "same"]
    ]);
  });

  it("treats missing skill roots as empty trees", async () => {
    const root = await createTempRoot();
    const repoRoot = join(root, "repo-skills");
    const localRoot = join(root, "local-skills");

    await writeSkill(repoRoot, "repo-only", "from repo");

    const plan = await createSyncPlan({ repoRoot, localRoot });

    expect(plan.totals["repo-only"]).toBe(1);
    expect(plan.totals["local-only"]).toBe(0);
    expect(plan.skills[0]?.name).toBe("repo-only");
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
