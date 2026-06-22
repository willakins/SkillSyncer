import { execFile, type ExecFileOptions } from "node:child_process";
import { readdir } from "node:fs/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const GIT_TIMEOUT_MS = 30_000;

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

export async function getChangedSkillNames(repositoryPath: string): Promise<string[]> {
  const status = await getGitStatus(repositoryPath, ["."]);
  const statusSkillNames = status.entries.flatMap((entry) => skillNameFromStatusEntry(entry) ?? []);
  const untrackedRootSkillNames = status.entries.some(isCurrentDirectoryStatusEntry)
    ? await readChildDirectoryNames(repositoryPath)
    : [];

  return normalizeSkillNames([...statusSkillNames, ...untrackedRootSkillNames]);
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
      ...gitExecOptions(repositoryPath)
    });
  } catch (error) {
    throw new Error("No upstream branch is configured. Run `git push -u <remote> <branch>` once, then try again.");
  }
}

async function hasStagedChanges(repositoryPath: string, pathspecs: string[]): Promise<boolean> {
  try {
    await execFileAsync("git", ["diff", "--cached", "--quiet", ...pathspecArgs(pathspecs)], {
      ...gitExecOptions(repositoryPath)
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
      ...gitExecOptions(repositoryPath)
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

function skillNameFromStatusEntry(entry: string): string | undefined {
  const changedPath = entry.slice(3).trim();
  const currentPath = changedPath.includes(" -> ")
    ? changedPath.split(" -> ").at(-1)?.trim() ?? ""
    : changedPath;

  if (!currentPath || currentPath === "." || currentPath === ".." || currentPath.startsWith("../")) {
    return undefined;
  }

  const pathParts = currentPath.split(/[\\/]/).filter(Boolean);

  if (pathParts[0] === "." || pathParts[0] === "..") {
    return undefined;
  }

  if (pathParts.length < 2 && !currentPath.endsWith("/")) {
    return undefined;
  }

  return pathParts[0];
}

function isCurrentDirectoryStatusEntry(entry: string): boolean {
  const changedPath = entry.slice(3).trim();
  return changedPath === "." || changedPath === "./";
}

async function readChildDirectoryNames(repositoryPath: string): Promise<string[]> {
  const entries = await readdir(repositoryPath, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

function createGitError(args: string[], error: unknown): Error {
  if (error instanceof Error) {
    if (isTimedOut(error)) {
      return new Error(`git ${args.join(" ")} timed out after ${GIT_TIMEOUT_MS / 1000} seconds. Check the repository remote, network connection, or git credentials, then try again.`);
    }

    const details = [
      getErrorOutput(error, "stderr"),
      getErrorOutput(error, "stdout"),
      error.message
    ].filter(Boolean);

    return new Error(`git ${args.join(" ")} failed: ${details[0] ?? error.message}`);
  }

  return new Error(`git ${args.join(" ")} failed: ${String(error)}`);
}

function gitExecOptions(repositoryPath: string): ExecFileOptions {
  return {
    cwd: repositoryPath,
    env: {
      ...process.env,
      GCM_INTERACTIVE: "never",
      GIT_TERMINAL_PROMPT: "0"
    },
    timeout: GIT_TIMEOUT_MS
  };
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

function isTimedOut(error: Error): boolean {
  return "killed" in error && error.killed === true;
}
