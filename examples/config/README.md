# Configuration Examples

This directory contains example configuration files for lazypr.

## Configuration File Location

LazyPR reads configuration from `~/.lazypr` in your home directory.

```bash
# View your config file location
echo ~/.lazypr

# Linux/macOS
~/.lazypr

# Windows
C:\Users\YourUsername\.lazypr
```

## Available Configurations

### 1. Minimal Configuration ([minimal.conf](./minimal.conf))

The simplest setup to get started.

**Contains:**
- API key only
- Uses all default settings

**Best for:**
- First-time users
- Quick setup
- Personal projects

**Setup:**
```bash
cp examples/config/minimal.conf ~/.lazypr
# Edit ~/.lazypr and add your API key
```

### 2. Team Configuration ([team.conf](./team.conf))

Standardized configuration for team environments.

**Contains:**
- Both Groq and Cerebras API keys
- Team defaults (branch, locale, filtering)
- Standard context message
- Reliability settings (retries, timeout)

**Best for:**
- Team environments
- Consistent PR standards
- Shared conventions

**Setup:**
```bash
cp examples/config/team.conf ~/.lazypr
# Edit ~/.lazypr and add your API keys
# Share this config template with your team
```

### 3. Multi-Provider Configuration ([multi-provider.conf](./multi-provider.conf))

Configuration supporting multiple AI providers with easy switching.

**Contains:**
- Multiple provider API keys
- Provider-specific model settings
- Usage notes for switching
- Fallback strategy guidance

**Best for:**
- Production environments
- High-availability requirements
- Cost optimization
- Rate limit management

**Setup:**
```bash
cp examples/config/multi-provider.conf ~/.lazypr
# Edit ~/.lazypr and add your API keys
```

## Configuration Management

### Using the CLI

```bash
# View all configuration
lazypr config list

# Set a value
lazypr config set PROVIDER cerebras

# Get a specific value
lazypr config get PROVIDER

# Remove a value (revert to default)
lazypr config remove PROVIDER
```

### Manually Editing

```bash
# Open config file in your editor
vim ~/.lazypr
nano ~/.lazypr
code ~/.lazypr
```

Config file format:
```
KEY=value
ANOTHER_KEY=another value
```

## Configuration Keys

### Required

| Key | Description | Example |
|-----|-------------|---------|
| `GROQ_API_KEY` or `CEREBRAS_API_KEY` | API key for AI provider | `gsk_...` |

### Provider Settings

| Key | Default | Description | Example |
|-----|---------|-------------|---------|
| `PROVIDER` | `groq` | AI provider to use | `groq`, `cerebras` |
| `MODEL` | `llama-3.3-70b-versatile` | Model to use | `llama-3.1-8b-instant` |

### Git Settings

| Key | Default | Description | Example |
|-----|---------|-------------|---------|
| `DEFAULT_BRANCH` | `master` | Default target branch | `main`, `develop`, `master` |

### Generation Settings

| Key | Default | Description | Example |
|-----|---------|-------------|---------|
| `LOCALE` | `en` | Language for PR description | `en`, `es`, `fr`, `ja` |
| `FILTER_COMMITS` | `true` | Filter out noise commits | `true`, `false` |
| `CONTEXT` | _(empty)_ | Additional context for AI | `Security fix` |

### Advanced Settings

| Key | Default | Description | Example |
|-----|---------|-------------|---------|
| `MAX_RETRIES` | `3` | Number of retry attempts | `5` |
| `TIMEOUT` | `30000` | Timeout in milliseconds | `60000` |

## Configuration Validation

LazyPR validates configuration values when you set them:

```bash
# Valid
lazypr config set PROVIDER groq
# ✓ Set PROVIDER=groq

# Invalid
lazypr config set PROVIDER invalid
# ✗ Error: PROVIDER must be one of: groq, cerebras
```

### Validation Rules

- `PROVIDER`: Must be `groq` or `cerebras`
- `MODEL`: Any string (provider-specific validation)
- `DEFAULT_BRANCH`: Any string
- `LOCALE`: Any string (2-letter codes recommended)
- `FILTER_COMMITS`: Must be `true` or `false`
- `CONTEXT`: Any string
- `MAX_RETRIES`: Must be a positive number
- `TIMEOUT`: Must be a positive number (milliseconds)

## Environment Variables

You can override config values with environment variables:

```bash
# Override provider
GROQ_API_KEY=xxx lazypr

# Override multiple values
PROVIDER=cerebras MODEL=llama-3.1-8b-instant lazypr
```

Environment variables take precedence over config file values.

## Team Configuration Best Practices

### 1. Share Configuration Template

Create a team config template in your repository:

