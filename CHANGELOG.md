# Changelog

All notable changes to this project will be documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

_(nothing yet)_

---

## [0.1.1] — 2026-05-24

### Changed

- Renamed `jobs-ops` crate to `network-ops`; pivoted Phase 2 to company tracking + network growth (was: job search + auto-apply)
- README now shows build-from-source as the primary install path; not publishing to crates.io for v0.1.x
- CLI `jobs` subcommand replaced with `company` and `network` subcommands (Phase 2 stubs)

---

## [0.1.0] — 2026-05-24

### Added

- Initial release: tag-search + safe-pace likes (max 30/day hard cap)
- CLI commands: `init`, `login`, `run`, `dry-run`, `status`, `config`
- Quality filter: `min_engagement`, `skip_keywords`, hashtag rotation
- Captcha canary — halts session immediately on any LinkedIn challenge page
- Active-hours gate — skips likes outside the configured `[start, end]` window
- Randomised delay (90–300 s default) between like actions
- SQLite-backed daily counter + liked-post deduplication (`data.db`)
- Persistent Chromium profile at `~/.forge-linkedin/chrome-profile/`
- Optional Telegram digest hook — captcha alerts + daily like summary
- `config.example.json` and `.env.example` with safe defaults
- `scripts/install.sh` — idempotent one-liner for macOS and Linux
