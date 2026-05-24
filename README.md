# forge-linkedin

> Safe-pace LinkedIn engagement for solo devs.
> 30 likes/day max · real-browser session · zero passwords in code.

[![License: MIT](https://img.shields.io/badge/license-MIT-e85d04)](LICENSE)
[![Node](https://img.shields.io/badge/node-20%2B-e85d04?logo=node.js)](https://nodejs.org/)

---

## Try it now

```bash
git clone https://github.com/sbknext/forge-linkedin
cd forge-linkedin
npm install
npm run build
node dist/cli.js init       # scaffolds ~/.forge-linkedin/
node dist/cli.js login      # opens Chromium, log in manually (one time)
node dist/cli.js dry-run    # preview candidate posts — no clicks
node dist/cli.js run        # like up to 30/day
```

Or install globally:

```bash
npm link    # makes `forge-linkedin` available in PATH
forge-linkedin init
forge-linkedin login
forge-linkedin run
```

---

## What is this

`forge-linkedin` is a TypeScript CLI that automates LinkedIn engagement at human-realistic pace:

1. **Tag-search** — discovers posts by hashtags you configure
2. **Quality filter** — skips low-engagement posts, blocked keywords, and posts you already liked
3. **Like** — clicks Like through your own real Chrome session (visible browser, no headless flags, no fake user agent)

No LinkedIn API. No password stored anywhere in the repo. Cookies live in your home directory, same as if you opened Chrome manually.

Built as part of [Forge](https://forge.sbknext.com) — the solo-dev OSS thesis.

---

## Why "safe pace"

LinkedIn ToS prohibits automation. This tool runs *through your own browser* (visible, real Chromium, not headless), at human-realistic pace:

- **30 likes/day max** (hard cap — not configurable beyond this ceiling)
- **90–300 sec between actions** (randomised delay, configurable)
- **Active hours only** (default 09:00–21:00 IST — stops outside that window)
- **Captcha canary** — stops the session instantly if LinkedIn shows a challenge page
- **No bulk follow / no mass DM / no auto-comment** in v0.2

You are responsible for your own LinkedIn account. These defaults are deliberately conservative.

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/sbknext/forge-linkedin/main/scripts/install.sh | sh
```

The script clones this repo, runs `npm install && npm run build`, installs Playwright Chromium, and symlinks the binary. Safe to re-run — idempotent.

See [INSTALL.md](INSTALL.md) for prerequisites, manual build instructions, cron/launchd scheduling, and uninstall.

---

## First run

```bash
# 1. Scaffold config dir
forge-linkedin init

# 2. Edit secrets + tunables
nano ~/.forge-linkedin/.env          # Telegram token (optional)
nano ~/.forge-linkedin/config.json   # hashtags, cap, delays

# 3. Authenticate — opens Chromium, log in manually (one-time)
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
| `login` | Opens Chromium profile, waits for LinkedIn login, persists session |
| `run` | Discover → filter → like (one session, respects daily cap) |
| `dry-run` | Same discovery + filtering as `run`, prints candidates, no clicks |
| `status` | Today's like count, recent 10 liked posts, last login timestamp |
| `config` | Pretty-prints current `~/.forge-linkedin/config.json` |

---

## Configuration

Defaults live in `~/.forge-linkedin/config.json`. See [`config.example.json`](config.example.json) for the full schema.

| Field | Default | Description |
|---|---|---|
| `hashtags` | `["#AgenticAI", ...]` | Hashtags to search. Rotated each run. |
| `daily_cap` | `30` | Maximum likes per calendar day. Hard ceiling. |
| `min_delay_sec` | `90` | Minimum wait between actions (seconds). |
| `max_delay_sec` | `300` | Maximum wait between actions (seconds). |
| `active_hours` | `[9, 21]` | Clock-hour window `[start, end]` (24h). |
| `active_tz` | `"Asia/Kolkata"` | Timezone for `active_hours` evaluation. |
| `skip_weekends` | `false` | Set `true` to pause on Saturday + Sunday. |
| `min_engagement` | `10` | Skip posts with fewer than this many reactions. |
| `skip_keywords` | `["hiring", ...]` | Posts whose text matches any keyword are skipped. |

---

## Where your data lives

| Path | Purpose |
|---|---|
| `~/.forge-linkedin/.env` | Secrets — Telegram token, optional login hint. Mode `0600`. |
| `~/.forge-linkedin/config.json` | Runtime tunables (hashtags, cap, delays, hours). |
| `~/.forge-linkedin/data.db` | SQLite — liked post URNs, daily counts, run log. |
| `~/.forge-linkedin/chrome-profile/` | Persistent Chromium profile — session cookies live here. |
| `~/.forge-linkedin/logs/` | Rotated run logs. |

Nothing sensitive ever lives in the repo. `.env`, `*.db`, `logs/`, and `chrome-profile/` are all in `.gitignore`.

---

## Roadmap

- [x] Phase 1 — Tag-search + safe-pace likes (max 30/day)
- [ ] Phase 2 — Company tracking + network growth
  - [ ] Company search & follow
  - [ ] Network grow (find + connect with 2nd-degree matches, 5/day max)
  - [ ] Network digest (signal-ranked feed)
- [ ] Phase 3 — Comment drafts via Forge Brain MCP (manual confirm)

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
