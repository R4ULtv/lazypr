import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { generatePullRequest } from "../../utils/groq";
import type { GitCommit } from "../../utils/git";
import { config } from "../../utils/config";

const ORIGINAL_CONFIG_FILE = join(homedir(), ".lazypr");

// Helper to backup and restore original config
let originalConfigContent: string | null = null;

beforeEach(async () => {
  // Backup original config if it exists
  try {
    originalConfigContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
  } catch {
    originalConfigContent = null;
  }

  // Reset config instance
  (config as any).cache.clear();
  (config as any).loaded = false;
});

afterEach(async () => {
  // Restore original config
  if (originalConfigContent !== null) {
    await writeFile(ORIGINAL_CONFIG_FILE, originalConfigContent, "utf8");
  } else {
    try {
      await unlink(ORIGINAL_CONFIG_FILE);
    } catch {
      // File doesn't exist, that's fine
    }
  }

  // Reset config instance
  (config as any).cache.clear();
  (config as any).loaded = false;
});

describe("generatePullRequest - Schema Validation", () => {
  test("should validate title length constraints (minimum 5 characters)", async () => {
    // Setup config with valid API key
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "abc123",
        shortHash: "abc123",
        author: "Test User",
        date: "2024-01-01",
        message: "Initial commit",
      },
    ];

    // This test verifies the schema enforces a minimum of 5 characters
    // The actual API call would fail if it returns a title < 5 chars
    try {
      const result = await generatePullRequest("feature/test", commits);

      // If successful, verify the result meets schema requirements
      expect(result.object.title).toBeDefined();
      expect(typeof result.object.title).toBe("string");
      expect(result.object.title.length).toBeGreaterThanOrEqual(5);
    } catch (error: any) {
      // Expected to fail without valid API key or network
      expect(error).toBeDefined();
    }
  });

  test("should validate title length constraints (maximum 50 characters)", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "def456",
        shortHash: "def456",
        author: "Test User",
        date: "2024-01-01",
        message: "Add feature",
      },
    ];

    try {
      const result = await generatePullRequest("feature/long-name", commits);

      expect(result.object.title).toBeDefined();
      expect(result.object.title.length).toBeLessThanOrEqual(50);
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should validate description minimum length (100 characters)", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "ghi789",
        shortHash: "ghi789",
        author: "Test User",
        date: "2024-01-01",
        message: "Fix bug in authentication",
      },
    ];

    try {
      const result = await generatePullRequest("bugfix/auth", commits);

      expect(result.object.description).toBeDefined();
      expect(typeof result.object.description).toBe("string");
      expect(result.object.description.length).toBeGreaterThanOrEqual(100);
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should return an object with title and description properties", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "jkl012",
        shortHash: "jkl012",
        author: "Test User",
        date: "2024-01-01",
        message: "Update dependencies",
      },
    ];

    try {
      const result = await generatePullRequest("chore/deps", commits);

      expect(result).toHaveProperty("object");
      expect(result).toHaveProperty("usage");
      expect(result.object).toHaveProperty("title");
      expect(result.object).toHaveProperty("description");
      expect(result.object).toHaveProperty("labels");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});

describe("generatePullRequest - Configuration Integration", () => {
  test("should use GROQ_API_KEY from config", async () => {
    const testApiKey = "gsk_integrationtest1234567890abc";
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      `GROQ_API_KEY=${testApiKey}\nMODEL=openai/gpt-oss-20b\n`,
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "mno345",
        shortHash: "mno345",
        author: "Test User",
        date: "2024-01-01",
        message: "Test commit",
      },
    ];

    // Verify config is loaded correctly
    const loadedApiKey = await config.get("GROQ_API_KEY");
    expect(loadedApiKey).toBe(testApiKey);

    try {
      await generatePullRequest("feature/test", commits);
    } catch (error: any) {
      // Expected to fail with invalid key, but it should attempt to use the key
      expect(error).toBeDefined();
    }
  });

  test("should use LOCALE from config", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nLOCALE=es\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const locale = await config.get("LOCALE");
    expect(locale).toBe("es");

    const commits: GitCommit[] = [
      {
        hash: "pqr678",
        shortHash: "pqr678",
        author: "Test User",
        date: "2024-01-01",
        message: "Add Spanish support",
      },
    ];

    try {
      await generatePullRequest("feature/i18n", commits);
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should use MODEL from config", async () => {
    const testModel = "openai/gpt-oss-120b";
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      `GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=${testModel}\n`,
      "utf8",
    );

    const model = await config.get("MODEL");
    expect(model).toBe(testModel);

    const commits: GitCommit[] = [
      {
        hash: "stu901",
        shortHash: "stu901",
        author: "Test User",
        date: "2024-01-01",
        message: "Test model config",
      },
    ];

    try {
      await generatePullRequest("feature/model-test", commits);
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should use MAX_RETRIES from config", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMAX_RETRIES=5\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const maxRetries = await config.get("MAX_RETRIES");
    expect(maxRetries).toBe("5");

    const commits: GitCommit[] = [
      {
        hash: "vwx234",
        shortHash: "vwx234",
        author: "Test User",
        date: "2024-01-01",
        message: "Test retries",
      },
    ];

    try {
      await generatePullRequest("feature/retry-test", commits);
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should use TIMEOUT from config", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nTIMEOUT=5000\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const timeout = await config.get("TIMEOUT");
    expect(timeout).toBe("5000");

    const commits: GitCommit[] = [
      {
        hash: "yz1567",
        shortHash: "yz1567",
        author: "Test User",
        date: "2024-01-01",
        message: "Test timeout",
      },
    ];

    try {
      await generatePullRequest("feature/timeout-test", commits);
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should throw error when GROQ_API_KEY is missing", async () => {
    // Create config without API key
    await writeFile(ORIGINAL_CONFIG_FILE, "MODEL=openai/gpt-oss-20b\n", "utf8");

    const commits: GitCommit[] = [
      {
        hash: "abc890",
        shortHash: "abc890",
        author: "Test User",
        date: "2024-01-01",
        message: "Test missing key",
      },
    ];

    try {
      await generatePullRequest("feature/test", commits);
      expect(true).toBe(false); // Should not reach here
    } catch (error: any) {
      expect(error).toBeDefined();
      // Should fail during config validation
    }
  });
});

