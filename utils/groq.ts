import * as z from "zod/mini";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";

import type { GitCommit } from "./git";
import { config } from "./config";

const pullRequestSchema = z.object({
  title: z.string().check(z.minLength(5), z.maxLength(50)),
  description: z.string().check(z.minLength(100)),
});

export async function generatePullRequest(
  currentBranch: string,
  commits: GitCommit[],
) {
  const groq = createGroq({
    apiKey: await config.get("GROQ_API_KEY"),
  });
  const locale = await config.get("LOCALE");
  const model = await config.get("MODEL");
  const commitsString = commits.map((commit) => commit.message).join("\n");

  const { object } = await generateObject({
    model: groq(model),
    schema: pullRequestSchema,
    maxRetries: parseInt(await config.get("MAX_RETRIES")),
    abortSignal: AbortSignal.timeout(parseInt(await config.get("TIMEOUT"))),
    system: `
    You are a pull request content generator that creates professional PR titles and descriptions for code reviews.

    **Return ONLY valid JSON with no extra prose.**

    ### Instructions:
    1. Analyze the target branch name to understand the overall intent
    2. Use commit messages as concrete evidence of what changed
    3. Generate title and description in the specified locale language
    4. Follow exact formatting requirements below

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

    **Language:**
    - ALL content must be in the specified locale language
    - Fall back to English if locale not supported
    `,
    prompt: `
    ### Input Data:

    **Locale:** ${locale}
    **Target Branch:** ${currentBranch}

    **Commit History (most recent last):**
    \`\`\`
    ${commitsString}
    \`\`\`

    ### Required Output:
    Generate JSON with exactly these keys:
    - title (string, 5-50 chars, imperative mood)
    - description (string, 100+ chars, markdown formatted, verbose with general overview first)

    ### Example Output:
    {"title":"Add user authentication system","description":"This pull request introduces a comprehensive user authentication system to enhance application security and user management capabilities.\\n\\n## Key Changes\\n- Implemented JWT-based authentication with secure token generation\\n- Added login/logout API endpoints with proper validation\\n- Updated user model to include password hashing using bcrypt\\n- Added middleware for route protection\\n\\n## Technical Details\\n- Uses industry-standard JWT tokens for session management\\n- Passwords are hashed with salt rounds for security\\n- Includes proper error handling and validation"}

    Generate the JSON object now:
    `,
  });
  return object;
}
