import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

const homeDirectory = homedir();
const configFilePath = join(homeDirectory, ".lazypr");

export type ConfigKey = "GROQ_API_KEY" | "LOCALE";

type ConfigSpec = {
  required: boolean;
  defaultValue?: string;
  validate(value: string): void;
  normalize?(value: string): string;
};

const CONFIG_SPECS: Record<ConfigKey, ConfigSpec> = {
  GROQ_API_KEY: {
    required: true,
    validate(value: string) {
      if (!value || value.trim() === "") {
        throw new Error("GROQ_API_KEY must be a non-empty string");
      }
      // Basic sanity check: allow typical API key characters and length >= 20
      const isLikelyKey = /^[A-Za-z0-9._-]{20,}$/.test(value.trim());
      if (!isLikelyKey) {
        throw new Error("GROQ_API_KEY appears invalid");
      }
    },
    normalize(value: string) {
      return value.trim();
    },
  },
  LOCALE: {
    required: false,
    defaultValue: "en",
    validate(value: string) {
      const normalized = value.trim().toLowerCase();
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
      ];
      if (!allowed.includes(normalized)) {
        throw new Error(
          `LOCALE must be one of: ${allowed.join(", ")}`,
        );
      }
    },
    normalize(value: string) {
      return value.trim().toLowerCase();
    },
  },
};

/**
 * Parses a string in KEY=VALUE format into an object.
 * @param {string} fileContent The string content of the file.
 * @returns {Record<string, string>} An object with the parsed key-value pairs.
 */
function parseEnv(fileContent: string): Record<string, string> {
  const config: Record<string, string> = {};
  const lines = fileContent.split("\n");

  for (const line of lines) {
    // Ignore comments and empty lines
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("#") || trimmedLine === "") {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex !== -1) {
      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = trimmedLine.slice(separatorIndex + 1).trim();
      config[key] = value;
    }
  }

  return config;
}

/**
 * Adds or updates a key-value pair in the configuration file.
 * This function reads the existing configuration, adds or updates the key,
 * and then writes the entire configuration back to the file.
 * @param {string} key The key to add or update.
 * @param {string} value The value to set for the key.
 * @returns {Promise<void>} A promise that resolves when the file has been written.
 */
export async function addKeyValue(key: ConfigKey, value: string): Promise<void> {
  let fileContent = "";
  try {
    // Attempt to read the existing file.
    fileContent = await readFile(configFilePath, { encoding: "utf8" });
  } catch (error) {
    // If the file does not exist, we will create it. For other errors, we throw.
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const config = parseEnv(fileContent);
  config[key] = value;

  // Reconstruct the file content from the config object.
  const newFileContent = Object.entries(config)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  await writeFile(configFilePath, newFileContent, { encoding: "utf8" });
}

/**
 * Reads the value of a specific key from the configuration file.
 * @param {string} key The key to read.
 * @returns {Promise<string | undefined>} The value of the key, or undefined if the key is not found or the file doesn't exist.
 */
export async function readSpecificKey(key: ConfigKey): Promise<string | undefined> {
  try {
    const fileContent = await readFile(configFilePath, { encoding: "utf8" });
    const config = parseEnv(fileContent);
    return config[key];
  } catch (error) {
    // If the file doesn't exist, it's expected that the key can't be found.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    // For any other kind of error, re-throw it.
    throw error;
  }
}

/**
 * Gets a validated config value applying per-key rules and defaults.
 * Throws if a required value is missing or invalid.
 */
export async function getConfigValue(key: ConfigKey): Promise<string> {
  const spec = CONFIG_SPECS[key];
  const raw = await readSpecificKey(key);

  if (raw == null || raw === "") {
    if (spec.required && spec.defaultValue == null) {
      throw new Error(`${key} is required but not set`);
    }
    const def = spec.defaultValue ?? "";
    // Validate default as well
    if (def !== "") {
      spec.validate(def);
    }
    return def;
  }

  const normalized = spec.normalize ? spec.normalize(raw) : raw;
  spec.validate(normalized);
  return normalized;
}

/**
 * Validates and sets a config value following per-key rules.
 */
export async function setConfigValue(key: ConfigKey, value: string): Promise<void> {
  const spec = CONFIG_SPECS[key];
  const normalized = spec.normalize ? spec.normalize(value) : value;
  spec.validate(normalized);
  await addKeyValue(key, normalized);
}