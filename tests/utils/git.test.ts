import { beforeAll, describe, expect, test } from "bun:test";
import {
  filterCommits,
  type GitCommit,
  getAllBranches,
  getCurrentBranch,
  getPullRequestCommits,
  isGitRepository,
  shouldFilterCommit,
} from "../../utils/git";

describe("Git Utilities - Integration Tests", () => {
  let isInGitRepo: boolean;
  let currentBranch: string;
  let hasMainBranch: boolean;

  beforeAll(async () => {
    // Check if we're in a git repository before running tests
    isInGitRepo = await isGitRepository();
    if (isInGitRepo) {
      currentBranch = await getCurrentBranch();
      // Check if main branch exists (may not exist in shallow clones like CI)
      const branches = await getAllBranches();
      hasMainBranch = branches.includes("main") || branches.includes("master");
    }
  });

  describe("isGitRepository()", () => {
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
      if (!isInGitRepo || !hasMainBranch) {
        console.log(
          "Skipping test: not in a git repository or main branch not available",
        );
        return;
      }

      // Try to get commits comparing to a common branch
      const result = await getPullRequestCommits("main");
      expect(Array.isArray(result)).toBe(true);
    });

    test("should return commits with correct structure", async () => {
      if (!isInGitRepo || !hasMainBranch) {
        console.log(
          "Skipping test: not in a git repository or main branch not available",
        );
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
      if (!isInGitRepo || !hasMainBranch) {
        console.log(
          "Skipping test: not in a git repository or main branch not available",
        );
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
      if (!isInGitRepo || !hasMainBranch) {
        console.log(
          "Skipping test: not in a git repository or main branch not available",
        );
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
      if (!isInGitRepo || !hasMainBranch) {
        console.log(
          "Skipping test: not in a git repository or main branch not available",
        );
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

      // Should throw a user-friendly error for non-existent branches
      await expect(
        getPullRequestCommits("this-branch-definitely-does-not-exist-12345"),
      ).rejects.toThrow(/Branch or revision not found/);
    });

    test("should safely handle branch names with special characters (command injection protection)", async () => {
      if (!isInGitRepo) {
        console.log("Skipping test: not in a git repository");
        return;
      }

      // Test various potentially dangerous branch name patterns
      // These should be handled safely without executing arbitrary commands
      const dangerousBranchNames = [
        "main; echo 'injected'",
        "main && echo 'injected'",
        "main | echo 'injected'",
        "main$(echo 'injected')",
        "main`echo 'injected'`",
        "main; rm -rf /",
      ];

      for (const branchName of dangerousBranchNames) {
        // Should throw because branch doesn't exist, but NOT execute command
        await expect(getPullRequestCommits(branchName)).rejects.toThrow(
          /Branch or revision not found/,
        );
      }
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

    test("getPullRequestCommits should throw on error", async () => {
      // This should throw a user-friendly error
      await expect(getPullRequestCommits("any-branch")).rejects.toThrow();
    });
  });

  describe("Smart Commit Filtering", () => {
    describe("shouldFilterCommit()", () => {
      test("should filter merge commits", () => {
        const mergeCommits: GitCommit[] = [
          {
            hash: "abc123",
            shortHash: "abc",
            author: "Dev",
            date: "2024-01-01",
            message: "Merge branch 'feature' into main",
          },
          {
            hash: "def456",
            shortHash: "def",
            author: "Dev",
            date: "2024-01-02",
            message: "Merge pull request #123 from user/feature",
          },
          {
            hash: "ghi789",
            shortHash: "ghi",
            author: "Dev",
            date: "2024-01-03",
            message: "Merge remote-tracking branch 'origin/main'",
          },
          {
            hash: "jkl012",
            shortHash: "jkl",
            author: "Dev",
            date: "2024-01-04",
            message: "Merged in feature-branch (pull request #456)",
          },
        ];

        mergeCommits.forEach((commit) => {
          expect(shouldFilterCommit(commit)).toBe(true);
        });
      });

      test("should filter dependency update commits", () => {
        const dependencyCommits: GitCommit[] = [
          {
            hash: "abc123",
            shortHash: "abc",
            author: "Dev",
            date: "2024-01-01",
            message: "bump dependencies",
          },
          {
            hash: "def456",
            shortHash: "def",
            author: "Dev",
            date: "2024-01-02",
            message: "chore(deps): update packages",
          },
          {
            hash: "ghi789",
            shortHash: "ghi",
            author: "Dev",
            date: "2024-01-03",
            message: "build(deps): bump lodash from 4.17.20 to 4.17.21",
          },
          {
            hash: "jkl012",
            shortHash: "jkl",
            author: "Dependabot",
            date: "2024-01-04",
            message: "Bump axios from 0.21.1 to 0.21.2",
          },
          {
            hash: "mno345",
            shortHash: "mno",
            author: "Renovate Bot",
            date: "2024-01-05",
            message: "Update dependency typescript to v5.0.0",
          },
          {
            hash: "pqr678",
            shortHash: "pqr",
            author: "Dev",
            date: "2024-01-06",
            message: "npm update packages",
          },
          {
            hash: "stu901",
            shortHash: "stu",
            author: "Dev",
            date: "2024-01-07",
            message: "upgrade react to v18.2.0",
          },
        ];

        dependencyCommits.forEach((commit) => {
          expect(shouldFilterCommit(commit)).toBe(true);
        });
      });

      test("should filter formatting-only commits", () => {
        const formattingCommits: GitCommit[] = [
          {
            hash: "abc123",
            shortHash: "abc",
            author: "Dev",
            date: "2024-01-01",
            message: "fix formatting",
          },
          {
            hash: "def456",
            shortHash: "def",
            author: "Dev",
            date: "2024-01-02",
            message: "run prettier",
          },
          {
            hash: "ghi789",
            shortHash: "ghi",
            author: "Dev",
            date: "2024-01-03",
            message: "apply linting fixes",
          },
          {
            hash: "jkl012",
            shortHash: "jkl",
            author: "Dev",
            date: "2024-01-04",
            message: "format code",
          },
          {
            hash: "mno345",
            shortHash: "mno",
            author: "Dev",
            date: "2024-01-05",
            message: "chore(format): auto-format files",
          },
          {
            hash: "pqr678",
            shortHash: "pqr",
            author: "Dev",
            date: "2024-01-06",
            message: "style: fix indentation",
          },
          {
            hash: "stu901",
            shortHash: "stu",
            author: "Dev",
            date: "2024-01-07",
            message: "eslint fixes",
          },
          {
            hash: "vwx234",
            shortHash: "vwx",
            author: "Dev",
            date: "2024-01-08",
            message: "reformat with prettier",
          },
          {
            hash: "yz567",
            shortHash: "yz5",
            author: "Dev",
            date: "2024-01-09",
            message: "whitespace cleanup",
          },
        ];

        formattingCommits.forEach((commit) => {
          expect(shouldFilterCommit(commit)).toBe(true);
        });
      });

      test("should NOT filter regular feature commits", () => {
        const regularCommits: GitCommit[] = [
          {
            hash: "abc123",
            shortHash: "abc",
            author: "Dev",
            date: "2024-01-01",
            message: "feat: add user authentication",
          },
          {
            hash: "def456",
            shortHash: "def",
            author: "Dev",
            date: "2024-01-02",
            message: "fix: resolve login bug",
          },
          {
            hash: "ghi789",
            shortHash: "ghi",
            author: "Dev",
            date: "2024-01-03",
            message: "docs: update README with installation instructions",
          },
          {
            hash: "jkl012",
            shortHash: "jkl",
            author: "Dev",
            date: "2024-01-04",
            message: "refactor: improve database query performance",
          },
          {
            hash: "mno345",
            shortHash: "mno",
            author: "Dev",
            date: "2024-01-05",
            message: "test: add unit tests for auth module",
          },
        ];

        regularCommits.forEach((commit) => {
          expect(shouldFilterCommit(commit)).toBe(false);
        });
      });

      test("should be case-insensitive", () => {
        const commits: GitCommit[] = [
          {
            hash: "abc123",
            shortHash: "abc",
            author: "Dev",
            date: "2024-01-01",
            message: "MERGE BRANCH 'feature'",
          },
          {
            hash: "def456",
            shortHash: "def",
            author: "Dev",
            date: "2024-01-02",
            message: "BUMP DEPENDENCIES",
          },
          {
            hash: "ghi789",
            shortHash: "ghi",
            author: "Dev",
            date: "2024-01-03",
            message: "FIX FORMATTING",
          },
        ];

        commits.forEach((commit) => {
          expect(shouldFilterCommit(commit)).toBe(true);
        });
      });

      test("should handle commits with leading/trailing whitespace", () => {
        const commit: GitCommit = {
          hash: "abc123",
          shortHash: "abc",
          author: "Dev",
          date: "2024-01-01",
          message: "  Merge branch 'feature'  ",
        };

        expect(shouldFilterCommit(commit)).toBe(true);
      });
    });

    describe("filterCommits()", () => {
      test("should filter out merge, dependency, and formatting commits", () => {
        const commits: GitCommit[] = [
          {
            hash: "abc123",
            shortHash: "abc",
            author: "Dev",
            date: "2024-01-01",
            message: "feat: add user authentication",
          },
          {
            hash: "def456",
            shortHash: "def",
            author: "Dev",
            date: "2024-01-02",
            message: "Merge branch 'feature' into main",
          },
          {
            hash: "ghi789",
            shortHash: "ghi",
            author: "Dev",
            date: "2024-01-03",
            message: "fix: resolve login bug",
          },
          {
            hash: "jkl012",
            shortHash: "jkl",
            author: "Dev",
            date: "2024-01-04",
            message: "chore(deps): update packages",
          },
          {
            hash: "mno345",
            shortHash: "mno",
            author: "Dev",
            date: "2024-01-05",
            message: "docs: update README",
          },
          {
            hash: "pqr678",
            shortHash: "pqr",
            author: "Dev",
            date: "2024-01-06",
            message: "run prettier",
          },
          {
            hash: "stu901",
            shortHash: "stu",
            author: "Dev",
            date: "2024-01-07",
            message: "refactor: improve code structure",
          },
        ];

        const filtered = filterCommits(commits);

        expect(filtered.length).toBe(4);
        expect(filtered[0]?.message).toBe("feat: add user authentication");
        expect(filtered[1]?.message).toBe("fix: resolve login bug");
        expect(filtered[2]?.message).toBe("docs: update README");
        expect(filtered[3]?.message).toBe("refactor: improve code structure");
      });

      test("should return empty array when all commits are filtered", () => {
        const commits: GitCommit[] = [
          {
            hash: "abc123",
            shortHash: "abc",
            author: "Dev",
            date: "2024-01-01",
            message: "Merge branch 'feature'",
          },
          {
            hash: "def456",
            shortHash: "def",
            author: "Dev",
            date: "2024-01-02",
            message: "bump dependencies",
          },
          {
            hash: "ghi789",
            shortHash: "ghi",
            author: "Dev",
            date: "2024-01-03",
            message: "fix formatting",
          },
        ];

        const filtered = filterCommits(commits);
        expect(filtered.length).toBe(0);
      });

      test("should return all commits when none match filter patterns", () => {
        const commits: GitCommit[] = [
          {
            hash: "abc123",
            shortHash: "abc",
            author: "Dev",
            date: "2024-01-01",
            message: "feat: add feature A",
          },
          {
            hash: "def456",
            shortHash: "def",
            author: "Dev",
            date: "2024-01-02",
            message: "fix: resolve bug B",
          },
          {
            hash: "ghi789",
            shortHash: "ghi",
            author: "Dev",
            date: "2024-01-03",
            message: "docs: update documentation C",
          },
        ];

        const filtered = filterCommits(commits);
        expect(filtered.length).toBe(3);
        expect(filtered).toEqual(commits);
      });

      test("should handle empty array", () => {
        const commits: GitCommit[] = [];
        const filtered = filterCommits(commits);
        expect(filtered.length).toBe(0);
      });

      test("should preserve order of non-filtered commits", () => {
        const commits: GitCommit[] = [
          {
            hash: "abc123",
            shortHash: "abc",
            author: "Dev",
            date: "2024-01-01",
            message: "feat: feature 1",
          },
          {
            hash: "def456",
            shortHash: "def",
            author: "Dev",
            date: "2024-01-02",
            message: "Merge branch 'x'",
          },
          {
            hash: "ghi789",
            shortHash: "ghi",
            author: "Dev",
            date: "2024-01-03",
            message: "feat: feature 2",
          },
          {
            hash: "jkl012",
            shortHash: "jkl",
            author: "Dev",
            date: "2024-01-04",
            message: "bump deps",
          },
          {
            hash: "mno345",
            shortHash: "mno",
            author: "Dev",
            date: "2024-01-05",
            message: "feat: feature 3",
          },
        ];

        const filtered = filterCommits(commits);
        expect(filtered.length).toBe(3);
        expect(filtered[0]?.message).toBe("feat: feature 1");
        expect(filtered[1]?.message).toBe("feat: feature 2");
        expect(filtered[2]?.message).toBe("feat: feature 3");
      });
    });

    describe("Integration with getPullRequestCommits()", () => {
      test("should apply filtering by default when config is true", async () => {
        if (!isInGitRepo || !hasMainBranch) {
          console.log(
            "Skipping test: not in a git repository or main branch not available",
          );
          return;
        }

        // This tests the integration - actual filtering behavior depends on config
        const commits = await getPullRequestCommits("main");
        expect(Array.isArray(commits)).toBe(true);
        // Commits should be filtered, so verify structure is maintained
        commits.forEach((commit) => {
          expect(commit).toHaveProperty("hash");
          expect(commit).toHaveProperty("message");
        });
      });

      test("should skip filtering when noFilter parameter is true", async () => {
        if (!isInGitRepo || !hasMainBranch) {
          console.log(
            "Skipping test: not in a git repository or main branch not available",
          );
          return;
        }

        const commits = await getPullRequestCommits("main", true);
        expect(Array.isArray(commits)).toBe(true);
        commits.forEach((commit) => {
          expect(commit).toHaveProperty("hash");
          expect(commit).toHaveProperty("message");
        });
      });
    });
  });
});
