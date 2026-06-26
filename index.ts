#!/usr/bin/env node

import {
  autocomplete,
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  note,
  outro,
  password,
  select,
  spinner,
  text,
} from "@clack/prompts";
import { writeText } from "tinyclip";
import { Command } from "commander";
import { displayConfigBadge } from "./utils/badge";
import { CONFIG_FILE, CONFIG_KEYS, CONFIG_SCHEMA, type ConfigKey, config } from "./utils/config";
import { colorize } from "./utils/colors";
import {
  getAllBranches,
  getCurrentBranch,
  getPullRequestCommits,
  isGitRepository,
} from "./utils/git";
import { pkg } from "./utils/info";
import { formatLabels } from "./utils/labels";
import {
  CUSTOM_MODEL_SENTINEL,
  LOCALE_OPTIONS,
  MODEL_COMBOS,
  applyProviderModel,
  getApiKeyConfigKey,
  getApiKeyLink,
  isProviderType,
  validateConfigValue,
} from "./utils/models";
import { generatePullRequest, validateProviderApiKey } from "./utils/provider";
import { buildGhPrCommand } from "./utils/shell";
import { findPRTemplates, getPRTemplate } from "./utils/template";

const program = new Command();

const isConfigKey = (value: string): value is ConfigKey => value in CONFIG_SCHEMA;

// Returns true for config keys that hold sensitive secrets (API keys)
const isSensitiveConfigKey = (key: string): boolean => key.endsWith("_API_KEY");

// Masks the value for sensitive keys; returns raw value for non-sensitive keys
const maskConfigValue = (key: string, value: string): string => {
  if (!isSensitiveConfigKey(key)) return value;
  return value.length > 4 ? `${"*".repeat(value.length - 4)}${value.slice(-4)}` : "****";
};

// Simple error handler
const exitWithError = (message: string): never => {
  cancel(message);
  process.exit(1);
  throw new Error(message);
};

// Simple success message
const success = (message: string): void => {
  log.success(message);
};

