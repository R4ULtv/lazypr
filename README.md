[![lazypr](https://lazypr.raulcarini.dev/og-image.webp)](https://lazypr.raulcarini.dev)

[![test status](https://img.shields.io/github/actions/workflow/status/r4ultv/lazypr/test.yml)](https://github.com/r4ultv/lazypr/actions/workflows/test.yml)
[![version](https://img.shields.io/npm/v/lazypr.svg)](https://www.npmjs.com/package/lazypr)
[![license](https://img.shields.io/github/license/r4ultv/lazypr.svg)](https://github.com/r4ultv/lazypr/blob/main/LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20.0-43853d?logo=node.js&logoColor=white)](https://nodejs.org)

Generate clean, consistent PRs from commits - powered by AI and your git history.

> 📖 **[Full Documentation](https://lazypr.raulcarini.dev/docs/what-is-lazypr)**

## Features ✨

- **Multi-provider AI:** [Groq, Cerebras, and OpenAI-compatible APIs](https://lazypr.raulcarini.dev/docs/config/providers)
- **Smart commit filtering:** [Excludes noise commits](https://lazypr.raulcarini.dev/docs/advanced/commit-filtering)
- **PR template support:** [Use your existing templates](https://lazypr.raulcarini.dev/docs/usage/templates)
- **GitHub CLI integration:** [Generate `gh pr create` commands](https://lazypr.raulcarini.dev/docs/usage/github-integration)
- **Multilingual:** [12+ languages supported](https://lazypr.raulcarini.dev/docs/advanced/multilingual)
- **Custom context:** [Guide AI generation style](https://lazypr.raulcarini.dev/docs/advanced/context-guidance)

## Installation 📦

```bash
npm install -g lazypr
```

Requires Node.js >= 20. **[See installation guide →](https://lazypr.raulcarini.dev/docs/installation)**

## Quick start ⚡

1. **Set your API key:**
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

```bash
lazypr config set KEY=VALUE    # Set configuration
lazypr config get KEY          # Get configuration
```

**Common settings:**
- `PROVIDER` - AI provider (`groq`, `cerebras`, or `openai`)
- `LOCALE` - Output language (`en`, `es`, `pt`, `fr`, etc.)
- `MODEL` - AI model to use
- `FILTER_COMMITS` - Smart commit filtering
- `CONTEXT` - Custom guidance for AI generation
- `OPENAI_BASE_URL` - Custom endpoint for OpenAI-compatible APIs

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

Uses Bun for development, Node.js >= 20 for runtime.

## Contributing 🤝

Issues and PRs are welcome. Open one on the repository’s Issues page.

## License 📄

MIT © Raul Carini. See the `LICENSE` file for details.
