#!/usr/bin/env node

import { Command } from "commander";
import clipboardy from "clipboardy";
import {
  intro,
  outro,
  cancel,
  log,
  spinner,
  confirm,
  select,
} from "@clack/prompts";

import { pkg } from "./utils/info";
import {
  getAllBranches,
  getCurrentBranch,
  getPullRequestCommits,
  isGitRepository,
} from "./utils/git";
import { generatePullRequest } from "./utils/groq";
import { config, CONFIG_SCHEMA, type ConfigKey } from "./utils/config";

const program = new Command();

// Simple error handler
const exitWithError = (message: string): never => {
  cancel(message);
  process.exit(0);
};

// Simple success message
const success = (message: string): void => {
  log.success(message);
};

// Copy to clipboard
const copyToClipboard = async (content: string): Promise<void> => {
  try {
    await clipboardy.write(content);
    success("Copied to clipboard!");
  } catch {
    log.warn("Couldn't copy to clipboard");
  }
};

// Main function
const createPullRequest = async (
  targetBranch: string | undefined,
): Promise<void> => {
  try {
    intro("🚀 LazyPR - Generate Pull Request");
    targetBranch = targetBranch || (await config.get("DEFAULT_BRANCH"));

    // Check if git repo
    if (!(await isGitRepository())) {
      exitWithError("Not a git repository");
    }

    // Check for GROQ API KEY
    try {
      await config.get("GROQ_API_KEY");
    } catch {
      exitWithError(
        "Set the GROQ_API_KEY with: lazypr config set GROQ_API_KEY=<your-api-key>",
      );
    }

    // Get current branch
    const currentBranch = await getCurrentBranch();
    if (!currentBranch) {
      exitWithError("No current branch found");
    }

    // Get all branches
    const branches = await getAllBranches();

    // Check if branches are the same
    if (currentBranch === targetBranch) {
      log.warning(
        `Target branch '${targetBranch}' is the same as current branch '${currentBranch}'`,
      );
    }

    // Check if target branch exists
    if (!branches.includes(targetBranch)) {
      log.warning(
        `Target branch '${targetBranch}' doesn't exist. You can change the default branch in the config.`,
      );
    }

    // If either condition is true, show branch selection
    if (currentBranch === targetBranch || !branches.includes(targetBranch)) {
      const availableBranches = branches.filter(
        (branch) => branch !== currentBranch,
      );

      if (availableBranches.length === 0) {
        exitWithError("No other branches available to merge into");
      }

      const selectedBranch = await select({
        message: `Select target branch to merge '${currentBranch}' into:`,
        options: availableBranches.map((branch) => ({
          value: branch,
          label: branch,
        })),
      });

      if (typeof selectedBranch === "symbol") {
        exitWithError("Branch selection cancelled");
      }

      targetBranch = selectedBranch as string;
    }

    // Get commits
    const commits = await getPullRequestCommits(targetBranch);
    if (!commits || commits.length === 0) {
      exitWithError("No commits found for pull request");
    }

    const commitCount = commits.length;
    log.info(
      `You want to merge ${commitCount} commit${
        commitCount === 1 ? "" : "s"
      } into '${targetBranch}' from '${currentBranch}'`,
    );

    const spin = spinner();
    const startTime = performance.now();
    spin.start("🤖 Generating Pull Request");

    // Generate PR
    const pullRequest = await generatePullRequest(currentBranch, commits);

    const endTime = performance.now();
    const timeInSeconds = ((endTime - startTime) / 1000).toFixed(2);
    spin.stop(`📝 Generated Pull Request in ${timeInSeconds}s`);

    log.info(`Pull Request Title: ${pullRequest.title}`);
    log.info(`Pull Request Description: ${pullRequest.description}`);

    const copyTitle = await confirm({
      message: "Do you want to copy the title ?",
    });

    if (copyTitle) {
      await copyToClipboard(pullRequest.title);
    }

    const copyDescription = await confirm({
      message: "Do you want to copy the description ?",
    });

    if (copyDescription) {
      await copyToClipboard(pullRequest.description);
    }
    outro("✅ Done!");
  } catch (error) {
    exitWithError(
      `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// Setup CLI
program
  .name(pkg.name)
  .version(pkg.version)
  .description("Generate pull request title and description")
  .argument("[target]", "Target branch")
  .action(createPullRequest);

program
  .command("config")
  .description("Manage the config file, see the .lazypr file")
  .argument("<type>", "Type of config operation (set, get, or remove)")
  .argument(
    "<keyValue>",
    "For 'set': KEY=VALUE pair. For 'get' or 'remove': just the KEY",
  )
  .action(async (type, keyValue) => {
    if (type === "set") {
      // Check if the keyValue contains '='
      if (!keyValue.includes("=")) {
        console.error(
          "Error: For 'set' operation, key-value pair must be in format KEY=VALUE",
        );
        process.exit(1);
      }

      // Split only on the first '=' to handle values that might contain '='
      const equalIndex = keyValue.indexOf("=");
      const key = keyValue.substring(0, equalIndex);
      const value = keyValue.substring(equalIndex + 1);

      // Validate that both key and value exist
      if (!key.trim()) {
        console.error("Error: Key cannot be empty");
        process.exit(0);
      }

      const trimmedKey = key.trim();
      if (!(trimmedKey in CONFIG_SCHEMA)) {
        console.error(
          `Error: Unknown config key '${trimmedKey}'. Valid keys: ${Object.keys(CONFIG_SCHEMA).join(", ")}`,
        );
        process.exit(0);
      }
      console.log(`Setting config: ${trimmedKey} = ${value}`);
      await config.set(trimmedKey as ConfigKey, value);
    } else if (type === "get") {
      // For get operation, keyValue is just the key
      const key = keyValue.trim();

      if (!key) {
        console.error("Error: Key cannot be empty");
        process.exit(0);
      }

      if (!(key in CONFIG_SCHEMA)) {
        console.error(
          `Error: Unknown config config '${key}'. Valid config: ${Object.keys(CONFIG_SCHEMA).join(", ")}`,
        );
        process.exit(0);
      }
      const value = await config.get(key as ConfigKey).catch(() => undefined);

      if (value !== undefined) {
        console.log(`${key} = ${value}`);
      } else {
        console.log(`Key '${key}' not found in config`);
      }
    } else if (type === "remove") {
      // For remove operation, keyValue is just the key
      const key = keyValue.trim();

      if (!key) {
        console.error("Error: Key cannot be empty");
        process.exit(0);
      }

      if (!(key in CONFIG_SCHEMA)) {
        console.error(
          `Error: Unknown config key '${key}'. Valid keys: ${Object.keys(CONFIG_SCHEMA).join(", ")}`,
        );
        process.exit(0);
      }

      console.log(`Removing config: ${key}`);
      await config.remove(key as ConfigKey);
      success(`Config key '${key}' removed successfully`);
    } else {
      console.error(
        `Error: Invalid operation '${type}'. Use 'set', 'get', or 'remove'`,
      );
      process.exit(1);
    }
  });

program.parse();