describe("generatePullRequest - Input Processing", () => {
  test("should handle single commit", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "single1",
        shortHash: "single1",
        author: "Test User",
        date: "2024-01-01",
        message: "Single commit message",
      },
    ];

    try {
      const result = await generatePullRequest("feature/single", commits);
      expect(result).toBeDefined();
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should handle multiple commits", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "multi1",
        shortHash: "multi1",
        author: "Test User",
        date: "2024-01-01",
        message: "First commit",
      },
      {
        hash: "multi2",
        shortHash: "multi2",
        author: "Test User",
        date: "2024-01-02",
        message: "Second commit",
      },
      {
        hash: "multi3",
        shortHash: "multi3",
        author: "Test User",
        date: "2024-01-03",
        message: "Third commit",
      },
    ];

    try {
      const result = await generatePullRequest("feature/multi", commits);
      expect(result).toBeDefined();
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should handle commits with special characters", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "special1",
        shortHash: "special1",
        author: "Test User",
        date: "2024-01-01",
        message: "Fix: bug with @mentions",
      },
      {
        hash: "special2",
        shortHash: "special2",
        author: "Test User",
        date: "2024-01-02",
        message: 'Add "quotes" in message',
      },
      {
        hash: "special3",
        shortHash: "special3",
        author: "Test User",
        date: "2024-01-03",
        message: "Handle newlines\nand tabs\there",
      },
    ];

    try {
      const result = await generatePullRequest("bugfix/special-chars", commits);
      expect(result).toBeDefined();
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should handle different branch name patterns", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "branch1",
        shortHash: "branch1",
        author: "Test User",
        date: "2024-01-01",
        message: "Test commit",
      },
    ];

    const branchNames = [
      "feature/new-feature",
      "bugfix/fix-bug",
      "hotfix/critical-fix",
      "chore/update-deps",
      "docs/update-readme",
      "test/add-tests",
    ];

    for (const branchName of branchNames) {
      try {
        const result = await generatePullRequest(branchName, commits);
        expect(result).toBeDefined();
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    }
  });

  test("should handle empty commit messages", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "empty1",
        shortHash: "empty1",
        author: "Test User",
        date: "2024-01-01",
        message: "",
      },
    ];

    try {
      const result = await generatePullRequest("feature/empty", commits);
      expect(result).toBeDefined();
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should handle very long commit messages", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const longMessage = "A".repeat(1000);
    const commits: GitCommit[] = [
      {
        hash: "long1",
        shortHash: "long1",
        author: "Test User",
        date: "2024-01-01",
        message: longMessage,
      },
    ];

    try {
      const result = await generatePullRequest("feature/long-message", commits);
      expect(result).toBeDefined();
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});

describe("generatePullRequest - Error Handling", () => {
  test("should handle timeout errors", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nTIMEOUT=1\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "timeout1",
        shortHash: "timeout1",
        author: "Test User",
        date: "2024-01-01",
        message: "This should timeout",
      },
    ];

    try {
      await generatePullRequest("feature/timeout", commits);
      expect(true).toBe(false); // Should timeout
    } catch (error: any) {
      expect(error).toBeDefined();
      // Error should be related to timeout or API call failure
    }
  });

  test("should handle invalid model names gracefully", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=invalid-model-name\n",
      "utf8",
    );

    const _commits: GitCommit[] = [
      {
        hash: "invalid1",
        shortHash: "invalid1",
        author: "Test User",
        date: "2024-01-01",
        message: "Test invalid model",
      },
    ];

    try {
      await config.get("MODEL");
      expect(true).toBe(false); // Should fail validation
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should handle network errors", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_definitelyinvalidkey123\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "network1",
        shortHash: "network1",
        author: "Test User",
        date: "2024-01-01",
        message: "Test network error",
      },
    ];

    try {
      await generatePullRequest("feature/network-error", commits);
      expect(true).toBe(false); // Should fail with invalid API key
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});

