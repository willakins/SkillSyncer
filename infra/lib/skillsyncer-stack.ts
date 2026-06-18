import * as cdk from "aws-cdk-lib";
import { Duration, Stack, type StackProps } from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";

export class SkillSyncerStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const userPool = new cognito.UserPool(this, "UserPool", {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    const userPoolClient = new cognito.CfnUserPoolClient(this, "DesktopClient", {
      userPoolId: userPool.userPoolId,
      explicitAuthFlows: [
        "ALLOW_USER_PASSWORD_AUTH",
        "ALLOW_USER_SRP_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH"
      ],
      preventUserExistenceErrors: "ENABLED",
      supportedIdentityProviders: ["COGNITO"],
      accessTokenValidity: 60,
      idTokenValidity: 60,
      refreshTokenValidity: 30,
      tokenValidityUnits: {
        accessToken: "minutes",
        idToken: "minutes",
        refreshToken: "days"
      }
    });

    const metadataTable = new dynamodb.Table(this, "MetadataTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN
    });

    const metadataHandler = new nodejs.NodejsFunction(this, "MetadataHandler", {
      entry: "infra/lambda/metadata.ts",
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(10),
      environment: {
        TABLE_NAME: metadataTable.tableName
      }
    });

    metadataTable.grantReadData(metadataHandler);

    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      corsPreflight: {
        allowHeaders: ["authorization", "content-type"],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.OPTIONS
        ],
        allowOrigins: ["*"]
      }
    });

    const jwtAuthorizer = new authorizers.HttpJwtAuthorizer(
      "UserPoolAuthorizer",
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      {
        jwtAudience: [userPoolClient.ref]
      }
    );
    const metadataIntegration = new integrations.HttpLambdaIntegration("MetadataIntegration", metadataHandler);

    httpApi.addRoutes({
      path: "/me",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: metadataIntegration,
      authorizer: jwtAuthorizer
    });
    httpApi.addRoutes({
      path: "/repos",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: metadataIntegration,
      authorizer: jwtAuthorizer
    });
    httpApi.addRoutes({
      path: "/orgs",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: metadataIntegration,
      authorizer: jwtAuthorizer
    });
    httpApi.addRoutes({
      path: "/orgs/{orgId}/repos",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: metadataIntegration,
      authorizer: jwtAuthorizer
    });

    new cdk.CfnOutput(this, "AwsConfig", {
      value: JSON.stringify({
        region: this.region,
        userPoolId: userPool.userPoolId,
        userPoolClientId: userPoolClient.ref,
        apiBaseUrl: httpApi.apiEndpoint
      })
    });
  }
}
