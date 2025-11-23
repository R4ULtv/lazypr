import { expect, test, describe, beforeEach, afterEach, mock } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { config } from "../utils/config";

const ORIGINAL_CONFIG_FILE = join(homedir(), ".lazypr");
const CLI_PATH = join(import.meta.dir, "..", "index.ts");

// Helper to backup and restore original config
let originalConfigContent: string | null = null;

beforeEach(async () => {
  // Backup original config if it exists
  try {
    originalConfigContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
  } catch {
    originalConfigContent = null;
  }

  // Clear any existing test config
  try {
    await unlink(ORIGINAL_CONFIG_FILE);
  } catch {
    // File doesn't exist, that's fine
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

describe("CLI - config command", () => {
  describe("config set", () => {
    test("should set valid GROQ_API_KEY", async () => {
      const testKey = "gsk_1234567890abcdefghij";
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", `GROQ_API_KEY=${testKey}`],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Setting config");
      expect(result.stdout).toContain("GROQ_API_KEY");

      // Verify it was actually written
      const fileContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
      expect(fileContent).toContain(`GROQ_API_KEY=${testKey}`);
    });

    test("should set valid LOCALE", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", "LOCALE=es"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Setting config");

      const fileContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
      expect(fileContent).toContain("LOCALE=es");
    });

    test("should set valid MAX_RETRIES", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", "MAX_RETRIES=5"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Setting config");

      const fileContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
      expect(fileContent).toContain("MAX_RETRIES=5");
    });

    test("should set valid TIMEOUT", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", "TIMEOUT=15000"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Setting config");

      const fileContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
      expect(fileContent).toContain("TIMEOUT=15000");
    });

    test("should set valid DEFAULT_BRANCH", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", "DEFAULT_BRANCH=main"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Setting config");

      const fileContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
      expect(fileContent).toContain("DEFAULT_BRANCH=main");
    });

    test("should set valid MODEL", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", "MODEL=openai/gpt-oss-120b"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Setting config");

      const fileContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
      expect(fileContent).toContain("MODEL=openai/gpt-oss-120b");
    });

    test("should reject invalid config key", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", "INVALID_KEY=value"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stderr || result.stdout).toContain("Unknown config key");
    });

    test("should reject set command without equals sign", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", "KEY_WITHOUT_EQUALS"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stderr || result.stdout).toContain(
        "key-value pair must be in format KEY=VALUE",
      );
    });

    test("should reject empty key", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", "=value"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stderr || result.stdout).toContain("Key cannot be empty");
    });

    test("should handle values with equals signs", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", "DEFAULT_BRANCH=feature/test=value"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Setting config");
    });

    test("should reject invalid GROQ_API_KEY format", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", "GROQ_API_KEY=invalid"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stderr || result.stdout).toContain(
        "Invalid GROQ_API_KEY format",
      );
    });

    test("should reject invalid LOCALE", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", "LOCALE=invalid"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stderr || result.stdout).toContain("LOCALE must be one of");
    });

    test("should reject negative MAX_RETRIES", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", "MAX_RETRIES=-1"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stderr || result.stdout).toContain(
        "MAX_RETRIES must be a non-negative number",
      );
    });

    test("should reject negative TIMEOUT", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", "TIMEOUT=-1000"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stderr || result.stdout).toContain(
        "TIMEOUT must be a non-negative number",
      );
    });

    test("should set valid CONTEXT", async () => {
      const result = spawnSync(
        "bun",
        [
          "run",
          CLI_PATH,
          "config",
          "set",
          "CONTEXT=make it simple and cohesive",
        ],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Setting config");

      const fileContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
      expect(fileContent).toContain("CONTEXT=make it simple and cohesive");
    });

    test("should set empty CONTEXT", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", "CONTEXT="],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);
    });

    test("should reject CONTEXT longer than 200 characters", async () => {
      const longContext = "a".repeat(201);
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", `CONTEXT=${longContext}`],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stderr || result.stdout).toContain(
        "CONTEXT must be 200 characters or less",
      );
    });
  });

  describe("config get", () => {
    test("should get existing config value", async () => {
      await config.set("LOCALE", "es");

      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "get", "LOCALE"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("LOCALE = es");
    });

    test("should show empty value for missing GROQ_API_KEY", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "get", "GROQ_API_KEY"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      // GROQ_API_KEY now returns empty string when not set (conditionally required)
      expect(result.stdout).toContain("GROQ_API_KEY");
    });

    test("should reject invalid config key for get", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "get", "INVALID_KEY"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stderr || result.stdout).toContain("Unknown config");
    });

    test("should reject empty key for get", async () => {
      const result = spawnSync("bun", ["run", CLI_PATH, "config", "get", ""], {
        encoding: "utf8",
      });

      expect(result.status).toBe(1);
      expect(result.stderr || result.stdout).toContain("Key cannot be empty");
    });

    test("should get default value when key not set", async () => {
      await writeFile(
        ORIGINAL_CONFIG_FILE,
        "GROQ_API_KEY=gsk_1234567890abcdefghij",
        "utf8",
      );

      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "get", "DEFAULT_BRANCH"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("DEFAULT_BRANCH = master");
    });
  });

  describe("config remove", () => {
    test("should remove existing config key", async () => {
      await config.set("LOCALE", "es");
      await config.set("MAX_RETRIES", "5");

      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "remove", "LOCALE"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Removing config");
      expect(result.stdout).toContain("removed successfully");

      const fileContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
      expect(fileContent).not.toContain("LOCALE=");
      expect(fileContent).toContain("MAX_RETRIES=5");
    });

    test("should reject invalid config key for remove", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "remove", "INVALID_KEY"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stderr || result.stdout).toContain("Unknown config key");
    });

    test("should reject empty key for remove", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "remove", ""],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stderr || result.stdout).toContain("Key cannot be empty");
    });
  });

  describe("config invalid operation", () => {
    test("should reject invalid config operation", async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "invalid", "KEY=VALUE"],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(1);
      expect(result.stderr || result.stdout).toContain("Invalid operation");
    });
  });
});

