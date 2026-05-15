/**
 * Escape shell special characters for $'...' syntax
 */
export const escapeShellArg = (str: string): string => {
  return str
    .replace(/\\/g, "\\\\") // Escape backslashes first
    .replace(/'/g, "\\'") // Escape single quotes for $'...' syntax
    .replace(/`/g, "\\`") // Escape backticks
    .replace(/\$/g, "\\$") // Escape dollar signs
    .replace(/\n/g, "\\n"); // Keep newlines as \n for $'...' syntax
};

interface PullRequestData {
  title: string;
  description: string;
  labels?: string[];
}

/**
 * Build a gh pr create command with properly escaped arguments
 */
export const buildGhPrCommand = (targetBranch: string, pullRequest: PullRequestData): string => {
  const escapedTargetBranch = escapeShellArg(targetBranch);
  const escapedTitle = escapeShellArg(pullRequest.title);
  const escapedDescription = escapeShellArg(pullRequest.description);

  // Build labels part of the command
  const labelsArg =
    pullRequest.labels && pullRequest.labels.length > 0
      ? pullRequest.labels.map((label) => `-l $'${escapeShellArg(label)}'`).join(" ")
      : "";

  // Use $'...' syntax for the body to properly interpret \n as newlines
  return `gh pr create -B $'${escapedTargetBranch}' ${labelsArg} -t $'${escapedTitle}' -b $'${escapedDescription}'`;
};
