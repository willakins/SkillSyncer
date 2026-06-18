export type OrganizationRole = "owner" | "admin" | "maintainer" | "member" | "viewer";

export interface OrganizationMemberSettings {
  email: string;
  role: OrganizationRole;
  groups: string[];
}

export interface OrganizationLibrarySettings {
  id: string;
  displayName: string;
  skillsPath: string;
  recommendedSkills: string[];
  optionalSkills: string[];
  installedSkills: string[];
}

export interface OrganizationGroupSettings {
  id: string;
  displayName: string;
  memberEmails: string[];
  libraryIds: string[];
}

export interface OrganizationSettings {
  id: string;
  displayName: string;
  members: Record<string, OrganizationMemberSettings>;
  groups: Record<string, OrganizationGroupSettings>;
  libraries: Record<string, OrganizationLibrarySettings>;
}

export interface RegisterOrganizationLibraryOptions {
  organizationId: string;
  organizationName?: string;
  libraryId: string;
  displayName?: string;
  skillsPath: string;
  recommendedSkills?: string[];
  optionalSkills?: string[];
}

export function upsertOrganizationLibrary(
  organizations: Record<string, OrganizationSettings> | undefined,
  options: RegisterOrganizationLibraryOptions
): Record<string, OrganizationSettings> {
  const next = cloneOrganizations(organizations);
  const organization = next[options.organizationId] ?? {
    id: options.organizationId,
    displayName: options.organizationName ?? options.organizationId,
    members: {},
    groups: {},
    libraries: {}
  };

  organization.libraries[options.libraryId] = {
    id: options.libraryId,
    displayName: options.displayName ?? options.libraryId,
    skillsPath: options.skillsPath,
    recommendedSkills: normalizeNames(options.recommendedSkills),
    optionalSkills: normalizeNames(options.optionalSkills),
    installedSkills: organization.libraries[options.libraryId]?.installedSkills ?? []
  };
  next[organization.id] = organization;

  return next;
}

export function parseOrganizations(input: unknown): Record<string, OrganizationSettings> | undefined {
  if (input === undefined || input === null) {
    return undefined;
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error('SkillSyncer settings field "organizations" must be an object.');
  }

  const organizations: Record<string, OrganizationSettings> = {};

  for (const [id, value] of Object.entries(input as Record<string, unknown>)) {
    organizations[id] = parseOrganization(id, value);
  }

  return organizations;
}

export function cloneOrganizations(
  organizations: Record<string, OrganizationSettings> | undefined
): Record<string, OrganizationSettings> {
  return organizations ? JSON.parse(JSON.stringify(organizations)) as Record<string, OrganizationSettings> : {};
}

function parseOrganization(id: string, input: unknown): OrganizationSettings {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`Organization "${id}" must be an object.`);
  }

  const record = input as Record<string, unknown>;

  return {
    id: stringField(record.id, id),
    displayName: stringField(record.displayName, id),
    members: parseRecord(record.members, parseMember, "members"),
    groups: parseRecord(record.groups, parseGroup, "groups"),
    libraries: parseRecord(record.libraries, parseLibrary, "libraries")
  };
}

function parseMember(id: string, input: unknown): OrganizationMemberSettings {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`Organization member "${id}" must be an object.`);
  }

  const record = input as Record<string, unknown>;
  const role = stringField(record.role, "viewer");

  if (!["owner", "admin", "maintainer", "member", "viewer"].includes(role)) {
    throw new Error(`Organization member "${id}" has unsupported role "${role}".`);
  }

  return {
    email: stringField(record.email, id),
    role: role as OrganizationRole,
    groups: stringList(record.groups)
  };
}

function parseGroup(id: string, input: unknown): OrganizationGroupSettings {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`Organization group "${id}" must be an object.`);
  }

  const record = input as Record<string, unknown>;

  return {
    id: stringField(record.id, id),
    displayName: stringField(record.displayName, id),
    memberEmails: stringList(record.memberEmails),
    libraryIds: stringList(record.libraryIds)
  };
}

function parseLibrary(id: string, input: unknown): OrganizationLibrarySettings {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`Organization library "${id}" must be an object.`);
  }

  const record = input as Record<string, unknown>;

  return {
    id: stringField(record.id, id),
    displayName: stringField(record.displayName, id),
    skillsPath: stringField(record.skillsPath, ""),
    recommendedSkills: stringList(record.recommendedSkills),
    optionalSkills: stringList(record.optionalSkills),
    installedSkills: stringList(record.installedSkills)
  };
}

function parseRecord<T>(
  input: unknown,
  parser: (id: string, value: unknown) => T,
  label: string
): Record<string, T> {
  if (input === undefined || input === null) {
    return {};
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`Organization field "${label}" must be an object.`);
  }

  const record: Record<string, T> = {};

  for (const [id, value] of Object.entries(input as Record<string, unknown>)) {
    record[id] = parser(id, value);
  }

  return record;
}

function stringField(input: unknown, fallback: string): string {
  if (input === undefined || input === null) {
    return fallback;
  }

  if (typeof input !== "string") {
    throw new Error("Organization string fields must be strings.");
  }

  return input.trim() || fallback;
}

function stringList(input: unknown): string[] {
  if (input === undefined || input === null) {
    return [];
  }

  if (!Array.isArray(input) || input.some((item) => typeof item !== "string")) {
    throw new Error("Organization list fields must be arrays of strings.");
  }

  return normalizeNames(input);
}

function normalizeNames(input: string[] | undefined): string[] {
  return [...new Set((input ?? []).map((item) => item.trim()).filter(Boolean))].sort();
}
