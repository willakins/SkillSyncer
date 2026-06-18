import { describe, expect, it } from "vitest";
import { parseAwsAppConfig } from "../../src/aws/config";

describe("parseAwsAppConfig", () => {
  it("accepts the public Cognito and API settings needed by the desktop app", () => {
    expect(parseAwsAppConfig({
      region: "us-east-1",
      userPoolId: "us-east-1_example",
      userPoolClientId: "client",
      apiBaseUrl: "https://example.execute-api.us-east-1.amazonaws.com/"
    })).toEqual({
      region: "us-east-1",
      userPoolId: "us-east-1_example",
      userPoolClientId: "client",
      apiBaseUrl: "https://example.execute-api.us-east-1.amazonaws.com"
    });
  });

  it("rejects incomplete config", () => {
    expect(() => parseAwsAppConfig({ region: "us-east-1" })).toThrow("userPoolId");
  });
});
