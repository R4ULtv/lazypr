// PR validation constants
export const MIN_TITLE_LENGTH = 5;
export const MAX_TITLE_LENGTH = 100;
export const MIN_DESCRIPTION_LENGTH = 100;

// System prompt for PR generation
export const getSystemPrompt = () => `
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
- Exactly ${MIN_TITLE_LENGTH}-${MAX_TITLE_LENGTH} characters
- Imperative mood, capitalize first letter, no trailing period
- Summarize the main change or feature

**Description:**
- Minimum ${MIN_DESCRIPTION_LENGTH} characters (should be verbose and detailed)
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
`;

// Build prompt for PR generation
export const buildPrompt = (
  locale: string,
  currentBranch: string,
  context: string | undefined,
  availableLabels: string[],
  commitsString: string,
  template: string | undefined,
) => {
  const hasTemplate = template && template.trim().length > 0;
  return `
### Input Data:

**Locale:** ${locale}
**Target Branch:** ${currentBranch}${context ? `\n**Additional Guidance:** ${context}` : ""}
**Available Labels:** ${availableLabels}

**Commit History (most recent last):**
\`\`\`
${commitsString}
\`\`\`
${hasTemplate ? `\n**PR Template to Follow:**\n\`\`\`markdown\n${template}\n\`\`\`` : ""}

### Required Output:
Generate JSON with exactly these keys:
- title (string, ${MIN_TITLE_LENGTH}-${MAX_TITLE_LENGTH} chars, imperative mood)
- description (string, ${MIN_DESCRIPTION_LENGTH}+ chars, markdown formatted, verbose with general overview first)

### Example Output:
{"title":"Add user authentication system","description":"This pull request introduces a comprehensive user authentication system to enhance application security and user management capabilities.\\n\\n## Key Changes\\n- Implemented JWT-based authentication with secure token generation\\n- Added login/logout API endpoints with proper validation\\n- Updated user model to include password hashing using bcrypt\\n- Added middleware for route protection\\n\\n## Technical Details\\n- Uses industry-standard JWT tokens for session management\\n- Passwords are hashed with salt rounds for security\\n- Includes proper error handling and validation","labels":["enhancement"]}

Generate the JSON object now:
`;
};
