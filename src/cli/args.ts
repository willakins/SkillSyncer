export interface CliOptions {
  command: string;
  skillNames: string[];
  repoRoot?: string;
  localRoot?: string;
  all: boolean;
  dryRun: boolean;
  includeChanged: boolean;
  json: boolean;
  help: boolean;
}

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    command: "status",
    skillNames: [],
    all: false,
    dryRun: false,
    includeChanged: false,
    json: false,
    help: false
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

    if (arg === "--repo-skills-dir") {
      options.repoRoot = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--local-skills-dir") {
      options.localRoot = readOptionValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--include-changed") {
      options.includeChanged = true;
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
