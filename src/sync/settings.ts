import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { defaultBackupRoot } from "./backup";
import { resolveSkillsRootFromLibraryPath } from "./manifest";
import { parseOrganizations, type OrganizationSettings } from "./organizations";
import { defaultLocalSkillsPath, defaultRepoSkillsPath, resolveInputPath } from "./paths";
import type { ResolvedSkillPaths } from "./types";

export const SETTINGS_SCHEMA_VERSION = 1;

export interface SkillSyncerSettings {
  schemaVersion: 1;
  librarySkillsPath?: string;
  localSkillsPath?: string;
  backupPath?: string;
  gitRemote?: string;
  gitBranch?: string;
  organizations?: Record<string, OrganizationSettings>;
}

export interface ResolveConfiguredPathsOptions {
  repoRoot?: string;
  localRoot?: string;
  backupRoot?: string;
  remote?: string;
  branch?: string;
  settingsPath?: string;
  workingDirectory?: string;
}

export interface ResolvedSkillSyncerSettings extends ResolvedSkillPaths {
  backupRoot: string;
  settingsPath: string;
  settings: SkillSyncerSettings;
  gitRemote?: string;
  gitBranch?: string;
}

export function defaultSettingsPath(): string {
  const configRoot = process.env.XDG_CONFIG_HOME
    ? resolveInputPath(process.env.XDG_CONFIG_HOME)
    : join(homedir(), ".config");

  return join(configRoot, "skillsyncer", "settings.json");
}

export async function loadSettings(settingsPath = defaultSettingsPath()): Promise<SkillSyncerSettings> {
  try {
    const contents = await readFile(settingsPath, "utf8");
    return parseSettings(contents);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { schemaVersion: SETTINGS_SCHEMA_VERSION };
    }

    throw error;
  }
}

export async function saveSettings(
  settings: SkillSyncerSettings,
  settingsPath = defaultSettingsPath()
): Promise<SkillSyncerSettings> {
  const normalized = normalizeSettings(settings);

  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");

  return normalized;
}

export async function resolveConfiguredSkillPaths(
  options: ResolveConfiguredPathsOptions = {}
): Promise<ResolvedSkillSyncerSettings> {
  const settingsPath = options.settingsPath
    ? resolveInputPath(options.settingsPath, options.workingDirectory)
    : defaultSettingsPath();
  const settings = await loadSettings(settingsPath);
  const workingDirectory = options.workingDirectory ?? process.cwd();
  const repoInput = options.repoRoot ?? settings.librarySkillsPath;
  const localInput = options.localRoot ?? settings.localSkillsPath;
  const configuredRepoRoot = repoInput
    ? resolveInputPath(repoInput, workingDirectory)
    : defaultRepoSkillsPath(workingDirectory);
  const repoRoot = await resolveSkillsRootFromLibraryPath(configuredRepoRoot);
  const localRoot = localInput
    ? resolveInputPath(localInput, workingDirectory)
    : defaultLocalSkillsPath();
  const backupInput = options.backupRoot ?? settings.backupPath;
  const backupRoot = backupInput
    ? resolveInputPath(backupInput, workingDirectory)
    : defaultBackupRoot(localRoot);

  return {
    repoRoot,
    localRoot,
    backupRoot,
    settingsPath,
    settings,
    gitRemote: options.remote ?? settings.gitRemote,
    gitBranch: options.branch ?? settings.gitBranch
  };
}

export function settingsPatchFromInputs(
  options: ResolveConfiguredPathsOptions
): Partial<SkillSyncerSettings> {
  const workingDirectory = options.workingDirectory ?? process.cwd();
  const patch: Partial<SkillSyncerSettings> = {};

  if (options.repoRoot !== undefined) {
    patch.librarySkillsPath = resolveInputPath(options.repoRoot, workingDirectory);
  }

  if (options.localRoot !== undefined) {
    patch.localSkillsPath = resolveInputPath(options.localRoot, workingDirectory);
  }

  if (options.backupRoot !== undefined) {
    patch.backupPath = resolveInputPath(options.backupRoot, workingDirectory);
  }

  if (options.remote !== undefined) {
    patch.gitRemote = normalizeOptionalString(options.remote);
  }

  if (options.branch !== undefined) {
    patch.gitBranch = normalizeOptionalString(options.branch);
  }

  return patch;
}

export function normalizeSettings(settings: SkillSyncerSettings): SkillSyncerSettings {
  return {
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    librarySkillsPath: normalizeOptionalString(settings.librarySkillsPath),
    localSkillsPath: normalizeOptionalString(settings.localSkillsPath),
    backupPath: normalizeOptionalString(settings.backupPath),
    gitRemote: normalizeOptionalString(settings.gitRemote),
    gitBranch: normalizeOptionalString(settings.gitBranch),
    organizations: settings.organizations
  };
}

function parseSettings(contents: string): SkillSyncerSettings {
  const parsed = JSON.parse(contents) as unknown;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("SkillSyncer settings must be a JSON object.");
  }

  const record = parsed as Record<string, unknown>;

  if (record.schemaVersion !== SETTINGS_SCHEMA_VERSION) {
    throw new Error(`Unsupported SkillSyncer settings schema version: ${String(record.schemaVersion)}`);
  }

  return normalizeSettings({
    schemaVersion: SETTINGS_SCHEMA_VERSION,
    librarySkillsPath: stringField(record, "librarySkillsPath"),
    localSkillsPath: stringField(record, "localSkillsPath"),
    backupPath: stringField(record, "backupPath"),
    gitRemote: stringField(record, "gitRemote"),
    gitBranch: stringField(record, "gitBranch"),
    organizations: parseOrganizations(record.organizations)
  });
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`SkillSyncer settings field "${key}" must be a string.`);
  }

  return normalizeOptionalString(value);
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed ? trimmed : undefined;
}
