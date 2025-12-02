# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [1.3.3] - 2025-12-02

### Added
- **USAGE EXAMPLES:** Added comprehensive examples and configuration files demonstrating LazyPR usage, including CLI commands, GitHub Actions workflows, and multi-provider configuration setups to help users get started quickly.

### Changed
- **DEPENDENCIES:** Updated core dependencies, including bumping the `ai` package version to `5.0.106`, updating the Biome schema to `2.3.8`, and performing general dependency upgrades for improved stability and compatibility.

### Fixed
- **ERROR HANDLING:** Improved the `handleGitError` function to provide more robust and user-friendly error handling for Git-related failures.

## [1.3.2] - 2025-11-27

### Added
- **CODE QUALITY:** Introduced Biome configuration for consistent linting and formatting across the codebase.
- **CI/CD:** Added automated linting step to both npm-publish and test workflows to ensure code quality before execution.

### Changed
- **CODE STRUCTURE:** Reorganized import statements across multiple files for improved readability and maintainability.
- **TEST IMPROVEMENTS:** Enhanced test assertions to handle potential null values in label colors and refined parsing logic for configuration values.

### Fixed
- **CONFIGURATION:** Updated Biome linting rules and improved configuration parsing logic for better reliability.

## [1.3.1] - 2025-11-26

### Added
- **TEST COVERAGE:** Added comprehensive unit tests for the `config list` command to ensure proper functionality and output formatting.
- **TEST COVERAGE:** Added comprehensive unit tests for the `displayConfigBadge` function to validate configuration badge display across various scenarios.

### Changed
- **BUILD PROCESS:** Updated lzp script path in package.json to point to `dist/lzp.js` and added a postbuild script to generate the lzp.js file for improved build automation.
- **CI/CD:** Removed the specified bun version from the npm-publish workflow for improved flexibility.

### Fixed
- **PR GENERATION:** Included finish reason in pull request generation output for better debugging and transparency.
- **VALIDATION:** Updated title validation length constraints to improve generated PR title quality.

## [1.3.0] - 2025-11-24

### Added
- **MULTI-PROVIDER SUPPORT:** Introduced a flexible provider system allowing users to choose between different AI providers. The new `PROVIDER` configuration option supports switching providers seamlessly.
- **CEREBRAS PROVIDER:** Added Cerebras as a new AI provider option alongside Groq. Users can now leverage Cerebras' high-performance AI inference by setting `PROVIDER=cerebras` and configuring their `CEREBRAS_API_KEY`.
- **PROVIDER CONFIGURATION:** Added `CEREBRAS_API_KEY` configuration option for Cerebras authentication.

### Changed
- **MODEL FLEXIBILITY:** Removed hardcoded model restrictions. The `MODEL` setting now accepts any model name supported by your chosen provider, giving users full flexibility.
- **DEFAULT MODEL:** Changed the default model from `openai/gpt-oss-20b` to `llama-3.3-70b` which works well across multiple providers.
- **ARCHITECTURE REFACTOR:** Refactored the AI integration layer from `groq.ts` to a generic `provider.ts` module, enabling easy addition of future providers.

### Documentation
- **README UPDATE:** Updated documentation with multi-provider setup instructions, provider comparison table, and future provider roadmap (OpenAI, Anthropic, Google AI coming soon).

## [1.2.7] - 2025-11-04

### Fixed
- **CRITICAL BUILD FIX:** Fixed a misconfigured file that broke CLI commands in v1.2.6, restoring full functionality. The bin paths in package.json now correctly point to the bundled output.

## [1.2.6] - 2025-11-04

### Added
- **CONFIG LIST COMMAND:** Introduced a new `list` subcommand for configuration management, allowing users to view all current configuration settings with their statuses. Sensitive values (like API keys) are automatically masked for security.

### Fixed
- **BUILD SIZE OPTIMIZATION:** Resolved a build configuration issue that was duplicating files in the distribution bundle, which had doubled the package size. The build process now correctly generates a single, optimized output.

### Changed
- **CI/CD OPTIMIZATION:** Removed the build step from the npm publish workflow, streamlining the deployment process.
- **DEPENDENCIES:** Updated project dependencies to their latest versions.

## [1.2.5] - 2025-10-24

