import { CONFIG_SCHEMA, type ConfigKey, config } from "./config";
import type { ProviderType } from "./provider";

// ---------------------------------------------------------------------------
// Provider/model combo catalog
//
// Intentionally non-exhaustive — provider catalogs change frequently.
// Keep entries small and add the custom escape hatch per provider.
// Update as needed when new flagship models are released.
// ---------------------------------------------------------------------------

export interface ModelCombo {
  /** Must match ProviderType and pass CONFIG_SCHEMA.PROVIDER.validate */
  provider: ProviderType;
  /** Persisted as MODEL; must pass CONFIG_SCHEMA.MODEL.validate */
  model: string;
  /** Human-readable label for Clack select */
  label: string;
  /** Short optional hint shown alongside label */
  hint?: string;
  /** If true, this entry routes to a free-form text prompt for model id */
  isCustom?: boolean;
}

// Sentinel value that signals the interactive flow to show a free-form prompt.
export const CUSTOM_MODEL_SENTINEL = "__custom__";

export const MODEL_COMBOS: ModelCombo[] = [
  // --- Groq ---
  {
    provider: "groq",
    model: "llama-3.3-70b",
    label: "Groq — Llama 3.3 70B",
    hint: "default, fast",
  },
  {
    provider: "groq",
    model: "llama-3.1-8b-instant",
    label: "Groq — Llama 3.1 8B Instant",
    hint: "very fast, lower quality",
  },
  {
    provider: "groq",
    model: CUSTOM_MODEL_SENTINEL,
    label: "Groq — Custom / local model…",
    hint: "enter any model id",
    isCustom: true,
  },

  // --- Cerebras ---
  {
    provider: "cerebras",
    model: "llama3.3-70b",
    label: "Cerebras — Llama 3.3 70B",
    hint: "fast inference",
  },
  {
    provider: "cerebras",
    model: "llama3.1-8b",
    label: "Cerebras — Llama 3.1 8B",
    hint: "very fast",
  },
  {
    provider: "cerebras",
    model: CUSTOM_MODEL_SENTINEL,
    label: "Cerebras — Custom / local model…",
    hint: "enter any model id",
    isCustom: true,
  },

  // --- Google ---
  {
    provider: "google",
    model: "gemini-2.5-flash",
    label: "Google — Gemini 2.5 Flash",
    hint: "fast, recommended",
  },
  {
    provider: "google",
    model: "gemini-2.5-pro",
    label: "Google — Gemini 2.5 Pro",
    hint: "highest quality",
  },
  {
    provider: "google",
    model: CUSTOM_MODEL_SENTINEL,
    label: "Google — Custom / local model…",
    hint: "enter any model id",
    isCustom: true,
  },

  // --- OpenAI / OpenAI-compatible ---
  {
    provider: "openai",
    model: "gpt-4o",
    label: "OpenAI — GPT-4o",
    hint: "flagship",
  },
  {
    provider: "openai",
    model: "gpt-4o-mini",
    label: "OpenAI — GPT-4o Mini",
    hint: "faster, cheaper",
  },
  {
    provider: "openai",
    model: CUSTOM_MODEL_SENTINEL,
    label: "OpenAI / local — Custom model…",
    hint: "Ollama, LM Studio, etc.",
    isCustom: true,
  },
];

// ---------------------------------------------------------------------------
// applyProviderModel — pure persistence helper
//
// Persists both PROVIDER and MODEL via config.set (which runs CONFIG_SCHEMA
// validation). Returns the normalized values for display.
// ---------------------------------------------------------------------------

export interface ProviderModelSelection {
  provider: ProviderType;
  model: string;
}

export async function applyProviderModel(
  selection: ProviderModelSelection,
): Promise<{ provider: string; model: string }> {
  await config.set("PROVIDER", selection.provider);
  await config.set("MODEL", selection.model);

  // Return the normalized values (post-validation)
  const [normalizedProvider, normalizedModel] = await Promise.all([
    config.get("PROVIDER"),
    config.get("MODEL"),
  ]);

  return { provider: normalizedProvider, model: normalizedModel };
}

// ---------------------------------------------------------------------------
// getApiKeyConfigKey — returns the ConfigKey that holds the API key for a
// given provider. Used by the interactive flow.
// ---------------------------------------------------------------------------

const PROVIDER_API_KEY_MAP: Record<ProviderType, ConfigKey> = {
  groq: "GROQ_API_KEY",
  cerebras: "CEREBRAS_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  openai: "OPENAI_API_KEY",
};

export function getApiKeyConfigKey(provider: ProviderType): ConfigKey {
  return PROVIDER_API_KEY_MAP[provider];
}

// ---------------------------------------------------------------------------
// getApiKeyLink — returns the URL where users can obtain an API key.
// ---------------------------------------------------------------------------

const API_KEY_LINKS: Record<ProviderType, string> = {
  groq: "https://console.groq.com/keys",
  cerebras: "https://cloud.cerebras.ai/",
  google: "https://aistudio.google.com/app/apikey",
  openai: "https://platform.openai.com/api-keys",
};

export function getApiKeyLink(provider: ProviderType): string {
  return API_KEY_LINKS[provider];
}

// ---------------------------------------------------------------------------
// LOCALE_OPTIONS — list of allowed locale values from CONFIG_SCHEMA.
// Extracted here to avoid duplicating the list across interactive flow code.
// ---------------------------------------------------------------------------

export const LOCALE_OPTIONS = ["en", "es", "pt", "fr", "de", "it", "ja", "ko", "zh", "ru", "nl", "pl", "tr"] as const;

// ---------------------------------------------------------------------------
// isProviderType guard — re-exported for use in the interactive flow.
// ---------------------------------------------------------------------------

export function isProviderType(value: string): value is ProviderType {
  return value === "groq" || value === "cerebras" || value === "google" || value === "openai";
}

// ---------------------------------------------------------------------------
// validateConfigValue — wraps CONFIG_SCHEMA validation with a friendly error.
// ---------------------------------------------------------------------------

export function validateConfigValue(
  key: ConfigKey,
  value: string | undefined,
): { valid: boolean; error?: string; normalized?: string } {
  try {
    const normalized = CONFIG_SCHEMA[key].validate(value ?? "");
    return { valid: true, normalized };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "Invalid value" };
  }
}
