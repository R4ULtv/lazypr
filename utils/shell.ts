/**
 * Escape a string so it can be safely wrapped in POSIX single quotes.
 *
 * POSIX single-quoted strings are entirely literal — no character has special
 * meaning, including $, `, \, and newlines. The only character that cannot
 * appear inside a single-quoted string is the single quote itself.
 *
 * To embed a literal single quote, we close the current quoted segment,
 * output an escaped quote outside any quoting (\'), then reopen single
 * quoting: e.g. bug'fix → bug'\''fix.
 *
 * buildGhPrCommand wraps every escaped value with '...' in the final command.
 */
export const escapeShellArg = (str: string): string => str.replace(/'/g, `'\\''`);

interface PullRequestData {
  title: string;
  description: string;
  labels?: string[];
}

/**
 * Build a gh pr create command with shell-safe POSIX single-quoted arguments.
 *
 * Every argument is wrapped in plain single quotes after applying
 * escapeShellArg. Single-quoted POSIX strings are fully literal, so $, `,
 * \, and newlines require no escaping.
 */
export const buildGhPrCommand = (targetBranch: string, pullRequest: PullRequestData): string => {
  const escapedTargetBranch = escapeShellArg(targetBranch);
  const escapedTitle = escapeShellArg(pullRequest.title);
  const escapedDescription = escapeShellArg(pullRequest.description);

  // Build labels part of the command
  const labelsArg =
    pullRequest.labels && pullRequest.labels.length > 0
      ? pullRequest.labels.map((label) => `-l '${escapeShellArg(label)}'`).join(" ")
      : "";

  const labelsPart = labelsArg ? ` ${labelsArg}` : "";

  return `gh pr create -B '${escapedTargetBranch}'${labelsPart} -t '${escapedTitle}' -b '${escapedDescription}'`;
};
