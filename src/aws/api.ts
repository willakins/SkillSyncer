import type { AwsAppConfig, ConnectedOrganization, ConnectedRepo } from "./types";

export class CloudApiClient {
  constructor(private readonly config: AwsAppConfig) {}

  listRepos(accessToken: string): Promise<ConnectedRepo[]> {
    return this.getJson("/repos", accessToken);
  }

  listOrganizations(accessToken: string): Promise<ConnectedOrganization[]> {
    return this.getJson("/orgs", accessToken);
  }

  listOrganizationRepos(accessToken: string, orgId: string): Promise<ConnectedRepo[]> {
    return this.getJson(`/orgs/${encodeURIComponent(orgId)}/repos`, accessToken);
  }

  private async getJson<T>(path: string, accessToken: string): Promise<T> {
    const response = await fetch(`${this.config.apiBaseUrl}${path}`, {
      headers: {
        authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Cloud API ${path} failed with ${response.status}: ${await response.text()}`);
    }

    return response.json() as Promise<T>;
  }
}
