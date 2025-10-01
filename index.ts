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
  note,
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
import {
  findPRTemplates,
  getPRTemplate,
  type PRTemplate,
} from "./utils/template";

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
  options: { template?: string | boolean; usage?: boolean },
): Promise<void> => {
  try {
    intro("lazypr");
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

    // Handle template selection
    let templateContent: string | undefined;
    if (options.template !== undefined) {
      // Template flag was provided
      if (
        options.template === "" ||
        options.template === "true" ||
        options.template === true
      ) {
        // Flag without value or --template flag: show interactive selection
        const availableTemplates = await findPRTemplates();

        if (availableTemplates.length === 0) {
          log.warning("No PR templates found in .github folder");
        } else if (availableTemplates.length === 1) {
          // Only one template, use it automatically
          const firstTemplate = availableTemplates[0];
          if (firstTemplate) {
            templateContent = firstTemplate.content;
            log.info(`Using template: ${firstTemplate.name}`);
          }
        } else {
          // Multiple templates, let user choose
          const selectedTemplate = await select({
            message: "Select a PR template:",
            options: availableTemplates.map((tmpl) => ({
              value: tmpl.path,
              label: `${tmpl.name} (${tmpl.path})`,
            })),
          });

          if (typeof selectedTemplate === "symbol") {
            log.info("No template selected, continuing without template");
          } else {
            const template = availableTemplates.find(
              (t) => t.path === selectedTemplate,
            );
            if (template) {
              templateContent = template.content;
              log.info(`Using template: ${template.name}`);
            }
          }
        }
      } else if (typeof options.template === "string") {
        // Specific template name/path provided
        const template = await getPRTemplate(options.template);
        if (template) {
          templateContent = template.content;
          log.info(`Using template: ${template.name}`);
        } else {
          log.warning(
            `Template '${options.template}' not found, continuing without template`,
          );
        }
      }
    }

    const spin = spinner({ indicator: "timer" });
    spin.start("🤖 Generating Pull Request");

    // Generate PR
    const { object: pullRequest, usage } = await generatePullRequest(
      currentBranch,
      commits,
      templateContent,
    );

    spin.stop("📝 Generated Pull Request");

    // Display detailed usage if flag is set
    if (options.usage) {
      note(
        `- Input: ${usage.inputTokens} tokens\n- Output: ${usage.outputTokens} tokens\n- Total: ${usage.totalTokens} tokens`,
        "📊 AI Model Usage",
      );
    }

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
  .option(
    "-t, --template [name]",
    "Use a PR template from .github folder. Omit value to select interactively, or provide template name/path",
  )
  .option("-u, --usage", "Display detailed AI token usage statistics")
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
      try {
        await config.set(trimmedKey as ConfigKey, value);
      } catch (error) {
        console.error(`error: ${(error as Error).message}`);
        process.exit(1);
      }
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