// Validate config option value
const validateOption = (
  value: string | undefined,
  key: "LOCALE" | "CONTEXT",
): string | undefined => {
  if (!value) return undefined;
  try {
    return CONFIG_SCHEMA[key].validate(value);
  } catch (error) {
    return exitWithError(
      `Invalid ${key.toLowerCase()}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
};

// Select target branch with autocomplete
const selectTargetBranch = async (
  currentBranch: string,
  availableBranches: string[],
): Promise<string> => {
  if (availableBranches.length === 0) {
    exitWithError("No other branches available to merge into");
  }

  const selectedBranch = await autocomplete({
    message: `Select target branch to merge '${currentBranch}' into:`,
    options: availableBranches.map((branch) => ({
      value: branch,
      label: branch,
    })),
    placeholder: "Type to filter...",
  });

  return typeof selectedBranch === "string"
    ? selectedBranch
    : exitWithError("Branch selection cancelled");
};

// Select PR template interactively or by name
const selectTemplate = async (
  templateOption: string | boolean | undefined,
): Promise<{ content: string | undefined; name: string | undefined }> => {
  if (templateOption === undefined) {
    return { content: undefined, name: undefined };
  }

  // Flag without value or --template flag: show interactive selection
  if (templateOption === "" || templateOption === "true" || templateOption === true) {
    const availableTemplates = await findPRTemplates();

    if (availableTemplates.length === 0) {
      log.warn("No PR templates found in .github folder");
      return { content: undefined, name: undefined };
    }

    if (availableTemplates.length === 1) {
      const firstTemplate = availableTemplates[0];
      if (firstTemplate) {
        log.info(`Using template: ${firstTemplate.name}`);
        return { content: firstTemplate.content, name: firstTemplate.name };
      }
    }

    // Multiple templates, let user choose
    const selectedTemplate = await autocomplete({
      message: "Select a PR template:",
      options: availableTemplates.map((tmpl) => ({
        value: tmpl.path,
        label: `${tmpl.name} (${tmpl.path})`,
      })),
      placeholder: "Type to filter...",
    });

    if (typeof selectedTemplate === "symbol") {
      log.info("No template selected, continuing without template");
      return { content: undefined, name: undefined };
    }

    const template = availableTemplates.find((t) => t.path === selectedTemplate);
    if (template) {
      log.info(`Using template: ${template.name}`);
      return { content: template.content, name: template.name };
    }

    return { content: undefined, name: undefined };
  }

  // Specific template name/path provided
  if (typeof templateOption === "string") {
    const template = await getPRTemplate(templateOption);
    if (template) {
      log.info(`Using template: ${template.name}`);
      return { content: template.content, name: template.name };
    }
    log.warn(`Template '${templateOption}' not found, continuing without template`);
  }

  return { content: undefined, name: undefined };
};

// Copy to clipboard
const copyToClipboard = async (content: string): Promise<void> => {
  try {
    await writeText(content);
    success("Copied to clipboard!");
  } catch {
    log.warn("Failed to copy to clipboard. You can manually copy the content above.");
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
    intro(colorize(["bgWhite", "black"], " lazypr "));
    let targetBranch = target || (await config.get("DEFAULT_BRANCH"));

    // Validate options
    options.locale = validateOption(options.locale, "LOCALE");
    options.context = validateOption(options.context, "CONTEXT");

    // Check if git repo
    await isGitRepository();

    // Check for provider API KEY
    try {
      await validateProviderApiKey();
    } catch (error) {
      exitWithError(error instanceof Error ? error.message : "Provider API key is required");
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
      log.warn(`Target branch '${targetBranch}' is the same as current branch '${currentBranch}'`);
    }

    // Check if target branch exists
    if (!branches.includes(targetBranch)) {
      log.warn(
        `Target branch '${targetBranch}' doesn't exist. You can change the default branch in the config.`,
      );
    }

    // If either condition is true, show branch selection
    if (currentBranch === targetBranch || !branches.includes(targetBranch)) {
      const availableBranches = branches.filter((branch) => branch !== currentBranch);
      targetBranch = await selectTargetBranch(currentBranch, availableBranches);
    }

    // Get commits (with optional filtering override)
    // When --no-filter is used, options.filter is false
    const filterDisabled = options.filter === false;
    const commits = await getPullRequestCommits(targetBranch, filterDisabled);

    if (!commits || commits.length === 0) {
      const filterEnabled = !filterDisabled && (await config.get("FILTER_COMMITS")) === "true";

      if (filterEnabled) {
        // Get unfiltered commits to show how many were filtered
        const unfilteredCommits = await getPullRequestCommits(targetBranch, true);
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
      } into ${colorize(["bold", "underline"], targetBranch)} from ${colorize(
        ["bold", "underline"],
        currentBranch,
      )}`,
    );

    // Handle template selection
    const { content: templateContent, name: templateName } = await selectTemplate(options.template);

    // Load config values in parallel
    const [configLocale, configContext, filterCommitsConfig, provider, model] = await Promise.all([
      config.get("LOCALE"),
      config.get("CONTEXT"),
      config.get("FILTER_COMMITS"),
      config.get("PROVIDER"),
      config.get("MODEL"),
    ]);

    const currentLocale = options.locale || configLocale;
    const currentContext = options.context || configContext;
    const filterEnabled = options.filter !== false && filterCommitsConfig === "true";

    displayConfigBadge({
      provider,
      smartFilter: filterEnabled,
      locale: currentLocale,
      template: templateName,
      usage: options.usage || false,
      ghCli: options.gh || false,
      model,
      context: currentContext,
    });

    const spin = spinner({ indicator: "timer" });
    spin.start("Generating Pull Request");

    // Generate PR
    let pullRequest: Awaited<ReturnType<typeof generatePullRequest>>["object"];
    let usage: Awaited<ReturnType<typeof generatePullRequest>>["usage"];
    let finishReason: Awaited<ReturnType<typeof generatePullRequest>>["finishReason"];

    try {
      const result = await generatePullRequest(
        currentBranch,
        commits,
        templateContent,
        options.locale,
        options.context,
      );
      pullRequest = result.object;
      usage = result.usage;
      finishReason = result.finishReason;
      spin.stop("Generated Pull Request");
    } catch (error) {
      spin.error("Failed to generate Pull Request");
      throw error;
    }

    // Display detailed usage if flag is set
    if (options.usage) {
      note(
        `- Input: ${usage.inputTokens} tokens\n- Output: ${usage.outputTokens} tokens\n- Total: ${usage.totalTokens} tokens\n- Finish Reason: ${finishReason}`,
        "AI Model Usage",
      );
    }

    if (pullRequest.labels?.length) {
      const customLabelsConfig = await config.get("CUSTOM_LABELS");
      const coloredLabels = formatLabels(pullRequest.labels, customLabelsConfig);
      log.info(`Pull Request Labels: ${coloredLabels}`);
    }

    log.info(`Pull Request Title: ${pullRequest.title}`);
    log.info(`Pull Request Description: ${pullRequest.description}`);

    // If --gh flag is provided, generate and copy the gh pr create command
    if (options.gh) {
      const ghCommand = buildGhPrCommand(targetBranch, pullRequest);

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

    outro("Done - Remember: AI can make mistakes, always review the generated content.");
  } catch (error) {
    exitWithError(`Failed: ${error instanceof Error ? error.message : "Unknown error"}`);
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

// ---------------------------------------------------------------------------
// Interactive config flow helpers
// ---------------------------------------------------------------------------

// Render config list output (shared between interactive "view" and `config list`)
const renderConfigList = async (): Promise<void> => {
  const allConfig = await config.getAll();
  const lines: string[] = [];

  for (const key of CONFIG_KEYS) {
    const schema = CONFIG_SCHEMA[key];
    const currentValue = allConfig[key];
    const defaultValue = "default" in schema ? (schema as { default?: string }).default : undefined;
    const isRequired =
      "required" in schema ? Boolean((schema as { required?: boolean }).required) : false;

    let displayValue: string;
    let status: string;

    if (currentValue !== undefined && currentValue !== "") {
      displayValue = maskConfigValue(key, currentValue);
      status = colorize("green", "✓");
    } else if (defaultValue !== undefined) {
      displayValue = `${defaultValue} ${colorize("dim", "(default)")}`;
      status = colorize("yellow", "○");
    } else if (isRequired) {
      displayValue = colorize("red", "NOT SET (required)");
      status = colorize("red", "✗");
    } else {
      displayValue = colorize("dim", "not set");
      status = colorize("dim", "○");
    }

    lines.push(`${status} ${colorize("bold", key)}: ${displayValue}`);
  }

  note(lines.join("\n"), "Configuration Settings");

  const locationLines: string[] = [];
  locationLines.push(colorize("dim", `Location: ${CONFIG_FILE}`));
  locationLines.push("");
  locationLines.push(
    colorize("yellow", "⚠️  Editing the config file manually is not recommended - use the CLI"),
  );
  locationLines.push(colorize("yellow", "   commands instead to avoid misconfigurations"));
  note(locationLines.join("\n"), "Config File");
};

// Interactive provider+model picker (Step 5)
const interactiveProviderModelPicker = async (): Promise<void> => {
  const comboOptions = MODEL_COMBOS.map((combo) => ({
    value: `${combo.provider}::${combo.model}`,
    label: combo.label,
    hint: combo.hint,
  }));

  const selected = await select({
    message: "Select a provider and model:",
    options: comboOptions,
  });

  if (isCancel(selected)) {
    cancel("Cancelled");
    process.exit(0);
  }

  const [providerPart, modelPart] = selected.split("::");
  const providerStr = providerPart ?? "";
  let model: string = modelPart ?? "";

  // Validate provider is a known ProviderType using the type guard
  if (!isProviderType(providerStr)) {
    return exitWithError(`Unknown provider: ${providerStr}`);
  }
  const provider = providerStr;

  // Custom model escape hatch
  if (model === CUSTOM_MODEL_SENTINEL) {
    const customModel = await text({
      message: `Enter a custom model id for ${provider}:`,
      placeholder: "e.g. llama-3.1-8b-instant",
      validate: (v) => {
        const result = validateConfigValue("MODEL", v);
        return result.valid ? undefined : result.error;
      },
    });

    if (isCancel(customModel)) {
      cancel("Cancelled");
      process.exit(0);
    }

    model = customModel;
  }

  // If provider is openai, optionally ask for a base URL
  if (provider === "openai") {
    const currentBaseUrl = await config.get("OPENAI_BASE_URL");
    const baseUrlPrompt = await text({
      message: "Enter OpenAI-compatible base URL (leave empty to keep current):",
      placeholder: "e.g. http://localhost:11434/v1",
      initialValue: currentBaseUrl,
      validate: (v) => {
        if (!v || !v.trim()) return undefined; // empty is fine (optional)
        const result = validateConfigValue("OPENAI_BASE_URL", v);
        return result.valid ? undefined : result.error;
      },
    });

    if (isCancel(baseUrlPrompt)) {
      cancel("Cancelled");
      process.exit(0);
    }

    const baseUrl = baseUrlPrompt.trim();
    if (baseUrl) {
      await config.set("OPENAI_BASE_URL", baseUrl);
      log.success(`Base URL set to: ${baseUrl}`);
    }
  }

  const normalized = await applyProviderModel({ provider, model });
  log.success(`Provider set to: ${normalized.provider}`);
  log.success(`Model set to: ${normalized.model}`);
};

// Interactive masked API-key entry (Step 6)
const interactiveApiKeyEntry = async (): Promise<void> => {
  // Determine which provider is active (let user pick if they want)
  const currentProvider = await config.get("PROVIDER");
  const providerChoices = [
    { value: "groq", label: "Groq", hint: currentProvider === "groq" ? "current" : undefined },
    {
      value: "cerebras",
      label: "Cerebras",
      hint: currentProvider === "cerebras" ? "current" : undefined,
    },
    {
      value: "google",
      label: "Google",
      hint: currentProvider === "google" ? "current" : undefined,
    },
    {
      value: "openai",
      label: "OpenAI / local",
      hint: currentProvider === "openai" ? "current" : undefined,
    },
  ];

  const chosenProvider = await select({
    message: "Which provider's API key do you want to set?",
    options: providerChoices,
    initialValue: currentProvider,
  });

  if (isCancel(chosenProvider)) {
    cancel("Cancelled");
    process.exit(0);
  }

  if (!isProviderType(chosenProvider)) {
    return exitWithError(`Unknown provider: ${chosenProvider}`);
  }
  const provider = chosenProvider;
  const apiKeyLink = getApiKeyLink(provider);
  const apiKeyConfigKey = getApiKeyConfigKey(provider);

  note(`Get your ${provider} API key at:\n${apiKeyLink}`, "API Key");

  // Retry loop on validation failure
  while (true) {
    const apiKey = await password({
      message: `Enter your ${provider} API key (leave empty to skip):`,
    });

    if (isCancel(apiKey)) {
      cancel("Cancelled");
      process.exit(0);
    }

    const keyValue = apiKey.trim();

    if (!keyValue) {
      log.info("Skipped — API key unchanged");
      return;
    }

    try {
      await config.set(apiKeyConfigKey, keyValue);
      log.success(`API key saved: ${maskConfigValue(apiKeyConfigKey, keyValue)}`);
      return;
    } catch (error) {
      log.error(
        `Invalid API key: ${error instanceof Error ? error.message : "Unknown error"}. Please try again or leave empty to skip.`,
      );
    }
  }
};

// Interactive general settings editor (Step 6)
const interactiveGeneralSettings = async (): Promise<void> => {
  type SettingChoice =
    | "LOCALE"
    | "FILTER_COMMITS"
    | "DEFAULT_BRANCH"
    | "CONTEXT"
    | "CUSTOM_LABELS"
    | "MAX_RETRIES"
    | "TIMEOUT"
    | "back";

  const settingChoice = await select<SettingChoice>({
    message: "Which setting do you want to edit?",
    options: [
      { value: "LOCALE", label: "Locale", hint: "output language" },
      { value: "FILTER_COMMITS", label: "Smart commit filter", hint: "filter noise commits" },
      { value: "DEFAULT_BRANCH", label: "Default branch", hint: "default target branch" },
      { value: "CONTEXT", label: "Context", hint: "AI generation guidance" },
      { value: "CUSTOM_LABELS", label: "Custom labels", hint: "comma-separated label names" },
      { value: "MAX_RETRIES", label: "Max retries", hint: "AI retry attempts" },
      { value: "TIMEOUT", label: "Timeout (ms)", hint: "request timeout" },
      { value: "back", label: "Back to main menu" },
    ],
  });

  if (isCancel(settingChoice) || settingChoice === "back") {
    return;
  }

  if (settingChoice === "LOCALE") {
    const locale = await select({
      message: "Select locale:",
      options: LOCALE_OPTIONS.map((l) => ({ value: l, label: l })),
      initialValue: await config.get("LOCALE"),
    });
    if (!isCancel(locale)) {
      await config.set("LOCALE", locale);
      log.success(`LOCALE set to: ${locale}`);
    }
  } else if (settingChoice === "FILTER_COMMITS") {
    const current = await config.get("FILTER_COMMITS");
    const enabled = await confirm({
      message: "Enable smart commit filtering?",
      initialValue: current === "true",
    });
    if (!isCancel(enabled)) {
      await config.set("FILTER_COMMITS", enabled ? "true" : "false");
      log.success(`FILTER_COMMITS set to: ${enabled ? "true" : "false"}`);
    }
  } else if (
    settingChoice === "DEFAULT_BRANCH" ||
    settingChoice === "CONTEXT" ||
    settingChoice === "CUSTOM_LABELS" ||
    settingChoice === "MAX_RETRIES" ||
    settingChoice === "TIMEOUT"
  ) {
    const currentVal = await config.get(settingChoice);
    while (true) {
      const newVal = await text({
        message: `Enter value for ${settingChoice}:`,
        initialValue: currentVal,
        validate: (v) => {
          const result = validateConfigValue(settingChoice, v);
          return result.valid ? undefined : result.error;
        },
      });
      if (isCancel(newVal)) {
        break;
      }
      try {
        await config.set(settingChoice, newVal);
        log.success(`${settingChoice} set to: ${newVal}`);
        break;
      } catch (error) {
        log.error(`Invalid value: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  }
};