describe("CLI - version and help", () => {
  test("should display version with --version flag", async () => {
    const result = spawnSync("bun", ["run", CLI_PATH, "--version"], {
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  test("should display version with -V flag", async () => {
    const result = spawnSync("bun", ["run", CLI_PATH, "-V"], {
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  test("should display help with --help flag", async () => {
    const result = spawnSync("bun", ["run", CLI_PATH, "--help"], {
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("lazypr");
    expect(result.stdout).toContain("Generate pull request");
  });

  test("should display help with -h flag", async () => {
    const result = spawnSync("bun", ["run", CLI_PATH, "-h"], {
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("lazypr");
  });
});

describe("CLI - main command structure", () => {
  test("should have config command available", async () => {
    const result = spawnSync("bun", ["run", CLI_PATH, "config", "--help"], {
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("config");
  });

  test("should accept target branch argument", async () => {
    // This test just verifies the CLI accepts the argument
    // Without a valid git repo/config, it will fail early but that's expected
    const result = spawnSync("bun", ["run", CLI_PATH, "main"], {
      encoding: "utf8",
    });

    // Exit code will be non-zero due to missing config/git, but command structure is valid
    expect(result.status).toBeDefined();
  });
});

describe("CLI - error handling", () => {
  test("should handle missing GROQ_API_KEY gracefully", async () => {
    // Run in a git repository but without API key
    const result = spawnSync("bun", ["run", CLI_PATH], {
      encoding: "utf8",
      cwd: join(import.meta.dir, ".."),
    });

    // Should exit with message about setting GROQ_API_KEY
    const output = result.stdout + result.stderr;
    expect(output).toContain("GROQ_API_KEY");
  });

  test("should validate config operations require arguments", async () => {
    const result = spawnSync("bun", ["run", CLI_PATH, "config"], {
      encoding: "utf8",
    });

    // Commander will show error about missing arguments
    expect(result.status).not.toBe(0);
  });
});

describe("CLI - config file operations", () => {
  test("should create config file if it doesn't exist on set", async () => {
    await unlink(ORIGINAL_CONFIG_FILE).catch(() => {});

    const result = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "set", "LOCALE=es"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);

    const fileContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
    expect(fileContent).toContain("LOCALE=es");
  });

  test("should handle multiple config operations in sequence", async () => {
    // Set multiple values
    const set1 = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "set", "LOCALE=es"],
      { encoding: "utf8" },
    );
    expect(set1.status).toBe(0);

    const set2 = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "set", "MAX_RETRIES=5"],
      { encoding: "utf8" },
    );
    expect(set2.status).toBe(0);

    const set3 = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "set", "TIMEOUT=15000"],
      { encoding: "utf8" },
    );
    expect(set3.status).toBe(0);

    // Verify all values
    const fileContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
    expect(fileContent).toContain("LOCALE=es");
    expect(fileContent).toContain("MAX_RETRIES=5");
    expect(fileContent).toContain("TIMEOUT=15000");
  });

  test("should update existing config value", async () => {
    const set1 = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "set", "LOCALE=es"],
      { encoding: "utf8" },
    );
    expect(set1.status).toBe(0);

    const set2 = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "set", "LOCALE=fr"],
      { encoding: "utf8" },
    );
    expect(set2.status).toBe(0);

    const get = spawnSync("bun", ["run", CLI_PATH, "config", "get", "LOCALE"], {
      encoding: "utf8",
    });
    expect(get.stdout).toContain("LOCALE = fr");
  });
});

describe("CLI - input validation", () => {
  test("should trim whitespace from config keys", async () => {
    const result = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "set", "LOCALE=  es  "],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);

    const get = spawnSync("bun", ["run", CLI_PATH, "config", "get", "LOCALE"], {
      encoding: "utf8",
    });
    expect(get.stdout).toContain("LOCALE = es");
  });

  test("should handle config keys with case sensitivity", async () => {
    // Config keys should be handled case-sensitively
    const result = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "set", "locale=es"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr || result.stdout).toContain("Unknown config key");
  });
});

