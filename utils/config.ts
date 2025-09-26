import { homedir } from "node:os";
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";

const homeDirectory = homedir();
const configFilePath = join(homeDirectory, ".lazypr");

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
export async function addKeyValue(key: string, value: string): Promise<void> {
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
export async function readSpecificKey(key: string): Promise<string | undefined> {
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