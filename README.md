# lazypr

[![version](https://img.shields.io/npm/v/lazypr.svg)](https://www.npmjs.com/package/lazypr)
[![license](https://img.shields.io/github/license/r4ultv/lazypr.svg)](https://github.com/r4ultv/lazypr/blob/main/LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D20.0-43853d?logo=node.js&logoColor=white)](https://nodejs.org)

AI-powered CLI that turns your git commits into a polished pull request title and description.

## What is it? ℹ️

`lazypr` analyzes your current branch's commits against a target branch and generates a concise, professional PR title and a markdown description. It also lets you copy either (or both) to your clipboard with a simple interactive prompt.

## Features ✨

- **AI summarization:** Uses the Groq AI SDK to synthesize clear PR context from commits
- **Concise titles + markdown descriptions:** Enforces length and style requirements
- **Clipboard integration:** Copy title or description right from the prompt
- **Alias included:** Use `lzp` as a short command
- **Configurable locale:** Output language via `LOCALE` (en, es, pt, fr, de, it, ja, ko, zh)
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

1) Set your Groq API key

```bash
lazypr config set GROQ_API_KEY=<your-api-key>
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

## Configuration ⚙️

Settings are stored in `~/.lazypr` as simple `KEY=VALUE` lines. Manage them via the built-in command:

```bash
# Set a value
lazypr config set KEY=VALUE

# Get a value
lazypr config get KEY
```

Available keys:

- `GROQ_API_KEY` (required): Your Groq API key
- `LOCALE` (default: `en`): One of `en, es, pt, fr, de, it, ja, ko, zh`
- `MAX_RETRIES` (default: `2`): Non-negative integer
- `TIMEOUT` (default: `10000`): Milliseconds

Examples:

```bash
lazypr config set LOCALE=es
lazypr config set MAX_RETRIES=3
lazypr config set TIMEOUT=15000
```

## How it works 🧠

1. Verifies you are inside a git repository and not already on the target branch
2. Ensures the target branch exists locally or remotely
3. Collects commits in `HEAD` that are not in the target branch (oldest → newest)
4. Sends commit messages to Groq and generates a title + markdown description
5. Offers an interactive menu to copy the title or description to your clipboard

## CLI 🛠️

```bash
lazypr [target]

Options:
  target   Target branch name (default: master)
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

# Build a standalone binary (experimental)
bun run build:standalone
```

## Contributing 🤝

Issues and PRs are welcome. Open one on the repository’s Issues page.

## License 📄

MIT © Raul Carini. See the `LICENSE` file for details.