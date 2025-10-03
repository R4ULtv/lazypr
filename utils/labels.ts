export const LABEL_COLORS: Record<string, string> = {
  enhancement: "\x1b[30;42m",
  bug: "\x1b[30;41m",
  documentation: "\x1b[30;44m",
};

export const DEFAULT_COLOR = "\x1b[30;47m";
export const RESET = "\x1b[0m";

export function formatLabels(labels: string[]): string {
  if (!labels || labels.length === 0) {
    return "";
  }

  const coloredLabels = labels
    .map(
      (label) =>
        `${LABEL_COLORS[label] || DEFAULT_COLOR} ${label} ${RESET}`,
    )
    .join(" ");

  return coloredLabels;
}
