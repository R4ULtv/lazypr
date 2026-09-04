# Configuration Examples

lazypr stores configuration in `~/.lazypr` as `KEY=value` lines. Use `lazypr config` for guided setup; it masks API-key input and keeps secrets out of shell history.

## Included examples

- [`minimal.conf`](./minimal.conf): the smallest Groq setup
- [`team.conf`](./team.conf): shared generation settings for a team
- [`provider-fallback.conf`](./provider-fallback.conf): Groq and Cerebras keys ready for manual fallback

Copy an example to your home directory, then replace placeholder API keys:

```bash
cp examples/config/minimal.conf ~/.lazypr
chmod 600 ~/.lazypr
```

## Commands

```bash
lazypr config
lazypr config list
lazypr config get PROVIDER
lazypr config set PROVIDER=cerebras
lazypr config remove CONTEXT
```

The `set` command expects one `KEY=VALUE` argument. Quote values containing spaces:

```bash
lazypr config set "CONTEXT=Keep the description concise"
```

## Supported settings

| Key                | Default | Purpose                                     |
| ------------------ | ------- | ------------------------------------------- |
| `PROVIDER`         | `groq`  | `groq` or `cerebras`                        |
| `GROQ_API_KEY`     | empty   | Groq authentication                         |
| `CEREBRAS_API_KEY` | empty   | Cerebras authentication                     |
| `DEFAULT_BRANCH`   | `main`  | Default comparison target                   |
| `LOCALE`           | `en`    | Generated title and description language    |
| `FILTER_COMMITS`   | `true`  | Remove common noise commits                 |
| `CONTEXT`          | empty   | Persistent guidance, at most 200 characters |
| `CUSTOM_LABELS`    | empty   | Extra comma-separated labels                |
| `MAX_RETRIES`      | `2`     | Additional request attempts                 |
| `TIMEOUT`          | `10000` | Per-request timeout in milliseconds         |

The model is not configurable: both providers use Qwen 3.8 27B. lazypr maps it to `qwen/qwen3.8-27b` on Groq and `qwen-3.8-27b` on Cerebras.

## Switching providers

Store both keys once:

```bash
lazypr config set GROQ_API_KEY=your-groq-key
lazypr config set CEREBRAS_API_KEY=your-cerebras-key
```

Then switch without changing prompts or model settings:

```bash
lazypr config set PROVIDER=groq
lazypr config set PROVIDER=cerebras
```

## Validation

- `PROVIDER` accepts only `groq` or `cerebras`.
- `FILTER_COMMITS` accepts only `true` or `false`.
- `MAX_RETRIES` and `TIMEOUT` accept non-negative integers.
- `LOCALE` accepts `en`, `es`, `pt`, `fr`, `de`, `it`, `ja`, `ko`, `zh`, `ru`, `nl`, `pl`, or `tr`.
- Custom labels must begin with a letter and contain only letters, numbers, hyphens, or underscores.

Run `lazypr config list` to inspect normalized values. API keys are masked in the output.
