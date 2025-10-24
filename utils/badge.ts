import { note } from "@clack/prompts";

interface BadgeConfig {
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
function formatBadgeItem(
  label: string,
  value: string | boolean,
  enabled = true,
): string {
  const statusIcon = enabled ? "✓" : "✗";
  const color = enabled ? "\x1b[32m" : "\x1b[90m"; // Green for enabled, gray for disabled
  const reset = "\x1b[0m";
  const bold = "\x1b[1m";
  const dim = "\x1b[2m";

  if (typeof value === "boolean") {
    return `${color}${statusIcon}${reset} ${bold}${label}${reset}`;
  }

  return `${color}${statusIcon}${reset} ${bold}${label}${reset}${dim}:${reset} ${value}`;
}

/**
 * Displays a configuration badge showing all enabled settings
 */
export function displayConfigBadge(config: BadgeConfig): void {
  const items: string[] = [];

  // Model
  items.push(formatBadgeItem("Model", config.model));

  // Smart filtering (shorter name for FILTER_COMMITS)
  items.push(
    formatBadgeItem("Smart Filter", config.smartFilter, config.smartFilter),
  );

  // Locale
  items.push(formatBadgeItem("Locale", config.locale.toUpperCase()));

  // Template (only show if used)
  if (config.template) {
    items.push(formatBadgeItem("Template", config.template));
  }

  // Context (only show if provided)
  if (config.context) {
    items.push(
      formatBadgeItem(
        "User Context",
        config.context ? true : false,
        config.context ? true : false,
      ),
    );
  }

  // Usage stats
  items.push(formatBadgeItem("Usage Stats", config.usage, config.usage));

  // GitHub CLI
  items.push(formatBadgeItem("GH CLI", config.ghCli, config.ghCli));

  const badge = items.join("\x1b[2m | \x1b[0m");
  note(badge, "Configuration");
}
