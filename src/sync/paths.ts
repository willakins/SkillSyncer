import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import type { ResolvedSkillPaths } from "./types";

export interface ResolveSkillPathOptions {
  repoRoot?: string;
  localRoot?: string;
  workingDirectory?: string;
}

export function expandHome(inputPath: string): string {
  if (inputPath === "~") {
    return homedir();
  }

  if (inputPath.startsWith("~/")) {
    return join(homedir(), inputPath.slice(2));
  }

  return inputPath;
}

export function defaultRepoSkillsPath(workingDirectory = process.cwd()): string {
  return resolve(workingDirectory, "skills");
}

export function defaultLocalSkillsPath(): string {
  return join(homedir(), ".codex", "skills");
}

export function resolveInputPath(inputPath: string, workingDirectory = process.cwd()): string {
  const expanded = expandHome(inputPath);

  return isAbsolute(expanded) ? expanded : resolve(workingDirectory, expanded);
}

export function resolveSkillPaths(options: ResolveSkillPathOptions = {}): ResolvedSkillPaths {
  const workingDirectory = options.workingDirectory ?? process.cwd();

  return {
    repoRoot: options.repoRoot
      ? resolveInputPath(options.repoRoot, workingDirectory)
      : defaultRepoSkillsPath(workingDirectory),
    localRoot: options.localRoot
      ? resolveInputPath(options.localRoot, workingDirectory)
      : defaultLocalSkillsPath()
  };
}
