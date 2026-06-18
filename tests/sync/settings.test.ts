import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveConfiguredSkillPaths, saveSettings } from "../../src/sync";

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots.length = 0;
});

describe("settings", () => {
  it("persists configured paths and resolves them for sync commands", async () => {
    const root = await createTempRoot();
    const settingsPath = join(root, "settings.json");
    const librarySkillsPath = join(root, "library-skills");
    const localSkillsPath = join(root, "local-skills");
    const backupPath = join(root, "backups");

    await saveSettings({
      schemaVersion: 1,
      librarySkillsPath,
      localSkillsPath,
      backupPath,
      gitRemote: "origin",
      gitBranch: "main"
    }, settingsPath);

    const resolved = await resolveConfiguredSkillPaths({ settingsPath });

    expect(resolved.repoRoot).toBe(librarySkillsPath);
    expect(resolved.localRoot).toBe(localSkillsPath);
    expect(resolved.backupRoot).toBe(backupPath);
    expect(resolved.gitRemote).toBe("origin");
    expect(resolved.gitBranch).toBe("main");
  });
});

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillsyncer-"));
  tempRoots.push(root);
  return root;
}
