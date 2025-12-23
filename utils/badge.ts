import { note } from "@clack/prompts";

// ANSI color constants
const COLORS = {
  green: "\x1b[32m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
} as const;

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
  const statusIcon = "✓";

  if (typeof value === "boolean") {
    return `${COLORS.green}${statusIcon}${COLORS.reset} ${COLORS.bold}${label}${COLORS.reset}`;
  }

  return `${COLORS.green}${statusIcon}${COLORS.reset} ${COLORS.bold}${label}${COLORS.reset}${COLORS.dim}:${COLORS.reset} ${value}`;
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

  const badge = items.join(`${COLORS.dim} | ${COLORS.reset}`);
  note(badge, "Configuration");
}
