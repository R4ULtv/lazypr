[![lazypr](https://lazypr.raulcarini.dev/config.webp)](https://lazypr.raulcarini.dev)

Practical examples for using `lazypr` in different scenarios - from CLI usage to GitHub Actions automation.

## What's inside?

- **[CLI Examples](./cli/)** - Command-line usage patterns and workflows
- **[GitHub Actions](./github-actions/)** - Automated PR workflows
- **[Configuration](./config/)** - Setup examples for different use cases

## Quick examples ⚡

### Basic CLI usage

```bash
# Generate PR from current branch to main
lazypr

# Target a different branch
lazypr develop

# Use a PR template
lazypr --template feature

# Different AI provider
lazypr --provider cerebras

# Add context
lazypr --context "Security fix - review carefully"
```

### GitHub Actions workflow

Auto-update PR descriptions when you push new commits:

```yaml
name: Auto-Update PR

on:
  pull_request:
    types: [opened, synchronize]

permissions:
  pull-requests: write
  contents: read

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install -g lazypr

      - name: Generate and update PR
        env:
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
          GH_TOKEN: ${{ github.token }}
        run: |
          lazypr ${{ github.event.pull_request.base.ref }} > pr.txt
          TITLE=$(head -n 1 pr.txt | sed 's/^# //')
          BODY=$(tail -n +2 pr.txt)
          gh pr edit ${{ github.event.pull_request.number }} \
            --title "$TITLE" \
            --body "$BODY"
```

See [github-actions/](./github-actions/) for more workflows.

## Examples by category

### CLI Examples

| Example | Description |
|---------|-------------|
| [Basic Usage](./cli/basic-usage.md) | Simple commands and common patterns |
| [Advanced Options](./cli/advanced-options.md) | Filters, templates, providers, and models |

### GitHub Actions Examples

| Workflow | Description |
|----------|-------------|
| [Auto-Update PR](./github-actions/auto-update-pr.yml) | Update PR on new commits |
| [Auto-Create PR](./github-actions/auto-create-pr.yml) | Create PR when pushing to feature branches |
| [Multi-Provider Fallback](./github-actions/multi-provider-fallback.yml) | Groq with Cerebras fallback |
| [PR Validation](./github-actions/pr-validation.yml) | Validate and suggest improvements |

### Configuration Examples

| Config | Description |
|--------|-------------|
| [Minimal](./config/minimal.conf) | Bare minimum to get started |
| [Team](./config/team.conf) | Shared team standards |
| [Multi-Provider](./config/multi-provider.conf) | Multiple AI provider setup |

## Getting started

### 1. Install lazypr

```bash
npm install -g lazypr
```

### 2. Get an API key

Sign up for a free API key:
- **Groq:** [console.groq.com](https://console.groq.com/keys)
- **Cerebras:** [cloud.cerebras.ai](https://cloud.cerebras.ai)

### 3. Configure

```bash
lazypr config set GROQ_API_KEY=your-key-here
```

### 4. Try it

```bash
# In a git repository with commits
lazypr
```

## Common use cases

### For individual developers

**Quick PR generation:**
```bash
lazypr                    # Generate PR description
lazypr --template bug     # Use bug template
lazypr develop            # Target develop branch
```

**With GitHub CLI:**
```bash
lazypr --gh               # Get gh pr create command
```

### For teams

**Standardized config:** Share a [team configuration](./config/team.conf) file

**GitHub Actions:** Set up [auto-update workflow](./github-actions/auto-update-pr.yml) to keep PRs synchronized

**PR validation:** Use [validation workflow](./github-actions/pr-validation.yml) to enforce quality standards

### For CI/CD

**Automated PR creation:** Use [auto-create workflow](./github-actions/auto-create-pr.yml) for feature branches

**Multi-provider reliability:** Implement [fallback strategy](./github-actions/multi-provider-fallback.yml) for production

## Prerequisites

- Node.js >= 20
- Git repository
- API key for Groq or Cerebras

## Need help?

- **Main docs:** [README.md](../README.md)
- **CLI help:** `lazypr --help`
- **Config help:** `lazypr config --help`
- **Issues:** [github.com/r4ultv/lazypr/issues](https://github.com/r4ultv/lazypr/issues)
