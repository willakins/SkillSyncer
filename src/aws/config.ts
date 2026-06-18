import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { AwsAppConfig } from "./types";

const CONFIG_ENV_KEYS = {
  region: "SKILLSYNCER_AWS_REGION",
  userPoolId: "SKILLSYNCER_USER_POOL_ID",
  userPoolClientId: "SKILLSYNCER_USER_POOL_CLIENT_ID",
  apiBaseUrl: "SKILLSYNCER_API_BASE_URL"
} as const;

export async function loadAwsAppConfig(configPath = process.env.SKILLSYNCER_AWS_CONFIG): Promise<AwsAppConfig> {
  const envConfig = configFromEnv();

  if (envConfig) {
    return envConfig;
  }

  if (configPath) {
    return parseAwsAppConfig(JSON.parse(await readFile(resolve(configPath), "utf8")));
  }

  throw new Error([
    "AWS is not configured.",
    `Set ${Object.values(CONFIG_ENV_KEYS).join(", ")} or SKILLSYNCER_AWS_CONFIG.`
  ].join(" "));
}

export function parseAwsAppConfig(input: unknown): AwsAppConfig {
  if (!input || typeof input !== "object") {
    throw new Error("AWS app config must be a JSON object.");
  }

  const record = input as Record<string, unknown>;

  return {
    region: requiredString(record, "region"),
    userPoolId: requiredString(record, "userPoolId"),
    userPoolClientId: requiredString(record, "userPoolClientId"),
    apiBaseUrl: requiredString(record, "apiBaseUrl").replace(/\/+$/, "")
  };
}

function configFromEnv(): AwsAppConfig | undefined {
  const values = {
    region: process.env[CONFIG_ENV_KEYS.region],
    userPoolId: process.env[CONFIG_ENV_KEYS.userPoolId],
    userPoolClientId: process.env[CONFIG_ENV_KEYS.userPoolClientId],
    apiBaseUrl: process.env[CONFIG_ENV_KEYS.apiBaseUrl]
  };

  if (!values.region && !values.userPoolId && !values.userPoolClientId && !values.apiBaseUrl) {
    return undefined;
  }

  return parseAwsAppConfig(values);
}

function requiredString(record: Record<string, unknown>, key: keyof AwsAppConfig): string {
  const value = record[key];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`AWS app config field "${key}" is required.`);
  }

  return value.trim();
}
