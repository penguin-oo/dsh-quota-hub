# dsh-quota-hub

> [English](README.md) · [中文](README.zh.md)

**Unified real-time quota dashboard for DeepSeek Harness.**

One collapsible glass panel shows every provider quota/balance you care about —
OpenCodeGo rolling/weekly/monthly windows, DeepSeek official balance,
OpenRouter credits, SiliconFlow and Moonshot balances — refreshed on a timer,
with a live health dot on the sidebar button. **API keys stay on the host:
the browser only ever receives parsed numbers.**

## Features

- **Auto-detect** — built-in adapters appear as soon as the matching
  credential exists (`OPENCODE_GO_API_KEY`, `DEEPSEEK_API_KEY`,
  `OPENROUTER_API_KEY`, `SILICONFLOW_API_KEY`, `MOONSHOT_API_KEY` in DSH
  credentials / env). Unconfigured providers show collapsed as “未配置”.
- **Collapsible & compact** — every provider card collapses to one line;
  “全部收起/展开” in one click; auto-refresh with per-card updated time.
- **Health colors** — sidebar dot and progress bars turn green (>50% left),
  yellow (20–50%), red (<20%).
- **Custom providers** — any HTTP endpoint with JSON quota fields can be
  added in `~/.dsh/dsh-quota-hub.json` (dot-path field extraction).
- **Host-side only** — all fetching happens in a host service; keys never
  cross the browser boundary.

## Install

```sh
dsh plugin --profile web add dsh-quota-hub
```

Restart DSH afterwards. The **💰 额度** button appears in the sidebar footer.

## Custom providers

`~/.dsh/dsh-quota-hub.json`:

```json
{
  "refreshMs": 120000,
  "providers": [
    {
      "id": "my-relay",
      "label": "My Relay",
      "url": "https://relay.example.com/v1/usage",
      "credential": "MY_RELAY_API_KEY",
      "fields": [
        { "key": "used", "label": "已用", "path": "usage.used", "unit": "USD" },
        { "key": "percent", "label": "用量", "path": "usage.percent", "percent": true }
      ]
    }
  ]
}
```

`credential` names a DSH credential/env var (Bearer auth). Or drop
`credential` and put a static `headers` object on the entry instead — note
that stores the token in the config file in plain text.

## How it works

Host: a top-level `quotaHub` Remote service resolves each adapter's
credential via `ctx.credentials`, fetches the provider endpoint (10 s timeout,
`refreshMs` cache, shared in-flight requests), and returns normalized
snapshots. Client: the panel double-unwraps the transport envelope exactly
like the core `messageFeedback` remote and renders provider cards.

## License

MIT

## Acknowledgements

Built for the DeepSeek Harness plugin ecosystem — thanks to the community on
[LINUX DO](https://linux.do/) for feedback and testing.
