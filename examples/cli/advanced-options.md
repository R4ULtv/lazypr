# Advanced CLI Options

lazypr intentionally uses one model, Qwen 3.8 27B, so provider choice does not change the prompt-tuning target.

## Provider selection

Groq is the default and supports the model now:

```bash
lazypr config set GROQ_API_KEY=your-key
lazypr config set PROVIDER=groq
```

Cerebras runs the same fixed model:

```bash
lazypr config set CEREBRAS_API_KEY=your-key
lazypr config set PROVIDER=cerebras
```

Groq advertises roughly 450+ output tokens/s for this model, while Cerebras advertises roughly 1,500 tokens/s. These are approximate provider figures rather than lazypr benchmarks, and actual throughput varies by request and network conditions.

The interactive `lazypr config` menu provides the same settings without exposing API keys in shell history.

## Commit filtering

Merge commits, dependency updates, and formatting-only changes are filtered by default. Include every commit for one run with:

```bash
lazypr --no-filter
```

Or disable filtering persistently:

```bash
lazypr config set FILTER_COMMITS=false
```

## Context and locale

```bash
lazypr --context "Highlight the migration and breaking changes"
lazypr --locale it
lazypr develop --locale fr --context "Focus on reviewer impact"
```

Supported locale codes are `en`, `es`, `pt`, `fr`, `de`, `it`, `ja`, `ko`, `zh`, `ru`, `nl`, `pl`, and `tr`.

## Templates

```bash
lazypr --template
lazypr --template feature
lazypr --template .github/PULL_REQUEST_TEMPLATE/bug_fix.md
```

Templates may include GitHub YAML frontmatter. lazypr ignores that frontmatter and preserves the remaining section order, headings, checkboxes, and formatting.

## Reliability settings

```bash
lazypr config set MAX_RETRIES=5
lazypr config set TIMEOUT=60000
```

`MAX_RETRIES` is the number of additional attempts after the first request. `TIMEOUT` applies to each request in milliseconds.

## GitHub CLI output

Generate a shell-safe `gh pr create` command:

```bash
lazypr main --gh
```

## Combined example

```bash
lazypr main \
  --template production \
  --context "Call out the API v2 migration" \
  --locale en \
  --usage
```
