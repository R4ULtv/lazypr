import * as z from "zod/v4";
import { SUPPORTED_PROVIDERS, type ConfigKey, type ProviderType, config } from "./config";
import type { GitCommit } from "./git";
import { getAvailableLabels } from "./labels";
import {
  buildPrompt,
  getSystemPrompt,
  MAX_TITLE_LENGTH,
  MIN_DESCRIPTION_LENGTH,
  MIN_TITLE_LENGTH,
} from "./prompts";

export const MODEL_NAME = "Qwen 3.8 27B";

export const GENERATION_PARAMETERS = {
  reasoning_effort: "low",
  temperature: 0.7,
  top_p: 0.8,
  presence_penalty: 1,
} as const;

export type { ProviderType } from "./config";

interface ProviderConfig {
  name: ProviderType;
  label: string;
  hint: string;
  apiKeyConfigKey: ConfigKey;
  apiKeyUrl: string;
  endpoint: string;
  modelId: string;
  reasoningFormat?: "hidden";
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

interface GenerationResult {
  object: {
    title: string;
    description: string;
    labels: string[];
  };
  usage: TokenUsage;
  finishReason: string;
}

const providers: Record<ProviderType, ProviderConfig> = {
  groq: {
    name: "groq",
    label: "Groq",
    hint: "~450+ tokens/s",
    apiKeyConfigKey: "GROQ_API_KEY",
    apiKeyUrl: "https://console.groq.com/keys",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    modelId: "qwen/qwen3.8-27b",
    reasoningFormat: "hidden",
  },
  cerebras: {
    name: "cerebras",
    label: "Cerebras",
    hint: "~1,500 tokens/s",
    apiKeyConfigKey: "CEREBRAS_API_KEY",
    apiKeyUrl: "https://cloud.cerebras.ai/",
    endpoint: "https://api.cerebras.ai/v1/chat/completions",
    modelId: "qwen-3.8-27b",
  },
};

export const PROVIDER_OPTIONS = SUPPORTED_PROVIDERS.map((value) => ({
  value,
  label: providers[value].label,
  hint: providers[value].hint,
}));

const chatCompletionSchema = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        message: z.object({ content: z.string().nullable() }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
});

const apiErrorSchema = z.object({
  error: z.union([z.string(), z.object({ message: z.string().optional() })]).optional(),
  message: z.string().optional(),
});

class ProviderRequestError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

export function isProviderType(value: string): value is ProviderType {
  return SUPPORTED_PROVIDERS.some((provider) => provider === value);
}

function getProviderConfig(providerName: string): ProviderConfig {
  if (!isProviderType(providerName)) {
    throw new Error(`Unknown provider: ${providerName}`);
  }

  return providers[providerName];
}

async function getCurrentProviderConfig(): Promise<ProviderConfig> {
  return getProviderConfig(await config.get("PROVIDER"));
}

export function getApiKeyConfigKey(provider: ProviderType): ConfigKey {
  return providers[provider].apiKeyConfigKey;
}

export function getApiKeyLink(provider: ProviderType): string {
  return providers[provider].apiKeyUrl;
}

export async function validateProviderApiKey(): Promise<void> {
  const provider = await getCurrentProviderConfig();
  const apiKey = await config.get(provider.apiKeyConfigKey);

  if (!apiKey) {
    throw new Error(
      `${provider.apiKeyConfigKey} is required for provider '${provider.name}'.\n` +
        `Get your API key: ${provider.apiKeyUrl}\n` +
        `Then set it with: lazypr config set ${provider.apiKeyConfigKey}=<your-api-key>`,
    );
  }
}

async function readApiError(response: Response): Promise<string> {
  const fallback = response.statusText || "Unknown API error";

  try {
    const body = apiErrorSchema.parse(await response.json());

    if (typeof body.error === "string") return body.error;
    if (body.error?.message) return body.error.message;
    if (body.message) return body.message;
  } catch {
    // The provider did not return JSON. Use the HTTP status text instead.
  }

  return fallback;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function buildResponseFormat(availableLabels: string[]) {
  return {
    type: "json_schema",
    json_schema: {
      name: "pull_request",
      strict: true,
      schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          labels: {
            type: "array",
            items: { type: "string", enum: availableLabels },
          },
        },
        required: ["title", "description", "labels"],
        additionalProperties: false,
      },
    },
  } as const;
}

