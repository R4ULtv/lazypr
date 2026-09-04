import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export const CONFIG_FILE = join(homedir(), ".lazypr");

// Validation constants
const MIN_API_KEY_LENGTH = 20;
const MAX_CONTEXT_LENGTH = 200;
const MAX_CUSTOM_LABELS = 17;
const MAX_TOTAL_LABELS = 20;
const MAX_LABEL_NAME_LENGTH = 50;

type ConfigSchemaValue = {
  required?: boolean;
  default?: string;
  validate: (v: string) => string;
};

export const SUPPORTED_PROVIDERS = ["groq", "cerebras"] as const;
export type ProviderType = (typeof SUPPORTED_PROVIDERS)[number];
export const LOCALE_OPTIONS = [
  "en",
  "es",
  "pt",
  "fr",
  "de",
  "it",
  "ja",
  "ko",
  "zh",
  "ru",
  "nl",
  "pl",
  "tr",
] as const;

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function parseConfigEntry(line: string): [string, string] | null {
  const [key, ...rest] = line.split("=");
  const normalizedKey = key?.trim() ?? "";
  const normalizedValue = rest.join("=").trim();

  if (!normalizedKey) {
    return null;
  }

  return [normalizedKey, normalizedValue];
}

export const CONFIG_SCHEMA = {
  PROVIDER: {
    default: "groq",
    validate: (v: string) => {
      const provider = v?.trim().toLowerCase() || "groq";
      if (!SUPPORTED_PROVIDERS.some((supported) => supported === provider)) {
        throw new Error(`PROVIDER must be one of: ${SUPPORTED_PROVIDERS.join(", ")}`);
      }
      return provider;
    },
  },
  GROQ_API_KEY: {
    required: false,
    validate: (v: string) => {
      if (!v?.trim()) return "";
      const pattern = new RegExp(`^[A-Za-z0-9._-]{${MIN_API_KEY_LENGTH},}$`);
      if (!pattern.test(v.trim())) throw new Error("Invalid GROQ_API_KEY format");
      return v.trim();
    },
  },
  CEREBRAS_API_KEY: {
    required: false,
    validate: (v: string) => {
      if (!v?.trim()) return "";
      const pattern = new RegExp(`^[A-Za-z0-9._-]{${MIN_API_KEY_LENGTH},}$`);
      if (!pattern.test(v.trim())) throw new Error("Invalid CEREBRAS_API_KEY format");
      return v.trim();
    },
  },
  LOCALE: {
    default: "en",
    validate: (v: string) => {
      const locale = v?.trim().toLowerCase() || "en";
      if (!LOCALE_OPTIONS.some((supported) => supported === locale)) {
        throw new Error(`LOCALE must be one of: ${LOCALE_OPTIONS.join(", ")}`);
      }
      return locale;
    },
  },
  MAX_RETRIES: {
    default: "2",
    validate: (v: string) => {
      const num = Number.parseInt(v, 10);
      if (Number.isNaN(num) || num < 0)
        throw new Error("MAX_RETRIES must be a non-negative number");
      return num.toString();
    },
  },
  TIMEOUT: {
    default: "10000",
    validate: (v: string) => {
      const num = Number.parseInt(v, 10);
      if (Number.isNaN(num) || num < 0) throw new Error("TIMEOUT must be a non-negative number");
      return num.toString();
    },
  },
  DEFAULT_BRANCH: {
    default: "main",
    validate: (v: string) => {
      const branch = v?.trim() || "main";
      return branch;
    },
  },
  FILTER_COMMITS: {
    default: "true",
    validate: (v: string) => {
      const value = v?.trim().toLowerCase();
      if (value !== "true" && value !== "false") {
        throw new Error("FILTER_COMMITS must be either 'true' or 'false'");
      }
      return value;
    },
  },
  CONTEXT: {
    default: "",
    validate: (v: string) => {
      const context = v?.trim() || "";
      if (context.length > MAX_CONTEXT_LENGTH) {
        throw new Error(`CONTEXT must be ${MAX_CONTEXT_LENGTH} characters or less`);
      }
      return context;
    },
  },
  CUSTOM_LABELS: {
    default: "",
    validate: (v: string) => {
      const value = v?.trim() || "";
      if (!value) return "";

      const labels = value
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);

      if (labels.length > MAX_CUSTOM_LABELS) {
        throw new Error(
          `CUSTOM_LABELS cannot exceed ${MAX_CUSTOM_LABELS} labels (${MAX_TOTAL_LABELS} total with defaults)`,
        );
      }

      const labelNameRegex = new RegExp(`^[a-zA-Z][a-zA-Z0-9_-]{0,${MAX_LABEL_NAME_LENGTH - 1}}$`);
      for (const name of labels) {
        if (!labelNameRegex.test(name)) {
          throw new Error(
            `Invalid label '${name}'. Must start with letter, contain only alphanumeric/hyphen/underscore, max ${MAX_LABEL_NAME_LENGTH} chars.`,
          );
        }
      }

      return labels.join(",");
    },
  },
} as const satisfies Record<string, ConfigSchemaValue>;

