"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// infra/lambda/metadata.ts
var metadata_exports = {};
__export(metadata_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(metadata_exports);
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var dynamodb = new import_client_dynamodb.DynamoDBClient({});
var TABLE_NAME = process.env.TABLE_NAME ?? "";
async function handler(event) {
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
async function listRepos(groups) {
  const items = await scanType("REPO");
  return items.map(repoFromItem).filter((repo) => isAllowed(repo.repoId, repo.orgId, groups)).map((repo) => ({
    ...repo,
    capabilities: capabilitiesFor(repo.repoId, repo.orgId, groups)
  }));
}
async function listOrganizations(groups) {
  const items = await scanType("ORG");
  return items.map(orgFromItem).map((org) => ({
    ...org,
    role: bestOrgRole(org.orgId, groups)
  })).filter((org) => org.role !== "viewer" || groups.includes(groupName("org", org.orgId, "viewer")));
}
async function scanType(type) {
  const result = await dynamodb.send(new import_client_dynamodb.ScanCommand({
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
    if ("S" in value && value.S !== void 0) {
      return [[key, value.S]];
    }
    if ("N" in value && value.N !== void 0) {
      return [[key, value.N]];
    }
    return [];
  })));
}
function repoFromItem(item) {
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
function orgFromItem(item) {
  return {
    orgId: required(item.orgId, "orgId"),
    displayName: item.displayName ?? required(item.orgId, "orgId"),
    role: "viewer",
    repoCount: Number(item.repoCount ?? 0)
  };
}
function capabilitiesFor(repoId, orgId, groups) {
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
function isAllowed(repoId, orgId, groups) {
  return capabilitiesFor(repoId, orgId, groups).canRead;
}
function bestRepoRole(repoId, groups) {
  return bestRole("repo", repoId, groups);
}
function bestOrgRole(orgId, groups) {
  const role = bestRole("org", orgId, groups);
  return role === "none" ? "viewer" : role;
}
function bestRole(scope, id, groups) {
  for (const role of ["owner", "admin", "maintainer", "member", "viewer"]) {
    if (groups.includes(groupName(scope, id, role))) {
      return role;
    }
  }
  return "none";
}
function strongerRole(left, right) {
  const ranking = ["none", "viewer", "member", "maintainer", "admin", "owner"];
  return ranking.indexOf(left) >= ranking.indexOf(right) ? left : right;
}
function groupName(scope, id, role) {
  return `${scope}_${id}_${role}`;
}
function parseGroups(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string");
  }
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}
function provider(value) {
  return value === "github" || value === "gitlab" || value === "self-hosted" ? value : "other";
}
function required(value, fieldName) {
  if (!value) {
    throw new Error(`Metadata item is missing ${fieldName}.`);
  }
  return value;
}
function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