function buildLabelsSchema(availableLabels: string[]) {
  return z
    .array(z.string())
    .refine((labels) => labels.every((label) => availableLabels.includes(label)), {
      message: `Labels must be one of: ${availableLabels.join(", ")}`,
    });
}

async function requestPullRequest(
  provider: ProviderConfig,
  apiKey: string,
  prompt: string,
  availableLabels: string[],
  timeout: number,
): Promise<unknown> {
  let response: Response;

  try {
    response = await fetch(provider.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: provider.modelId,
        ...GENERATION_PARAMETERS,
        ...(provider.reasoningFormat ? { reasoning_format: provider.reasoningFormat } : {}),
        messages: [
          { role: "system", content: getSystemPrompt() },
          { role: "user", content: prompt },
        ],
        response_format: buildResponseFormat(availableLabels),
      }),
      signal: AbortSignal.timeout(timeout),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Network request failed";
    throw new ProviderRequestError(`${provider.name} request failed: ${detail}`, true);
  }

  if (!response.ok) {
    const detail = await readApiError(response);
    throw new ProviderRequestError(
      `${provider.name} request failed (${response.status}): ${detail}`,
      isRetryableStatus(response.status),
    );
  }

  try {
    return await response.json();
  } catch {
    throw new ProviderRequestError(`${provider.name} returned an invalid JSON response`, true);
  }
}

async function generateWithRetries(
  provider: ProviderConfig,
  apiKey: string,
  prompt: string,
  availableLabels: string[],
  timeout: number,
  maxRetries: number,
): Promise<GenerationResult> {
  const pullRequestSchema = z
    .object({
      title: z.string().min(MIN_TITLE_LENGTH).max(MAX_TITLE_LENGTH),
      description: z.string().min(MIN_DESCRIPTION_LENGTH),
      labels: buildLabelsSchema(availableLabels).min(1),
    })
    .strict();

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const payload = chatCompletionSchema.parse(
        await requestPullRequest(provider, apiKey, prompt, availableLabels, timeout),
      );
      const choice = payload.choices[0];
      const content = choice?.message.content;

      if (!content) {
        throw new ProviderRequestError(`${provider.name} returned an empty response`, true);
      }

      let generated: unknown;
      try {
        generated = JSON.parse(content);
      } catch {
        throw new ProviderRequestError(`${provider.name} returned invalid structured output`, true);
      }

      const object = pullRequestSchema.parse(generated);
      const inputTokens = payload.usage?.prompt_tokens ?? 0;
      const outputTokens = payload.usage?.completion_tokens ?? 0;

      return {
        object,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: payload.usage?.total_tokens ?? inputTokens + outputTokens,
        },
        finishReason: choice.finish_reason ?? "unknown",
      };
    } catch (error) {
      lastError = error;
      if (error instanceof ProviderRequestError && !error.retryable) throw error;
      if (attempt === maxRetries) break;
    }
  }

  if (lastError instanceof z.ZodError) {
    throw new Error(
      `${provider.name} returned output that failed validation: ${lastError.message}`,
    );
  }
  throw lastError instanceof Error ? lastError : new Error(`${provider.name} request failed`);
}

export async function generatePullRequest(
  sourceBranch: string,
  targetBranch: string,
  commits: GitCommit[],
  template?: string,
  localeOverride?: string,
  contextOverride?: string,
): Promise<GenerationResult> {
  const provider = await getCurrentProviderConfig();
  const apiKey = await config.get(provider.apiKeyConfigKey);

  if (!apiKey) {
    throw new Error(
      `${provider.apiKeyConfigKey} is required. Set it with: lazypr config set ${provider.apiKeyConfigKey}=<your-api-key>`,
    );
  }

  const [locale, context, customLabelsConfig, timeout, maxRetries] = await Promise.all([
    localeOverride ? Promise.resolve(localeOverride) : config.get("LOCALE"),
    contextOverride ? Promise.resolve(contextOverride) : config.get("CONTEXT"),
    config.get("CUSTOM_LABELS"),
    config.get("TIMEOUT"),
    config.get("MAX_RETRIES"),
  ]);
  const availableLabels = getAvailableLabels(customLabelsConfig);
  const prompt = buildPrompt({
    locale,
    sourceBranch,
    targetBranch,
    additionalGuidance: context,
    availableLabels,
    commitMessages: commits.map((commit) => commit.message),
    pullRequestTemplate: template,
  });

  return generateWithRetries(
    provider,
    apiKey,
    prompt,
    availableLabels,
    Number.parseInt(timeout, 10),
    Number.parseInt(maxRetries, 10),
  );
}
