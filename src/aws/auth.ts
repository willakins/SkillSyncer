import {
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  SignUpCommand,
  type AuthenticationResultType
} from "@aws-sdk/client-cognito-identity-provider";
import type {
  AuthSession,
  AwsAppConfig,
  ConfirmForgotPasswordRequest,
  ConfirmSignUpRequest,
  ForgotPasswordRequest,
  PublicAuthSession,
  SignInRequest,
  SignUpRequest
} from "./types";

export class CognitoAuthService {
  private readonly client: CognitoIdentityProviderClient;

  constructor(private readonly config: AwsAppConfig) {
    this.client = new CognitoIdentityProviderClient({ region: config.region });
  }

  async signUp(request: SignUpRequest): Promise<void> {
    await this.client.send(new SignUpCommand({
      ClientId: this.config.userPoolClientId,
      Username: request.email.trim(),
      Password: request.password,
      UserAttributes: [{ Name: "email", Value: request.email.trim() }]
    }));
  }

  async confirmSignUp(request: ConfirmSignUpRequest): Promise<void> {
    await this.client.send(new ConfirmSignUpCommand({
      ClientId: this.config.userPoolClientId,
      Username: request.email.trim(),
      ConfirmationCode: request.code.trim()
    }));
  }

  async signIn(request: SignInRequest): Promise<AuthSession | { challengeName: string; session?: string }> {
    const result = await this.client.send(new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: this.config.userPoolClientId,
      AuthParameters: {
        USERNAME: request.email.trim(),
        PASSWORD: request.password
      }
    }));

    if (result.ChallengeName) {
      return {
        challengeName: result.ChallengeName,
        session: result.Session
      };
    }

    return sessionFromAuthenticationResult(request.email.trim(), result.AuthenticationResult);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const result = await this.client.send(new InitiateAuthCommand({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: this.config.userPoolClientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    }));

    return sessionFromAuthenticationResult("", {
      ...result.AuthenticationResult,
      RefreshToken: refreshToken
    });
  }

  async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
    await this.client.send(new ForgotPasswordCommand({
      ClientId: this.config.userPoolClientId,
      Username: request.email.trim()
    }));
  }

  async confirmForgotPassword(request: ConfirmForgotPasswordRequest): Promise<void> {
    await this.client.send(new ConfirmForgotPasswordCommand({
      ClientId: this.config.userPoolClientId,
      Username: request.email.trim(),
      ConfirmationCode: request.code.trim(),
      Password: request.password
    }));
  }
}

export function publicSession(session: AuthSession): PublicAuthSession {
  return {
    username: session.username,
    email: session.email,
    expiresAt: session.expiresAt
  };
}

function sessionFromAuthenticationResult(
  fallbackUsername: string,
  result: AuthenticationResultType | undefined
): AuthSession {
  if (!result?.AccessToken || !result.IdToken) {
    throw new Error("Cognito sign-in did not return usable tokens.");
  }

  const claims = decodeJwtPayload(result.IdToken);
  const expiresInSeconds = result.ExpiresIn ?? 3600;

  return {
    username: stringClaim(claims, "cognito:username") ?? stringClaim(claims, "sub") ?? fallbackUsername,
    email: stringClaim(claims, "email") ?? fallbackUsername,
    idToken: result.IdToken,
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString()
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const [, payload] = token.split(".");

  if (!payload) {
    return {};
  }

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  try {
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function stringClaim(claims: Record<string, unknown>, key: string): string | undefined {
  const value = claims[key];

  return typeof value === "string" && value.trim() ? value : undefined;
}