// Main interactive config flow (Step 4)
const runInteractiveConfig = async (): Promise<void> => {
  intro(colorize(["bgWhite", "black"], " lazypr config "));

  type MenuChoice = "provider_model" | "api_key" | "general_settings" | "view_config" | "exit";

  while (true) {
    const action = await select<MenuChoice>({
      message: "What would you like to configure?",
      options: [
        {
          value: "provider_model",
          label: "Provider & model",
          hint: "pick AI provider and model together",
        },
        { value: "api_key", label: "API key", hint: "enter masked API key for a provider" },
        {
          value: "general_settings",
          label: "General settings",
          hint: "locale, branch, context, filters, labels, retries, timeout",
        },
        {
          value: "view_config",
          label: "View current config",
          hint: "show all settings (secrets masked)",
        },
        { value: "exit", label: "Exit / Done" },
      ],
    });

    if (isCancel(action) || action === "exit") {
      break;
    }

    if (action === "provider_model") {
      await interactiveProviderModelPicker();
    } else if (action === "api_key") {
      await interactiveApiKeyEntry();
    } else if (action === "general_settings") {
      await interactiveGeneralSettings();
    } else if (action === "view_config") {
      await renderConfigList();
    }
  }

  outro("Configuration saved. Run 'lazypr config list' to review all settings.");
};

