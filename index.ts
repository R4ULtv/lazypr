import { Command } from "commander";
import clipboardy from "clipboardy";
import inquirer from "inquirer";
import chalk from "chalk";

import { pkg } from "./utils/info";
import {
  getAllBranches,
  getCurrentBranch,
  getPullRequestCommits,
  isGitRepository,
  type GitCommit,
} from "./utils/git";
import { generatePullRequest } from "./utils/groq";
import { addKeyValue, readSpecificKey } from "./utils/config";

const program = new Command();

// Simple error handler
const exitWithError = (message: string): never => {
  console.error(chalk.red(`${message}`));
  process.exit(1);
};

// Simple success message
const success = (message: string): void => {
  console.log(chalk.green(`${message}`));
};

// Copy to clipboard
const copyToClipboard = async (content: string): Promise<void> => {
  try {
    await clipboardy.write(content);
    success("Copied to clipboard!");
  } catch {
    console.log(chalk.yellow("Couldn't copy to clipboard"));
  }
};

// Main function
const createPullRequest = async (
  targetBranch: string = "master",
): Promise<void> => {
  try {
    // Check if git repo
    if (!(await isGitRepository())) {
      exitWithError("Not a git repository");
    }

    // Check for GROQ API KEY
    if (!(await readSpecificKey("GROQ_API_KEY"))) {
      exitWithError(
        "Set the GROQ_API_KEY with: lazypr config set GROQ_API_KEY=<your-api-key>",
      );
    }

    // Get current branch
    const currentBranch = await getCurrentBranch();
    if (!currentBranch) {
      exitWithError("No current branch found");
    }

    // Check branches aren't the same
    if (currentBranch === targetBranch) {
      exitWithError(`Already on target branch '${targetBranch}'`);
    }

    // Check target branch exists
    const branches = await getAllBranches();
    if (!branches.includes(targetBranch)) {
      exitWithError(`Branch '${targetBranch}' doesn't exist`);
    }

    // Get commits
    const commits = await getPullRequestCommits(targetBranch);
    if (!commits || commits.length === 0) {
      exitWithError("No commits found for pull request");
    }

    const commitCount = commits.length;
    console.log(
      chalk.blue(
        `You want to merge ${commitCount} commit${commitCount === 1 ? "" : "s"} into '${targetBranch}' from '${currentBranch}'`,
      ),
    );

    // Generate PR
    const pullRequest = await generatePullRequest(currentBranch, commits);

    // Display result
    console.log("\n" + chalk.bold.cyan("Title:"));
    console.log(pullRequest.title);
    console.log("\n" + chalk.bold.cyan("Description:"));
    console.log(pullRequest.description);

    // Ask what to copy
    const { copyChoice } = await inquirer.prompt([
      {
        type: "list",
        name: "copyChoice",
        message: "Copy to clipboard:",
        choices: [
          "Title only",
          "Description only",
          "Both (title + description)",
          "Nothing",
        ],
      },
    ]);

    switch (copyChoice) {
      case "Title only":
        await copyToClipboard(pullRequest.title);
        break;
      case "Description only":
        await copyToClipboard(pullRequest.description);
        break;
      case "Both (title + description)":
        await copyToClipboard(
          `${pullRequest.title}\n\n${pullRequest.description}`,
        );
        break;
    }

    success("Done!");
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
  .argument("[target]", "Target branch", "master")
  .action(createPullRequest);

program
  .command("config")
  .description("Manage the config file, see the .lazypr file")
  .argument("<type>", "Type of config operation (set or get)")
  .argument("<keyValue>", "For 'set': KEY=VALUE pair. For 'get': just the KEY")
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
        process.exit(1);
      }

      console.log(`Setting config: ${key.trim()} = ${value}`);
      await addKeyValue(key.trim(), value);
    } else if (type === "get") {
      // For get operation, keyValue is just the key
      const key = keyValue.trim();

      if (!key) {
        console.error("Error: Key cannot be empty");
        process.exit(1);
      }

      const value = await readSpecificKey(key);

      if (value !== undefined) {
        console.log(`${key} = ${value}`);
      } else {
        console.log(`Key '${key}' not found in config`);
      }
    } else {
      console.error(`Error: Invalid operation '${type}'. Use 'set' or 'get'`);
      process.exit(1);
    }
  });

program.parse();
