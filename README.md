# lazypr

[![version](https://img.shields.io/npm/v/lazypr.svg)](https://www.npmjs.com/package/lazypr)
[![license](https://img.shields.io/github/license/r4ultv/lazypr.svg)](https://github.com/r4ultv/lazypr/blob/main/LICENSE)

AI-powered CLI tool that automatically generates pull request titles and descriptions from your git commits.

## Description

`lazypr` is a command-line interface (CLI) tool designed to streamline your pull request workflow. It leverages the power of AI to analyze your git commits and automatically generate a concise and informative title and description for your pull request.

Say goodbye to manually summarizing your changes and let `lazypr` do the heavy lifting for you.

## Installation

You can install `lazypr` globally using your favorite package manager:

```bash
# Using bun
bun install -g lazypr

# Using npm
npm install -g lazypr

# Using yarn
yarn global add lazypr
```

## Configuration

Before you can start using `lazypr`, you need to configure your Groq API key. You can do this with the `config` command:

```bash
lazypr config set GROQ_API_KEY=<your-api-key>
```

You can verify that the key has been set correctly by running:

```bash
lazypr config get GROQ_API_KEY
```

## Usage

Once `lazypr` is installed and configured, you can generate a pull request summary by running the following command in your project's directory:

```bash
lazypr
```

or the shorter alias:

```bash
lzp
```

By default, `lazypr` will compare your current branch with the `master` branch. If you want to specify a different target branch, you can pass it as an argument:

```bash
lazypr <target-branch>
```

The tool will then analyze the commits between your current branch and the target branch, generate a pull request title and description, and give you the option to copy them to your clipboard.

## Features

- **AI-Powered Summarization:** Utilizes the Groq AI SDK to intelligently summarize your git commits.
- **Automatic Title and Description Generation:** Creates clear and descriptive titles and descriptions for your pull requests in seconds.
- **Clipboard Integration:** Easily copy the generated title, description, or both to your clipboard.
- **Custom Target Branch:** Specify any branch as the target for your pull request.
- **Configuration Management:** Securely store and manage your API keys.
- **Streamlined Workflow:** Saves you time and mental energy during the pull request creation process.

## Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue on the [GitHub repository](https://github.com/r4ultv/lazypr/issues).

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/r4ultv/lazypr/blob/main/LICENSE) file for details.