# forge-linkedin

> Safe-pace LinkedIn engagement for solo devs.
> 30 likes/day max · real-browser session · zero passwords in code.

[![Crates.io](https://img.shields.io/crates/v/forge-linkedin?color=e85d04)](https://crates.io/crates/forge-linkedin)
[![License: MIT](https://img.shields.io/badge/license-MIT-e85d04)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.75%2B-e85d04?logo=rust)](https://www.rust-lang.org/)

---

## What is this

`forge-linkedin` is a Rust CLI that automates LinkedIn engagement at human-realistic pace:

1. **Tag-search** — discovers posts by hashtags you configure
2. **Quality filter** — skips low-engagement posts and blocked keywords
3. **Like** — clicks Like through your own real Chrome session (no headless browser, no fake user agent)

No LinkedIn API. No password stored. Cookies live in your home directory, same as if you opened Chrome manually.

Built as part of [Forge](https://forge.sbknext.com) — the solo-dev OSS thesis.

---

## Why "safe pace"

LinkedIn ToS prohibits automation. This tool runs *through your own browser* (no headless flags, no fake user agent), at human-realistic pace:

- **30 likes/day max** (hard cap — not configurable beyond this ceiling)
- **90–300 sec between actions** (randomised delay, configurable)
- **Active hours only** (default 09:00–21:00 IST — likes are queued outside that window)
- **Captcha canary** — stops the session instantly if LinkedIn shows a challenge page
- **No bulk follow / no mass DM / no auto-comment** in v0.1

You are responsible for your own LinkedIn account. These defaults are deliberately conservative; tighten them further if you want lower risk. Run `forge-linkedin status` to see today's count before deciding whether to run again.

---

## Quick install

```bash
curl -fsSL https://raw.githubusercontent.com/sbknext/forge-linkedin/main/scripts/install.sh | sh
```

See [INSTALL.md](INSTALL.md) for prerequisite details, cargo-install and build-from-source options, cron/launchd scheduling, and the uninstall procedure.

---

## First run

```bash
# 1. Scaffold config dir
forge-linkedin init

# 2. Edit secrets + tunables
#    secrets  → ~/.forge-linkedin/.env       (mode 600, never committed)
#    tunables → ~/.forge-linkedin/config.json
nano ~/.forge-linkedin/.env
nano ~/.forge-linkedin/config.json

# 3. Authenticate — opens Chrome, you log in manually (one-time)
forge-linkedin login

# 4. Preview candidates without liking anything
forge-linkedin dry-run

# 5. Run for real
forge-linkedin run

# 6. Check today's count
forge-linkedin status
```

---

## Commands

| Command | What it does |
|---|---|
| `init` | Scaffolds `~/.forge-linkedin/` with default config and empty `.env` |
| `login` | Opens your Chromium/Chrome profile, waits for manual LinkedIn login, persists cookies |
| `run` | Discover → filter → like (one session, respects daily cap) |
| `dry-run` | Same discovery + filtering as `run`, prints candidates to stdout, no clicks |
| `status` | Today's like count, recent 10 liked posts, last login timestamp |
| `config` | Pretty-prints current `~/.forge-linkedin/config.json` with field descriptions |

All commands respect `--config <path>` to override the default config location.

---

## Configuration

Defaults live in `~/.forge-linkedin/config.json`. See [`config.example.json`](config.example.json) for the full schema.

| Field | Default | Description |
|---|---|---|
| `hashtags` | `["#AgenticAI", ...]` | Hashtags to search. Rotated each run. |
| `daily_cap` | `30` | Maximum likes per calendar day. Hard ceiling. |
| `min_delay_sec` | `90` | Minimum wait between actions (seconds). |
| `max_delay_sec` | `300` | Maximum wait between actions (seconds). |
| `active_hours` | `[9, 21]` | Clock-hour window `[start, end]` (24h). Outside = queue only. |
| `active_tz` | `"Asia/Kolkata"` | Timezone for `active_hours` evaluation. |
| `skip_weekends` | `false` | Set `true` to pause on Saturday + Sunday. |
| `min_engagement` | `10` | Skip posts with fewer than this many reactions + comments combined. |
| `skip_keywords` | `["hiring", ...]` | Posts whose text matches any keyword (case-insensitive) are skipped. |

---

## Where your data lives

| Path | Purpose |
|---|---|
| `~/.forge-linkedin/.env` | Secrets — Telegram token, optional login hint. Mode `0600`. |
| `~/.forge-linkedin/config.json` | Runtime tunables (hashtags, cap, delays, hours). |
| `~/.forge-linkedin/data.db` | SQLite — liked post URNs, daily counts, run log. |
| `~/.forge-linkedin/chrome-profile/` | Persistent Chromium profile — session cookies live here. |
| `~/.forge-linkedin/logs/` | Rotated run logs (`forge-YYYYMMDD.log`). |

Nothing sensitive ever lives in the repo. `.env`, `*.db`, `logs/`, and `chrome-profile/` are all in `.gitignore`.

---

## Daily cap math

30 likes/day sits well below the threshold where LinkedIn's anomaly detection historically triggers on real accounts:

| Actor | Typical daily likes |
|---|---|
| Active human user (LinkedIn's own research) | 5–15 |
| `forge-linkedin` default cap | 30 |
| Cheap like-farm bots before account action | 200–500+ |

With 90–300 s random delays, 30 likes takes between 45 min and 2.5 hours — fully within an active working session. The captcha canary halts immediately on any challenge, so you are never silently burning likes against a broken session.

If you want to be even more conservative: set `daily_cap` to `15` and raise `min_delay_sec` to `120`. There is no way to set `daily_cap` above 30 — the ceiling is enforced in code, not just config.

---

## Roadmap

- [x] Phase 1 — Tag-search + safe-pace likes (v0.1)
- [ ] Phase 2 — Job search + tailored auto-apply
- [ ] Phase 3 — Comment drafts via Forge Brain MCP (manual confirm before send)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome; new filter rules require tests.

---

## Security

See [SECURITY.md](SECURITY.md) for the threat model, responsible disclosure address, and what to do if your account hits a captcha loop.

---

## Built with Forge

[forge.sbknext.com](https://forge.sbknext.com) · [forge-client SDK](https://github.com/sbknext/forge-client) · [Brain MCP](https://mcp.sbknext.com)

---

## License

MIT © 2026 sbknext — see [LICENSE](LICENSE).
