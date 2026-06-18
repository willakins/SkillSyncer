import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSyncPlan, readLibraryManifestForSkillsRoot, resolveSkillsRootFromLibraryPath } from "../../src/sync";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots.length = 0;
});

describe("library manifests", () => {
  it("loads optional library metadata from a sibling skillsyncer.json", async () => {
    const root = await createTempRoot();
    const skillsRoot = join(root, "skills");

    await writeSkill(skillsRoot, "sentry-triage", "from library");
    await writeFile(join(root, "skillsyncer.json"), JSON.stringify({
      schemaVersion: 1,
      name: "engineering-skills",
      description: "Shared engineering skills",
      skillsPath: "skills",
      skills: {
        "sentry-triage": {
          description: "Investigate production Sentry issues",
          tags: ["incident-response", "engineering"],
          visibility: "recommended"
        }
      }
    }));

    const plan = await createSyncPlan({ repoRoot: skillsRoot, localRoot: join(root, "local") });

    expect(plan.library?.manifest?.name).toBe("engineering-skills");
    expect(plan.skills[0]?.metadata).toMatchObject({
      visibility: "recommended",
      tags: ["engineering", "incident-response"]
    });
    await expect(resolveSkillsRootFromLibraryPath(root)).resolves.toBe(skillsRoot);
  });

  it("reports invalid manifests without disabling plain folder discovery", async () => {
    const root = await createTempRoot();
    const skillsRoot = join(root, "skills");

    await writeSkill(skillsRoot, "plain", "from library");
    await writeFile(join(root, "skillsyncer.json"), JSON.stringify({ schemaVersion: 99 }));

    const manifest = await readLibraryManifestForSkillsRoot(skillsRoot);
    const plan = await createSyncPlan({ repoRoot: skillsRoot, localRoot: join(root, "local") });

    expect(manifest.valid).toBe(false);
    expect(plan.skills.map((skill) => skill.name)).toEqual(["plain"]);
    expect(plan.library?.errors[0]).toContain("Unsupported");
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
