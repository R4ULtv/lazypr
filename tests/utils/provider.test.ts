import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Mock AI SDK and provider packages BEFORE importing the module under test.
// Bun's module system requires mock.module to be called before import for the
// hoisted mock to take effect.
// ---------------------------------------------------------------------------

// Capture the last options passed to generateText so tests can assert them.
let lastGenerateTextArgs: Record<string, unknown> = {};

// Track which model strings the provider factories were called with.
let lastGroqModelArg = "";
let lastCerebrasModelArg = "";
let lastGoogleModelArg = "";
let lastOpenAIModelArg = "";
let lastGroqApiKeyArg = "";
let lastCerebrasApiKeyArg = "";
let lastGoogleApiKeyArg = "";
let lastOpenAIApiKeyArg = "";
let lastOpenAIBaseURLArg: string | undefined = undefined;

// Marker objects returned by mocked factories — the real LanguageModel type
// is not needed because generateText is also mocked.
const MOCK_MODEL_MARKER = { __mockModel: true };

mock.module("ai", () => {
  return {
    generateText: mock(async (opts: Record<string, unknown>) => {
      lastGenerateTextArgs = opts;
      return {
        output: {
          title: "Add mocked provider output",
          description:
            "This mocked description is intentionally longer than one hundred characters so it satisfies the schema constraints used by provider generation tests.",
          labels: ["enhancement"],
        },
        usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
        finishReason: "stop",
      };
    }),
    Output: {
      object: (opts: unknown) => ({ __outputSchema: opts }),
    },
  };
});

mock.module("@ai-sdk/groq", () => ({
  createGroq: (opts: { apiKey: string }) => {
    lastGroqApiKeyArg = opts.apiKey;
    return (model: string) => {
      lastGroqModelArg = model;
      return MOCK_MODEL_MARKER;
    };
  },
}));

mock.module("@ai-sdk/cerebras", () => ({
  createCerebras: (opts: { apiKey: string }) => {
    lastCerebrasApiKeyArg = opts.apiKey;
    return (model: string) => {
      lastCerebrasModelArg = model;
      return MOCK_MODEL_MARKER;
    };
  },
}));

mock.module("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: (opts: { apiKey: string }) => {
    lastGoogleApiKeyArg = opts.apiKey;
    return (model: string) => {
      lastGoogleModelArg = model;
      return MOCK_MODEL_MARKER;
    };
  },
}));

mock.module("@ai-sdk/openai", () => ({
  createOpenAI: (opts: { apiKey: string; baseURL?: string }) => {
    lastOpenAIApiKeyArg = opts.apiKey;
    lastOpenAIBaseURLArg = opts.baseURL;
    return (model: string) => {
      lastOpenAIModelArg = model;
      return MOCK_MODEL_MARKER;
    };
  },
}));

// Now import the module under test (after mocks are registered).
import { CONFIG_FILE, config } from "../../utils/config";
import type { GitCommit } from "../../utils/git";
import {
  generatePullRequest,
  getProviderApiKeyConfigKey,
  validateProviderApiKey,
} from "../../utils/provider";

const TEST_CONFIG_FILE = join(tmpdir(), "lazypr-provider-test.conf");

// Synthetic API keys that satisfy config format validation (≥20 alphanumeric/._- chars).
const GROQ_TEST_KEY = "gsk_test1234567890abcdefghijklmnop";
const CEREBRAS_TEST_KEY = "csk_test1234567890abcdefghijklmnop";
const GOOGLE_TEST_KEY = "AIzaSyTestKey1234567890abcdef";
const OPENAI_TEST_KEY = "sk_test1234567890abcdefghijklmnop";

const SAMPLE_COMMITS: GitCommit[] = [
  {
    hash: "abc123",
    shortHash: "abc123",
    author: "Test User",
    date: "2024-01-01",
    message: "feat: add initial implementation",
  },
  {
    hash: "def456",
    shortHash: "def456",
    author: "Test User",
    date: "2024-01-02",
    message: "fix: address edge case in authentication",
  },
];

function resetTrackedArgs() {
  lastGenerateTextArgs = {};
  lastGroqModelArg = "";
  lastCerebrasModelArg = "";
  lastGoogleModelArg = "";
  lastOpenAIModelArg = "";
  lastGroqApiKeyArg = "";
  lastCerebrasApiKeyArg = "";
  lastGoogleApiKeyArg = "";
  lastOpenAIApiKeyArg = "";
  lastOpenAIBaseURLArg = undefined;
}