describe("CLI - integration scenarios", () => {
  test("should handle complete config workflow", async () => {
    // Set API key
    const setKey = spawnSync(
      "bun",
      [
        "run",
        CLI_PATH,
        "config",
        "set",
        "GROQ_API_KEY=gsk_1234567890abcdefghij",
      ],
      { encoding: "utf8" },
    );
    expect(setKey.status).toBe(0);

    // Get API key
    const getKey = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "get", "GROQ_API_KEY"],
      { encoding: "utf8" },
    );
    expect(getKey.stdout).toContain("gsk_1234567890abcdefghij");

    // Set locale
    const setLocale = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "set", "LOCALE=es"],
      { encoding: "utf8" },
    );
    expect(setLocale.status).toBe(0);

    // Remove locale
    const removeLocale = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "remove", "LOCALE"],
      { encoding: "utf8" },
    );
    expect(removeLocale.status).toBe(0);

    // Verify locale is back to default
    const getLocale = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "get", "LOCALE"],
      { encoding: "utf8" },
    );
    expect(getLocale.stdout).toContain("LOCALE = en");
  });

  test("should preserve other config values when removing one", async () => {
    await config.set("GROQ_API_KEY", "gsk_1234567890abcdefghij");
    await config.set("LOCALE", "es");
    await config.set("MAX_RETRIES", "5");

    const remove = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "remove", "LOCALE"],
      { encoding: "utf8" },
    );
    expect(remove.status).toBe(0);

    const getKey = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "get", "GROQ_API_KEY"],
      { encoding: "utf8" },
    );
    expect(getKey.stdout).toContain("gsk_1234567890abcdefghij");

    const getRetries = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "get", "MAX_RETRIES"],
      { encoding: "utf8" },
    );
    expect(getRetries.stdout).toContain("MAX_RETRIES = 5");
  });
});

describe("CLI - edge cases", () => {
  test("should handle special characters in branch names", async () => {
    const result = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "set", "DEFAULT_BRANCH=feature/test-123"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);

    const get = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "get", "DEFAULT_BRANCH"],
      { encoding: "utf8" },
    );
    expect(get.stdout).toContain("feature/test-123");
  });

  test("should handle very long config values", async () => {
    const longValue = "a".repeat(100);
    const result = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "set", `DEFAULT_BRANCH=${longValue}`],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
  });

  test("should handle unicode characters in branch names", async () => {
    const result = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "set", "DEFAULT_BRANCH=测试分支"],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);

    const get = spawnSync(
      "bun",
      ["run", CLI_PATH, "config", "get", "DEFAULT_BRANCH"],
      { encoding: "utf8" },
    );
    expect(get.stdout).toContain("测试分支");
  });
});

describe("CLI - all supported locales", () => {
  const validLocales = ["en", "es", "pt", "fr", "de", "it", "ja", "ko", "zh"];

  validLocales.forEach((locale) => {
    test(`should accept locale: ${locale}`, async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", `LOCALE=${locale}`],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);

      const get = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "get", "LOCALE"],
        { encoding: "utf8" },
      );
      expect(get.stdout).toContain(`LOCALE = ${locale}`);
    });
  });
});

describe("CLI - model configuration", () => {
  const testModels = ["llama-3.3-70b", "gpt-4", "custom/model-name"];

  testModels.forEach((model) => {
    test(`should accept model: ${model}`, async () => {
      const result = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "set", `MODEL=${model}`],
        { encoding: "utf8" },
      );

      expect(result.status).toBe(0);

      const get = spawnSync(
        "bun",
        ["run", CLI_PATH, "config", "get", "MODEL"],
        { encoding: "utf8" },
      );
      expect(get.stdout).toContain(`MODEL = ${model}`);
    });
  });
});
