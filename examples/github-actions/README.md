# GitHub Actions Examples

Automate PR description generation with these simple workflows.

## Quick Start

### 1. Add API Key to Secrets

Go to your repository **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add: `GROQ_API_KEY` with your API key from [console.groq.com](https://console.groq.com/keys)

### 2. Choose a Workflow

Copy one of the workflow files below to `.github/workflows/` in your repository.

## Available Workflows

### Auto-Update PR ([auto-update-pr.yml](./auto-update-pr.yml))

**What it does:** Updates PR title and description when you push new commits.

**When it runs:**
- PR is opened
- New commits are pushed

**Copy to:** `.github/workflows/auto-update-pr.yml`

```bash
mkdir -p .github/workflows
cp examples/github-actions/auto-update-pr.yml .github/workflows/
git add .github/workflows/auto-update-pr.yml
git commit -m "Add auto-update PR workflow"
git push
```

---

### Auto-Create PR ([auto-create-pr.yml](./auto-create-pr.yml))

**What it does:** Automatically creates a PR when you push to feature branches.

**When it runs:**
- Push to `feature/*` or `fix/*` branches

**Copy to:** `.github/workflows/auto-create-pr.yml`

```bash
mkdir -p .github/workflows
cp examples/github-actions/auto-create-pr.yml .github/workflows/
git add .github/workflows/auto-create-pr.yml
git commit -m "Add auto-create PR workflow"
git push
```

---

### Multi-Provider Fallback ([multi-provider-fallback.yml](./multi-provider-fallback.yml))

**What it does:** Tries Groq first, falls back to Cerebras if it fails.

**When it runs:**
- PR is opened
- New commits are pushed

**Extra setup:** Also add `CEREBRAS_API_KEY` to repository secrets.

**Copy to:** `.github/workflows/multi-provider-fallback.yml`

---

### PR Validation ([pr-validation.yml](./pr-validation.yml))

**What it does:** Checks if PR description is good quality. Suggests improvements if too short.

**When it runs:**
- PR is opened
- PR description is edited

**Copy to:** `.github/workflows/pr-validation.yml`

---

## Customization

### Change Target Branch

Default is to use the PR's base branch. To hardcode:

```yaml
lazypr main  # Change to your branch
```

### Use Different Provider

Change `--provider` flag:

```yaml
env:
  CEREBRAS_API_KEY: ${{ secrets.CEREBRAS_API_KEY }}
run: lazypr --provider cerebras
```

### Include All Commits (No Filtering)

By default, merge commits and dependency updates are filtered out:

```yaml
lazypr --no-filter  # Include everything
```

### Use PR Templates

If you have templates in `.github/PULL_REQUEST_TEMPLATE/`, specify one:

```yaml
lazypr --template feature
```

### Add Context

Provide additional guidance to the AI:

```yaml
lazypr --context "Security fix - please review carefully"
```

## Troubleshooting

### Workflow Not Running

**Check permissions** in the workflow file:
```yaml
permissions:
  pull-requests: write
  contents: read
```

**Check triggers** match your use case:
```yaml
on:
  pull_request:
    types: [opened, synchronize]
```

### API Key Not Found

Make sure the secret name matches:
```yaml
env:
  GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}  # Must match secret name
```

### Can't Find Commits

Ensure full history is fetched:
```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Important!
```

### Permission Denied

Enable workflow permissions:
**Settings** → **Actions** → **General** → **Workflow permissions** → **Read and write permissions**

## Examples

### Combine Multiple Workflows

You can use several workflows together:

```bash
# Auto-update PRs + validate descriptions
.github/workflows/
├── auto-update-pr.yml
└── pr-validation.yml
```

### Manual Trigger

Add manual trigger to any workflow:

```yaml
on:
  pull_request:
    types: [opened, synchronize]
  workflow_dispatch:  # Allows manual trigger
```

Then run from **Actions** tab → Select workflow → **Run workflow**

## Best Practices

1. **Start simple** - Begin with `auto-update-pr.yml`
2. **Test first** - Try in a test repository before production
3. **Use fallback** - Add `multi-provider-fallback.yml` for reliability
4. **Monitor costs** - Check your API usage regularly
5. **Cache when possible** - Avoid regenerating if commits haven't changed

## Support

- Main docs: [README.md](../../README.md)
- CLI examples: [examples/cli/](../cli/)
- Configuration: [examples/config/](../config/)
