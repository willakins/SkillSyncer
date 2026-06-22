import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { shareLocalSkills } from "../../src/sync";

const execFileAsync = promisify(execFile);
const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(tempRoots.map((root) => rm(root, { recursive: true, force: true })));
  tempRoots.length = 0;
});

describe("shareLocalSkills", () => {
  it("exports local skill changes and publishes only exported skill paths", async () => {
    const root = await createTempRoot();
    const remoteRoot = join(root, "remote.git");
    const repositoryRoot = join(root, "repository");
    const repoRoot = join(repositoryRoot, "skills");
    const localRoot = join(root, "local-skills");

    await runGit(root, ["init", "--bare", remoteRoot]);
    await runGit(root, ["init", "-b", "main", repositoryRoot]);
    await runGit(repositoryRoot, ["config", "user.name", "SkillSyncer Test"]);
    await runGit(repositoryRoot, ["config", "user.email", "skillsyncer@example.com"]);
    await runGit(repositoryRoot, ["remote", "add", "origin", remoteRoot]);

    await mkdir(repoRoot, { recursive: true });
    await writeFile(join(repositoryRoot, "README.md"), "# SkillSyncer test\n");
    await runGit(repositoryRoot, ["add", "README.md"]);
    await runGit(repositoryRoot, ["commit", "-m", "Initial commit"]);
    await runGit(repositoryRoot, ["push", "-u", "origin", "main"]);

    await writeSkill(localRoot, "device-only", "from device");
    await writeFile(join(repositoryRoot, "unrelated.txt"), "leave me uncommitted\n");

    const result = await shareLocalSkills({
      repoRoot,
      localRoot,
      commitMessage: "Share device-only skill"
    });

    expect(result.exported.map((skill) => skill.skillName)).toEqual(["device-only"]);
    expect(result.publish).toMatchObject({
      committed: true,
      pushed: true,
      skillNames: ["device-only"]
    });
    await expect(readFile(join(repoRoot, "device-only", "SKILL.md"), "utf8")).resolves.toContain("from device");
    await expect(runGit(repositoryRoot, ["log", "-1", "--pretty=%s"])).resolves.toBe("Share device-only skill");
    await expect(runGit(repositoryRoot, ["show", "--name-only", "--pretty=", "HEAD"])).resolves.toContain("skills/device-only/SKILL.md");
    await expect(runGit(repositoryRoot, ["status", "--short"])).resolves.toContain("?? unrelated.txt");
  });

  it("publishes pending shared skill changes after a previous export already copied them", async () => {
    const root = await createTempRoot();
    const remoteRoot = join(root, "remote.git");
    const repositoryRoot = join(root, "repository");
    const repoRoot = join(repositoryRoot, "skills");
    const localRoot = join(root, "local-skills");

    await runGit(root, ["init", "--bare", remoteRoot]);
    await runGit(root, ["init", "-b", "main", repositoryRoot]);
    await runGit(repositoryRoot, ["config", "user.name", "SkillSyncer Test"]);
    await runGit(repositoryRoot, ["config", "user.email", "skillsyncer@example.com"]);
    await runGit(repositoryRoot, ["remote", "add", "origin", remoteRoot]);

    await mkdir(repoRoot, { recursive: true });
    await writeFile(join(repositoryRoot, "README.md"), "# SkillSyncer test\n");
    await runGit(repositoryRoot, ["add", "README.md"]);
    await runGit(repositoryRoot, ["commit", "-m", "Initial commit"]);
    await runGit(repositoryRoot, ["push", "-u", "origin", "main"]);

    await writeSkill(localRoot, "already-exported", "copied but not committed");
    await writeSkill(repoRoot, "already-exported", "copied but not committed");

    const result = await shareLocalSkills({
      repoRoot,
      localRoot,
      commitMessage: "Publish pending shared skill"
    });

    expect(result.exported).toEqual([]);
    expect(result.publish).toMatchObject({
      committed: true,
      pushed: true,
      skillNames: ["already-exported"]
    });
    await expect(runGit(repositoryRoot, ["log", "-1", "--pretty=%s"])).resolves.toBe("Publish pending shared skill");
    await expect(runGit(repositoryRoot, ["status", "--short", "--", "skills"])).resolves.toBe("");
  });
});

async function createTempRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillsyncer-"));
  tempRoots.push(root);
  return root;
}

async function runGit(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trim();
}

async function writeSkill(root: string, name: string, contents: string): Promise<void> {
  const skillRoot = join(root, name);
  await mkdir(skillRoot, { recursive: true });
  await writeFile(join(skillRoot, "SKILL.md"), `# ${name}\n\n${contents}\n`);
}