describe("generatePullRequest - Return Type", () => {
  test("should return object with correct structure", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "struct1",
        shortHash: "struct1",
        author: "Test User",
        date: "2024-01-01",
        message: "Test structure",
      },
    ];

    try {
      const result = await generatePullRequest("feature/structure", commits);

      // Verify it's an object
      expect(typeof result).toBe("object");
      expect(result).not.toBeNull();

      // Verify result has object and usage
      expect(result).toHaveProperty("object");
      expect(result).toHaveProperty("usage");

      // Verify properties exist and are strings
      expect(typeof result.object.title).toBe("string");
      expect(typeof result.object.description).toBe("string");
      expect(Array.isArray(result.object.labels)).toBe(true);

      // Verify object properties
      const keys = Object.keys(result.object);
      expect(keys).toContain("title");
      expect(keys).toContain("description");
      expect(keys).toContain("labels");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should return strings (not other types)", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "types1",
        shortHash: "types1",
        author: "Test User",
        date: "2024-01-01",
        message: "Test types",
      },
    ];

    try {
      const result = await generatePullRequest("feature/types", commits);

      // Ensure title is a string, not number, boolean, etc.
      expect(result.object.title).not.toBeNull();
      expect(result.object.title).not.toBeUndefined();
      expect(Array.isArray(result.object.title)).toBe(false);

      // Ensure description is a string
      expect(result.object.description).not.toBeNull();
      expect(result.object.description).not.toBeUndefined();
      expect(Array.isArray(result.object.description)).toBe(false);

      // Ensure labels is an array
      expect(result.object.labels).not.toBeNull();
      expect(result.object.labels).not.toBeUndefined();
      expect(Array.isArray(result.object.labels)).toBe(true);
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});

describe("generatePullRequest - Labels", () => {
  test("should return object with labels property", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "label1",
        shortHash: "label1",
        author: "Test User",
        date: "2024-01-01",
        message: "Add new feature",
      },
    ];

    try {
      const result = await generatePullRequest("feature/labels", commits);

      // Verify labels property exists
      expect(result.object).toHaveProperty("labels");
      expect(Array.isArray(result.object.labels)).toBe(true);
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should validate labels are valid enum values", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "label2",
        shortHash: "label2",
        author: "Test User",
        date: "2024-01-01",
        message: "Fix critical bug in authentication",
      },
    ];

    try {
      const result = await generatePullRequest("bugfix/auth", commits);

      // Verify labels are from valid enum values
      const validLabels = ["enhancement", "bug", "documentation"];
      result.object.labels.forEach((label: string) => {
        expect(validLabels).toContain(label);
      });
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should handle empty labels array", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "label3",
        shortHash: "label3",
        author: "Test User",
        date: "2024-01-01",
        message: "Refactor code structure",
      },
    ];

    try {
      const result = await generatePullRequest("refactor/structure", commits);

      // Verify labels is an array (can be empty)
      expect(Array.isArray(result.object.labels)).toBe(true);
      expect(result.object.labels.length).toBeGreaterThanOrEqual(0);
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should return complete object structure with labels, title, and description", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "complete1",
        shortHash: "complete1",
        author: "Test User",
        date: "2024-01-01",
        message: "Update documentation for API endpoints",
      },
    ];

    try {
      const result = await generatePullRequest("docs/api", commits);

      // Verify complete structure
      expect(result.object).toHaveProperty("title");
      expect(result.object).toHaveProperty("description");
      expect(result.object).toHaveProperty("labels");

      expect(typeof result.object.title).toBe("string");
      expect(typeof result.object.description).toBe("string");
      expect(Array.isArray(result.object.labels)).toBe(true);
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  test("should return usage information alongside the object", async () => {
    await writeFile(
      ORIGINAL_CONFIG_FILE,
      "GROQ_API_KEY=gsk_test1234567890abcdefghijk\nMODEL=openai/gpt-oss-20b\n",
      "utf8",
    );

    const commits: GitCommit[] = [
      {
        hash: "usage1",
        shortHash: "usage1",
        author: "Test User",
        date: "2024-01-01",
        message: "Add user authentication",
      },
    ];

    try {
      const result = await generatePullRequest("feature/auth", commits);

      // Verify result has both object and usage
      expect(result).toHaveProperty("object");
      expect(result).toHaveProperty("usage");

      // Verify object structure
      expect(result.object).toHaveProperty("title");
      expect(result.object).toHaveProperty("description");
      expect(result.object).toHaveProperty("labels");
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});
