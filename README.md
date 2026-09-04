![lazypr](./assets/og-image.webp)

[![test status](https://img.shields.io/github/actions/workflow/status/R4ULtv/lazypr/test.yml?branch=main)](https://github.com/R4ULtv/lazypr/actions/workflows/test.yml)
[![npm version](https://img.shields.io/npm/v/lazypr.svg)](https://www.npmjs.com/package/lazypr)
[![license](https://img.shields.io/github/license/R4ULtv/lazypr.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22.0-43853d?logo=node.js&logoColor=white)](https://nodejs.org)

Generate clean pull request titles, descriptions, and labels from your Git history.

> [!IMPORTANT]
> **Version 2 is a breaking release.** OpenAI, Google Gemini, custom endpoints, and custom models are no longer supported. lazypr now focuses on Qwen 3.8 27B through Groq and Cerebras so its prompts and output validation can be tuned for one model.
>
> Need the previous behavior? See the [`v1` branch](https://github.com/R4ULtv/lazypr/tree/v1) or the latest v1 release, [`v1.6.2`](https://github.com/R4ULtv/lazypr/releases/tag/v1.6.2). Install it with `npm install -g lazypr@1.6.2`. Version 1 is no longer maintained.

lazypr reads the commits between your current branch and its target branch. It generates structured PR content, validates it locally with Zod, and lets you copy the result or create a ready-to-run GitHub CLI command.

## Install

Requires Node.js 22 or newer, Git, and a Groq or Cerebras API key.

```bash
npm install -g lazypr
```

Both `lazypr` and the shorter `lzp` command are available.

## Quick start

Open the guided configuration menu and enter your API key:

```bash
lazypr config
```

From a feature branch, generate a PR against `main`:

```bash
lazypr
```

Pass another target branch when needed:

```bash
lazypr develop
```

Always review AI-generated content before publishing it.

## Providers

Both providers run the same tuned model but use different API model IDs.

| Provider                               | Model ID           | Advertised speed | API key            |
| -------------------------------------- | ------------------ | ---------------- | ------------------ |
| [Groq](https://console.groq.com/keys)  | `qwen/qwen3.8-27b` | ~450+ tokens/s   | `GROQ_API_KEY`     |
| [Cerebras](https://cloud.cerebras.ai/) | `qwen-3.8-27b`     | ~1,500 tokens/s  | `CEREBRAS_API_KEY` |

Speeds are approximate provider claims, not lazypr benchmarks.

Switch providers from the configuration menu or directly:

```bash
lazypr config set PROVIDER=cerebras
```

## Usage

```text
lazypr [target] [options]
```

| Option                    | Description                                                 |
| ------------------------- | ----------------------------------------------------------- |
| `-t, --template [name]`   | Use a PR template, selecting one interactively when unnamed |
| `-u, --usage`             | Show token usage                                            |
| `-l, --locale <language>` | Override the output language                                |
| `--no-filter`             | Include commits normally removed by smart filtering         |
| `--gh`                    | Generate a `gh pr create` command                           |
| `-c, --context <text>`    | Add generation guidance for this run                        |

Examples:

```bash
lazypr develop --no-filter
lazypr --locale it --context "Focus on user-facing changes"
lazypr --template bug_fix --usage
lazypr main --gh
```

Run `lazypr --help` for the complete command reference.

## Configuration

Use `lazypr config` for interactive setup. API keys are masked and do not appear in shell history.

Configuration can also be managed directly:

```bash
lazypr config list
lazypr config get PROVIDER
lazypr config set LOCALE=it
lazypr config set "CONTEXT=Keep the description concise"
lazypr config remove CONTEXT
```

> API keys passed to `lazypr config set` may remain in shell history. Prefer the interactive menu for secrets.

Settings are stored in `~/.lazypr` as `KEY=value` entries.

| Key                | Default | Purpose                                        |
| ------------------ | ------- | ---------------------------------------------- |
| `PROVIDER`         | `groq`  | `groq` or `cerebras`                           |
| `GROQ_API_KEY`     | empty   | Groq authentication                            |
| `CEREBRAS_API_KEY` | empty   | Cerebras authentication                        |
| `DEFAULT_BRANCH`   | `main`  | Default target branch                          |
| `LOCALE`           | `en`    | Generated content language                     |
| `FILTER_COMMITS`   | `true`  | Filter merge, dependency, and formatting noise |
| `CONTEXT`          | empty   | Persistent guidance, up to 200 characters      |
| `CUSTOM_LABELS`    | empty   | Additional comma-separated labels              |
| `MAX_RETRIES`      | `2`     | Additional request attempts                    |
| `TIMEOUT`          | `10000` | Per-request timeout in milliseconds            |

Supported locales: `en`, `es`, `pt`, `fr`, `de`, `it`, `ja`, `ko`, `zh`, `ru`, `nl`, `pl`, and `tr`.

## Templates and filtering

lazypr discovers GitHub PR templates in `.github` and `docs`. Use `--template` to select one or pass its name or path:

```bash
lazypr --template
lazypr --template feature
lazypr --template .github/PULL_REQUEST_TEMPLATE/bug_fix.md
```

Smart filtering removes common merge, dependency-update, and formatting-only commits. Use `--no-filter` if it excludes meaningful work.

Generation uses branch names, commit messages, optional context, and the selected template. It does not inspect repository source files.

## GitHub CLI

With [GitHub CLI](https://cli.github.com/) installed and authenticated, generate a shell-safe PR creation command:

```bash
lazypr main --gh
```

lazypr copies the command for you to review and run; it never executes it automatically.

## More examples

See [`examples`](./examples/) for CLI recipes, configuration files, and GitHub Actions workflows.

For bugs and feature requests, [open an issue](https://github.com/R4ULtv/lazypr/issues).

## Development

```bash
bun install
bun test
bun run lint
bun run format
bun run build
```

See [CLAUDE.md](./CLAUDE.md) for repository architecture and contributor guidance.

## License

[MIT](./LICENSE) © Raul Carini
