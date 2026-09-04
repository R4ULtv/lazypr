# Basic CLI Usage

## Configure lazypr

Open the guided configuration menu:

```bash
lazypr config
```

Or configure Groq directly:

```bash
lazypr config set GROQ_API_KEY=your-key
lazypr config set PROVIDER=groq
```

lazypr always uses Qwen 3.8 27B. To run it through Cerebras instead:

```bash
lazypr config set CEREBRAS_API_KEY=your-key
lazypr config set PROVIDER=cerebras
```

## Generate a pull request

Generate against the default `main` branch:

```bash
lazypr
```

Target another branch:

```bash
lazypr develop
```

lazypr reads the commits in `target..HEAD`, generates a title, Markdown description, and labels, then offers to copy the result.

## Common options

```bash
# Choose a repository template
lazypr --template
lazypr --template feature

# Generate in another language
lazypr --locale it

# Add one-run guidance
lazypr --context "Focus on the user-facing changes"

# Include commits normally removed as noise
lazypr --no-filter

# Show token usage
lazypr --usage

# Build a gh pr create command
lazypr --gh
```

## Typical workflow

```bash
git switch -c feature/add-dark-mode
# Make and commit changes.
lazypr main
```

Review the generated content before publishing it; commit messages are the source of truth, so vague commits produce less specific PR descriptions.

## Troubleshooting

If lazypr cannot find commits, inspect the same range directly:

```bash
git log main..HEAD --oneline
```

If every commit was filtered, retry with `lazypr --no-filter`. If a request times out, increase `TIMEOUT`:

```bash
lazypr config set TIMEOUT=30000
```
