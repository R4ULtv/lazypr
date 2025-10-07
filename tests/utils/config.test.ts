import { expect, test, describe, beforeEach, afterEach } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { config, CONFIG_SCHEMA } from "../../utils/config";

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

describe("CONFIG_SCHEMA", () => {
  describe("GROQ_API_KEY validation", () => {
    test("should validate correct API key format", () => {
      const validKey = "gsk_1234567890abcdefghij";
      expect(() => CONFIG_SCHEMA.GROQ_API_KEY.validate(validKey)).not.toThrow();
    });

    test("should throw error for empty API key", () => {
      expect(() => CONFIG_SCHEMA.GROQ_API_KEY.validate("")).toThrow(
        "GROQ_API_KEY is required",
      );
    });

    test("should throw error for whitespace-only API key", () => {
      expect(() => CONFIG_SCHEMA.GROQ_API_KEY.validate("   ")).toThrow(
        "GROQ_API_KEY is required",
      );
    });

    test("should throw error for invalid API key format", () => {
      expect(() => CONFIG_SCHEMA.GROQ_API_KEY.validate("invalid")).toThrow(
        "Invalid GROQ_API_KEY format",
      );
    });

    test("should trim whitespace from API key", () => {
      const result = CONFIG_SCHEMA.GROQ_API_KEY.validate(
        "  gsk_1234567890abcdefghij  ",
      );
      expect(result).toBe("gsk_1234567890abcdefghij");
    });
  });

  describe("LOCALE validation", () => {
    test("should accept valid locales", () => {
      const validLocales = [
        "en",
        "es",
        "pt",
        "fr",
        "de",
        "it",
        "ja",
        "ko",
        "zh",
      ];
      validLocales.forEach((locale) => {
        expect(() => CONFIG_SCHEMA.LOCALE.validate(locale)).not.toThrow();
      });
    });

    test("should default to 'en' for empty value", () => {
      const result = CONFIG_SCHEMA.LOCALE.validate("");
      expect(result).toBe("en");
    });

    test("should normalize locale to lowercase", () => {
      const result = CONFIG_SCHEMA.LOCALE.validate("EN");
      expect(result).toBe("en");
    });

    test("should throw error for invalid locale", () => {
      expect(() => CONFIG_SCHEMA.LOCALE.validate("invalid")).toThrow(
        "LOCALE must be one of:",
      );
    });

    test("should trim whitespace from locale", () => {
      const result = CONFIG_SCHEMA.LOCALE.validate("  es  ");
      expect(result).toBe("es");
    });
  });

  describe("MAX_RETRIES validation", () => {
    test("should accept valid positive numbers", () => {
      expect(() => CONFIG_SCHEMA.MAX_RETRIES.validate("5")).not.toThrow();
      expect(CONFIG_SCHEMA.MAX_RETRIES.validate("5")).toBe("5");
    });

    test("should accept zero", () => {
      expect(() => CONFIG_SCHEMA.MAX_RETRIES.validate("0")).not.toThrow();
      expect(CONFIG_SCHEMA.MAX_RETRIES.validate("0")).toBe("0");
    });

    test("should throw error for negative numbers", () => {
      expect(() => CONFIG_SCHEMA.MAX_RETRIES.validate("-1")).toThrow(
        "MAX_RETRIES must be a non-negative number",
      );
    });

    test("should throw error for non-numeric values", () => {
      expect(() => CONFIG_SCHEMA.MAX_RETRIES.validate("abc")).toThrow(
        "MAX_RETRIES must be a non-negative number",
      );
    });
  });

  describe("TIMEOUT validation", () => {
    test("should accept valid positive numbers", () => {
      expect(() => CONFIG_SCHEMA.TIMEOUT.validate("30000")).not.toThrow();
      expect(CONFIG_SCHEMA.TIMEOUT.validate("30000")).toBe("30000");
    });

    test("should accept zero", () => {
      expect(() => CONFIG_SCHEMA.TIMEOUT.validate("0")).not.toThrow();
      expect(CONFIG_SCHEMA.TIMEOUT.validate("0")).toBe("0");
    });

    test("should throw error for negative numbers", () => {
      expect(() => CONFIG_SCHEMA.TIMEOUT.validate("-1000")).toThrow(
        "TIMEOUT must be a non-negative number",
      );
    });

    test("should throw error for non-numeric values", () => {
      expect(() => CONFIG_SCHEMA.TIMEOUT.validate("invalid")).toThrow(
        "TIMEOUT must be a non-negative number",
      );
    });
  });

  describe("DEFAULT_BRANCH validation", () => {
    test("should accept any branch name", () => {
      const result = CONFIG_SCHEMA.DEFAULT_BRANCH.validate("main");
      expect(result).toBe("main");
    });

    test("should normalize to lowercase", () => {
      const result = CONFIG_SCHEMA.DEFAULT_BRANCH.validate("MAIN");
      expect(result).toBe("main");
    });

    test("should default to 'master' for empty value", () => {
      const result = CONFIG_SCHEMA.DEFAULT_BRANCH.validate("");
      expect(result).toBe("master");
    });

    test("should trim whitespace", () => {
      const result = CONFIG_SCHEMA.DEFAULT_BRANCH.validate("  develop  ");
      expect(result).toBe("develop");
    });
  });

  describe("MODEL validation", () => {
    test("should accept supported models", () => {
      const supportedModels = [
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b",
        "moonshotai/kimi-k2-instruct-0905",
        "meta-llama/llama-4-maverick-17b-128e-instruct",
        "meta-llama/llama-4-scout-17b-16e-instruct",
      ];

      supportedModels.forEach((model) => {
        expect(() => CONFIG_SCHEMA.MODEL.validate(model)).not.toThrow();
        expect(CONFIG_SCHEMA.MODEL.validate(model)).toBe(model);
      });
    });

    test("should throw error for unsupported model", () => {
      expect(() => CONFIG_SCHEMA.MODEL.validate("unsupported/model")).toThrow(
        "MODEL must be one of the supported",
      );
    });

    test("should throw error for empty model", () => {
      expect(() => CONFIG_SCHEMA.MODEL.validate("")).toThrow(
        "MODEL cannot be empty",
      );
    });

    test("should trim whitespace", () => {
      const result = CONFIG_SCHEMA.MODEL.validate("  openai/gpt-oss-20b  ");
      expect(result).toBe("openai/gpt-oss-20b");
    });
  });
});

