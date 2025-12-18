import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { CONFIG_SCHEMA, config } from "../../utils/config";

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

    test("should return empty string for empty API key", () => {
      const result = CONFIG_SCHEMA.GROQ_API_KEY.validate("");
      expect(result).toBe("");
    });

    test("should return empty string for whitespace-only API key", () => {
      const result = CONFIG_SCHEMA.GROQ_API_KEY.validate("   ");
      expect(result).toBe("");
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

  describe("CEREBRAS_API_KEY validation", () => {
    test("should validate correct API key format", () => {
      const validKey = "csk_1234567890abcdefghij";
      expect(() =>
        CONFIG_SCHEMA.CEREBRAS_API_KEY.validate(validKey),
      ).not.toThrow();
    });

    test("should return empty string for empty API key", () => {
      const result = CONFIG_SCHEMA.CEREBRAS_API_KEY.validate("");
      expect(result).toBe("");
    });

    test("should return empty string for whitespace-only API key", () => {
      const result = CONFIG_SCHEMA.CEREBRAS_API_KEY.validate("   ");
      expect(result).toBe("");
    });

    test("should throw error for invalid API key format", () => {
      expect(() => CONFIG_SCHEMA.CEREBRAS_API_KEY.validate("invalid")).toThrow(
        "Invalid CEREBRAS_API_KEY format",
      );
    });

    test("should trim whitespace from API key", () => {
      const result = CONFIG_SCHEMA.CEREBRAS_API_KEY.validate(
        "  csk_1234567890abcdefghij  ",
      );
      expect(result).toBe("csk_1234567890abcdefghij");
    });
  });

  describe("OPENAI_API_KEY validation", () => {
    test("should accept any non-empty API key", () => {
      const result = CONFIG_SCHEMA.OPENAI_API_KEY.validate("sk-any-key-format");
      expect(result).toBe("sk-any-key-format");
    });

    test("should return empty string for empty API key", () => {
      const result = CONFIG_SCHEMA.OPENAI_API_KEY.validate("");
      expect(result).toBe("");
    });

    test("should return empty string for whitespace-only API key", () => {
      const result = CONFIG_SCHEMA.OPENAI_API_KEY.validate("   ");
      expect(result).toBe("");
    });

    test("should trim whitespace from API key", () => {
      const result = CONFIG_SCHEMA.OPENAI_API_KEY.validate("  sk-test-key  ");
      expect(result).toBe("sk-test-key");
    });
  });

  describe("OPENAI_BASE_URL validation", () => {
    test("should accept valid URL", () => {
      const result = CONFIG_SCHEMA.OPENAI_BASE_URL.validate(
        "http://localhost:11434/v1",
      );
      expect(result).toBe("http://localhost:11434/v1");
    });

    test("should accept HTTPS URL", () => {
      const result = CONFIG_SCHEMA.OPENAI_BASE_URL.validate(
        "https://api.together.xyz/v1",
      );
      expect(result).toBe("https://api.together.xyz/v1");
    });

    test("should return empty string for empty URL", () => {
      const result = CONFIG_SCHEMA.OPENAI_BASE_URL.validate("");
      expect(result).toBe("");
    });

    test("should return empty string for whitespace-only URL", () => {
      const result = CONFIG_SCHEMA.OPENAI_BASE_URL.validate("   ");
      expect(result).toBe("");
    });

    test("should throw error for invalid URL format", () => {
      expect(() =>
        CONFIG_SCHEMA.OPENAI_BASE_URL.validate("not-a-valid-url"),
      ).toThrow("Invalid OPENAI_BASE_URL format");
    });

    test("should trim whitespace from URL", () => {
      const result = CONFIG_SCHEMA.OPENAI_BASE_URL.validate(
        "  http://localhost:1234/v1  ",
      );
      expect(result).toBe("http://localhost:1234/v1");
    });
  });

  describe("PROVIDER validation", () => {
    test("should accept 'groq' as valid provider", () => {
      const result = CONFIG_SCHEMA.PROVIDER.validate("groq");
      expect(result).toBe("groq");
    });

    test("should accept 'cerebras' as valid provider", () => {
      const result = CONFIG_SCHEMA.PROVIDER.validate("cerebras");
      expect(result).toBe("cerebras");
    });

    test("should accept 'openai' as valid provider", () => {
      const result = CONFIG_SCHEMA.PROVIDER.validate("openai");
      expect(result).toBe("openai");
    });

    test("should default to 'groq' for empty value", () => {
      const result = CONFIG_SCHEMA.PROVIDER.validate("");
      expect(result).toBe("groq");
    });

    test("should normalize provider to lowercase", () => {
      expect(CONFIG_SCHEMA.PROVIDER.validate("GROQ")).toBe("groq");
      expect(CONFIG_SCHEMA.PROVIDER.validate("CEREBRAS")).toBe("cerebras");
      expect(CONFIG_SCHEMA.PROVIDER.validate("OPENAI")).toBe("openai");
    });

    test("should throw error for invalid provider", () => {
      expect(() => CONFIG_SCHEMA.PROVIDER.validate("invalid")).toThrow(
        "PROVIDER must be one of:",
      );
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

    test("should default to 'main' for empty value", () => {
      const result = CONFIG_SCHEMA.DEFAULT_BRANCH.validate("");
      expect(result).toBe("main");
    });

    test("should trim whitespace", () => {
      const result = CONFIG_SCHEMA.DEFAULT_BRANCH.validate("  develop  ");
      expect(result).toBe("develop");
    });
  });

  describe("MODEL validation", () => {
    test("should accept any model name", () => {
      const models = [
        "llama-3.3-70b",
        "gpt-4",
        "claude-3-sonnet",
        "custom/model-name",
      ];

      models.forEach((model) => {
        expect(() => CONFIG_SCHEMA.MODEL.validate(model)).not.toThrow();
        expect(CONFIG_SCHEMA.MODEL.validate(model)).toBe(model);
      });
    });

    test("should throw error for empty model", () => {
      expect(() => CONFIG_SCHEMA.MODEL.validate("")).toThrow(
        "MODEL cannot be empty",
      );
    });

    test("should trim whitespace", () => {
      const result = CONFIG_SCHEMA.MODEL.validate("  llama-3.3-70b  ");
      expect(result).toBe("llama-3.3-70b");
    });
  });

  describe("FILTER_COMMITS validation", () => {
    test("should accept 'true' as valid value", () => {
      const result = CONFIG_SCHEMA.FILTER_COMMITS.validate("true");
      expect(result).toBe("true");
    });

    test("should accept 'false' as valid value", () => {
      const result = CONFIG_SCHEMA.FILTER_COMMITS.validate("false");
      expect(result).toBe("false");
    });

    test("should normalize to lowercase", () => {
      expect(CONFIG_SCHEMA.FILTER_COMMITS.validate("TRUE")).toBe("true");
      expect(CONFIG_SCHEMA.FILTER_COMMITS.validate("FALSE")).toBe("false");
      expect(CONFIG_SCHEMA.FILTER_COMMITS.validate("True")).toBe("true");
      expect(CONFIG_SCHEMA.FILTER_COMMITS.validate("False")).toBe("false");
    });

    test("should trim whitespace", () => {
      expect(CONFIG_SCHEMA.FILTER_COMMITS.validate("  true  ")).toBe("true");
      expect(CONFIG_SCHEMA.FILTER_COMMITS.validate("  false  ")).toBe("false");
    });

    test("should throw error for invalid boolean strings", () => {
      expect(() => CONFIG_SCHEMA.FILTER_COMMITS.validate("yes")).toThrow(
        "FILTER_COMMITS must be either 'true' or 'false'",
      );
      expect(() => CONFIG_SCHEMA.FILTER_COMMITS.validate("no")).toThrow(
        "FILTER_COMMITS must be either 'true' or 'false'",
      );
      expect(() => CONFIG_SCHEMA.FILTER_COMMITS.validate("1")).toThrow(
        "FILTER_COMMITS must be either 'true' or 'false'",
      );
      expect(() => CONFIG_SCHEMA.FILTER_COMMITS.validate("0")).toThrow(
        "FILTER_COMMITS must be either 'true' or 'false'",
      );
    });

    test("should throw error for empty string", () => {
      expect(() => CONFIG_SCHEMA.FILTER_COMMITS.validate("")).toThrow(
        "FILTER_COMMITS must be either 'true' or 'false'",
      );
    });

    test("should have default value of 'true'", () => {
      expect(CONFIG_SCHEMA.FILTER_COMMITS.default).toBe("true");
    });
  });

  describe("CONTEXT validation", () => {
    test("should accept valid context strings", () => {
      const validContexts = [
        "make it simple and cohesive",
        "be concise",
        "focus on business impact",
        "make it technical",
      ];

      validContexts.forEach((context) => {
        expect(() => CONFIG_SCHEMA.CONTEXT.validate(context)).not.toThrow();
        expect(CONFIG_SCHEMA.CONTEXT.validate(context)).toBe(context);
      });
    });

    test("should accept empty string and return empty", () => {
      const result = CONFIG_SCHEMA.CONTEXT.validate("");
      expect(result).toBe("");
    });

    test("should trim whitespace", () => {
      const result = CONFIG_SCHEMA.CONTEXT.validate("  make it simple  ");
      expect(result).toBe("make it simple");
    });

    test("should throw error for context longer than 200 characters", () => {
      const longContext = "a".repeat(201);
      expect(() => CONFIG_SCHEMA.CONTEXT.validate(longContext)).toThrow(
        "CONTEXT must be 200 characters or less",
      );
    });

    test("should accept context exactly 200 characters", () => {
      const context200 = "a".repeat(200);
      expect(() => CONFIG_SCHEMA.CONTEXT.validate(context200)).not.toThrow();
      expect(CONFIG_SCHEMA.CONTEXT.validate(context200)).toBe(context200);
    });

    test("should accept context with special characters", () => {
      const context = "Use simple language, don't make it too complex!";
      expect(() => CONFIG_SCHEMA.CONTEXT.validate(context)).not.toThrow();
      expect(CONFIG_SCHEMA.CONTEXT.validate(context)).toBe(context);
    });
  });

  describe("CUSTOM_LABELS validation", () => {
    test("should accept empty string", () => {
      const result = CONFIG_SCHEMA.CUSTOM_LABELS.validate("");
      expect(result).toBe("");
    });

    test("should accept valid label names", () => {
      const result = CONFIG_SCHEMA.CUSTOM_LABELS.validate(
        "feature,refactor,security",
      );
      expect(result).toBe("feature,refactor,security");
    });

    test("should accept labels with hyphens and underscores", () => {
      const result = CONFIG_SCHEMA.CUSTOM_LABELS.validate(
        "feature-request,code_review",
      );
      expect(result).toBe("feature-request,code_review");
    });

    test("should accept labels with numbers", () => {
      const result = CONFIG_SCHEMA.CUSTOM_LABELS.validate("v2-feature,fix123");
      expect(result).toBe("v2-feature,fix123");
    });

    test("should trim whitespace from labels", () => {
      const result = CONFIG_SCHEMA.CUSTOM_LABELS.validate(
        " feature , refactor , security ",
      );
      expect(result).toBe("feature,refactor,security");
    });

    test("should throw error for labels starting with number", () => {
      expect(() =>
        CONFIG_SCHEMA.CUSTOM_LABELS.validate("123invalid"),
      ).toThrow("Invalid label '123invalid'");
    });

    test("should throw error for labels with spaces", () => {
      expect(() =>
        CONFIG_SCHEMA.CUSTOM_LABELS.validate("has space"),
      ).toThrow("Invalid label");
    });

    test("should throw error for labels with special characters", () => {
      expect(() =>
        CONFIG_SCHEMA.CUSTOM_LABELS.validate("feature!,test@"),
      ).toThrow("Invalid label");
    });

    test("should throw error if exceeding 17 labels", () => {
      const tooMany = Array.from({ length: 18 }, (_, i) => `label${i}`).join(
        ",",
      );
      expect(() => CONFIG_SCHEMA.CUSTOM_LABELS.validate(tooMany)).toThrow(
        "cannot exceed 17 labels",
      );
    });

    test("should accept exactly 17 labels", () => {
      const maxLabels = Array.from({ length: 17 }, (_, i) => `label${i}`).join(
        ",",
      );
      expect(() =>
        CONFIG_SCHEMA.CUSTOM_LABELS.validate(maxLabels),
      ).not.toThrow();
    });

    test("should filter out empty entries from result", () => {
      const result = CONFIG_SCHEMA.CUSTOM_LABELS.validate(
        "feature,,refactor,",
      );
      expect(result).toBe("feature,refactor");
    });

    test("should have default value of empty string", () => {
      expect(CONFIG_SCHEMA.CUSTOM_LABELS.default).toBe("");
    });
  });
});

describe("Config class", () => {
  describe("get()", () => {
    test("should return default value when key not in config", async () => {
      const locale = await config.get("LOCALE");
      expect(locale).toBe("en");
    });

    test("should return empty string for GROQ_API_KEY when not in config", async () => {
      const result = await config.get("GROQ_API_KEY");
      expect(result).toBe("");
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
      expect(config.set("GROQ_API_KEY", "invalid")).rejects.toThrow(
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
      expect(config.set("LOCALE", "invalid_locale")).rejects.toThrow();
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
      expect(allConfig.DEFAULT_BRANCH).toBe("main");
      expect(allConfig.MODEL).toBe("llama-3.3-70b");
    });

    test("should return empty string for GROQ_API_KEY when missing", async () => {
      const allConfig = await config.getAll();

      expect(allConfig.GROQ_API_KEY).toBe("");
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
    test("should return valid:true when no required keys are missing", async () => {
      // GROQ_API_KEY is no longer required (conditionally required based on provider)
      const result = await config.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test("should return valid:true when GROQ_API_KEY is present and valid", async () => {
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
      // GROQ_API_KEY returns empty string when not set (no longer required)
      expect(allConfig.GROQ_API_KEY).toBe("");
      // LOCALE returns default when not set
      expect(allConfig.LOCALE).toBe("en");
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
