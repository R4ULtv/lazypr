import * as z from "zod/mini";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";

import type { GitCommit } from "./git";
import { config } from "./config";

const pullRequestSchema = z.object({
  title: z.string().check(z.minLength(5), z.maxLength(50)),
  description: z.string().check(z.minLength(20)),
});

export async function generatePullRequest(
  currentBranch: string,
  commits: GitCommit[]
) {
  const groq = createGroq({
    apiKey: await config.get("GROQ_API_KEY"),
  });
  const locale = await config.get("LOCALE");
  const commitsString = commits.map((commit) => commit.message).join("\n");

  const { object } = await generateObject({
    model: groq("openai/gpt-oss-20b"),
    schema: pullRequestSchema,
    maxRetries: parseInt(await config.get("MAX_RETRIES")),
    abortSignal: AbortSignal.timeout(parseInt(await config.get("TIMEOUT"))),
    system: `
    You are an AI assistant that creates a pull-request title and description.

    - The target branch name (e.g. \`feature/login\`, \`bugfix/auth-token\`) is a strong indicator of the overall intent.
    - Use the commit messages (provided in the user prompt) as concrete evidence of what changed.
    - **ALL output (title and description) MUST be written in the language identified by the locale**  
      If the requested language is not supported, fall back to English.
    - Title requirements:
      - 5-50 characters  
      - Written in imperative mood, start with a capital letter, no trailing period
    - Description requirements:
      - At least 20 characters  
      - Use markdown formatting, be concise yet informative
    - Keep the tone professional.
    `,
    prompt: `
    Locale: ${locale}
    Target branch: ${currentBranch}

    Commit history (most recent last):
    ${commitsString}

    Based on the branch name, the commit list above, **and the locale**, generate a JSON object that conforms to this schema:

    {
      "title": "<PR title>",
      "description": "<PR description>"
    }

    Make sure the title respects the 5-50 character limit and the description is at least 20 characters long. Use markdown in the description where appropriate.
    `,
  });
  return object;
}
