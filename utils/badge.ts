import { note } from "@clack/prompts";
import { colorize } from "./colors";
import { MODEL_NAME, type ProviderType } from "./provider";

interface BadgeConfig {
  provider: ProviderType;
  smartFilter: boolean;
  locale: string;
  template?: string;
  usage: boolean;
  ghCli: boolean;
  context?: string;
}

/**
 * Formats a badge item with color and styling
 */
function formatBadgeItem(label: string, value: string | boolean): string {
  const statusIcon = "✓";

  if (typeof value === "boolean") {
    return `${colorize("green", statusIcon)} ${colorize("bold", label)}`;
  }

  return `${colorize("green", statusIcon)} ${colorize("bold", label)}${colorize("dim", ":")} ${value}`;
}

/**
 * Displays a configuration badge showing only enabled settings
 */
export function displayConfigBadge(config: BadgeConfig): void {
  const items: string[] = [];

  // Provider and fixed model (always shown)
  items.push(formatBadgeItem("Provider", config.provider));
  items.push(formatBadgeItem("Model", MODEL_NAME));

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
    items.push(formatBadgeItem("User Context", !!config.context));
  }

  // Usage stats (only show if enabled)
  if (config.usage) {
    items.push(formatBadgeItem("Usage Stats", config.usage));
  }

  // GitHub CLI (only show if enabled)
  if (config.ghCli) {
    items.push(formatBadgeItem("GH CLI", config.ghCli));
  }

  const badge = items.join(colorize("dim", " | "));
  note(badge, "Configuration");
}
