[![lazypr](https://lazypr.raulcarini.dev/og-image.webp)](https://lazypr.raulcarini.dev)

[![test status](https://img.shields.io/github/actions/workflow/status/r4ultv/lazypr/test.yml)](https://github.com/r4ultv/lazypr/actions/workflows/test.yml)
[![version](https://img.shields.io/npm/v/lazypr.svg)](https://www.npmjs.com/package/lazypr)
[![license](https://img.shields.io/github/license/r4ultv/lazypr.svg)](https://github.com/r4ultv/lazypr/blob/main/LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20.0-43853d?logo=node.js&logoColor=white)](https://nodejs.org)

Generate clean, consistent PRs from commits - powered by AI (Groq, Cerebras) and your git history.

## What is it? ℹ️

`lazypr` analyzes your current branch's commits against a target branch and generates a concise, professional PR title and a markdown description. It also lets you copy either (or both) to your clipboard with a simple interactive prompt.

## Features ✨

- **Multi-provider AI:** Choose between Groq and Cerebras for AI-powered PR generation
- **Smart commit filtering:** Automatically excludes merge commits, dependency updates, and formatting-only changes
- **Concise titles + markdown descriptions:** Enforces length and style requirements
- **PR template support:** Use your existing PR templates from `.github` folder
- **Clipboard integration:** Copy title or description right from the prompt
- **GitHub CLI integration:** Generate ready-to-use `gh pr create` commands with the `--gh` flag
- **Alias included:** Use `lzp` as a short command
- **Configurable locale:** Output language via `LOCALE` config or `--locale` flag (en, es, pt, fr, de, it, ja, ko, zh, ru, nl, pl, tr)
- **Resilience controls:** Tune `MAX_RETRIES` and `TIMEOUT`

## Installation 📦

Install globally with your preferred package manager:

```bash
# npm
npm install -g lazypr

# yarn
yarn global add lazypr

# pnpm
pnpm add -g lazypr

# bun
bun install -g lazypr
```

Requires Node.js >= 20 (for ESM-only dependencies and clipboard support).

## Quick start ⚡

1) Set your AI provider API key (Groq is the default provider)

```bash
# For Groq (default)
lazypr config set GROQ_API_KEY=<your-api-key>

# Or for Cerebras
lazypr config set PROVIDER=cerebras
lazypr config set CEREBRAS_API_KEY=<your-api-key>
```

2) From a git repo on a feature branch, run:

```bash
lazypr               # compares against 'master' by default
```

or use the alias:

```bash
lzp
```

To target a different base branch:

```bash
lazypr main          # or develop, release/1.2, etc.
```

To use a PR template:

```bash
lazypr -t            # interactive selection if multiple templates
lazypr --template    # same as above
lazypr -t bugfix     # use specific template by name
```

To specify a language for a single run (overrides config):

```bash
lazypr -l es         # generate PR in Spanish
lazypr --locale pt   # generate PR in Portuguese
lazypr main -l fr    # target main branch with French output
```

To provide custom context to guide the AI's tone and style:

```bash
lazypr -c "make it simple and cohesive"     # add context for this run
lazypr --context "be concise"                # same as above
lazypr main -c "focus on technical details" # with target branch
```

The context helps guide how the AI generates both the title and description. Examples:
- "be concise" - for shorter, more direct PRs
- "make it technical" - for detailed technical descriptions
- "use simple language" - for non-technical audiences
- "focus on business impact" - to emphasize value over implementation

Context is limited to 200 characters and can also be set globally via config:

```bash
lazypr config set CONTEXT="make it simple and cohesive"
```

To generate a GitHub CLI command instead of copying title and description separately:

```bash
lazypr --gh          # generates a complete 'gh pr create' command
lazypr main --gh     # target main branch and generate gh command
lazypr --gh -t       # use a PR template and generate gh command
```

This will create a command like:
```bash
gh pr create --base main --title "feat: Add new feature" --body "Description..."
```

You can then copy and run this command directly in your terminal to create the PR using GitHub CLI.

## Configuration ⚙️

Settings are stored in `~/.lazypr` as simple `KEY=VALUE` lines. Manage them via the built-in command:

```bash
# Set a value
lazypr config set KEY=VALUE

# Get a value
lazypr config get KEY
```

Available keys:

- `PROVIDER` (default: `groq`): AI provider to use (`groq` or `cerebras`)
- `GROQ_API_KEY`: Your Groq API key (required when using Groq provider)
- `CEREBRAS_API_KEY`: Your Cerebras API key (required when using Cerebras provider)
- `LOCALE` (default: `en`): One of `en, es, pt, fr, de, it, ja, ko, zh, ru, nl, pl, tr`
- `MAX_RETRIES` (default: `2`): Non-negative integer
- `TIMEOUT` (default: `10000`): Milliseconds
- `MODEL` (default: `llama-3.3-70b`): AI model to use for generating PR content (any model supported by your provider)
- `FILTER_COMMITS` (default: `true`): Enable smart filtering to exclude merge commits, dependency updates, and formatting-only changes
- `CONTEXT`: Custom context to guide AI generation style and tone (max 200 characters)

Examples:

```bash
lazypr config set PROVIDER=cerebras
lazypr config set CEREBRAS_API_KEY=<your-api-key>
lazypr config set LOCALE=es
lazypr config set MAX_RETRIES=3
lazypr config set TIMEOUT=15000
lazypr config set MODEL=llama-3.3-70b
lazypr config set FILTER_COMMITS=false
lazypr config set CONTEXT="make it simple and cohesive"
```

## Smart Commit Filtering 🎯

By default, `lazypr` intelligently filters out noise from your commit history to focus on meaningful changes:

**What gets filtered:**
- **Merge commits:** `Merge branch 'feature' into main`, `Merge pull request #123`
- **Dependency updates:** `chore(deps): update packages`, `Bump lodash from 4.17.20 to 4.17.21`, commits from Dependabot/Renovate
- **Formatting changes:** `run prettier`, `fix formatting`, `eslint fixes`, `style: fix indentation`

**Configuration:**

You can control this behavior globally via config:

```bash
# Disable filtering (include all commits)
lazypr config set FILTER_COMMITS=false

# Enable filtering (default)
lazypr config set FILTER_COMMITS=true
```

Or override it for a single run:

```bash
# Disable filtering for this run only
lazypr --no-filter

# Use with other options
lazypr main --no-filter -t
```

This ensures your PR descriptions focus on actual feature work and bug fixes, making them more relevant and easier to review.

## AI Providers 🤖

`lazypr` supports multiple AI providers. You can switch between them based on your preference:

| Provider | Status | Description |
|----------|--------|-------------|
| [Groq](https://groq.com) | ✅ Available | Fast inference with LPU technology (default) |
| [Cerebras](https://cerebras.ai) | ✅ Available | High-performance AI inference |

### Model Selection

The `MODEL` setting accepts any model name supported by your chosen provider. The default is `llama-3.3-70b` which works well with both Groq and Cerebras. Check your provider's documentation for available models.

## How it works 🧠

1. Verifies you are inside a git repository and not already on the target branch
2. Ensures the target branch exists locally or remotely
3. Collects commits in `HEAD` that are not in the target branch (oldest → newest)
4. Sends commit messages to Groq and generates a title + markdown description
5. Offers an interactive menu to copy the title or description to your clipboard

## PR Templates 📝

`lazypr` automatically detects PR templates in your repository from common locations:

- `.github/pull_request_template.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/pull_request_template/` (directory with multiple templates)
- `.github/PULL_REQUEST_TEMPLATE/` (directory with multiple templates)
- `docs/pull_request_template.md`
- `docs/PULL_REQUEST_TEMPLATE.md`

### Using Templates

When you use the `--template` or `-t` flag, lazypr will:

1. If only one template exists: automatically use it
2. If multiple templates exist: show an interactive selection menu
3. Fill in the template sections based on your commit history
4. Preserve template structure, headers, and checkboxes

> **⚠️ Important Note:** Using PR templates significantly increases the amount of input and output tokens consumed by the GROQ AI API. By using your own API key, you are in control of the API usage—please be careful and monitor your costs accordingly.

You can also specify a template by name or path:

```bash
lazypr -t "Bug Fix"              # by display name
lazypr -t .github/bug_fix.md     # by path
```

The AI will structure the PR description following your template format while incorporating the commit analysis.

## CLI 🛠️

```bash
lazypr [target] [options]

Arguments:
  target                     Target branch name (default: master)

Options:
  -t, --template [name]      Use a PR template from .github folder
                             Omit value to select interactively
  -l, --locale <language>    Set the language for PR content (en, es, pt, fr, de, it, ja, ko, zh, ru, nl, pl, tr)
                             Overrides config setting
  -c, --context <text>       Provide custom context to guide AI generation style and tone
                             (max 200 characters). Overrides config setting
  -u, --usage                Display detailed AI token usage statistics
  --no-filter                Disable smart commit filtering (include merge commits,
                             dependency updates, and formatting changes)
  --gh                       Generate and copy a GitHub CLI (gh pr create) command
                             instead of copying title and description separately
  -V, --version              Output version number
  -h, --help                 Display help
```

## Troubleshooting 🛟

- "Not a git repository" → Run inside a git project
- "Already on target branch 'X'" → Switch to your feature branch before running
- "Branch 'X' doesn't exist" → Ensure the target branch exists locally/remotely
- "No commits found for pull request" → Your branch may have no unique commits
- "Set the GROQ_API_KEY..." → Configure your API key with the config command
- "Couldn't copy to clipboard" → Clipboard access may be restricted in your environment

## Development 🧪

This repo uses Bun for building, but consumers only need Node.js to run the published CLI.

Common scripts:

```bash
# Install deps
bun install

# Dev (runs the TypeScript entry directly)
bun run index.ts

# Build ESM bundle to dist/
bun run build

# Run tests
bun test
```

### Testing 🧪

The project includes comprehensive test coverage for all core functionality:

**Test Structure:**
- `tests/index.test.ts` - CLI integration tests covering:
  - Configuration management (set, get, remove operations)
  - Command-line argument parsing
  - Version and help flags
  - Error handling and validation
  - Edge cases and special characters
  - All supported locales and models
  
- `tests/utils/` - Unit tests for utility modules:
  - `config.test.ts` - Configuration file operations
  - `git.test.ts` - Git repository interactions
  - `provider.test.ts` - AI provider integration and PR generation
  - `info.test.ts` - Information display utilities
  - `labels.test.ts` - Label generation and formatting
  - `template.test.ts` - PR template processing

**Running Tests:**

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run specific test file
bun test tests/utils/config.test.ts
```

**CI/CD:**

Tests run automatically on pull requests via GitHub Actions (see `.github/workflows/test.yml`). The test workflow:
1. Checks out the code
2. Installs Bun and dependencies
3. Runs the full test suite

The test status badge at the top of this README shows the current test status.

## Contributing 🤝

Issues and PRs are welcome. Open one on the repository’s Issues page.

## License 📄

MIT © Raul Carini. See the `LICENSE` file for details.
