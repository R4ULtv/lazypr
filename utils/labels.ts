import pc from "picocolors";

type ColorFn = (text: string) => string;

// Label color formatters using picocolors
const LABEL_FORMATTERS: Record<string, ColorFn> = {
  enhancement: (text) => pc.bgGreen(pc.black(text)),
  bug: (text) => pc.bgRed(pc.black(text)),
  documentation: (text) => pc.bgBlue(pc.black(text)),
};

// Extended color palette for custom labels
const CUSTOM_LABEL_FORMATTERS: ColorFn[] = [
  (text) => pc.bgCyan(pc.black(text)),
  (text) => pc.bgMagenta(pc.black(text)),
  (text) => pc.bgYellow(pc.black(text)),
  (text) => pc.inverse(text), // White on gray equivalent
  (text) => pc.bgGreen(pc.black(text)),
  (text) => pc.bgYellow(pc.black(text)),
  (text) => pc.bgBlue(pc.black(text)),
  (text) => pc.bgMagenta(pc.black(text)),
  (text) => pc.bgCyan(pc.black(text)),
];

const DEFAULT_FORMATTER: ColorFn = (text) => pc.bgWhite(pc.black(text));

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
    const formatter =
      CUSTOM_LABEL_FORMATTERS[customIndex % CUSTOM_LABEL_FORMATTERS.length];
    return formatter ?? DEFAULT_FORMATTER;
  }

  return DEFAULT_FORMATTER;
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
      const formatter = getLabelFormatter(label, customLabels);
      return formatter(` ${label} `);
    })
    .join(" ");

  return coloredLabels;
}