### Added
- **CUSTOM CONTEXT OPTION:** Introduced the ability for users to provide custom context to guide PR generation via the `--context` (`-c`) flag or the `CONTEXT` configuration key. This allows users to influence the tone, style, and structure of the generated PR content (e.g., "make it simple and cohesive", "be more technical"). Context is limited to 200 characters maximum.
- **CONTEXT BADGE DISPLAY:** Added context display to the configuration badge, providing visual confirmation when custom context is being used for PR generation.
- **CONTEXT VALIDATION:** Implemented comprehensive validation and testing for the new CONTEXT configuration option to ensure length constraints and proper integration.

### Changed
- **BADGE REFACTOR:** Refactored badge display logic to only show enabled settings, providing a cleaner and more focused configuration summary before PR generation.

## [1.2.4] - 2025-10-17

### Added
- **MODEL BADGE:** Added model name display to the configuration badge shown before PR generation, providing better visibility of which AI model is being used.

### Changed
- **REFACTOR:** Replaced `noFilter` option with clearer `filter` parameter for improved code clarity and consistency.
- **DEPENDENCIES:** Updated dependencies to latest versions in package.json and bun.lock.

### Fixed
- **CI/CD:** Corrected npm publish command in workflow to use `bunx` and removed redundant 'public' flag.
- **CI/CD:** Updated npm publish workflow to include provenance flag and adjusted dependency installation.

## [1.2.3] - 2025-10-10

### Fixed
- **TESTING & CODE ALIGNMENT:** Addressed minor issues in test files and logic:
    - Replaced backtick strings with plain strings in tests and removed unnecessary imports (`mock` from `bun:test`).
    - Updated color access to use named constants (`LABEL_COLORS.bug`, etc.) instead of array indexing.
    - Corrected parameter usage when defaulting to the `DEFAULT_BRANCH` to align with the renamed `target` argument.

### Changed
- **PERFORMANCE:** Achieved a significant reduction in the overall package size from **526 KB to 370 KB**, representing a massive **35% reduction**.
- **DEPENDENCIES:** Bumped the versions for the `ai` and `zod` dependencies.
- **INTERNAL REFACTOR:** Cleaned up and improved the internal parsing and error handling logic within utility files.

## [1.2.2] - 2025-10-06

### Note

- **RE-RELEASE:** This version is a direct re-publication of the changes introduced in **v1.2.1**. It was released to resolve a distribution issue with the `v1.2.1` package on the npm registry. No new code changes were introduced in this release.

## [1.2.1] - 2025-10-06

### Security

- **PREVENTED COMMAND INJECTION (GIT):** Patched a potential command injection vulnerability by replacing all instances of the insecure `child_process.exec` with the safer `child_process.execFile` for executing Git commands, fully eliminating the reliance on shell interpretation.

### Fixed

- **TEMPLATE HASHING RELIABILITY:** Improved template content hashing to significantly reduce collisions. The new hash now uses a multi-part strategy combining the total length and specific content slices (first 200, middle 100, and last 100 characters).
- **CONFIG EXIT CODE:** The command-line interface (CLI) now correctly exits with a non-zero status code (`1`) when a configuration error occurs, ensuring better pipeline and script integration.

### Changed

- **PROJECT MAINTENANCE:** Updated project metadata (`description`, `author`) in `package.json` and removed deprecated scripts (`test`, `test:watch`, `build:standalone`).
- **DOCUMENTATION:** Updated the README to reflect the current test and CI setup and removed the obsolete section detailing the standalone binary build process.

## [1.2.0] - 2025-10-05

### Added

- **GITHUB CLI INTEGRATION:** Introduced the `--gh` flag to automatically generate a complete `gh pr create` command using the AI-generated title, description, and labels. This command is then copied to the clipboard, streamlining the process for users who deploy PRs with the GitHub CLI.
- **SMART COMMIT FILTERING:** Implemented intelligent commit filtering to improve the quality of AI-generated content.
    - Commits deemed low-value (e.g., `docs:`, `test:`, `chore:`) are now excluded from the prompt sent to the AI.
    - Added the `FILTER_COMMITS` configuration option (default `true`) and the `--no-filter` CLI flag to disable this feature.
- **PULL REQUEST LABEL MANAGEMENT:** The AI is now capable of suggesting and generating a core set of labels (`enhancement`, `bug`, `documentation`) based on the changes in the commits, which are included in the generated output and the new `gh pr create` command.
- **ENHANCED VISUALS & UX:** Improved the command-line user experience with colorization:
    - Colorized the intro banner and branch names in log output.
    - Added colored formatting for the new PR labels in the console output.

