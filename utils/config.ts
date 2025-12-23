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

export const CONFIG_SCHEMA = {
  PROVIDER: {
    default: "groq",
    validate: (v: string) => {
      const provider = v?.trim().toLowerCase() || "groq";
      const allowed = ["groq", "cerebras", "openai"];
      if (!allowed.includes(provider)) {
        throw new Error(`PROVIDER must be one of: ${allowed.join(", ")}`);
      }
      return provider;
    },
  },
  GROQ_API_KEY: {
    required: false,
    validate: (v: string) => {
      if (!v?.trim()) return "";
      const pattern = new RegExp(`^[A-Za-z0-9._-]{${MIN_API_KEY_LENGTH},}$`);
      if (!pattern.test(v.trim()))
        throw new Error("Invalid GROQ_API_KEY format");
      return v.trim();
    },
  },
  CEREBRAS_API_KEY: {
    required: false,
    validate: (v: string) => {
      if (!v?.trim()) return "";
      const pattern = new RegExp(`^[A-Za-z0-9._-]{${MIN_API_KEY_LENGTH},}$`);
      if (!pattern.test(v.trim()))
        throw new Error("Invalid CEREBRAS_API_KEY format");
      return v.trim();
    },
  },
  OPENAI_API_KEY: {
    required: false,
    validate: (v: string) => {
      if (!v?.trim()) return "";
      // Allow any non-empty string for API keys (local providers may use custom formats)
      return v.trim();
    },
  },
  OPENAI_BASE_URL: {
    required: false,
    validate: (v: string) => {
      if (!v?.trim()) return "";
      const url = v.trim();
      // Validate URL format
      try {
        new URL(url);
      } catch {
        throw new Error(
          "Invalid OPENAI_BASE_URL format. Must be a valid URL (e.g., http://localhost:11434/v1)",
        );
      }
      return url;
    },
  },
  LOCALE: {
    default: "en",
    validate: (v: string) => {
      const locale = v?.trim().toLowerCase() || "en";
      const allowed = [
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
      ];
      if (!allowed.includes(locale)) {
        throw new Error(`LOCALE must be one of: ${allowed.join(", ")}`);
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
      if (Number.isNaN(num) || num < 0)
        throw new Error("TIMEOUT must be a non-negative number");
      return num.toString();
    },
  },
  DEFAULT_BRANCH: {
    default: "main",
    validate: (v: string) => {
      const branch = v?.trim().toLowerCase() || "main";
      return branch;
    },
  },
  MODEL: {
    default: "llama-3.3-70b",
    validate: (v: string) => {
      const model = v?.trim();
      if (!model) throw new Error("MODEL cannot be empty");
      return model;
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
        throw new Error(
          `CONTEXT must be ${MAX_CONTEXT_LENGTH} characters or less`,
        );
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

      const labelNameRegex = new RegExp(
        `^[a-zA-Z][a-zA-Z0-9_-]{0,${MAX_LABEL_NAME_LENGTH - 1}}$`,
      );
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

class Config {
  private cache = new Map<string, string>();
  private loaded = false;
  private loadPromise: Promise<void> | null = null;

  // Load and parse config file
  private async load(): Promise<void> {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      try {
        const content = await readFile(CONFIG_FILE, "utf8");
        this.cache = new Map(
          content
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith("#"))
            .map((line) => {
              const [key, ...rest] = line.split("=");
              return [key?.trim(), rest.join("=")?.trim()] as [string, string];
            })
            .filter(([key, value]) => key && value !== undefined),
        );
        this.loaded = true;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
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

    await writeFile(CONFIG_FILE, content, "utf8");
  }

  // Get a config value with validation and defaults
  async get<K extends ConfigKey>(key: K): Promise<string> {
    await this.load();

    const schema = CONFIG_SCHEMA[key];
    const raw = this.cache.get(key);

    // Handle missing values
    if (!raw) {
      const isRequired =
        "required" in schema &&
        Boolean((schema as { required?: boolean }).required);
      if (isRequired) {
        throw new Error(`${key} is required but not set.`);
      }
      const def =
        "default" in schema
          ? (schema as { default?: string }).default
          : undefined;
      return def || "";
    }

    // Validate and normalize
    return schema.validate(raw);
  }

  // Set a config value with validation
  async set<K extends ConfigKey>(key: K, value: string): Promise<void> {
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

    for (const key of Object.keys(CONFIG_SCHEMA) as ConfigKey[]) {
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

    for (const key of Object.keys(CONFIG_SCHEMA) as ConfigKey[]) {
      try {
        await this.get(key);
      } catch (err) {
        errors.push(`${key}: ${(err as Error).message}`);
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
