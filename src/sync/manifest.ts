import { readFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { LIBRARY_MANIFEST_FILE, type LibraryManifest, type LibraryManifestSummary, type LibrarySkillMetadata, type LibrarySkillVisibility } from "./types";

const DEFAULT_SKILLS_PATH = "skills";
const VISIBILITIES = new Set<LibrarySkillVisibility>(["recommended", "optional", "hidden"]);

export async function readLibraryManifestForSkillsRoot(skillsRoot: string): Promise<LibraryManifestSummary> {
  const candidates = manifestPathCandidates(skillsRoot);

  for (const candidate of candidates) {
    const result = await readLibraryManifest(candidate);

    if (result.path || result.errors.length > 0) {
      return result;
    }
  }

  return {
    valid: true,
    errors: []
  };
}

export async function readLibraryManifest(manifestPath: string): Promise<LibraryManifestSummary> {
  try {
    const parsed = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
    const manifest = parseLibraryManifest(parsed);

    return {
      path: manifestPath,
      valid: true,
      errors: [],
      manifest
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return {
        valid: true,
        errors: []
      };
    }

    return {
      path: manifestPath,
      valid: false,
      errors: [error instanceof Error ? error.message : String(error)]
    };
  }
}

export async function resolveSkillsRootFromLibraryPath(inputPath: string): Promise<string> {
  const manifestPath = join(inputPath, LIBRARY_MANIFEST_FILE);
  const manifest = await readLibraryManifest(manifestPath);

  if (manifest.valid && manifest.manifest) {
    return resolve(inputPath, manifest.manifest.skillsPath);
  }

  return inputPath;
}

export function manifestPathCandidates(skillsRoot: string): string[] {
  const candidates = [join(skillsRoot, LIBRARY_MANIFEST_FILE)];

  if (basename(skillsRoot) === DEFAULT_SKILLS_PATH) {
    candidates.push(join(dirname(skillsRoot), LIBRARY_MANIFEST_FILE));
  }

  return candidates;
}

function parseLibraryManifest(input: unknown): LibraryManifest {
  if (!input || typeof input !== "object") {
    throw new Error("Library manifest must be a JSON object.");
  }

  const record = input as Record<string, unknown>;

  if (record.schemaVersion !== 1) {
    throw new Error(`Unsupported library manifest schema version: ${String(record.schemaVersion)}`);
  }

  const name = requiredString(record, "name");
  const description = optionalString(record, "description");
  const skillsPath = optionalString(record, "skillsPath") ?? DEFAULT_SKILLS_PATH;
  const skills = parseSkills(record.skills);

  return {
    schemaVersion: 1,
    name,
    description,
    skillsPath,
    skills
  };
}

function parseSkills(input: unknown): Record<string, LibrarySkillMetadata> {
  if (input === undefined || input === null) {
    return {};
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error('Library manifest field "skills" must be an object.');
  }

  const skills: Record<string, LibrarySkillMetadata> = {};

  for (const [name, value] of Object.entries(input as Record<string, unknown>)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Library manifest metadata for "${name}" must be an object.`);
    }

    const record = value as Record<string, unknown>;
    const visibility = optionalString(record, "visibility") ?? "optional";

    if (!VISIBILITIES.has(visibility as LibrarySkillVisibility)) {
      throw new Error(`Library manifest visibility for "${name}" must be recommended, optional, or hidden.`);
    }

    skills[name] = {
      description: optionalString(record, "description"),
      tags: stringArray(record.tags, `Library manifest tags for "${name}"`),
      visibility: visibility as LibrarySkillVisibility
    };
  }

  return skills;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = optionalString(record, key);

  if (!value) {
    throw new Error(`Library manifest field "${key}" is required.`);
  }

  return value;
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Library manifest field "${key}" must be a string.`);
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : undefined;
}

function stringArray(input: unknown, fieldName: string): string[] {
  if (input === undefined || input === null) {
    return [];
  }

  if (!Array.isArray(input) || input.some((item) => typeof item !== "string")) {
    throw new Error(`${fieldName} must be an array of strings.`);
  }

  return [...new Set(input.map((item) => item.trim()).filter(Boolean))].sort();
}
