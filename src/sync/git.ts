import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitStatus {
  branchLine: string;
  entries: string[];
  clean: boolean;
}

export interface PublishSkillChangesOptions {
  skillNames: string[];
  message: string;
}

export interface PublishSkillChangesResult {
  skillNames: string[];
  committed: boolean;
  pushed: boolean;
  commitOutput: string;
  pushOutput: string;
}

export async function getGitStatus(repositoryPath: string, pathspecs: string[] = []): Promise<GitStatus> {
  const stdout = await runGit(repositoryPath, ["status", "--short", "--branch", ...pathspecArgs(pathspecs)]);

  const lines = stdout.trim().split("\n").filter(Boolean);
  const [branchLine = "## unknown", ...entries] = lines;

  return {
    branchLine,
    entries,
    clean: entries.length === 0
  };
}

export async function pullRepository(repositoryPath: string): Promise<string> {
  return runGit(repositoryPath, ["pull", "--ff-only"]);
}

export async function publishSkillChanges(
  repositoryPath: string,
  options: PublishSkillChangesOptions
): Promise<PublishSkillChangesResult> {
  const skillNames = normalizeSkillNames(options.skillNames);

  if (skillNames.length === 0) {
    throw new Error("Choose at least one exported skill to publish.");
  }

  await ensurePushTarget(repositoryPath);
  await runGit(repositoryPath, ["add", "--all", ...pathspecArgs(skillNames)]);

  const hasChanges = await hasStagedChanges(repositoryPath, skillNames);

  if (!hasChanges) {
    return {
      skillNames,
      committed: false,
      pushed: false,
      commitOutput: "No staged skill changes to commit.",
      pushOutput: ""
    };
  }

  const commitOutput = await runGit(repositoryPath, [
    "commit",
    "-m",
    options.message.trim() || "Export local skills",
    ...pathspecArgs(skillNames)
  ]);
  const pushOutput = await pushRepository(repositoryPath);

  return {
    skillNames,
    committed: true,
    pushed: true,
    commitOutput,
    pushOutput
  };
}

export async function pushRepository(repositoryPath: string): Promise<string> {
  return runGit(repositoryPath, ["push"]);
}

async function ensurePushTarget(repositoryPath: string): Promise<void> {
  try {
    await execFileAsync("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
      cwd: repositoryPath
    });
  } catch (error) {
    throw new Error("No upstream branch is configured. Run `git push -u <remote> <branch>` once, then try again.");
  }
}

async function hasStagedChanges(repositoryPath: string, pathspecs: string[]): Promise<boolean> {
  try {
    await execFileAsync("git", ["diff", "--cached", "--quiet", ...pathspecArgs(pathspecs)], {
      cwd: repositoryPath
    });
    return false;
  } catch (error) {
    if (isExitCode(error, 1)) {
      return true;
    }

    throw createGitError(["diff", "--cached", "--quiet", ...pathspecArgs(pathspecs)], error);
  }
}

async function runGit(repositoryPath: string, args: string[]): Promise<string> {
  try {
    const { stdout, stderr } = await execFileAsync("git", args, {
      cwd: repositoryPath
    });

    return [stdout, stderr].filter(Boolean).join("\n").trim();
  } catch (error) {
    throw createGitError(args, error);
  }
}

function pathspecArgs(pathspecs: string[]): string[] {
  return pathspecs.length > 0 ? ["--", ...pathspecs] : [];
}

function normalizeSkillNames(skillNames: string[]): string[] {
  const normalized = [...new Set(skillNames.map((skillName) => skillName.trim()).filter(Boolean))].sort();
  const invalidSkill = normalized.find((skillName) => {
    return skillName === "." || skillName === ".." || skillName.includes("/") || skillName.includes("\\");
  });

  if (invalidSkill) {
    throw new Error(`Invalid skill name for git publication: ${invalidSkill}`);
  }

  return normalized;
}

function createGitError(args: string[], error: unknown): Error {
  if (error instanceof Error) {
    const details = [
      getErrorOutput(error, "stderr"),
      getErrorOutput(error, "stdout"),
      error.message
    ].filter(Boolean);

    return new Error(`git ${args.join(" ")} failed: ${details[0] ?? error.message}`);
  }

  return new Error(`git ${args.join(" ")} failed: ${String(error)}`);
}

function getErrorOutput(error: Error, key: "stdout" | "stderr"): string | undefined {
  const output = error as Error & Record<string, unknown>;

  if (key in output) {
    const value = output[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function isExitCode(error: unknown, exitCode: number): boolean {
  return error instanceof Error && "code" in error && error.code === exitCode;
}
