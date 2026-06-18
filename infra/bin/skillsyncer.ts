#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { SkillSyncerStack } from "../lib/skillsyncer-stack";

const app = new cdk.App();

new SkillSyncerStack(app, "SkillSyncerStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1"
  }
});