describe("Config class", () => {
  describe("get()", () => {
    test("should return default value when key not in config", async () => {
      const locale = await config.get("LOCALE");
      expect(locale).toBe("en");
    });

    test("should throw error for required key not in config", async () => {
      await expect(config.get("GROQ_API_KEY")).rejects.toThrow(
        "GROQ_API_KEY is required but not set",
      );
    });

    test("should return validated value from config file", async () => {
      const testKey = "gsk_1234567890abcdefghij";
      await writeFile(ORIGINAL_CONFIG_FILE, `GROQ_API_KEY=${testKey}`, "utf8");
      (config as any).loaded = false;

      const result = await config.get("GROQ_API_KEY");
      expect(result).toBe(testKey);
    });

    test("should load and parse config file with multiple entries", async () => {
      const configContent = `GROQ_API_KEY=gsk_1234567890abcdefghij
LOCALE=es
MAX_RETRIES=5`;
      await writeFile(ORIGINAL_CONFIG_FILE, configContent, "utf8");
      (config as any).loaded = false;

      expect(await config.get("GROQ_API_KEY")).toBe("gsk_1234567890abcdefghij");
      expect(await config.get("LOCALE")).toBe("es");
      expect(await config.get("MAX_RETRIES")).toBe("5");
    });

    test("should ignore comments in config file", async () => {
      const configContent = `# This is a comment
GROQ_API_KEY=gsk_1234567890abcdefghij
# Another comment
LOCALE=es`;
      await writeFile(ORIGINAL_CONFIG_FILE, configContent, "utf8");
      (config as any).loaded = false;

      expect(await config.get("GROQ_API_KEY")).toBe("gsk_1234567890abcdefghij");
      expect(await config.get("LOCALE")).toBe("es");
    });

    test("should handle values with equals signs", async () => {
      // Using DEFAULT_BRANCH since it allows any characters including equals signs
      const configContent = "DEFAULT_BRANCH=feature/test=branch";
      await writeFile(ORIGINAL_CONFIG_FILE, configContent, "utf8");
      (config as any).loaded = false;

      const result = await config.get("DEFAULT_BRANCH");
      expect(result).toBe("feature/test=branch");
    });

    test("should only load config file once", async () => {
      const testKey = "gsk_1234567890abcdefghij";
      await writeFile(ORIGINAL_CONFIG_FILE, `GROQ_API_KEY=${testKey}`, "utf8");
      (config as any).loaded = false;

      await config.get("GROQ_API_KEY");

      // Change file content
      await writeFile(
        ORIGINAL_CONFIG_FILE,
        "GROQ_API_KEY=gsk_different_key_value",
        "utf8",
      );

      // Should still return original value (cached)
      const result = await config.get("GROQ_API_KEY");
      expect(result).toBe(testKey);
    });
  });

  describe("set()", () => {
    test("should set and persist valid config value", async () => {
      const testKey = "gsk_1234567890abcdefghij";
      await config.set("GROQ_API_KEY", testKey);

      const fileContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
      expect(fileContent).toContain(`GROQ_API_KEY=${testKey}`);
    });

    test("should throw error for invalid value", async () => {
      await expect(config.set("GROQ_API_KEY", "invalid")).rejects.toThrow(
        "Invalid GROQ_API_KEY format",
      );
    });

    test("should update existing key", async () => {
      await config.set("GROQ_API_KEY", "gsk_1234567890abcdefghij");
      await config.set("GROQ_API_KEY", "gsk_0987654321jihgfedcba");

      const result = await config.get("GROQ_API_KEY");
      expect(result).toBe("gsk_0987654321jihgfedcba");
    });

    test("should set multiple keys", async () => {
      await config.set("GROQ_API_KEY", "gsk_1234567890abcdefghij");
      await config.set("LOCALE", "es");
      await config.set("MAX_RETRIES", "5");

      expect(await config.get("GROQ_API_KEY")).toBe("gsk_1234567890abcdefghij");
      expect(await config.get("LOCALE")).toBe("es");
      expect(await config.get("MAX_RETRIES")).toBe("5");
    });

    test("should validate value before setting", async () => {
      await expect(config.set("LOCALE", "invalid_locale")).rejects.toThrow();
    });
  });

  describe("getAll()", () => {
    test("should return all config values with defaults", async () => {
      await config.set("GROQ_API_KEY", "gsk_1234567890abcdefghij");

      const allConfig = await config.getAll();

      expect(allConfig.GROQ_API_KEY).toBe("gsk_1234567890abcdefghij");
      expect(allConfig.LOCALE).toBe("en");
      expect(allConfig.MAX_RETRIES).toBe("2");
      expect(allConfig.TIMEOUT).toBe("10000");
      expect(allConfig.DEFAULT_BRANCH).toBe("master");
      expect(allConfig.MODEL).toBe("openai/gpt-oss-20b");
    });

    test("should skip required keys that are missing", async () => {
      const allConfig = await config.getAll();

      expect(allConfig.GROQ_API_KEY).toBeUndefined();
    });

    test("should return custom values", async () => {
      await config.set("GROQ_API_KEY", "gsk_1234567890abcdefghij");
      await config.set("LOCALE", "es");
      await config.set("MAX_RETRIES", "10");

      const allConfig = await config.getAll();

      expect(allConfig.LOCALE).toBe("es");
      expect(allConfig.MAX_RETRIES).toBe("10");
    });
  });

  describe("validate()", () => {
    test("should return valid:false when required keys are missing", async () => {
      const result = await config.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.includes("GROQ_API_KEY"))).toBe(true);
    });

    test("should return valid:true when all required keys are present and valid", async () => {
      await config.set("GROQ_API_KEY", "gsk_1234567890abcdefghij");

      const result = await config.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should include validation errors for invalid values", async () => {
      const configContent = "GROQ_API_KEY=invalid_key_format";
      await writeFile(ORIGINAL_CONFIG_FILE, configContent, "utf8");
      (config as any).loaded = false;

      const result = await config.validate();

      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes("Invalid GROQ_API_KEY format")),
      ).toBe(true);
    });
  });

  describe("remove()", () => {
    test("should remove key from config", async () => {
      await config.set("GROQ_API_KEY", "gsk_1234567890abcdefghij");
      await config.set("LOCALE", "es");

      await config.remove("LOCALE");

      const locale = await config.get("LOCALE");
      expect(locale).toBe("en"); // Should return default
    });

    test("should persist removal to file", async () => {
      await config.set("GROQ_API_KEY", "gsk_1234567890abcdefghij");
      await config.set("LOCALE", "es");

      await config.remove("LOCALE");

      const fileContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
      expect(fileContent).not.toContain("LOCALE=");
      expect(fileContent).toContain("GROQ_API_KEY=");
    });
  });

  describe("clear()", () => {
    test("should remove all config values", async () => {
      await config.set("GROQ_API_KEY", "gsk_1234567890abcdefghij");
      await config.set("LOCALE", "es");
      await config.set("MAX_RETRIES", "5");

      await config.clear();

      const allConfig = await config.getAll();
      expect(allConfig.GROQ_API_KEY).toBeUndefined();
    });

    test("should persist clear to file", async () => {
      await config.set("GROQ_API_KEY", "gsk_1234567890abcdefghij");
      await config.set("LOCALE", "es");

      await config.clear();

      const fileContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
      expect(fileContent).toBe("");
    });
  });

  describe("config file parsing", () => {
    test("should handle empty lines", async () => {
      const configContent = `GROQ_API_KEY=gsk_1234567890abcdefghij

LOCALE=es

`;
      await writeFile(ORIGINAL_CONFIG_FILE, configContent, "utf8");
      (config as any).loaded = false;

      expect(await config.get("GROQ_API_KEY")).toBe("gsk_1234567890abcdefghij");
      expect(await config.get("LOCALE")).toBe("es");
    });

    test("should handle whitespace around key-value pairs", async () => {
      const configContent = `  GROQ_API_KEY  =  gsk_1234567890abcdefghij
  LOCALE  =  es  `;
      await writeFile(ORIGINAL_CONFIG_FILE, configContent, "utf8");
      (config as any).loaded = false;

      expect(await config.get("GROQ_API_KEY")).toBe("gsk_1234567890abcdefghij");
      expect(await config.get("LOCALE")).toBe("es");
    });

    test("should create config file if it doesn't exist", async () => {
      try {
        await unlink(ORIGINAL_CONFIG_FILE);
      } catch {}

      (config as any).loaded = false;

      await config.set("GROQ_API_KEY", "gsk_1234567890abcdefghij");

      const fileContent = await readFile(ORIGINAL_CONFIG_FILE, "utf8");
      expect(fileContent).toContain("GROQ_API_KEY=gsk_1234567890abcdefghij");
    });
  });
});
