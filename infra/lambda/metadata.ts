import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import type { ConnectedOrganization, ConnectedRepo, RepoCapabilities } from "../../src/aws/types";

const dynamodb = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME ?? "";

export async function handler(event: any): Promise<{ statusCode: number; headers: Record<string, string>; body: string }> {
  try {
    const claims = event.requestContext?.authorizer?.jwt?.claims ?? {};
    const path = event.rawPath ?? "/";
    const groups = parseGroups(claims["cognito:groups"]);

    if (path === "/me") {
      return json(200, {
        sub: claims.sub,
        email: claims.email,
        groups
      });
    }

    if (path === "/repos") {
      return json(200, await listRepos(groups));
    }

    if (path === "/orgs") {
      return json(200, await listOrganizations(groups));
    }

    const orgReposMatch = path.match(/^\/orgs\/([^/]+)\/repos$/);

    if (orgReposMatch) {
      const orgId = decodeURIComponent(orgReposMatch[1] ?? "");
      const repos = (await listRepos(groups)).filter((repo) => repo.orgId === orgId);

      return json(200, repos);
    }

    return json(404, { message: "Not found" });
  } catch (error) {
    return json(500, {
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

async function listRepos(groups: string[]): Promise<ConnectedRepo[]> {
  const items = await scanType("REPO");

  return items
    .map(repoFromItem)
    .filter((repo) => isAllowed(repo.repoId, repo.orgId, groups))
    .map((repo) => ({
      ...repo,
      capabilities: capabilitiesFor(repo.repoId, repo.orgId, groups)
    }));
}

async function listOrganizations(groups: string[]): Promise<ConnectedOrganization[]> {
  const items = await scanType("ORG");

  return items
    .map(orgFromItem)
    .map((org) => ({
      ...org,
      role: bestOrgRole(org.orgId, groups)
    }))
    .filter((org) => org.role !== "viewer" || groups.includes(groupName("org", org.orgId, "viewer")));
}

async function scanType(type: "REPO" | "ORG"): Promise<Record<string, string>[]> {
  const result = await dynamodb.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: "#type = :type",
    ExpressionAttributeNames: {
      "#type": "type"
    },
    ExpressionAttributeValues: {
      ":type": { S: type }
    }
  }));

  return (result.Items ?? []).map((item) => Object.fromEntries(Object.entries(item).flatMap(([key, value]) => {
    if ("S" in value && value.S !== undefined) {
      return [[key, value.S]];
    }

    if ("N" in value && value.N !== undefined) {
      return [[key, value.N]];
    }

    return [];
  })));
}

function repoFromItem(item: Record<string, string>): ConnectedRepo {
  return {
    repoId: required(item.repoId, "repoId"),
    displayName: item.displayName ?? required(item.repoId, "repoId"),
    cloneUrl: required(item.cloneUrl, "cloneUrl"),
    provider: provider(item.provider),
    defaultBranch: item.defaultBranch,
    orgId: item.orgId,
    capabilities: {
      canRead: true,
      canInstall: false,
      canExport: false,
      canPublish: false,
      canReplaceLocal: false
    }
  };
}

function orgFromItem(item: Record<string, string>): ConnectedOrganization {
  return {
    orgId: required(item.orgId, "orgId"),
    displayName: item.displayName ?? required(item.orgId, "orgId"),
    role: "viewer",
    repoCount: Number(item.repoCount ?? 0)
  };
}

function capabilitiesFor(repoId: string, orgId: string | undefined, groups: string[]): RepoCapabilities {
  const repoRole = bestRepoRole(repoId, groups);
  const orgRole = orgId ? bestOrgRole(orgId, groups) : "viewer";
  const role = strongerRole(repoRole, orgRole);
  const canWrite = ["owner", "admin", "maintainer"].includes(role);

  return {
    canRead: role !== "none",
    canInstall: role !== "none",
    canExport: canWrite,
    canPublish: canWrite,
    canReplaceLocal: role !== "none"
  };
}

function isAllowed(repoId: string, orgId: string | undefined, groups: string[]): boolean {
  return capabilitiesFor(repoId, orgId, groups).canRead;
}

function bestRepoRole(repoId: string, groups: string[]): RoleName | "none" {
  return bestRole("repo", repoId, groups);
}

function bestOrgRole(orgId: string, groups: string[]): RoleName {
  const role = bestRole("org", orgId, groups);

  return role === "none" ? "viewer" : role;
}

function bestRole(scope: "org" | "repo", id: string, groups: string[]): RoleName | "none" {
  for (const role of ["owner", "admin", "maintainer", "member", "viewer"] as const) {
    if (groups.includes(groupName(scope, id, role))) {
      return role;
    }
  }

  return "none";
}

function strongerRole(left: RoleName | "none", right: RoleName | "none"): RoleName | "none" {
  const ranking = ["none", "viewer", "member", "maintainer", "admin", "owner"];

  return ranking.indexOf(left) >= ranking.indexOf(right) ? left : right;
}

function groupName(scope: "org" | "repo", id: string, role: RoleName): string {
  return `${scope}_${id}_${role}`;
}

function parseGroups(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function provider(value: string | undefined): ConnectedRepo["provider"] {
  return value === "github" || value === "gitlab" || value === "self-hosted" ? value : "other";
}

function required(value: string | undefined, fieldName: string): string {
  if (!value) {
    throw new Error(`Metadata item is missing ${fieldName}.`);
  }

  return value;
}

function json(statusCode: number, body: unknown): { statusCode: number; headers: Record<string, string>; body: string } {
  return {
    statusCode,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

type RoleName = "owner" | "admin" | "maintainer" | "member" | "viewer";
