import { z } from "zod/v4";
import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";

import type { GitCommit } from "./git";
import { readSpecificKey } from "./config";

const pullRequestSchema = z.object({
  title: z.string().max(50).describe("The title of the pull request."),
  description: z
    .string()
    .max(1000)
    .describe("The description of the pull request. (Markdown format)"),
});

export async function generatePullRequest(
  currentBranch: string,
  commits: GitCommit[]
) {
  const groq = createGroq({
    apiKey: await readSpecificKey("GROQ_API_KEY"),
  });
  const commitsString = commits.map((commit) => commit.message).join("\n");

  const { object } = await generateObject({
    model: groq("openai/gpt-oss-20b"),
    schema: pullRequestSchema,
    prompt: `
You are an AI assistant specialized in creating concise, GitHub-friendly pull-request titles and descriptions from a branch name and its commit history.  

**Output Requirements**  
- **Title**: Follow the *Conventional Commits* style (\`<type>: <subject>\`) and keep it ≤ 50 characters. Typical types include \`feat\`, \`fix\`, \`docs\`, \`chore\`, \`refactor\`, etc.  
- **Description** (Markdown):  
  1. *PR Summary*: One-to-two sentence overview of what the PR does.  
  2. *Changelog*: Bullet list summarizing each commit's main change.  
  3. *Issues Fixed/Addresses*: If any commit message references \`#<number>\` or “fixes #<number>”, list those issue links.  
  4. *Notes / Additional Info*: Any special build/test instructions or dependencies.  

**User Input**  
\`\`\`
Branch: ${currentBranch}
Commits:
${commitsString}
\`\`\`

**Example Output**  
\`\`\`
Title: feat: add JWT authentication middleware

Description:
## PR Summary
Introduces JWT-based authentication middleware and associated utilities, fixing token expiry edge-cases and updating documentation.

## Changeog
- \`feat\`: add JWT authentication middleware  
- \`fix\`: correct token expiration handling  
- \`docs\`: update README with auth flow diagrams

\`\`\`
    `,
  });
  return object;
}
