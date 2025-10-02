import { exec, execFile } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
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
 * Checks if the current working directory is a Git repository using a git command.
 * @returns {Promise<boolean>} A promise that resolves to true if it's a git repository, false otherwise.
 */
export async function isGitRepository(): Promise<boolean> {
  try {
    await execAsync("git rev-parse --is-inside-work-tree");
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
    const { stdout } = await execAsync("git branch -a");
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
    const { stdout } = await execAsync("git branch --show-current");
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
 * @returns {Promise<GitCommit[]>} A promise that resolves to an array of commit objects ordered from oldest to newest
 */
export async function getPullRequestCommits(
  targetBranch: string,
): Promise<GitCommit[]> {
  try {
    // Get commits that are in current branch but not in target branch
    // Using --reverse to show commits in chronological order (oldest first, like in a PR)
    // Format: hash|short_hash|author|date|message
    // SECURITY: Using execFile instead of exec to prevent command injection attacks.
    // execFile passes arguments as an array, so special characters in targetBranch
    // (like semicolons, pipes, backticks) are treated as literal strings, not shell commands.
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

    return commits;
  } catch (error) {
    // Silently return empty array for non-existent branches or other git errors
    // The calling code can check if the array is empty and handle accordingly
    return [];
  }
}