beforeEach(async () => {
  config.setFilePath(TEST_CONFIG_FILE);
  resetTrackedArgs();
  try {
    await unlink(TEST_CONFIG_FILE);
  } catch {
    // File doesn't exist — that's fine.
  }
});

afterEach(async () => {
  try {
    await unlink(TEST_CONFIG_FILE);
  } catch {
    // File doesn't exist — that's fine.
  }
  config.setFilePath(CONFIG_FILE);
});

// ---------------------------------------------------------------------------
// Return shape & schema
// ---------------------------------------------------------------------------

describe("generatePullRequest - Return Shape", () => {
  test("should return object with correct structure", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\n`,
      "utf8",
    );

    const result = await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(typeof result).toBe("object");
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("object");
    expect(result).toHaveProperty("usage");
    expect(result).toHaveProperty("finishReason");
  });

  test("should return title as non-empty string satisfying min length", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\n`,
      "utf8",
    );

    const result = await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(typeof result.object.title).toBe("string");
    expect(result.object.title.length).toBeGreaterThanOrEqual(5);
    expect(result.object.title.length).toBeLessThanOrEqual(100);
  });

  test("should return description satisfying minimum length", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\n`,
      "utf8",
    );

    const result = await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(typeof result.object.description).toBe("string");
    expect(result.object.description.length).toBeGreaterThanOrEqual(100);
  });

  test("should return labels as an array", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\n`,
      "utf8",
    );

    const result = await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(Array.isArray(result.object.labels)).toBe(true);
  });

  test("should return usage with token counts", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\n`,
      "utf8",
    );

    const result = await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(result.usage.inputTokens).toBe(1);
    expect(result.usage.outputTokens).toBe(2);
    expect(result.usage.totalTokens).toBe(3);
  });

  test("should return finishReason", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\n`,
      "utf8",
    );

    const result = await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(result.finishReason).toBe("stop");
  });
});

// ---------------------------------------------------------------------------
// Provider selection and API key routing
// ---------------------------------------------------------------------------

describe("generatePullRequest - Provider Selection", () => {
  test("groq provider uses GROQ_API_KEY and calls groq factory", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `PROVIDER=groq\nGROQ_API_KEY=${GROQ_TEST_KEY}\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(lastGroqApiKeyArg).toBe(GROQ_TEST_KEY);
  });

  test("cerebras provider uses CEREBRAS_API_KEY and calls cerebras factory", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `PROVIDER=cerebras\nCEREBRAS_API_KEY=${CEREBRAS_TEST_KEY}\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(lastCerebrasApiKeyArg).toBe(CEREBRAS_TEST_KEY);
  });

  test("google provider uses GOOGLE_GENERATIVE_AI_API_KEY and calls google factory", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `PROVIDER=google\nGOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_TEST_KEY}\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(lastGoogleApiKeyArg).toBe(GOOGLE_TEST_KEY);
  });

  test("openai provider uses OPENAI_API_KEY and calls openai factory", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `PROVIDER=openai\nOPENAI_API_KEY=${OPENAI_TEST_KEY}\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(lastOpenAIApiKeyArg).toBe(OPENAI_TEST_KEY);
  });

  test("openai provider uses custom OPENAI_BASE_URL when configured", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `PROVIDER=openai\nOPENAI_API_KEY=${OPENAI_TEST_KEY}\nOPENAI_BASE_URL=http://localhost:11434/v1\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(lastOpenAIBaseURLArg).toBe("http://localhost:11434/v1");
  });

  test("openai provider falls back to dummy-key when no API key is configured", async () => {
    // OpenAI provider is optional — it should resolve even without a key.
    await writeFile(TEST_CONFIG_FILE, "PROVIDER=openai\n", "utf8");

    const result = await generatePullRequest("feature/test", SAMPLE_COMMITS);

    // Should succeed (not throw).
    expect(result.object.title).toBeDefined();
    // The runtime substitutes "dummy-key" when no key is provided.
    expect(lastOpenAIApiKeyArg).toBe("dummy-key");
  });
});

// ---------------------------------------------------------------------------
// Model string is forwarded to the provider factory
// ---------------------------------------------------------------------------

describe("generatePullRequest - Model Config", () => {
  test("MODEL from config is passed to groq factory", async () => {
    const testModel = "llama-3.3-70b-versatile";
    await writeFile(
      TEST_CONFIG_FILE,
      `PROVIDER=groq\nGROQ_API_KEY=${GROQ_TEST_KEY}\nMODEL=${testModel}\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(lastGroqModelArg).toBe(testModel);
  });

  test("MODEL from config is passed to cerebras factory", async () => {
    const testModel = "llama3.1-70b";
    await writeFile(
      TEST_CONFIG_FILE,
      `PROVIDER=cerebras\nCEREBRAS_API_KEY=${CEREBRAS_TEST_KEY}\nMODEL=${testModel}\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(lastCerebrasModelArg).toBe(testModel);
  });

  test("MODEL from config is passed to google factory", async () => {
    const testModel = "gemini-2.5-flash";
    await writeFile(
      TEST_CONFIG_FILE,
      `PROVIDER=google\nGOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_TEST_KEY}\nMODEL=${testModel}\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(lastGoogleModelArg).toBe(testModel);
  });

  test("MODEL from config is passed to openai factory", async () => {
    const testModel = "gpt-4o";
    await writeFile(
      TEST_CONFIG_FILE,
      `PROVIDER=openai\nOPENAI_API_KEY=${OPENAI_TEST_KEY}\nMODEL=${testModel}\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(lastOpenAIModelArg).toBe(testModel);
  });

  test("arbitrary non-empty model names are treated as valid (no allowlist enforced)", async () => {
    // Any non-empty string should be accepted — different providers and local
    // OpenAI-compatible servers use custom model names.
    const arbitraryModel = "my-custom-quantized-model-v3";
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\nMODEL=${arbitraryModel}\n`,
      "utf8",
    );

    const loadedModel = await config.get("MODEL");
    expect(loadedModel).toBe(arbitraryModel);

    // generatePullRequest should not reject an arbitrary model string.
    const result = await generatePullRequest("feature/test", SAMPLE_COMMITS);
    expect(result.object.title).toBeDefined();
    expect(lastGroqModelArg).toBe(arbitraryModel);
  });
});

