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
    expect(parseArgs(["export", "--all", "--dry-run", "--include-changed"])).toMatchObject({
      command: "export",
      all: true,
      dryRun: true,
      includeChanged: true
    });
  });
});
