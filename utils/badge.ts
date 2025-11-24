import { note } from "@clack/prompts";

interface BadgeConfig {
  provider: string;
  smartFilter: boolean;
  locale: string;
  template?: string;
  usage: boolean;
  ghCli: boolean;
  model: string;
  context?: string;
}

/**
 * Formats a badge item with color and styling
 */
function formatBadgeItem(label: string, value: string | boolean): string {
  const color = "\x1b[32m"; // Green
  const reset = "\x1b[0m";
  const bold = "\x1b[1m";
  const dim = "\x1b[2m";
  const statusIcon = "✓";

  if (typeof value === "boolean") {
    return `${color}${statusIcon}${reset} ${bold}${label}${reset}`;
  }

  return `${color}${statusIcon}${reset} ${bold}${label}${reset}${dim}:${reset} ${value}`;
}

/**
 * Displays a configuration badge showing only enabled settings
 */
export function displayConfigBadge(config: BadgeConfig): void {
  const items: string[] = [];

  // Provider + Model (always shown)
  items.push(formatBadgeItem("Model", `${config.provider}/${config.model}`));

  // Locale (always shown)
  items.push(formatBadgeItem("Locale", config.locale.toUpperCase()));

  // Smart filtering (only show if enabled)
  if (config.smartFilter) {
    items.push(formatBadgeItem("Smart Filter", config.smartFilter));
  }

  // Template (only show if used)
  if (config.template) {
    items.push(formatBadgeItem("Template", config.template));
  }

  // Context (only show if provided)
  if (config.context) {
    items.push(formatBadgeItem("User Context", config.context ? true : false));
  }

  // Usage stats (only show if enabled)
  if (config.usage) {
    items.push(formatBadgeItem("Usage Stats", config.usage));
  }

  // GitHub CLI (only show if enabled)
  if (config.ghCli) {
    items.push(formatBadgeItem("GH CLI", config.ghCli));
  }

  const badge = items.join("\x1b[2m | \x1b[0m");
  note(badge, "Configuration");
}