export type ConfigKey = keyof typeof CONFIG_SCHEMA;

export function validateConfigValue(
  key: ConfigKey,
  value: string | undefined,
): { valid: boolean; error?: string; normalized?: string } {
  try {
    const normalized = CONFIG_SCHEMA[key].validate(value ?? "");
    return { valid: true, normalized };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid value",
    };
  }
}

export const CONFIG_KEYS = [
  "PROVIDER",
  "GROQ_API_KEY",
  "CEREBRAS_API_KEY",
  "LOCALE",
  "MAX_RETRIES",
  "TIMEOUT",
  "DEFAULT_BRANCH",
  "FILTER_COMMITS",
  "CONTEXT",
  "CUSTOM_LABELS",
] as const satisfies readonly ConfigKey[];

export class Config {
  private cache = new Map<string, string>();
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  constructor(private filePath: string = CONFIG_FILE) {}

  // Useful for tests and embedders that need an isolated config file.
  setFilePath(filePath: string): void {
    this.filePath = filePath;
    this.resetCache();
  }

  resetCache(): void {
    this.cache.clear();
    this.loaded = false;
    this.loadPromise = null;
  }

  // Load and parse config file
  private async load(): Promise<void> {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        const content = await readFile(this.filePath, "utf8");
        this.cache = new Map(
          content
            .split("\n")
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0 && !line.startsWith("#"))
            .map(parseConfigEntry)
            .filter((entry): entry is [string, string] => entry !== null),
        );
        this.loaded = true;
      } catch (err) {
        if (!isErrnoException(err) || err.code !== "ENOENT") throw err;
        // File doesn't exist, start with empty cache
        this.loaded = true;
      } finally {
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  // Save config to file
  private async save(): Promise<void> {
    const content = Array.from(this.cache.entries())
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    await writeFile(this.filePath, content, { encoding: "utf8", mode: 0o600 });
  }

  // Get a config value with validation and defaults
  async get(key: ConfigKey): Promise<string> {
    await this.load();

    const schema = CONFIG_SCHEMA[key];
    const raw = this.cache.get(key);

    // Handle missing values
    if (!raw) {
      const isRequired =
        "required" in schema && Boolean((schema as { required?: boolean }).required);
      if (isRequired) {
        throw new Error(`${key} is required but not set.`);
      }
      const def = "default" in schema ? (schema as { default?: string }).default : undefined;
      return def || "";
    }

    // Validate and normalize
    return schema.validate(raw);
  }

  // Set a config value with validation
  async set(key: ConfigKey, value: string): Promise<void> {
    await this.load();

    const schema = CONFIG_SCHEMA[key];
    const validated = schema.validate(value);

    this.cache.set(key, validated);
    await this.save();
  }

  // Get all config as object
  async getAll(): Promise<Partial<Record<ConfigKey, string>>> {
    await this.load();

    const result: Partial<Record<ConfigKey, string>> = {};

    for (const key of CONFIG_KEYS) {
      try {
        result[key] = await this.get(key);
      } catch {
        // Skip invalid/missing required values
      }
    }

    return result;
  }

  // Check if config is valid (all required keys present and valid)
  async validate(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const key of CONFIG_KEYS) {
      try {
        await this.get(key);
      } catch (err) {
        errors.push(`${key}: ${getErrorMessage(err)}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Remove a config key
  async remove(key: ConfigKey): Promise<void> {
    await this.load();
    this.cache.delete(key);
    await this.save();
  }

  // Clear all config
  async clear(): Promise<void> {
    this.cache.clear();
    await this.save();
  }
}

export const config = new Config();
