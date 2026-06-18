export interface CliOptions {
  command: string;
  skillNames: string[];
  repoRoot?: string;
  localRoot?: string;
  backupRoot?: string;
  settingsFile?: string;
  remote?: string;
  branch?: string;
  message?: string;
  targetDir?: string;
  organizationId?: string;
  libraryId?: string;
  displayName?: string;
  all: boolean;
  dryRun: boolean;
  json: boolean;
  help: boolean;
  overwrite: boolean;
  backup: boolean;
  pull: boolean;
  publish: boolean;
  conflictAction?: "use-library" | "keep-device" | "skip";
}

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    command: "status",
    skillNames: [],
    all: false,
    dryRun: false,
    json: false,
    help: false,
    overwrite: false,
    backup: true,
    pull: true,
    publish: true
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--all") {
      options.all = true;
      continue;
    }

    if (arg === "--repo-skills-dir" || arg === "--library-skills-dir") {
      options.repoRoot = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--local-skills-dir") {
      options.localRoot = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--backup-dir") {
      options.backupRoot = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--settings-file") {
      options.settingsFile = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--remote") {
      options.remote = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--branch") {
      options.branch = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--message" || arg === "-m") {
      options.message = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--target-dir") {
      options.targetDir = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--organization") {
      options.organizationId = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--library-id") {
      options.libraryId = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--name") {
      options.displayName = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--overwrite") {
      options.overwrite = true;
      continue;
    }

    if (arg === "--backup") {
      options.backup = true;
      continue;
    }

    if (arg === "--no-pull") {
      options.pull = false;
      continue;
    }

    if (arg === "--no-publish") {
      options.publish = false;
      continue;
    }

    if (arg === "--use-library") {
      options.conflictAction = "use-library";
      continue;
    }

    if (arg === "--keep-device") {
      options.conflictAction = "keep-device";
      continue;
    }

    if (arg === "--skip") {
      options.conflictAction = "skip";
      continue;
    }

    if (arg === "--no-backup") {
      options.backup = false;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (options.command === "status") {
      options.command = arg;
    } else {
      options.skillNames.push(arg);
    }
  }

  return options;
}

function readOptionValue(args: string[], index: number, optionName: string): string {
  const value = args[index + 1];

  if (!value || value.startsWith("-")) {
    throw new Error(`Missing value for ${optionName}`);
  }

  return value;
}
