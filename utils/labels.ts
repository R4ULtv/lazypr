export const LABEL_COLORS: Record<string, string> = {
  enhancement: "\x1b[30;42m",
  bug: "\x1b[30;41m",
  documentation: "\x1b[30;44m",
};

// Extended color palette for custom labels
export const CUSTOM_LABEL_COLORS: string[] = [
  "\x1b[30;46m", // Cyan
  "\x1b[30;45m", // Magenta
  "\x1b[30;43m", // Yellow
  "\x1b[97;100m", // Bright white on gray
  "\x1b[30;102m", // Bright green
  "\x1b[30;103m", // Bright yellow
  "\x1b[30;104m", // Bright blue
  "\x1b[30;105m", // Bright magenta
  "\x1b[30;106m", // Bright cyan
];

export const DEFAULT_COLOR = "\x1b[30;47m";
export const RESET = "\x1b[0m";

export const DEFAULT_LABELS = ["enhancement", "bug", "documentation"] as const;

/**
 * Parse custom labels config string into array of label names
 */
export function parseCustomLabels(configValue: string): string[] {
  if (!configValue?.trim()) {
    return [];
  }

  return configValue
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Get all available labels (defaults + custom)
 */
export function getAvailableLabels(customLabelsConfig: string): string[] {
  const customLabels = parseCustomLabels(customLabelsConfig);

  // Start with custom labels, then add defaults that aren't duplicated
  const combined = [...customLabels];

  for (const defaultLabel of DEFAULT_LABELS) {
    if (!combined.includes(defaultLabel)) {
      combined.push(defaultLabel);
    }
  }

  return combined;
}

/**
 * Get color for a label, using custom palette for non-default labels
 */
export function getLabelColor(label: string, customLabels: string[]): string {
  // Default labels have fixed colors
  const defaultColor = LABEL_COLORS[label];
  if (defaultColor) {
    return defaultColor;
  }

  // Custom labels get colors from the palette based on their index
  const customIndex = customLabels.indexOf(label);
  if (customIndex !== -1) {
    const color = CUSTOM_LABEL_COLORS[customIndex % CUSTOM_LABEL_COLORS.length];
    return color ?? DEFAULT_COLOR;
  }

  return DEFAULT_COLOR;
}

export function formatLabels(
  labels: string[],
  customLabelsConfig?: string,
): string {
  if (!labels || labels.length === 0) {
    return "";
  }

  const customLabels = parseCustomLabels(customLabelsConfig || "");

  const coloredLabels = labels
    .map((label) => {
      const color = getLabelColor(label, customLabels);
      return `${color} ${label} ${RESET}`;
    })
    .join(" ");

  return coloredLabels;
}
