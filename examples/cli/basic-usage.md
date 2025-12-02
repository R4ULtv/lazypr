# Basic CLI Usage Examples

## Simple PR Generation

Generate a PR from your current branch to main:

```bash
lazypr
```

This will:
1. Analyze commits between your current branch and main
2. Generate a professional PR title and description
3. Offer to copy the result to clipboard

## Targeting Different Branches

Generate PR for merging into develop branch:

```bash
lazypr develop
```

Generate PR for merging into production:

```bash
lazypr production
```

## Using Different AI Providers

### Using Groq (default)

```bash
# Make sure GROQ_API_KEY is set
export GROQ_API_KEY="your-api-key"
lazypr
```

### Using Cerebras

```bash
# Set Cerebras API key
export CEREBRAS_API_KEY="your-api-key"
lazypr --provider cerebras
```

## Using PR Templates

If you have PR templates in your repository:

```bash
# Use a specific template
lazypr --template feature

# List available templates
ls .github/PULL_REQUEST_TEMPLATE/
```

Template locations searched:
- `.github/pull_request_template.md`
- `.github/PULL_REQUEST_TEMPLATE/*.md`
- `docs/pull_request_template.md`
- `docs/PULL_REQUEST_TEMPLATE/*.md`

## Output Examples

### Example Output (Default)

```markdown
# Fix authentication bug in login flow

## Description

This PR addresses a critical authentication issue where users were unable to log in after password reset. The fix includes:

- Added proper session validation in the auth middleware
- Fixed token refresh logic to handle expired tokens
- Updated error messages for better user feedback
- Added comprehensive tests for the login flow

## Changes

- `src/middleware/auth.ts`: Enhanced session validation
- `src/services/token.ts`: Fixed token refresh mechanism
- `tests/auth.test.ts`: Added new test cases

## Labels

- bug
```

### Example Output (With Template)

If you have a template like:

```markdown
## What does this PR do?

<!-- Describe your changes -->

## Why are we doing this?

<!-- Explain the motivation -->

## Testing

<!-- How was this tested? -->
```

LazyPR will fill it in:

```markdown
## What does this PR do?

This PR fixes the authentication bug in the login flow by improving session validation and token refresh logic.

## Why are we doing this?

Users reported being unable to log in after resetting their passwords. Investigation revealed issues with token expiration handling and session validation.

## Testing

- Added unit tests for auth middleware
- Added integration tests for login flow
- Manually tested password reset flow
- All existing tests pass
```

## Common Patterns

### Quick Workflow

```bash
# 1. Create feature branch
git checkout -b feature/add-dark-mode

# 2. Make commits
git commit -m "Add dark mode toggle component"
git commit -m "Update theme context for dark mode"
git commit -m "Add dark mode styles"

# 3. Generate PR
lazypr

# 4. Copy to clipboard (prompted)
# 5. Create PR on GitHub and paste
```

### Multi-Step Review

```bash
# Generate without copying (for review)
lazypr > pr-draft.md

# Review the generated content
cat pr-draft.md

# Edit if needed
vim pr-draft.md

# Copy manually when ready
pbcopy < pr-draft.md  # macOS
xclip -selection clipboard < pr-draft.md  # Linux
```

### Using with Git Aliases

Add to your `~/.gitconfig`:

```ini
[alias]
    pr = !lazypr
    pr-dev = !lazypr develop
```

Then use:

```bash
git pr
git pr-dev
```

## Troubleshooting

### "Not a git repository"

Make sure you're in a git repository:

```bash
git status  # Verify you're in a repo
cd /path/to/your/repo
lazypr
```

### "No commits found"

Your branch might be up to date with the target:

```bash
git log main..HEAD  # Check if there are commits to analyze
git commit --allow-empty -m "Test commit"  # Add a commit if needed
```

### "API key not found"

Set your API key:

```bash
export GROQ_API_KEY="your-key-here"
# Or
lazypr config set GROQ_API_KEY "your-key-here"
```

### Rate Limiting

If you hit rate limits, try:
- Using a different provider: `lazypr --provider cerebras`
- Waiting a few minutes
- Checking your API quota
