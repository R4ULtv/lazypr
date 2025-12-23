#!/usr/bin/env node

import {
  cancel,
  confirm,
  intro,
  log,
  note,
  outro,
  select,
  spinner,
} from "@clack/prompts";
import clipboardy from "clipboardy";
import { Command } from "commander";
import { displayConfigBadge } from "./utils/badge";
import {
  CONFIG_FILE,
  CONFIG_SCHEMA,
  type ConfigKey,
  config,
} from "./utils/config";
import {
  getAllBranches,
  getCurrentBranch,
  getPullRequestCommits,
  isGitRepository,
} from "./utils/git";
import { pkg } from "./utils/info";
import { formatLabels } from "./utils/labels";
import { generatePullRequest, validateProviderApiKey } from "./utils/provider";
import { findPRTemplates, getPRTemplate } from "./utils/template";

const program = new Command();

// ANSI formatting constants
const ANSI = {
  bold: "\x1b[1m",
  underline: "\x1b[4m",
  reset: "\x1b[0m",
} as const;

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
    log.warn(
      "Failed to copy to clipboard. You can manually copy the content above.",
    );
  }
};

// Main function
const createPullRequest = async (
  target: string | undefined,
  options: {
    template?: string | boolean;
    usage?: boolean;
    locale?: string;
    filter?: boolean;
    gh?: boolean;
    context?: string;
  },
): Promise<void> => {
  try {
    intro("\x1b[30;47m lazypr \x1b[0m"); // Black text on white background for branding
    let targetBranch = target || (await config.get("DEFAULT_BRANCH"));

    // Validate locale if provided
    if (options.locale) {
      try {
        options.locale = CONFIG_SCHEMA.LOCALE.validate(options.locale);
      } catch (error) {
        exitWithError(
          `Invalid locale: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Validate context if provided
    if (options.context) {
      try {
        options.context = CONFIG_SCHEMA.CONTEXT.validate(options.context);
      } catch (error) {
        exitWithError(
          `Invalid context: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Check if git repo
    await isGitRepository();

    // Check for provider API KEY
    try {
      await validateProviderApiKey();
    } catch (error) {
      exitWithError(
        error instanceof Error ? error.message : "Provider API key is required",
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
      log.warn(
        `Target branch '${targetBranch}' is the same as current branch '${currentBranch}'`,
      );
    }

    // Check if target branch exists
    if (!branches.includes(targetBranch)) {
      log.warn(
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

    // Get commits (with optional filtering override)
    // When --no-filter is used, options.filter is false
    const filterDisabled = options.filter === false;
    const commits = await getPullRequestCommits(targetBranch, filterDisabled);

    if (!commits || commits.length === 0) {
      const filterEnabled =
        !filterDisabled && (await config.get("FILTER_COMMITS")) === "true";

      if (filterEnabled) {
        // Get unfiltered commits to show how many were filtered
        const unfilteredCommits = await getPullRequestCommits(
          targetBranch,
          true,
        );
        const filteredCount = unfilteredCommits.length;

        exitWithError(
          `No commits found after filtering. ${filteredCount} commit${filteredCount === 1 ? "" : "s"} filtered out (merge commits, dependency updates, or formatting changes).\nUse --no-filter to include all commits.`,
        );
      }

      exitWithError("No commits found for pull request");
    }

    const commitCount = commits.length;
    log.info(
      `You want to merge ${commitCount} commit${
        commitCount === 1 ? "" : "s"
      } into ${ANSI.bold}${ANSI.underline}${targetBranch}${ANSI.reset} from ${ANSI.bold}${ANSI.underline}${currentBranch}${ANSI.reset}`,
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
          log.warn("No PR templates found in .github folder");
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
          log.warn(
            `Template '${options.template}' not found, continuing without template`,
          );
        }
      }
    }

    // Display configuration badge before generating PR
    const currentLocale = options.locale || (await config.get("LOCALE"));
    const currentContext = options.context || (await config.get("CONTEXT"));
    const filterEnabled =
      options.filter !== false &&
      (await config.get("FILTER_COMMITS")) === "true";

    // Extract template name from templateContent if available
    let templateName: string | undefined;
    if (templateContent) {
      // Try to find template name from the previous logs or use generic name
      const availableTemplates = await findPRTemplates();
      const matchedTemplate = availableTemplates.find(
        (t) => t.content === templateContent,
      );
      templateName = matchedTemplate?.name || "Custom Template";
    }

    displayConfigBadge({
      provider: await config.get("PROVIDER"),
      smartFilter: filterEnabled,
      locale: currentLocale,
      template: templateName,
      usage: options.usage || false,
      ghCli: options.gh || false,
      model: await config.get("MODEL"),
      context: currentContext,
    });

    const spin = spinner({ indicator: "timer" });
    spin.start("Generating Pull Request");

    // Generate PR
    const {
      object: pullRequest,
      usage,
      finishReason,
    } = await generatePullRequest(
      currentBranch,
      commits,
      templateContent,
      options.locale,
      options.context,
    );

    spin.stop("Generated Pull Request");

    // Display detailed usage if flag is set
    if (options.usage) {
      note(
        `- Input: ${usage.inputTokens} tokens\n- Output: ${usage.outputTokens} tokens\n- Total: ${usage.totalTokens} tokens\n- Finish Reason: ${finishReason}`,
        "AI Model Usage",
      );
    }

    if (pullRequest.labels?.length) {
      const customLabelsConfig = await config.get("CUSTOM_LABELS");
      const coloredLabels = formatLabels(
        pullRequest.labels,
        customLabelsConfig,
      );
      log.info(`Pull Request Labels: ${coloredLabels}`);
    }

    log.info(`Pull Request Title: ${pullRequest.title}`);
    log.info(`Pull Request Description: ${pullRequest.description}`);

    // If --gh flag is provided, generate and copy the gh pr create command
    if (options.gh) {
      // Helper function to escape shell special characters for $'...' syntax
      const escapeShellArg = (str: string): string => {
        return str
          .replace(/\\/g, "\\\\") // Escape backslashes first
          .replace(/'/g, "\\'") // Escape single quotes for $'...' syntax
          .replace(/`/g, "\\`") // Escape backticks
          .replace(/\$/g, "\\$") // Escape dollar signs
          .replace(/\n/g, "\\n"); // Keep newlines as \n for $'...' syntax
      };

      const escapedTitle = escapeShellArg(pullRequest.title);
      const escapedDescription = escapeShellArg(pullRequest.description);

      // Build labels part of the command
      const labelsArg =
        pullRequest.labels && pullRequest.labels.length > 0
          ? `-l "${pullRequest.labels.join(", ")}"`
          : "";

      // Use $'...' syntax for the body to properly interpret \n as newlines
      const ghCommand = `gh pr create -B ${targetBranch} ${labelsArg} -t $'${escapedTitle}' -b $'${escapedDescription}'`;

      const copyCommand = await confirm({
        message: "Do you want to copy the GitHub CLI command?",
      });

      if (copyCommand) {
        await copyToClipboard(ghCommand);
      }
    } else {
      // Original behavior when --gh is not used
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
    }

    log.info(
      "Remember: AI can make mistakes, always review the generated content.",
    );
    outro("Done!");
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
  .option(
    "-l, --locale <language>",
    "Set the language for the PR content (en, es, pt, fr, de, it, ja, ko, zh, ru, nl, pl, tr). Overrides config setting",
  )
  .option(
    "--no-filter",
    "Disable smart commit filtering (include merge commits, dependency updates, and formatting changes)",
  )
  .option(
    "--gh",
    "Generate and copy a GitHub CLI (gh pr create) command instead of copying title and description separately",
  )
  .option(
    "-c, --context <text>",
    "Add custom context to guide PR generation (e.g., 'make it simple and cohesive'). Overrides config setting",
  )
  .action(createPullRequest);

program
  .command("config")
  .description("Manage the config file, see the .lazypr file")
  .argument("<type>", "Type of config operation (set, get, remove, list)")
  .argument(
    "[keyValue]",
    "For 'set': KEY=VALUE pair. For 'get' or 'remove': just the KEY. Not needed for 'list'",
  )
  .action(async (type, keyValue) => {
    if (type === "list") {
      // Get all current config
      const allConfig = await config.getAll();

      // Build the output lines
      const lines: string[] = [];

      // Display each config key with its value or default
      for (const key of Object.keys(CONFIG_SCHEMA) as ConfigKey[]) {
        const schema = CONFIG_SCHEMA[key];
        const currentValue = allConfig[key];
        const defaultValue =
          "default" in schema
            ? (schema as { default?: string }).default
            : undefined;
        const isRequired =
          "required" in schema
            ? Boolean((schema as { required?: boolean }).required)
            : false;

        let displayValue: string;
        let status: string;

        if (currentValue !== undefined && currentValue !== "") {
          // Mask sensitive values (API keys)
          if (key.endsWith("_API_KEY")) {
            const masked =
              currentValue.length > 4
                ? `${"*".repeat(currentValue.length - 4)}${currentValue.slice(-4)}`
                : "****";
            displayValue = masked;
            status = "\x1b[32m✓\x1b[0m"; // Green checkmark
          } else {
            displayValue = currentValue;
            status = "\x1b[32m✓\x1b[0m"; // Green checkmark
          }
        } else if (defaultValue !== undefined) {
          displayValue = `${defaultValue} \x1b[2m(default)\x1b[0m`;
          status = "\x1b[33m○\x1b[0m"; // Yellow circle
        } else if (isRequired) {
          displayValue = "\x1b[31mNOT SET (required)\x1b[0m";
          status = "\x1b[31m✗\x1b[0m"; // Red X
        } else {
          displayValue = "\x1b[2mnot set\x1b[0m";
          status = "\x1b[2m○\x1b[0m"; // Dim circle
        }

        lines.push(`${status} \x1b[1m${key}\x1b[0m: ${displayValue}`);
      }

      // Display configuration settings in first note
      note(lines.join("\n"), "Configuration Settings");

      // Display file location and warning in second note
      const locationLines: string[] = [];
      locationLines.push(`\x1b[2mLocation: ${CONFIG_FILE}\x1b[0m`);
      locationLines.push("");
      locationLines.push(
        "\x1b[33m⚠️  Editing the config file manually is not recommended - use the CLI\x1b[0m",
      );
      locationLines.push(
        "\x1b[33m   commands instead to avoid misconfigurations\x1b[0m",
      );

      note(locationLines.join("\n"), "Config File");

      return;
    } else if (type === "set") {
      // Check if the keyValue contains '='
      if (!keyValue.includes("=")) {
        log.error(
          "Error: For 'set' operation, key-value pair must be in format KEY=VALUE\nExample: lazypr config set LOCALE=es",
        );
        process.exit(1);
      }

      // Split only on the first '=' to handle values that might contain '='
      const equalIndex = keyValue.indexOf("=");
      const key = keyValue.substring(0, equalIndex);
      const value = keyValue.substring(equalIndex + 1);

      // Validate that both key and value exist
      if (!key.trim()) {
        log.error("Error: Key cannot be empty");
        process.exit(1);
      }

      const trimmedKey = key.trim();
      if (!(trimmedKey in CONFIG_SCHEMA)) {
        log.error(
          `Error: Unknown config key '${trimmedKey}'.\nRun 'lazypr config list' to see all available keys.`,
        );
        process.exit(1);
      }
      log.info(`Setting config: ${trimmedKey} = ${value}`);
      try {
        await config.set(trimmedKey as ConfigKey, value);
      } catch (error) {
        log.error(`error: ${(error as Error).message}`);
        process.exit(1);
      }
    } else if (type === "get") {
      // For get operation, keyValue is just the key
      const key = keyValue.trim();

      if (!key) {
        log.error("Error: Key cannot be empty");
        process.exit(1);
      }

      if (!(key in CONFIG_SCHEMA)) {
        log.error(
          `Error: Unknown config key '${key}'.\nRun 'lazypr config list' to see all available keys.`,
        );
        process.exit(1);
      }
      const value = await config.get(key as ConfigKey).catch(() => undefined);

      if (value !== undefined) {
        log.warn(`${key} = ${value}`);
      } else {
        log.warn(`Key '${key}' not found in config`);
      }
    } else if (type === "remove") {
      // For remove operation, keyValue is just the key
      const key = keyValue.trim();

      if (!key) {
        log.error("Error: Key cannot be empty");
        process.exit(1);
      }

      if (!(key in CONFIG_SCHEMA)) {
        log.error(
          `Error: Unknown config key '${key}'. Valid keys: ${Object.keys(CONFIG_SCHEMA).join(", ")}`,
        );
        process.exit(1);
      }

      log.info(`Removing config: ${key}`);
      await config.remove(key as ConfigKey);
      success(`Config key '${key}' removed successfully`);
    } else {
      log.error(
        `Error: Invalid operation '${type}'. Use 'set', 'get', 'remove', 'list'`,
      );
      process.exit(1);
    }
  });

program.parse();