```bash
# In your repo
mkdir -p .github/lazypr
cp ~/.lazypr .github/lazypr/team-config.example

# Remove sensitive data
sed -i 's/API_KEY=.*/API_KEY=your-api-key-here/g' .github/lazypr/team-config.example

# Commit to repo
git add .github/lazypr/team-config.example
git commit -m "Add lazypr team configuration template"
```

### 2. Document Team Standards

Create a team document explaining:
- Which provider to use (Groq/Cerebras)
- Default branch naming convention
- Commit filtering preferences
- When to use different models

Example `LAZYPR.md`:
```markdown
# Team LazyPR Standards

## Configuration
- Provider: Groq (free tier)
- Model: llama-3.3-70b-versatile
- Default branch: main
- Filtering: Enabled

## When to Use
- All PRs should have AI-generated descriptions
- Run `lazypr` before creating PR
- Update PR description when adding significant commits

## Setup
1. Copy team config: `cp .github/lazypr/team-config.example ~/.lazypr`
2. Add your API key: `lazypr config set GROQ_API_KEY "your-key"`
3. Verify: `lazypr config list`
```

### 3. Use CI/CD for Consistency

Add GitHub Actions to auto-generate PR descriptions:
- See [github-actions examples](../github-actions/)
- Ensures all PRs have consistent descriptions
- Reduces manual work

### 4. Personal Overrides

Team members can override settings locally:

```bash
# Team uses English, but I prefer Spanish
lazypr config set LOCALE es

# Team uses Groq, but I prefer Cerebras
lazypr config set PROVIDER cerebras
```

## Configuration Migrations

### From v1.x to v2.x

If configuration format changes in future versions:

```bash
# Backup old config
cp ~/.lazypr ~/.lazypr.backup

# Update to new format (example)
# Old: API_KEY=xxx
# New: GROQ_API_KEY=xxx
sed -i 's/API_KEY=/GROQ_API_KEY=/g' ~/.lazypr
```

## Troubleshooting

### Config Not Found

```bash
# Check if config file exists
ls -la ~/.lazypr

# Create if missing
touch ~/.lazypr
lazypr config set GROQ_API_KEY "your-key"
```

### Invalid Configuration

```bash
# Validate all settings
lazypr config list

# Reset to defaults
rm ~/.lazypr
lazypr config set GROQ_API_KEY "your-key"
```

### Permissions Issues

```bash
# Fix permissions (Unix/Linux/macOS)
chmod 600 ~/.lazypr  # Read/write for owner only
```

### Config Not Loading

```bash
# Check config file format
cat ~/.lazypr

# Ensure proper format (KEY=value)
# No quotes needed:
PROVIDER=groq  # ✓
PROVIDER="groq"  # ✓ (but quotes are kept in value)

# Check for BOM or encoding issues
file ~/.lazypr
# Should be: ASCII text or UTF-8 text
```

## Advanced Patterns

### Per-Project Configuration

Use environment variables in your project:

```bash
# .env file in your project
GROQ_API_KEY=project-specific-key
PROVIDER=cerebras
MODEL=llama-3.1-8b-instant

# Load and run
source .env && lazypr
```

### Conditional Configuration

```bash
# Different config based on branch
if [[ $(git branch --show-current) == "main" ]]; then
  lazypr --context "Production release"
else
  lazypr --context "Development changes"
fi
```

### Configuration Scripts

```bash
#!/bin/bash
# setup-lazypr.sh

echo "Setting up lazypr configuration..."

# Prompt for API key
read -p "Enter your Groq API key: " api_key

# Write config
cat > ~/.lazypr << EOF
GROQ_API_KEY=$api_key
PROVIDER=groq
MODEL=llama-3.3-70b-versatile
DEFAULT_BRANCH=main
FILTER_COMMITS=true
EOF

echo "✓ Configuration saved to ~/.lazypr"
lazypr config list
```

## Security Considerations

### Protect Your API Keys

```bash
# Secure config file permissions
chmod 600 ~/.lazypr

# Never commit config with API keys
echo ".lazypr" >> .gitignore

# Use environment variables in CI/CD
# Don't store API keys in config files in repos
```

### Rotate API Keys

```bash
# Update API key
lazypr config set GROQ_API_KEY "new-key"

# Or edit directly
vim ~/.lazypr
```

### Audit Configuration

```bash
# Review current config
lazypr config list

# Check for leaked keys
grep -r "GROQ_API_KEY" ~/.bash_history  # Should return nothing
```

## Getting Help

For configuration issues:
- Check main [README.md](../../README.md)
- Run `lazypr config --help`
- See [CLI examples](../cli/)
