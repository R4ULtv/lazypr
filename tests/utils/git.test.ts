import { expect, test, describe, beforeAll } from "bun:test";
import {
  isGitRepository,
  getAllBranches,
  getCurrentBranch,
  getPullRequestCommits,
  type GitCommit,
} from "../../utils/git";

describe("Git Utilities - Integration Tests", () => {
  let isInGitRepo: boolean;
  let currentBranch: string;

  beforeAll(async () => {
    // Check if we're in a git repository before running tests
    isInGitRepo = await isGitRepository();
    if (isInGitRepo) {
      currentBranch = await getCurrentBranch();
    }
  });

  describe("isGitRepository()", () => {
    test("should return a boolean", async () => {
      const result = await isGitRepository();
      expect(typeof result).toBe("boolean");
    });

    test("should return true when in project root (lazypr is a git repo)", async () => {
      const result = await isGitRepository();
      expect(result).toBe(true);
    });
  });

  describe("getAllBranches()", () => {
    test("should return an array", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result = await getAllBranches();
      expect(Array.isArray(result)).toBe(true);
    });

    test("should return at least one branch", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result = await getAllBranches();
      expect(result.length).toBeGreaterThan(0);
    });

    test("should not have empty branch names", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result = await getAllBranches();
      const emptyBranches = result.filter((b) => b === "");
      expect(emptyBranches.length).toBe(0);
    });

    test("should not have asterisks in branch names", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result = await getAllBranches();
      const branchesWithAsterisk = result.filter((b) => b.includes("*"));
      expect(branchesWithAsterisk.length).toBe(0);
    });

    test("should not contain symbolic references with arrows", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result = await getAllBranches();
      const symbolicRefs = result.filter((b) => b.includes("->"));
      expect(symbolicRefs.length).toBe(0);
    });

    test("should have unique branch names", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result = await getAllBranches();
      const uniqueBranches = new Set(result);
      expect(uniqueBranches.size).toBe(result.length);
    });

    test("should include current branch", async () => {
      if (!isInGitRepo || !currentBranch) {
        console.log("Skipping test: not in a git repository or detached HEAD");
        return;
      }

      const result = await getAllBranches();
      const hasCurrentBranch = result.some((b) => b === currentBranch);
      expect(hasCurrentBranch).toBe(true);
    });
  });

  describe("getCurrentBranch()", () => {
    test("should return a string", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result = await getCurrentBranch();
      expect(typeof result).toBe("string");
    });

    test("should not have leading/trailing whitespace", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result = await getCurrentBranch();
      expect(result).toBe(result.trim());
    });

    test("should not contain asterisks", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result = await getCurrentBranch();
      expect(result.includes("*")).toBe(false);
    });

    test("should be consistent across multiple calls", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result1 = await getCurrentBranch();
      const result2 = await getCurrentBranch();
      expect(result1).toBe(result2);
    });
  });

  describe("getPullRequestCommits()", () => {
    test("should return an array", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      // Try to get commits comparing to a common branch
      const result = await getPullRequestCommits("main");
      expect(Array.isArray(result)).toBe(true);
    });

    test("should return commits with correct structure", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result = await getPullRequestCommits("main");

      // If there are commits, check their structure
      if (result.length > 0) {
        const commit = result[0];
        expect(commit).toHaveProperty("hash");
        expect(commit).toHaveProperty("shortHash");
        expect(commit).toHaveProperty("author");
        expect(commit).toHaveProperty("date");
        expect(commit).toHaveProperty("message");

        if (commit) {
          expect(typeof commit.hash).toBe("string");
          expect(typeof commit.shortHash).toBe("string");
          expect(typeof commit.author).toBe("string");
          expect(typeof commit.date).toBe("string");
          expect(typeof commit.message).toBe("string");
        }
      }
    });

    test("should have hash longer than shortHash", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result = await getPullRequestCommits("main");

      if (result.length > 0) {
        result.forEach((commit) => {
          if (commit.hash && commit.shortHash) {
            expect(commit.hash.length).toBeGreaterThan(commit.shortHash.length);
          }
        });
      }
    });

    test("should have valid date format (YYYY-MM-DD)", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result = await getPullRequestCommits("main");

      if (result.length > 0) {
        result.forEach((commit) => {
          if (commit.date) {
            // Check date format YYYY-MM-DD
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            expect(dateRegex.test(commit.date)).toBe(true);
          }
        });
      }
    });

    test("should not have empty hashes", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result = await getPullRequestCommits("main");

      if (result.length > 0) {
        result.forEach((commit) => {
          expect(commit.hash.length).toBeGreaterThan(0);
          expect(commit.shortHash.length).toBeGreaterThan(0);
        });
      }
    });

    test("should return empty array for same branch comparison", async () => {
      if (!isInGitRepo || !currentBranch) {
        console.log("Skipping test: not in a git repository or detached HEAD");
        return;
      }

      // Comparing a branch to itself should return no commits
      const result = await getPullRequestCommits(currentBranch);
      expect(result).toEqual([]);
    });

    test("should handle non-existent target branch gracefully", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      const result = await getPullRequestCommits(
        "this-branch-definitely-does-not-exist-12345",
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
    });
  });

  describe("GitCommit interface", () => {
    test("should match expected structure", () => {
      const commit: GitCommit = {
        hash: "abc123def456789",
        shortHash: "abc123d",
        author: "Test Author",
        date: "2024-01-15",
        message: "test commit message",
      };

      expect(commit).toHaveProperty("hash");
      expect(commit).toHaveProperty("shortHash");
      expect(commit).toHaveProperty("author");
      expect(commit).toHaveProperty("date");
      expect(commit).toHaveProperty("message");
    });

    test("should have all string properties", () => {
      const commit: GitCommit = {
        hash: "abc123",
        shortHash: "abc",
        author: "Author",
        date: "2024-01-01",
        message: "message",
      };

      expect(typeof commit.hash).toBe("string");
      expect(typeof commit.shortHash).toBe("string");
      expect(typeof commit.author).toBe("string");
      expect(typeof commit.date).toBe("string");
      expect(typeof commit.message).toBe("string");
    });

    test("should allow empty message", () => {
      const commit: GitCommit = {
        hash: "abc123",
        shortHash: "abc",
        author: "Author",
        date: "2024-01-01",
        message: "",
      };

      expect(commit.message).toBe("");
    });

    test("should handle special characters in commit data", () => {
      const commit: GitCommit = {
        hash: "abc123def456",
        shortHash: "abc123d",
        author: "José García",
        date: "2024-03-15",
        message: "feat: añadir función | with pipe",
      };

      expect(commit.author).toBe("José García");
      expect(commit.message).toContain("|");
    });
  });

  describe("Error handling", () => {
    test("getAllBranches should not throw on error", async () => {
      // This should not throw even if there's an error
      await expect(getAllBranches()).resolves.toBeDefined();
    });

    test("getCurrentBranch should not throw on error", async () => {
      // This should not throw even if there's an error
      await expect(getCurrentBranch()).resolves.toBeDefined();
    });

    test("getPullRequestCommits should not throw on error", async () => {
      // This should not throw even if there's an error
      await expect(getPullRequestCommits("any-branch")).resolves.toBeDefined();
    });
  });
});
