import { describe, expect, it } from "vitest";
import { parseArgs } from "../../src/cli/args";

describe("parseArgs", () => {
  it("keeps the first positional argument as the command and the rest as skill names", () => {
    expect(parseArgs(["export", "my-skill"])).toMatchObject({
      command: "export",
      skillNames: ["my-skill"]
    });
  });

  it("parses configured skill roots", () => {
    expect(parseArgs(["status", "--repo-skills-dir", "./skills", "--local-skills-dir", "~/.codex/skills"])).toMatchObject({
      command: "status",
      repoRoot: "./skills",
      localRoot: "~/.codex/skills"
    });
  });

  it("parses export selection flags", () => {
    expect(parseArgs(["export", "--all", "--dry-run"])).toMatchObject({
      command: "export",
      all: true,
      dryRun: true
    });
  });

  it("parses install overwrite and backup settings", () => {
    expect(parseArgs([
      "install",
      "--all",
      "--overwrite",
      "--backup-dir",
      "./backups",
      "--remote",
      "origin",
      "--branch",
      "main"
    ])).toMatchObject({
      command: "install",
      all: true,
      overwrite: true,
      backupRoot: "./backups",
      remote: "origin",
      branch: "main"
    });
  });

  it("parses config and publish options", () => {
    expect(parseArgs([
      "publish",
      "my-skill",
      "--message",
      "Publish my skill",
      "--settings-file",
      "./settings.json",
      "--no-backup"
    ])).toMatchObject({
      command: "publish",
      skillNames: ["my-skill"],
      message: "Publish my skill",
      settingsFile: "./settings.json",
      backup: false
    });
  });

  it("parses sync, conflict, clone, and organization options", () => {
    expect(parseArgs(["sync", "--no-pull", "--no-publish"])).toMatchObject({
      command: "sync",
      pull: false,
      publish: false
    });
    expect(parseArgs(["resolve", "changed-skill", "--keep-device"])).toMatchObject({
      command: "resolve",
      skillNames: ["changed-skill"],
      conflictAction: "keep-device"
    });
    expect(parseArgs(["clone", "git@example.com:acme/skills.git", "--target-dir", "./library"])).toMatchObject({
      command: "clone",
      skillNames: ["git@example.com:acme/skills.git"],
      targetDir: "./library"
    });
    expect(parseArgs(["org", "register-library", "--organization", "acme", "--library-id", "engineering", "--name", "Engineering"])).toMatchObject({
      command: "org",
      skillNames: ["register-library"],
      organizationId: "acme",
      libraryId: "engineering",
      displayName: "Engineering"
    });
  });
});
