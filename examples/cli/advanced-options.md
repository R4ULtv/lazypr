# Advanced CLI Options

## Commit Filtering

### Disable Commit Filtering

By default, lazypr filters out merge commits, dependency updates, and formatting changes:

```bash
# Include ALL commits (no filtering)
lazypr --no-filter
```

This will include:
- Merge commits
- Dependency updates (npm, yarn, etc.)
- Formatting-only changes (prettier, eslint, etc.)

### Understanding What Gets Filtered

Filtered patterns include:

**Merge commits:**
- `Merge branch 'feature' into main`
- `Merge pull request #123`

**Dependency updates:**
- `chore: update dependencies`
- `bump version to 1.2.3`
- `Update package.json`

**Formatting changes:**
- `style: format code with prettier`
- `chore: run eslint --fix`
- `Fix linting issues`

## Adding Context

Provide additional context to guide the AI:

```bash
# Add context about the PR purpose
lazypr --context "This is a critical security fix that needs immediate review"

# Add context about breaking changes
lazypr --context "Breaking changes: API endpoints have been renamed"

# Add context about the target audience
lazypr --context "This PR is for the mobile team to review"
```

The AI will use this context to adjust the tone and content of the PR description.

## Locale Support

Generate PRs in different languages:

```bash
# Generate in Spanish
lazypr --locale es

# Generate in French
lazypr --locale fr

# Generate in Japanese
lazypr --locale ja

# Generate in German
lazypr --locale de
```

Supported locales:
- `en` - English (default)
- `es` - Spanish
- `fr` - French
- `de` - German
- `ja` - Japanese
- `zh` - Chinese
- `pt` - Portuguese
- `ru` - Russian
- `ko` - Korean

## Using Custom Models

### Groq Models

```bash
# Use a different Groq model
lazypr --model llama-3.3-70b-versatile

# Smaller, faster model
lazypr --model llama-3.1-8b-instant
```

Available Groq models:
- `llama-3.3-70b-versatile` (default)
- `llama-3.1-70b-versatile`
- `llama-3.1-8b-instant`
- `mixtral-8x7b-32768`

### Cerebras Models

```bash
# Use Cerebras with specific model
lazypr --provider cerebras --model llama-3.3-70b

# Fast inference model
lazypr --provider cerebras --model llama-3.1-8b
```

## Combining Options

### Production-Ready PR with Context

```bash
lazypr \
  main \
  --template production \
  --context "Breaking changes in API v2" \
  --locale en
```

### Quick PR for Development

```bash
lazypr \
  develop \
  --no-filter \
  --provider cerebras \
  --model llama-3.1-8b-instant
```

### Detailed PR with All Commits

```bash
lazypr \
  main \
  --no-filter \
  --context "Complete refactor of authentication system - review all commits" \
  --template detailed
```

## Configuration for Advanced Options

Save your preferences:

```bash
# Set default provider
lazypr config set PROVIDER cerebras

# Set default model
lazypr config set MODEL llama-3.1-8b-instant

# Set default locale
lazypr config set LOCALE es

# Disable filtering by default
lazypr config set FILTER_COMMITS false

# Set default context
lazypr config set CONTEXT "Please review carefully"

# View current config
lazypr config list
```

## Scripting with LazyPR

### Capture Output

```bash
# Save to file
lazypr > pr-description.md

# Capture just the title
lazypr | head -n 1

# Capture just the description (skip title)
lazypr | tail -n +2
```

### Conditional PR Generation

```bash
# Only generate if there are changes
if [ $(git log main..HEAD --oneline | wc -l) -gt 0 ]; then
  lazypr
else
  echo "No commits to generate PR from"
fi
```

### Batch Processing

```bash
# Generate PRs for multiple branches
for branch in feature-1 feature-2 feature-3; do
  git checkout $branch
  lazypr main > "pr-$branch.md"
done
```

## Advanced Template Usage

### Multiple Templates in One Repo

Structure:

```
.github/PULL_REQUEST_TEMPLATE/
├── feature.md
├── bugfix.md
├── hotfix.md
└── release.md
```

Usage:

```bash
# Use feature template
lazypr --template feature

# Use bugfix template
lazypr --template bugfix

# Use hotfix template
lazypr --template hotfix
```

### Template with Frontmatter

Templates can include GitHub metadata:

```markdown
---
name: Feature Request
about: New feature implementation
labels: enhancement, needs-review
---

## Feature Description

<!-- Details here -->
```

LazyPR automatically ignores the frontmatter and only processes the template content.

## Performance Tuning

### Faster Generation

```bash
# Use fastest model and provider
lazypr --provider cerebras --model llama-3.1-8b-instant

# Reduce timeout (fail faster)
lazypr config set TIMEOUT 15000
```

### More Reliable Generation

```bash
# Increase retries
lazypr config set MAX_RETRIES 5

# Increase timeout
lazypr config set TIMEOUT 60000
```

## Debugging

### Verbose Output

```bash
# Enable debug mode (if implemented)
DEBUG=lazypr:* lazypr

# Check git commits being analyzed
git log $(git merge-base HEAD main)..HEAD --oneline
```

### Testing Different Configurations

```bash
# Test with minimal config
HOME=/tmp lazypr

# Test with specific API key
GROQ_API_KEY="test-key" lazypr

# Test template selection
lazypr --template nonexistent  # See error handling
```

## Integration with Git Hooks

### Prepare-Commit-Msg Hook

```bash
#!/bin/sh
# .git/hooks/prepare-commit-msg

# Generate PR description when creating commits
if [ -z "$2" ]; then
  lazypr > .pr-description
fi
```

### Pre-Push Hook

```bash
#!/bin/sh
# .git/hooks/pre-push

# Remind to generate PR before pushing
echo "Don't forget to run: lazypr"
```

## Environment Variables

Override config with environment variables:

```bash
# Override provider
LAZYPR_PROVIDER=cerebras lazypr

# Override model
LAZYPR_MODEL=llama-3.1-8b-instant lazypr

# Override multiple settings
LAZYPR_PROVIDER=cerebras \
LAZYPR_MODEL=llama-3.1-8b-instant \
LAZYPR_LOCALE=es \
lazypr
```

## Best Practices

### For Feature Branches

```bash
# Use detailed templates and context
lazypr --template feature --context "New user-facing feature"
```

### For Bug Fixes

```bash
# Include all commits for traceability
lazypr --no-filter --template bugfix
```

### For Hotfixes

```bash
# Fast generation with clear context
lazypr --provider cerebras --context "Critical security fix - expedite review"
```

### For Releases

```bash
# Comprehensive description
lazypr main --no-filter --template release
```
