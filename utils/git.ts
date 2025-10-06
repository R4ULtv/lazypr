import { exec, execFile } from "child_process";
import { promisify } from "util";
import { config } from "./config";

const execFileAsync = promisify(execFile);

/**
 * Interface representing a git commit with basic information.
 */
export interface GitCommit {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

/**
 * Patterns to identify commits that should be filtered out
 * These are exported to allow external tools to understand what gets filtered
 */
export const MERGE_COMMIT_PATTERNS = [
  /^merge\s+(branch|pull\s+request|remote-tracking\s+branch)/i,
  /^merge\s+.+\s+into\s+.+/i,
  /^merged\s+in\s+/i,
];

export const DEPENDENCY_UPDATE_PATTERNS = [
  /^(bump|update|upgrade)\s+(dependencies|deps|dependency)/i,
  /^chore\(deps\)/i,
  /^build\(deps\)/i,
  /^\[deps\]/i,
  /^(npm|yarn|pnpm|bun)\s+update/i,
  /^update\s+.*\s+(package|packages|dependency|dependencies)/i,
  /^upgrade\s+.*\s+to\s+v?\d+\.\d+/i,
  /^bump\s+.+\s+(from|to)\s+\d+\.\d+/i,
  /^dependabot/i,
  /^renovate/i,
];

export const FORMATTING_PATTERNS = [
  /^(fix|run|apply)\s+(formatting|linting|lint|prettier|eslint)/i,
  /^format\s+(code|files?)/i,
  /^(prettier|eslint|style)\s+(fix|fixes)/i,
  /^chore\(format\)/i,
  /^style:/i,
  /^auto[- ]?format/i,
  /^reformat\s+/i,
  /^whitespace\s+/i,
  /^fix\s+indentation/i,
];

/**
 * Checks if a commit message matches any of the given patterns
 */
function matchesAnyPattern(message: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(message));
}

/**
 * Determines if a commit should be filtered out based on its content
 */
export function shouldFilterCommit(commit: GitCommit): boolean {
  const message = commit.message.trim();

  // Filter merge commits
  if (matchesAnyPattern(message, MERGE_COMMIT_PATTERNS)) {
    return true;
  }

  // Filter dependency updates
  if (matchesAnyPattern(message, DEPENDENCY_UPDATE_PATTERNS)) {
    return true;
  }

  // Filter formatting-only changes
  if (matchesAnyPattern(message, FORMATTING_PATTERNS)) {
    return true;
  }

  return false;
}

/**
 * Filters out merge commits, dependency updates, and formatting-only changes
 */
export function filterCommits(commits: GitCommit[]): GitCommit[] {
  return commits.filter((commit) => !shouldFilterCommit(commit));
}

/**
 * Checks if the current working directory is a Git repository using a git command.
 * @returns {Promise<boolean>} A promise that resolves to true if it's a git repository, false otherwise.
 */
export async function isGitRepository(): Promise<boolean> {
  try {
    await execFileAsync("git", ["rev-parse", "--is-inside-work-tree"]);
    return true;
  } catch (error) {
    // This catch block handles cases where the command fails (not a git repo) or git is not installed
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      console.error(
        "An unexpected error occurred. Is git installed and in your PATH?",
        error,
      );
    }
    return false;
  }
}

/**
 * Gets a list of all local and remote git branches.
 * @returns {Promise<string[]>} A promise that resolves to an array of branch names.
 */
export async function getAllBranches(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["branch", "-a"]);
    const branches = stdout
      .split("\n")
      .map((branch) => branch.trim().replace(/^\*\s*/, ""))
      .filter((branch) => branch.length > 0 && !branch.includes("->")); // Filter out empty lines and symbolic refs like 'HEAD ->'

    // Using a Set to ensure all branch names are unique before returning as an array.
    return [...new Set(branches)];
  } catch (error) {
    console.error(
      "Failed to get git branches. Are you in a git repository?",
      error,
    );
    return [];
  }
}

/**
 * Gets the current active branch name.
 * @returns {Promise<string>} A promise that resolves to the current branch name, or an empty string if not on a branch (e.g., detached HEAD).
 */
export async function getCurrentBranch(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", ["branch", "--show-current"]);
    return stdout.trim();
  } catch (error) {
    console.error("Failed to get the current branch.", error);
    return "";
  }
}

/**
 * Gets all commits that would be included in a pull request from the current branch to the target branch.
 * This shows commits that are in the current branch but not in the target branch (i.e., new commits to be merged).
 * @param {string} targetBranch - The target branch that the PR would merge into
 * @param {boolean} noFilter - Optional flag to disable smart commit filtering for this call
 * @returns {Promise<GitCommit[]>} A promise that resolves to an array of commit objects ordered from oldest to newest
 */
export async function getPullRequestCommits(
  targetBranch: string,
  noFilter?: boolean,
): Promise<GitCommit[]> {
  try {
    // Get commits that are in current branch but not in target branch
    // Using --reverse to show commits in chronological order (oldest first, like in a PR)
    // Format: hash|short_hash|author|date|message
    const { stdout } = await execFileAsync("git", [
      "log",
      `${targetBranch}..HEAD`,
      "--reverse",
      "--pretty=format:%H|%h|%an|%ad|%s",
      "--date=short",
    ]);

    if (!stdout.trim()) {
      return []; // No commits for PR
    }

    const commits: GitCommit[] = stdout
      .trim()
      .split("\n")
      .map((line) => {
        const [hash, shortHash, author, date, message] = line.split("|");
        return {
          hash: hash || "",
          shortHash: shortHash || "",
          author: author || "",
          date: date || "",
          message: message || "",
        };
      })
      .filter((commit) => commit.hash.length > 0); // Filter out any malformed entries

    // Apply smart filtering if enabled in config and not overridden
    if (noFilter) {
      return commits;
    }
    const shouldFilter = (await config.get("FILTER_COMMITS")) === "true";
    return shouldFilter ? filterCommits(commits) : commits;
  } catch (error) {
    // Silently return empty array for non-existent branches or other git errors
    // The calling code can check if the array is empty and handle accordingly
    return [];
  }
}
