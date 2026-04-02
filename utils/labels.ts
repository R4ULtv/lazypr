import { colorize } from "./colors";

type ColorFn = (text: string) => string;

// Label color formatters for terminal output
const LABEL_FORMATTERS: Record<string, ColorFn> = {
  enhancement: (text) => colorize(["bgGreen", "black"], text),
  bug: (text) => colorize(["bgRed", "black"], text),
  documentation: (text) => colorize(["bgBlue", "black"], text),
};

// Extended color palette for custom labels
const CUSTOM_LABEL_FORMATTERS: ColorFn[] = [
  (text) => colorize(["bgCyan", "black"], text),
  (text) => colorize(["bgMagenta", "black"], text),
  (text) => colorize(["bgYellow", "black"], text),
  (text) => colorize("inverse", text), // White on gray equivalent
  (text) => colorize(["bgGreen", "black"], text),
  (text) => colorize(["bgYellow", "black"], text),
  (text) => colorize(["bgBlue", "black"], text),
  (text) => colorize(["bgMagenta", "black"], text),
  (text) => colorize(["bgCyan", "black"], text),
];

const DEFAULT_FORMATTER: ColorFn = (text) => colorize(["bgWhite", "black"], text);

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
 * Get formatter for a label, using custom palette for non-default labels
 */
function getLabelFormatter(label: string, customLabels: string[]): ColorFn {
  // Default labels have fixed formatters
  const defaultFormatter = LABEL_FORMATTERS[label];
  if (defaultFormatter) {
    return defaultFormatter;
  }

  // Custom labels get formatters from the palette based on their index
  const customIndex = customLabels.indexOf(label);
  if (customIndex !== -1) {
    const formatter = CUSTOM_LABEL_FORMATTERS[customIndex % CUSTOM_LABEL_FORMATTERS.length];
    return formatter ?? DEFAULT_FORMATTER;
  }

  return DEFAULT_FORMATTER;
}

export function formatLabels(labels: string[], customLabelsConfig?: string): string {
  if (!labels || labels.length === 0) {
    return "";
  }

  const customLabels = parseCustomLabels(customLabelsConfig || "");

  const coloredLabels = labels
    .map((label) => {
      const formatter = getLabelFormatter(label, customLabels);
      return formatter(` ${label} `);
    })
    .join(" ");

  return coloredLabels;
}
