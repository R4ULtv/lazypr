import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

const CONFIG_FILE = join(homedir(), ".lazypr");

type ConfigSchemaValue = {
  required?: boolean;
  default?: string;
  validate: (v: string) => string;
};

export const CONFIG_SCHEMA = {
  GROQ_API_KEY: {
    required: true,
    validate: (v: string) => {
      if (!v?.trim()) throw new Error("GROQ_API_KEY is required");
      if (!/^[A-Za-z0-9._-]{20,}$/.test(v.trim()))
        throw new Error("Invalid GROQ_API_KEY format");
      return v.trim();
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
    default: "master",
    validate: (v: string) => {
      const branch = v?.trim().toLowerCase() || "master";
      return branch;
    },
  },
  MODEL: {
    default: "openai/gpt-oss-20b",
    validate: (v: string) => {
      const model = v?.trim();
      if (!model) throw new Error("MODEL cannot be empty");

      // Only allow models that support structured outputs
      const supportedModels = [
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b",
        "moonshotai/kimi-k2-instruct-0905",
        "meta-llama/llama-4-maverick-17b-128e-instruct",
        "meta-llama/llama-4-scout-17b-16e-instruct",
      ];

      if (!supportedModels.includes(model)) {
        throw new Error(
          `MODEL must be one of the supported structured output models: ${supportedModels.join(", ")}`,
        );
      }

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
} as const satisfies Record<string, ConfigSchemaValue>;

export type ConfigKey = keyof typeof CONFIG_SCHEMA;

class Config {
  private cache = new Map<string, string>();
  private loaded = false;

  // Load and parse config file
  private async load(): Promise<void> {
    if (this.loaded) return;

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
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      // File doesn't exist, start with empty cache
    }

    this.loaded = true;
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
