# Security Policy

---

## Threat model

`forge-linkedin` is a local CLI tool. There is no server, no cloud component, and no telemetry.

| Surface | What is stored | Where | Risk |
|---|---|---|---|
| LinkedIn session | Chromium cookies | `~/.forge-linkedin/chrome-profile/` | Local read = full session access |
| Secrets | Optional username / Telegram token | `~/.forge-linkedin/.env` (mode `0600`) | Local read = token exposure |
| Like history | Post URNs, timestamps | `~/.forge-linkedin/data.db` | Low — no credentials |
| Logs | Run metadata | `~/.forge-linkedin/logs/` | Low — no credentials |

**Nothing is sent to sbknext servers.** Outbound connections are only to LinkedIn (via Chrome) and optionally to the Telegram Bot API.

---

## Hard rules

- Do not run `forge-linkedin` on shared or work machines. The Chrome profile and `.env` file contain session-level credentials. Any user with filesystem access to your home directory can steal your LinkedIn session.
- Do not commit `.env` to version control. It is in `.gitignore`, but double-check with `git status` before any `git add .`.
- The `daily_cap` ceiling (30) is enforced in code. Even if you manually edit the binary's config, the cap cannot be raised via config file — this is intentional.

---

## What to do if your account hits a captcha loop

1. **Stop the tool immediately.** Run `forge-linkedin status` to confirm the last run ended cleanly.
2. **Log in to LinkedIn manually** in a real browser session (not the forge-linkedin Chrome profile). Complete any verification LinkedIn requests.
3. **Wait 24–48 hours** before running `forge-linkedin` again.
4. **Raise your delays.** In `config.json`, increase `min_delay_sec` to `180` and reduce `daily_cap` to `15`.
5. If LinkedIn has suspended your account, you must appeal through LinkedIn's own support — `forge-linkedin` cannot reverse account actions.

The captcha canary (`forge-linkedin` halts on challenge pages) means the tool will not silently continue burning actions against a broken session. Check `~/.forge-linkedin/logs/` for a `[CAPTCHA DETECTED]` line.

---

## Responsible disclosure

If you discover a security vulnerability in `forge-linkedin` — for example, a path that could leak credentials outside the local machine, or a supply-chain issue in a dependency — please report it privately before opening a public issue.

**Email:** erp@sbknext.com  
**Subject line:** `[forge-linkedin security] <short description>`

Include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Your suggested fix (optional but appreciated)

We aim to acknowledge within 48 hours and provide a fix or mitigation within 14 days for confirmed issues.

Please do not include exploit code or proof-of-concept payloads that could harm other users.
