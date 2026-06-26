[![lazypr](https://lazypr.raulcarini.dev/og-image.webp)](https://lazypr.raulcarini.dev)

[![test status](https://img.shields.io/github/actions/workflow/status/r4ultv/lazypr/test.yml)](https://github.com/r4ultv/lazypr/actions/workflows/test.yml)
[![version](https://img.shields.io/npm/v/lazypr.svg)](https://www.npmjs.com/package/lazypr)
[![license](https://img.shields.io/github/license/r4ultv/lazypr.svg)](https://github.com/r4ultv/lazypr/blob/main/LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22.0-43853d?logo=node.js&logoColor=white)](https://nodejs.org)

Generate clean, consistent PRs from commits - powered by AI and your git history.

> 📖 **[Full Documentation](https://lazypr.raulcarini.dev/docs/what-is-lazypr)**

## Features ✨

- **Multi-provider AI:** [Groq, Cerebras, Google Gemini, and OpenAI-compatible APIs](https://lazypr.raulcarini.dev/docs/config/providers)
- **Smart commit filtering:** [Excludes noise commits](https://lazypr.raulcarini.dev/docs/advanced/commit-filtering)
- **PR template support:** [Use your existing templates](https://lazypr.raulcarini.dev/docs/usage/templates)
- **GitHub CLI integration:** [Generate `gh pr create` commands](https://lazypr.raulcarini.dev/docs/usage/github-integration)
- **Multilingual:** [12+ languages supported](https://lazypr.raulcarini.dev/docs/advanced/multilingual)
- **Custom context:** [Guide AI generation style](https://lazypr.raulcarini.dev/docs/advanced/context-guidance)

## Installation 📦

```bash
npm install -g lazypr
```

Requires Node.js >= 22. **[See installation guide →](https://lazypr.raulcarini.dev/docs/installation)**

## Quick start ⚡

1. **Configure interactively (recommended for first-time setup):**

   ```bash
   lazypr config
   ```

   This opens a guided menu where you can pick provider + model together and enter your API key with masked input (never echoed to terminal or shell history).

   **Or use scriptable commands for CI/dotfiles:**

   ```bash
   lazypr config set GROQ_API_KEY=<your-key>
   ```

2. **Generate a PR:**
   ```bash
   lazypr              # compares against main
   lzp                 # short alias
   lazypr develop      # compare against different branch
   ```

**[Complete quick start guide →](https://lazypr.raulcarini.dev/docs/quick-start)** | **[Usage examples →](https://lazypr.raulcarini.dev/docs/examples/cli-usage)**

## Configuration ⚙️

lazypr supports two configuration flows that work alongside each other:

### Interactive (recommended for setup)

```bash
lazypr config          # opens a Clack-powered interactive menu
```

The interactive menu lets you:

- **Pick provider + model together** with a combined selector (Groq, Cerebras, Google, OpenAI, or custom/local)
- **Enter API keys with masked input** — keys are never echoed to the terminal or shell history
- Configure locale, default branch, context, commit filtering, custom labels, retries, and timeout
- View the current config with secrets masked

### Scriptable (CI and dotfiles)

```bash
lazypr config set KEY=VALUE    # Set configuration
lazypr config get KEY          # Get configuration
lazypr config remove KEY       # Remove configuration key
lazypr config list             # Show all settings
```

**Examples:**

```bash
# Set API keys (key is visible in shell history — use interactive flow to avoid this)
lazypr config set GROQ_API_KEY=<key>

# Switch provider and model
lazypr config set PROVIDER=google
lazypr config set MODEL=gemini-2.5-flash

# Use a local/custom model with OpenAI-compatible API
lazypr config set PROVIDER=openai
lazypr config set OPENAI_BASE_URL=http://localhost:11434/v1
lazypr config set MODEL=llama3.2

# View config
lazypr config list
```

**Common settings:**

- `PROVIDER` - AI provider (`groq`, `cerebras`, `google`, or `openai`)
- `GROQ_API_KEY` / `CEREBRAS_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` / `OPENAI_API_KEY` - API keys
- `LOCALE` - Output language (`en`, `es`, `pt`, `fr`, etc.)
- `MODEL` - AI model to use (any non-empty string; custom/local model IDs supported)
- `FILTER_COMMITS` - Smart commit filtering (`true` or `false`)
- `CONTEXT` - Custom guidance for AI generation
- `OPENAI_BASE_URL` - Custom endpoint for OpenAI-compatible APIs (Ollama, LM Studio, etc.)

**[View all settings →](https://lazypr.raulcarini.dev/docs/config/settings)** | **[Configuration examples →](https://lazypr.raulcarini.dev/docs/examples/configuration)**

## Advanced Features

- **[Smart Commit Filtering](https://lazypr.raulcarini.dev/docs/advanced/commit-filtering)** - Automatically excludes merge commits, dependency updates, and formatting changes
- **[PR Templates](https://lazypr.raulcarini.dev/docs/usage/templates)** - Use your existing `.github` templates
- **[GitHub CLI Integration](https://lazypr.raulcarini.dev/docs/usage/github-integration)** - Generate `gh pr create` commands
- **[Multilingual Support](https://lazypr.raulcarini.dev/docs/advanced/multilingual)** - 12+ languages available
- **[Context Guidance](https://lazypr.raulcarini.dev/docs/advanced/context-guidance)** - Customize AI generation style
- **[GitHub Actions](https://lazypr.raulcarini.dev/docs/examples/github-actions)** - Automate PR generation in CI/CD
- **[OpenAI-Compatible APIs](https://lazypr.raulcarini.dev/docs/config/providers)** - Use local providers (Ollama, LM Studio) or third-party services

## CLI Reference

```bash
lazypr [target] [options]

Options:
  -t, --template [name]      Use a PR template
  -l, --locale <language>    Output language
  -c, --context <text>       Custom AI guidance
  --gh                       Generate gh pr create command
  --no-filter                Disable smart filtering
  -u, --usage                Show token usage
  -h, --help                 Display help
```

**[View complete CLI reference →](https://lazypr.raulcarini.dev/docs/usage/basic-commands)**

## Development

```bash
bun install      # Install dependencies
bun test         # Run tests
bun run build    # Build for production
```

Uses Bun for development, Node.js >= 22 for runtime.

## Contributing 🤝

Issues and PRs are welcome. Open one on the repository’s Issues page.

## License 📄

MIT © Raul Carini. See the `LICENSE` file for details.