### Changed

- **PR MESSAGE FORMATTING:**
    - Removed emojis from the AI-generated Pull Request titles and descriptions.
    - Added a standard "Review Reminder" boilerplate to the bottom of the generated PR message.
- **CI/CD:** Updated the NPM publish script to include a mandatory test step and removed the push-based trigger from the pipeline.

## [1.1.0] - 2025-10-02

### Added

- **PULL REQUEST TEMPLATE INTEGRATION:** Implemented full support for standard Git repository templates (`PULL_REQUEST_TEMPLATE.md`). The AI now automatically detects and uses the structure and content of this template to format the generated PR description, allowing users to enforce consistent and custom documentation standards. ([#7](https://github.com/R4ULtv/lazypr/pull/7))
- **AI USAGE REPORTING:** Introduced transparent API token usage reporting. After the PR is successfully generated, the CLI now displays the total number of **prompt tokens** and **completion tokens** consumed, providing users with better visibility into API costs. ([#8](https://github.com/R4ULtv/lazypr/pull/8))
- **MULTILINGUAL SUPPORT (LOCALE FLAG):** Added the optional `--locale` (`-l`) flag to the main command. This allows users to explicitly request that the AI generate the PR title and description in a specified language (e.g., Italian, Spanish, German), enabling localized output. ([#9](https://github.com/R4ULtv/lazypr/pull/9))

### Security

- **PREVENTED COMMAND INJECTION:** Patched a security vulnerability by replacing the insecure `child_process.exec` with `child_process.execFile` in the `getPullRequestCommits` function. This prevents shell interpretation of commands, mitigating potential **command injection** risks.
    - Added an integration test to safely handle branch names containing special shell characters, confirming the fix. ([e108786](https://github.com/R4ULtv/lazypr/commit/e108786e5d3f2daa64947b2f0059f95a947ea24d))

## [1.0.4] - 2025-09-30

### Added

- **COMPREHENSIVE TEST SUITE:** Introduced a comprehensive test suite (Bun) for core utilities and CLI commands, covering configuration parsing, Git helpers, information utilities, and GROQ PR generation logic. This significantly improves code reliability and prevents future regressions. ([#6](https://github.com/R4ULtv/lazypr/pull/6))

### Fixed

- **PR FETCH RELIABILITY:** Updated the pull request commit fetching logic to gracefully handle Git errors (such as a non-existent target branch) by returning an empty array (`[]`) instead of throwing an error. This prevents unexpected crashes during PR generation. ([30edcdf](https://github.com/R4ULtv/lazypr/commit/30edcdf))

## [1.0.3] - 2025-09-29

### Added

- **CONFIG REMOVE OPTION:** Added the `remove` subcommand to the `config` command, allowing users to easily delete a configured key from the `.lazypr` file. ([e1c5318](https://github.com/R4ULtv/lazypr/commit/e1c5318))

### Changed

- **UX/DEPENDENCY MIGRATION:** Migrated the entire interactive prompt system from legacy libraries (like `Inquirer`) to **`@clack/prompts`** for a modern, consistent, and performant command-line user experience. ([#5](https://github.com/R4ULtv/lazypr/pull/5))
    - **Performance:** This migration resulted in a reduction of the overall package bundle size by approximately **5%** (from 545 KB to 517 KB).
    - Implemented the Clack timer spinner for real-time feedback during long operations (e.g., waiting for AI generation).

## [1.0.2] - 2025-09-28

### Changed

- **PR DESCRIPTION QUALITY:** Increased the minimum length requirement for the generated Pull Request description to **100 characters**. This enforces a higher standard of detail and quality for the AI-generated content.

## [1.0.1] - 2025-09-28

### Added

- **CUSTOM MODEL CONFIG:** Introduced a new `MODEL` configuration option in the config file (`.lazypr`). This allows users to specify and use custom large language models (LLMs) for pull request generation. ([#3](https://github.com/R4ULtv/lazypr/pull/3))

## [1.0.0] - 2025-09-27

Initial public release of `lazypr`.

### Added

- **CORE FUNCTIONALITY:** Initial project setup, command-line interface (CLI) structure, and core functionality for generating Pull Request titles and descriptions from Git commit history using AI.
