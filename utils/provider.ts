import { createCerebras } from "@ai-sdk/cerebras";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { generateObject } from "ai";
import * as z from "zod/v4";
import { config } from "./config";
import type { GitCommit } from "./git";
import { DEFAULT_LABELS, getAvailableLabels } from "./labels";

// Provider types
export type ProviderType = "groq" | "cerebras" | "openai";

// Provider configuration interface
interface ProviderConfig {
  name: ProviderType;
  apiKeyConfigKey: string;
  apiKeyOptional?: boolean;
  createModel: (apiKey: string, model: string, baseURL?: string) => LanguageModel;
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
      `${providerConfig.apiKeyConfigKey} is required for provider '${providerConfig.name}'. ` +
        `Set it with: lazypr config set ${providerConfig.apiKeyConfigKey}=<your-api-key>`,
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
  const hasTemplate = template && template.trim().length > 0;

  // Get baseURL for OpenAI-compatible providers
  const baseURL =
    providerConfig.name === "openai"
      ? await config.get("OPENAI_BASE_URL")
      : undefined;

  const languageModel = providerConfig.createModel(apiKey, model, baseURL);

  // Build schema with dynamic labels
  const pullRequestSchema = z.object({
    title: z.string().min(5).max(100),
    description: z.string().min(100),
    labels: buildLabelsSchema(availableLabels),
  });

  const { object, usage, finishReason } = await generateObject({
    model: languageModel,
    schema: pullRequestSchema,
    maxRetries: Number.parseInt(await config.get("MAX_RETRIES"), 10),
    abortSignal: AbortSignal.timeout(
      Number.parseInt(await config.get("TIMEOUT"), 10),
    ),
    system: `
    You are a pull request content generator that creates professional PR titles and descriptions for code reviews.

    **Return ONLY valid JSON with no extra prose.**

    ### Instructions:
    1. Analyze the target branch name to understand the overall intent
    2. Use commit messages as concrete evidence of what changed
    3. Generate title and description in the specified locale language
    4. Follow exact formatting requirements below
    5. If a PR template is provided, you MUST follow it strictly - preserve all sections, headers, checkboxes, and formatting exactly as they appear
    6. IMPORTANT: PR templates often contain frontmatter sections delimited by --- at the top with GitHub metadata (labels, assignees, etc.). You MUST completely ignore and exclude all content within these frontmatter sections. Only follow the actual template content that comes after the frontmatter.

    ### Context:
    - Branch names indicate feature scope (feature/, bugfix/, hotfix/, etc.)
    - Commit messages show implementation details and progression
    - PR titles should be concise and actionable for reviewers
    - Descriptions should highlight key changes and impacts

    ### Requirements:
    **Title:**
    - Exactly 5-50 characters
    - Imperative mood, capitalize first letter, no trailing period
    - Summarize the main change or feature

    **Description:**
    - Minimum 100 characters (should be verbose and detailed)
    - Start with a general overview paragraph explaining the purpose/goal
    - Follow with detailed sections using markdown formatting
    - Include key changes, impacts, technical details, and context
    - Use bullet points, headers, and formatting for readability
    - Professional tone, comprehensive yet well-structured
    - When a PR template is provided: ignore any frontmatter section between --- markers at the top (this contains GitHub metadata like labels, assignees, etc.), then strictly follow the actual template structure that comes after, fill in all sections with relevant information, and preserve all template formatting

    **Language:**
    - ALL content must be in the specified locale language
    - Fall back to English if locale not supported

    **Additional Guidance:**
    - The user may provide additional context to guide the tone, style, and structure of the PR content
    - If provided, apply this guidance while maintaining professional quality and completeness

    **Labels:**
    - Select one or more labels that best describe the changes
    - Only use labels from the provided list
    - Default label meanings: enhancement (new features/improvements), bug (bug fixes), documentation (documentation changes)
    `,
    prompt: `
    ### Input Data:

    **Locale:** ${locale}
    **Target Branch:** ${currentBranch}${context ? `\n    **Additional Guidance:** ${context}` : ""}
    **Available Labels:** ${availableLabels}

    **Commit History (most recent last):**
    \`\`\`
    ${commitsString}
    \`\`\`
    ${hasTemplate ? `\n    **PR Template to Follow:**\n    \`\`\`markdown\n    ${template}\n    \`\`\`` : ""}

    ### Required Output:
    Generate JSON with exactly these keys:
    - title (string, 5-50 chars, imperative mood)
    - description (string, 100+ chars, markdown formatted, verbose with general overview first)

    ### Example Output:
    {"title":"Add user authentication system","description":"This pull request introduces a comprehensive user authentication system to enhance application security and user management capabilities.\\n\\n## Key Changes\\n- Implemented JWT-based authentication with secure token generation\\n- Added login/logout API endpoints with proper validation\\n- Updated user model to include password hashing using bcrypt\\n- Added middleware for route protection\\n\\n## Technical Details\\n- Uses industry-standard JWT tokens for session management\\n- Passwords are hashed with salt rounds for security\\n- Includes proper error handling and validation"}

    Generate the JSON object now:
    `,
  });
  return { object, usage, finishReason };
}