// ---------------------------------------------------------------------------
// generateText call options (maxRetries, abortSignal, system, prompt)
// ---------------------------------------------------------------------------

describe("generatePullRequest - generateText Options", () => {
  test("MAX_RETRIES from config is passed to generateText as a number", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\nMAX_RETRIES=5\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(lastGenerateTextArgs.maxRetries).toBe(5);
    expect(typeof lastGenerateTextArgs.maxRetries).toBe("number");
  });

  test("TIMEOUT config creates an AbortSignal passed to generateText", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\nTIMEOUT=30000\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(lastGenerateTextArgs.abortSignal).toBeDefined();
    // AbortSignal.timeout returns an AbortSignal instance.
    expect(lastGenerateTextArgs.abortSignal).toBeInstanceOf(AbortSignal);
  });

  test("system prompt is passed to generateText", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(typeof lastGenerateTextArgs.system).toBe("string");
    const system = lastGenerateTextArgs.system as string;
    expect(system.length).toBeGreaterThan(0);
    // System prompt instructs the model to output JSON.
    expect(system).toContain("JSON");
  });

  test("user prompt is passed to generateText", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    expect(typeof lastGenerateTextArgs.prompt).toBe("string");
    const prompt = lastGenerateTextArgs.prompt as string;
    expect(prompt.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Prompt content — locale, context, commits, branch, labels, template
// ---------------------------------------------------------------------------

describe("generatePullRequest - Prompt Content", () => {
  test("branch name appears in the prompt", async () => {
    await writeFile(TEST_CONFIG_FILE, `GROQ_API_KEY=${GROQ_TEST_KEY}\n`, "utf8");

    await generatePullRequest("feature/my-special-branch", SAMPLE_COMMITS);

    const prompt = lastGenerateTextArgs.prompt as string;
    expect(prompt).toContain("feature/my-special-branch");
  });

  test("commit messages appear in the prompt", async () => {
    await writeFile(TEST_CONFIG_FILE, `GROQ_API_KEY=${GROQ_TEST_KEY}\n`, "utf8");

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    const prompt = lastGenerateTextArgs.prompt as string;
    expect(prompt).toContain("feat: add initial implementation");
    expect(prompt).toContain("fix: address edge case in authentication");
  });

  test("LOCALE from config appears in the prompt", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\nLOCALE=es\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    const prompt = lastGenerateTextArgs.prompt as string;
    expect(prompt).toContain("es");
  });

  test("locale override parameter takes precedence over config LOCALE", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\nLOCALE=en\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS, undefined, "fr");

    const prompt = lastGenerateTextArgs.prompt as string;
    expect(prompt).toContain("fr");
  });

  test("CONTEXT from config appears in the prompt", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\nCONTEXT=Focus on security improvements\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    const prompt = lastGenerateTextArgs.prompt as string;
    expect(prompt).toContain("Focus on security improvements");
  });

  test("context override parameter takes precedence over config CONTEXT", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\nCONTEXT=config context\n`,
      "utf8",
    );

    await generatePullRequest(
      "feature/test",
      SAMPLE_COMMITS,
      undefined,
      undefined,
      "override context",
    );

    const prompt = lastGenerateTextArgs.prompt as string;
    expect(prompt).toContain("override context");
  });

  test("available labels appear in the prompt", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    const prompt = lastGenerateTextArgs.prompt as string;
    // Default labels should be included.
    expect(prompt).toContain("enhancement");
    expect(prompt).toContain("bug");
    expect(prompt).toContain("documentation");
  });

  test("custom labels from CUSTOM_LABELS config appear in the prompt", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `GROQ_API_KEY=${GROQ_TEST_KEY}\nCUSTOM_LABELS=performance,security\n`,
      "utf8",
    );

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    const prompt = lastGenerateTextArgs.prompt as string;
    expect(prompt).toContain("performance");
    expect(prompt).toContain("security");
  });

  test("template content appears in the prompt when provided", async () => {
    await writeFile(TEST_CONFIG_FILE, `GROQ_API_KEY=${GROQ_TEST_KEY}\n`, "utf8");

    const template = "## Summary\n- Describe your change\n\n## Testing\n- How was this tested?";
    await generatePullRequest("feature/test", SAMPLE_COMMITS, template);

    const prompt = lastGenerateTextArgs.prompt as string;
    expect(prompt).toContain("## Summary");
    expect(prompt).toContain("## Testing");
  });

  test("no template section in prompt when template is not provided", async () => {
    await writeFile(TEST_CONFIG_FILE, `GROQ_API_KEY=${GROQ_TEST_KEY}\n`, "utf8");

    await generatePullRequest("feature/test", SAMPLE_COMMITS);

    const prompt = lastGenerateTextArgs.prompt as string;
    expect(prompt).not.toContain("PR Template to Follow");
  });
});

// ---------------------------------------------------------------------------
// getProviderApiKeyConfigKey
// ---------------------------------------------------------------------------

describe("getProviderApiKeyConfigKey", () => {
  test("returns GROQ_API_KEY for groq provider", async () => {
    await writeFile(TEST_CONFIG_FILE, "PROVIDER=groq\n", "utf8");
    expect(await getProviderApiKeyConfigKey()).toBe("GROQ_API_KEY");
  });

  test("returns CEREBRAS_API_KEY for cerebras provider", async () => {
    await writeFile(TEST_CONFIG_FILE, "PROVIDER=cerebras\n", "utf8");
    expect(await getProviderApiKeyConfigKey()).toBe("CEREBRAS_API_KEY");
  });

  test("returns GOOGLE_GENERATIVE_AI_API_KEY for google provider", async () => {
    await writeFile(TEST_CONFIG_FILE, "PROVIDER=google\n", "utf8");
    expect(await getProviderApiKeyConfigKey()).toBe("GOOGLE_GENERATIVE_AI_API_KEY");
  });

  test("returns OPENAI_API_KEY for openai provider", async () => {
    await writeFile(TEST_CONFIG_FILE, "PROVIDER=openai\n", "utf8");
    expect(await getProviderApiKeyConfigKey()).toBe("OPENAI_API_KEY");
  });
});

// ---------------------------------------------------------------------------
// validateProviderApiKey — local validation, no network
// ---------------------------------------------------------------------------

describe("validateProviderApiKey", () => {
  test("resolves when GROQ_API_KEY is set", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `PROVIDER=groq\nGROQ_API_KEY=${GROQ_TEST_KEY}\n`,
      "utf8",
    );
    await expect(validateProviderApiKey()).resolves.toBeUndefined();
  });

  test("rejects with friendly message when GROQ_API_KEY is missing for groq provider", async () => {
    await writeFile(TEST_CONFIG_FILE, "PROVIDER=groq\n", "utf8");
    await expect(validateProviderApiKey()).rejects.toThrow(
      "GROQ_API_KEY is required for provider 'groq'.",
    );
  });

  test("resolves when CEREBRAS_API_KEY is set", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `PROVIDER=cerebras\nCEREBRAS_API_KEY=${CEREBRAS_TEST_KEY}\n`,
      "utf8",
    );
    await expect(validateProviderApiKey()).resolves.toBeUndefined();
  });

  test("rejects with friendly message when CEREBRAS_API_KEY is missing for cerebras provider", async () => {
    await writeFile(TEST_CONFIG_FILE, "PROVIDER=cerebras\n", "utf8");
    await expect(validateProviderApiKey()).rejects.toThrow(
      "CEREBRAS_API_KEY is required for provider 'cerebras'.",
    );
  });

  test("resolves when GOOGLE_GENERATIVE_AI_API_KEY is set", async () => {
    await writeFile(
      TEST_CONFIG_FILE,
      `PROVIDER=google\nGOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_TEST_KEY}\n`,
      "utf8",
    );
    await expect(validateProviderApiKey()).resolves.toBeUndefined();
  });

  test("rejects with friendly message when GOOGLE_GENERATIVE_AI_API_KEY is missing for google provider", async () => {
    await writeFile(TEST_CONFIG_FILE, "PROVIDER=google\n", "utf8");
    await expect(validateProviderApiKey()).rejects.toThrow(
      "GOOGLE_GENERATIVE_AI_API_KEY is required for provider 'google'.",
    );
  });

  test("resolves even when OPENAI_API_KEY is missing (openai key is optional)", async () => {
    await writeFile(TEST_CONFIG_FILE, "PROVIDER=openai\n", "utf8");
    await expect(validateProviderApiKey()).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// generatePullRequest — local error paths (no network)
// ---------------------------------------------------------------------------

describe("generatePullRequest - Local Error Paths", () => {
  test("rejects when GROQ_API_KEY is missing for groq provider", async () => {
    await writeFile(TEST_CONFIG_FILE, "PROVIDER=groq\n", "utf8");

    await expect(generatePullRequest("feature/test", SAMPLE_COMMITS)).rejects.toThrow(
      "GROQ_API_KEY is required",
    );
  });

  test("rejects when CEREBRAS_API_KEY is missing for cerebras provider", async () => {
    await writeFile(TEST_CONFIG_FILE, "PROVIDER=cerebras\n", "utf8");

    await expect(generatePullRequest("feature/test", SAMPLE_COMMITS)).rejects.toThrow(
      "CEREBRAS_API_KEY is required",
    );
  });

  test("rejects when GOOGLE_GENERATIVE_AI_API_KEY is missing for google provider", async () => {
    await writeFile(TEST_CONFIG_FILE, "PROVIDER=google\n", "utf8");

    await expect(generatePullRequest("feature/test", SAMPLE_COMMITS)).rejects.toThrow(
      "GOOGLE_GENERATIVE_AI_API_KEY is required",
    );
  });

  test("resolves even when OPENAI_API_KEY is missing (openai is optional)", async () => {
    await writeFile(TEST_CONFIG_FILE, "PROVIDER=openai\n", "utf8");

    const result = await generatePullRequest("feature/test", SAMPLE_COMMITS);
    expect(result.object.title).toBeDefined();
  });

  test("rejects when provider name is not one of the known providers", async () => {
    // Config validation rejects unknown provider values before generatePullRequest
    // even reaches the isProviderType check.
    await writeFile(TEST_CONFIG_FILE, "PROVIDER=unknown-provider\n", "utf8");

    await expect(generatePullRequest("feature/test", SAMPLE_COMMITS)).rejects.toThrow(
      "PROVIDER must be one of",
    );
  });
});

// ---------------------------------------------------------------------------
// Config schema — MODEL validation
// ---------------------------------------------------------------------------

describe("Config - MODEL validation", () => {
  test("empty MODEL value fails config validation", async () => {
    await writeFile(TEST_CONFIG_FILE, `GROQ_API_KEY=${GROQ_TEST_KEY}\n`, "utf8");

    // Setting MODEL to an empty string via config.set should throw.
    await expect(config.set("MODEL", "")).rejects.toThrow();
  });

  test("any non-empty MODEL string is accepted (no allowlist)", async () => {
    await writeFile(TEST_CONFIG_FILE, `GROQ_API_KEY=${GROQ_TEST_KEY}\n`, "utf8");

    // Arbitrary model names are valid — custom and local providers support them.
    await config.set("MODEL", "custom-local-model-v2");
    const loaded = await config.get("MODEL");
    expect(loaded).toBe("custom-local-model-v2");
  });
});
