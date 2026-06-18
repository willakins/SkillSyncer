import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GitFailureKind =
  | "not-git-repository"
  | "missing-remote"
  | "authentication"
  | "merge-conflict"
  | "diverged"
  | "working-tree-dirty"
  | "unknown";

export class GitCommandError extends Error {
  readonly kind: GitFailureKind;
  readonly command: string[];
  readonly exitCode?: number | string;

  constructor(message: string, kind: GitFailureKind, command: string[], exitCode?: number | string) {
    super(message);
    this.name = "GitCommandError";
    this.kind = kind;
    this.command = command;
    this.exitCode = exitCode;
  }
}

export interface GitStatus {
  branchLine: string;
  entries: string[];
  clean: boolean;
}

export interface RepositoryStatus extends GitStatus {
  isRepository: boolean;
  branchName?: string;
  upstream?: string;
  ahead: number;
  behind: number;
  diverged: boolean;
  hasMergeConflicts: boolean;
}

export interface GitPullOptions {
  remote?: string;
  branch?: string;
}

export interface GitPushOptions {
  remote?: string;
  branch?: string;
}

export interface GitCloneOptions {
  url: string;
  targetPath: string;
  branch?: string;
}

export interface PublishSkillChangesOptions {
  skillNames: string[];
  message: string;
  remote?: string;
  branch?: string;
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

export async function getRepositoryStatus(repositoryPath: string, pathspecs: string[] = []): Promise<RepositoryStatus> {
  try {
    const status = await getGitStatus(repositoryPath, pathspecs);
    const branch = parseBranchLine(status.branchLine);

    return {
      ...status,
      isRepository: true,
      branchName: branch.branchName,
      upstream: branch.upstream,
      ahead: branch.ahead,
      behind: branch.behind,
      diverged: branch.ahead > 0 && branch.behind > 0,
      hasMergeConflicts: status.entries.some(hasMergeConflictStatus)
    };
  } catch (error) {
    if (error instanceof GitCommandError && error.kind === "not-git-repository") {
      return {
        branchLine: "## not a git repository",
        entries: [],
        clean: false,
        isRepository: false,
        ahead: 0,
        behind: 0,
        diverged: false,
        hasMergeConflicts: false
      };
    }

    throw error;
  }
}

export async function pullRepository(repositoryPath: string, options: GitPullOptions = {}): Promise<string> {
  return runGit(repositoryPath, ["pull", "--ff-only", ...remoteBranchArgs(options)]);
}

export async function cloneRepository(options: GitCloneOptions): Promise<string> {
  await mkdir(dirname(options.targetPath), { recursive: true });

  try {
    const { stdout, stderr } = await execFileAsync("git", [
      "clone",
      ...(options.branch ? ["--branch", options.branch] : []),
      options.url,
      options.targetPath
    ]);

    return [stdout, stderr].filter(Boolean).join("\n").trim();
  } catch (error) {
    throw createGitError(["clone", options.url, options.targetPath], error);
  }
}

export async function publishSkillChanges(
  repositoryPath: string,
  options: PublishSkillChangesOptions
): Promise<PublishSkillChangesResult> {
  const skillNames = normalizeSkillNames(options.skillNames);

  if (skillNames.length === 0) {
    throw new Error("Choose at least one exported skill to publish.");
  }

  await ensurePushTarget(repositoryPath, options);
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
  const pushOutput = await pushRepository(repositoryPath, options);

  return {
    skillNames,
    committed: true,
    pushed: true,
    commitOutput,
    pushOutput
  };
}

export async function pushRepository(repositoryPath: string, options: GitPushOptions = {}): Promise<string> {
  return runGit(repositoryPath, ["push", ...remoteBranchArgs(options)]);
}

async function ensurePushTarget(repositoryPath: string, options: GitPushOptions): Promise<void> {
  if (options.remote && options.branch) {
    return;
  }

  try {
    await execFileAsync("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], {
      cwd: repositoryPath
    });
  } catch (error) {
    throw new GitCommandError(
      "No upstream branch is configured. Run `git push -u <remote> <branch>` once, then try again.",
      "missing-remote",
      ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
      getExitCodeFromUnknown(error)
    );
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

function remoteBranchArgs(options: GitPullOptions | GitPushOptions): string[] {
  if (options.remote && options.branch) {
    return [options.remote, options.branch];
  }

  if (options.remote || options.branch) {
    throw new Error("Both git remote and branch must be configured when overriding the upstream target.");
  }

  return [];
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
    const detail = details[0] ?? error.message;
    const kind = classifyGitFailure(args, detail);

    return new GitCommandError(`git ${args.join(" ")} failed: ${detail}`, kind, args, getExitCode(error));
  }

  return new GitCommandError(`git ${args.join(" ")} failed: ${String(error)}`, "unknown", args);
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

function getExitCode(error: Error): number | string | undefined {
  if ("code" in error && (typeof error.code === "number" || typeof error.code === "string")) {
    return error.code;
  }

  return undefined;
}

function getExitCodeFromUnknown(error: unknown): number | string | undefined {
  return error instanceof Error ? getExitCode(error) : undefined;
}

function classifyGitFailure(args: string[], detail: string): GitFailureKind {
  const normalized = detail.toLowerCase();

  if (normalized.includes("not a git repository")) {
    return "not-git-repository";
  }

  if (
    normalized.includes("could not read from remote repository") ||
    normalized.includes("authentication failed") ||
    normalized.includes("permission denied") ||
    normalized.includes("repository not found")
  ) {
    return "authentication";
  }

  if (normalized.includes("no such remote") || normalized.includes("does not appear to be a git repository")) {
    return "missing-remote";
  }

  if (normalized.includes("merge conflict") || normalized.includes("unmerged files")) {
    return "merge-conflict";
  }

  if (normalized.includes("not possible to fast-forward") || normalized.includes("divergent branches")) {
    return "diverged";
  }

  if (args[0] === "pull" && normalized.includes("local changes")) {
    return "working-tree-dirty";
  }

  return "unknown";
}

function parseBranchLine(branchLine: string): Pick<RepositoryStatus, "branchName" | "upstream" | "ahead" | "behind"> {
  const withoutPrefix = branchLine.replace(/^##\s*/, "");
  const [branchPart, statusPart = ""] = withoutPrefix.split(" [", 2);
  const [branchName, upstream] = branchPart.split("...");
  const aheadMatch = statusPart.match(/ahead (\d+)/);
  const behindMatch = statusPart.match(/behind (\d+)/);

  return {
    branchName: branchName && branchName !== "unknown" ? branchName : undefined,
    upstream,
    ahead: aheadMatch ? Number(aheadMatch[1]) : 0,
    behind: behindMatch ? Number(behindMatch[1]) : 0
  };
}

function hasMergeConflictStatus(entry: string): boolean {
  const status = entry.slice(0, 2);

  return status.includes("U") || ["AA", "DD"].includes(status);
}
