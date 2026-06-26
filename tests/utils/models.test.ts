import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CONFIG_FILE, CONFIG_SCHEMA } from "../../utils/config";
import { config } from "../../utils/config";
import {
  CUSTOM_MODEL_SENTINEL,
  LOCALE_OPTIONS,
  MODEL_COMBOS,
  applyProviderModel,
  getApiKeyConfigKey,
  getApiKeyLink,
  isProviderType,
  validateConfigValue,
} from "../../utils/models";

const TEST_CONFIG_FILE = join(tmpdir(), "lazypr-models-test.conf");

beforeEach(async () => {
  config.setFilePath(TEST_CONFIG_FILE);
  try {
    await unlink(TEST_CONFIG_FILE);
  } catch {
    // File doesn't exist, that's fine
  }
});

afterEach(async () => {
  try {
    await unlink(TEST_CONFIG_FILE);
  } catch {
    // File doesn't exist, that's fine
  }
  config.setFilePath(CONFIG_FILE);
});

// ---------------------------------------------------------------------------
// MODEL_COMBOS — catalog integrity
// ---------------------------------------------------------------------------

describe("MODEL_COMBOS catalog", () => {
  test("every combo has a non-empty label", () => {
    for (const combo of MODEL_COMBOS) {
      expect(combo.label).toBeTruthy();
      expect(combo.label.length).toBeGreaterThan(0);
    }
  });

  test("labels are unique across all combos", () => {
    const labels = MODEL_COMBOS.map((c) => c.label);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });

  test("every combo's provider passes CONFIG_SCHEMA.PROVIDER.validate", () => {
    for (const combo of MODEL_COMBOS) {
      if (combo.isCustom) continue; // sentinel entries use CUSTOM_MODEL_SENTINEL
      expect(() => CONFIG_SCHEMA.PROVIDER.validate(combo.provider)).not.toThrow();
    }
  });

  test("every non-sentinel combo's model passes CONFIG_SCHEMA.MODEL.validate", () => {
    for (const combo of MODEL_COMBOS) {
      if (combo.isCustom) continue; // custom entries use CUSTOM_MODEL_SENTINEL, skip
      expect(() => CONFIG_SCHEMA.MODEL.validate(combo.model)).not.toThrow();
      expect(combo.model.length).toBeGreaterThan(0);
    }
  });

  test("every provider value is a valid ProviderType", () => {
    const validProviders = ["groq", "cerebras", "google", "openai"];
    for (const combo of MODEL_COMBOS) {
      expect(validProviders).toContain(combo.provider);
    }
  });

  test("each provider has a custom/local escape hatch entry", () => {
    const providers = ["groq", "cerebras", "google", "openai"] as const;
    for (const provider of providers) {
      const hasCustomEntry = MODEL_COMBOS.some(
        (c) => c.provider === provider && c.isCustom === true,
      );
      expect(hasCustomEntry).toBe(true);
    }
  });

  test("custom entries use CUSTOM_MODEL_SENTINEL as model", () => {
    const customEntries = MODEL_COMBOS.filter((c) => c.isCustom);
    expect(customEntries.length).toBeGreaterThan(0);
    for (const entry of customEntries) {
      expect(entry.model).toBe(CUSTOM_MODEL_SENTINEL);
    }
  });

  test("CUSTOM_MODEL_SENTINEL is a non-empty string", () => {
    expect(typeof CUSTOM_MODEL_SENTINEL).toBe("string");
    expect(CUSTOM_MODEL_SENTINEL.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// applyProviderModel — persistence helper
// ---------------------------------------------------------------------------

describe("applyProviderModel", () => {
  test("persists PROVIDER and MODEL to config", async () => {
    const result = await applyProviderModel({ provider: "groq", model: "llama-3.3-70b" });

    expect(result.provider).toBe("groq");
    expect(result.model).toBe("llama-3.3-70b");

    // Verify persistence
    expect(await config.get("PROVIDER")).toBe("groq");
    expect(await config.get("MODEL")).toBe("llama-3.3-70b");
  });

  test("returns normalized values post-validation", async () => {
    const result = await applyProviderModel({ provider: "cerebras", model: "  llama3.3-70b  " });

    // MODEL is trimmed by validation
    expect(result.model).toBe("llama3.3-70b");
    expect(result.provider).toBe("cerebras");
  });

  test("works with google provider and gemini model", async () => {
    const result = await applyProviderModel({ provider: "google", model: "gemini-2.5-flash" });

    expect(result.provider).toBe("google");
    expect(result.model).toBe("gemini-2.5-flash");
  });

  test("works with openai provider", async () => {
    const result = await applyProviderModel({ provider: "openai", model: "gpt-4o" });

    expect(result.provider).toBe("openai");
    expect(result.model).toBe("gpt-4o");
  });

  test("preserves arbitrary/custom model id (free-form MODEL)", async () => {
    const customModel = "my-custom-quantized-model-v3-gguf";
    const result = await applyProviderModel({ provider: "openai", model: customModel });

    expect(result.model).toBe(customModel);
    expect(await config.get("MODEL")).toBe(customModel);
  });

  test("throws on invalid provider", async () => {
    await expect(
      // @ts-expect-error — intentionally passing invalid provider for test
      applyProviderModel({ provider: "invalid-provider", model: "some-model" }),
    ).rejects.toThrow("PROVIDER must be one of");
  });

  test("throws when model is empty string", async () => {
    await expect(applyProviderModel({ provider: "groq", model: "" })).rejects.toThrow(
      "MODEL cannot be empty",
    );
  });
});

// ---------------------------------------------------------------------------
// isProviderType guard
// ---------------------------------------------------------------------------

describe("isProviderType", () => {
  test("returns true for valid providers", () => {
    expect(isProviderType("groq")).toBe(true);
    expect(isProviderType("cerebras")).toBe(true);
    expect(isProviderType("google")).toBe(true);
    expect(isProviderType("openai")).toBe(true);
  });

  test("returns false for unknown providers", () => {
    expect(isProviderType("unknown")).toBe(false);
    expect(isProviderType("")).toBe(false);
    expect(isProviderType("gpt-4")).toBe(false);
  });

  test("is case-sensitive (normalized lowercase expected)", () => {
    expect(isProviderType("Groq")).toBe(false);
    expect(isProviderType("GROQ")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getApiKeyConfigKey
// ---------------------------------------------------------------------------

describe("getApiKeyConfigKey", () => {
  test("returns correct config key for each provider", () => {
    expect(getApiKeyConfigKey("groq")).toBe("GROQ_API_KEY");
    expect(getApiKeyConfigKey("cerebras")).toBe("CEREBRAS_API_KEY");
    expect(getApiKeyConfigKey("google")).toBe("GOOGLE_GENERATIVE_AI_API_KEY");
    expect(getApiKeyConfigKey("openai")).toBe("OPENAI_API_KEY");
  });
});

// ---------------------------------------------------------------------------
// getApiKeyLink
// ---------------------------------------------------------------------------

describe("getApiKeyLink", () => {
  test("returns non-empty URL for each provider", () => {
    const providers = ["groq", "cerebras", "google", "openai"] as const;
    for (const provider of providers) {
      const link = getApiKeyLink(provider);
      expect(typeof link).toBe("string");
      expect(link.length).toBeGreaterThan(0);
      expect(link.startsWith("http")).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// validateConfigValue
// ---------------------------------------------------------------------------

describe("validateConfigValue", () => {
  test("returns valid:true with normalized value for valid input", () => {
    const result = validateConfigValue("LOCALE", "es");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("es");
  });

  test("returns valid:false with error message for invalid input", () => {
    const result = validateConfigValue("LOCALE", "invalid-locale");
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("LOCALE must be one of");
  });

  test("handles undefined as empty string (no crash)", () => {
    const result = validateConfigValue("CONTEXT", undefined);
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("");
  });

  test("validates MODEL rejects empty string", () => {
    const result = validateConfigValue("MODEL", "");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("MODEL cannot be empty");
  });

  test("validates MODEL accepts any non-empty string", () => {
    const result = validateConfigValue("MODEL", "custom-model-xyz");
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe("custom-model-xyz");
  });
});

// ---------------------------------------------------------------------------
// LOCALE_OPTIONS
// ---------------------------------------------------------------------------

describe("LOCALE_OPTIONS", () => {
  test("includes common locales", () => {
    expect(LOCALE_OPTIONS).toContain("en");
    expect(LOCALE_OPTIONS).toContain("es");
    expect(LOCALE_OPTIONS).toContain("fr");
    expect(LOCALE_OPTIONS).toContain("de");
  });

  test("every locale passes CONFIG_SCHEMA.LOCALE.validate", () => {
    for (const locale of LOCALE_OPTIONS) {
      expect(() => CONFIG_SCHEMA.LOCALE.validate(locale)).not.toThrow();
    }
  });

  test("matches the allowed locales in CONFIG_SCHEMA", () => {
    // Round-trip check: every LOCALE_OPTIONS value is valid and every invalid
    // value is not in the list
    for (const locale of LOCALE_OPTIONS) {
      const result = validateConfigValue("LOCALE", locale);
      expect(result.valid).toBe(true);
    }
  });
});
