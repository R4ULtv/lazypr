import { createCerebras } from "@ai-sdk/cerebras";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { generateText, Output } from "ai";
import * as z from "zod/v4";
import { config } from "./config";
import type { GitCommit } from "./git";
import { DEFAULT_LABELS, getAvailableLabels } from "./labels";
import {
  buildPrompt,
  getSystemPrompt,
  MAX_TITLE_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  MIN_TITLE_LENGTH,
} from "./prompts";

// Provider types
export type ProviderType = "groq" | "cerebras" | "openai";

// Provider configuration interface
interface ProviderConfig {
  name: ProviderType;
  apiKeyConfigKey: string;
  apiKeyOptional?: boolean;
  createModel: (
    apiKey: string,
    model: string,
    baseURL?: string,
  ) => LanguageModel;
}

// Provider registry
const providers: Record<ProviderType, ProviderConfig> = {
  groq: {
    name: "groq",
    apiKeyConfigKey: "GROQ_API_KEY",
    createModel: (apiKey: string, model: string) => {
      const groq = createGroq({ apiKey });
      return groq(model);
    },
  },
  cerebras: {
    name: "cerebras",
    apiKeyConfigKey: "CEREBRAS_API_KEY",
    createModel: (apiKey: string, model: string) => {
      const cerebras = createCerebras({ apiKey });
      return cerebras(model);
    },
  },
  openai: {
    name: "openai",
    apiKeyConfigKey: "OPENAI_API_KEY",
    apiKeyOptional: true, // API key is optional for local providers like Ollama, LM Studio
    createModel: (apiKey: string, model: string, baseURL?: string) => {
      const openai = createOpenAI({
        apiKey: apiKey || "dummy-key", // Some local providers don't need a key but SDK requires one
        baseURL: baseURL || undefined,
      });
      return openai(model);
    },
  },
};

// Get the current provider configuration
async function getProviderConfig(): Promise<ProviderConfig> {
  const providerName = (await config.get("PROVIDER")) as ProviderType;
  const providerConfig = providers[providerName];

  if (!providerConfig) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  return providerConfig;
}

// Provider API key URLs
const apiKeyLinks: Record<ProviderType, string> = {
  groq: "https://console.groq.com/keys",
  cerebras: "https://cloud.cerebras.ai/",
  openai: "https://platform.openai.com/api-keys",
};

// Validate that the required API key is set for the current provider
export async function validateProviderApiKey(): Promise<void> {
  const providerConfig = await getProviderConfig();
  const apiKey = await config.get(
    providerConfig.apiKeyConfigKey as Parameters<typeof config.get>[0],
  );

  // Skip API key validation if provider allows optional keys (e.g., OpenAI for local providers)
  if (providerConfig.apiKeyOptional) {
    return;
  }

  if (!apiKey) {
    throw new Error(
      `${providerConfig.apiKeyConfigKey} is required for provider '${providerConfig.name}'.\n` +
        `Get your API key: ${apiKeyLinks[providerConfig.name]}\n` +
        `Then set it with: lazypr config set ${providerConfig.apiKeyConfigKey}=<your-api-key>`,
    );
  }
}

// Get the API key config key for the current provider
export async function getProviderApiKeyConfigKey(): Promise<string> {
  const providerConfig = await getProviderConfig();
  return providerConfig.apiKeyConfigKey;
}

// Build labels schema dynamically based on available labels
function buildLabelsSchema(availableLabels: string[]) {
  if (availableLabels.length === 0) {
    return z.array(z.enum([...DEFAULT_LABELS]));
  }

  // Zod enum requires at least one value
  const [first, ...rest] = availableLabels;
  return z.array(z.enum([first, ...rest] as [string, ...string[]]));
}

export async function generatePullRequest(
  currentBranch: string,
  commits: GitCommit[],
  template?: string,
  localeOverride?: string,
  contextOverride?: string,
) {
  const providerConfig = await getProviderConfig();
  const apiKey = await config.get(
    providerConfig.apiKeyConfigKey as Parameters<typeof config.get>[0],
  );

  // Only require API key if provider doesn't allow optional keys
  if (!apiKey && !providerConfig.apiKeyOptional) {
    throw new Error(
      `${providerConfig.apiKeyConfigKey} is required. Set it with: lazypr config set ${providerConfig.apiKeyConfigKey}=<your-api-key>`,
    );
  }

  const locale = localeOverride || (await config.get("LOCALE"));
  const context = contextOverride || (await config.get("CONTEXT"));
  const model = await config.get("MODEL");
  const customLabelsConfig = await config.get("CUSTOM_LABELS");
  const availableLabels = getAvailableLabels(customLabelsConfig);
  const commitsString = commits.map((commit) => commit.message).join("\n");

  // Get baseURL for OpenAI-compatible providers
  const baseURL =
    providerConfig.name === "openai"
      ? await config.get("OPENAI_BASE_URL")
      : undefined;

  const languageModel = providerConfig.createModel(apiKey, model, baseURL);

  // Build schema with dynamic labels
  const pullRequestSchema = z.object({
    title: z.string().min(MIN_TITLE_LENGTH).max(MAX_TITLE_LENGTH),
    description: z.string().min(MIN_DESCRIPTION_LENGTH),
    labels: buildLabelsSchema(availableLabels),
  });

  const { output, usage, finishReason } = await generateText({
    model: languageModel,
    output: Output.object({ schema: pullRequestSchema }),
    maxRetries: Number.parseInt(await config.get("MAX_RETRIES"), 10),
    abortSignal: AbortSignal.timeout(
      Number.parseInt(await config.get("TIMEOUT"), 10),
    ),
    system: getSystemPrompt(),
    prompt: buildPrompt(
      locale,
      currentBranch,
      context,
      availableLabels,
      commitsString,
      template,
    ),
  });
  return { object: output, usage, finishReason };
}