program
  .command("config")
  .description("Manage the config file, see the .lazypr file")
  .argument(
    "[type]",
    "Type of config operation (set, get, remove, list). Omit to open interactive menu.",
  )
  .argument(
    "[keyValue]",
    "For 'set': KEY=VALUE pair. For 'get' or 'remove': just the KEY. Not needed for 'list'",
  )
  .action(async (type, keyValue) => {
    // No type provided — launch interactive config flow
    if (!type) {
      await runInteractiveConfig();
      return;
    }

    if (type === "list") {
      await renderConfigList();
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
      if (!isConfigKey(trimmedKey)) {
        log.error(
          `Error: Unknown config key '${trimmedKey}'.\nRun 'lazypr config list' to see all available keys.`,
        );
        process.exit(1);
      }
      log.info(`Setting config: ${trimmedKey} = ${maskConfigValue(trimmedKey, value)}`);
      try {
        await config.set(trimmedKey, value);
      } catch (error) {
        log.error(`error: ${error instanceof Error ? error.message : "Unknown error"}`);
        process.exit(1);
      }
    } else if (type === "get") {
      // For get operation, keyValue is just the key
      const key = keyValue.trim();

      if (!key) {
        log.error("Error: Key cannot be empty");
        process.exit(1);
      }

      if (!isConfigKey(key)) {
        log.error(
          `Error: Unknown config key '${key}'.\nRun 'lazypr config list' to see all available keys.`,
        );
        process.exit(1);
      }
      const value = await config.get(key).catch(() => undefined);

      if (value !== undefined) {
        log.warn(`${key} = ${maskConfigValue(key, value)}`);
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

      if (!isConfigKey(key)) {
        log.error(
          `Error: Unknown config key '${key}'. Valid keys: ${Object.keys(CONFIG_SCHEMA).join(", ")}`,
        );
        process.exit(1);
      }

      log.info(`Removing config: ${key}`);
      await config.remove(key);
      success(`Config key '${key}' removed successfully`);
    } else {
      log.error(`Error: Invalid operation '${type}'. Use 'set', 'get', 'remove', 'list'`);
      process.exit(1);
    }
  });

program.parse();
