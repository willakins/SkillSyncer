# AWS Backend

SkillSyncer can start in an authenticated desktop flow backed by AWS Cognito and a small metadata API.

## Auth Model

- Cognito User Pool supports self sign-up with email verification.
- The desktop app uses embedded forms and Cognito user-pool API calls.
- The User Pool app client must not have a client secret.
- Tokens are stored by the Electron main process under the app user-data directory using Electron `safeStorage` when available.

## Runtime Config

The desktop app reads non-secret AWS config from environment variables or a JSON file:

```bash
export SKILLSYNCER_AWS_REGION=us-east-1
export SKILLSYNCER_USER_POOL_ID=us-east-1_example
export SKILLSYNCER_USER_POOL_CLIENT_ID=exampleclientid
export SKILLSYNCER_API_BASE_URL=https://example.execute-api.us-east-1.amazonaws.com
```

or:

```bash
export SKILLSYNCER_AWS_CONFIG=/path/to/aws-config.json
```

The JSON shape matches `aws-config.example.json`.

## CDK Stack

Run:

```bash
npm run cdk:synth
```

The stack creates:

- Cognito User Pool and desktop app client.
- HTTP API Gateway with a Cognito JWT authorizer.
- DynamoDB metadata table.
- Lambda metadata API for `/me`, `/repos`, `/orgs`, and `/orgs/{orgId}/repos`.

The CDK output named `AwsConfig` is the JSON config the desktop app needs.

## Metadata

AWS stores repo and organization metadata only. Skill file contents remain in git repositories and local checkouts.

Repo items use `type = REPO` and include `repoId`, `displayName`, `cloneUrl`, optional `provider`, optional `defaultBranch`, and optional `orgId`.

Organization items use `type = ORG` and include `orgId`, `displayName`, and optional `repoCount`.

Cognito groups drive access. Use names such as:

```text
org_acme_admin
org_acme_member
repo_engineering-skills_maintainer
```
