# forge-linkedin — Install Guide

---

## 1. Prerequisites

| Requirement | Minimum version | Check |
|---|---|---|
| **Node.js** | 20+ | `node --version` |
| **npm** | ships with Node | `npm --version` |
| **OS** | Linux (x86_64, aarch64) or macOS (Intel/Apple Silicon) | — |

On macOS, install Node via [nvm](https://github.com/nvm-sh/nvm) or Homebrew:

```bash
brew install node
```

On Debian/Ubuntu:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

---

## 2. Option A — One-liner install script (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/sbknext/forge-linkedin/main/scripts/install.sh | sh
```

The script:
- Clones the repo to `~/.forge-linkedin/repo/` (or pulls latest if already cloned)
- Runs `npm install && npm run build`
- Installs Playwright Chromium (`npx playwright install chromium`)
- Symlinks the binary to `~/.local/bin/forge-linkedin`
- Runs `forge-linkedin init` to scaffold `~/.forge-linkedin/`

Safe to re-run — idempotent.

---

## 3. Option B — Build from source manually

```bash
git clone https://github.com/sbknext/forge-linkedin
cd forge-linkedin
npm install
npm run build
npx playwright install chromium
```

Then either run directly:

```bash
node dist/cli.js init
```

Or link globally:

```bash
npm link     # makes `forge-linkedin` available in PATH
forge-linkedin init
```

---

## 4. Configure

After `init`, two files are created:

### `~/.forge-linkedin/.env`

```
LINKEDIN_USERNAME=
LINKEDIN_PASSWORD=

TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

- `LINKEDIN_USERNAME` / `LINKEDIN_PASSWORD` — only used by the optional unattended login flow. Leave blank to use the manual browser flow (recommended).
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — optional. Fill for captcha alerts and daily digests.
- File is created with mode `0600`. Never commit it.

### `~/.forge-linkedin/config.json`

```json
{
  "hashtags": ["#AgenticAI", "#AIEngineering", "#SelfImprovingAI", "#LLM", "#AITooling"],
  "daily_cap": 30,
  "min_delay_sec": 90,
  "max_delay_sec": 300,
  "active_hours": [9, 21],
  "active_tz": "Asia/Kolkata",
  "skip_weekends": false,
  "min_engagement": 10,
  "skip_keywords": ["hiring", "recruiter", "career opportunity"]
}
```

Run `forge-linkedin config` to view current values with descriptions.

---

## 5. First login

### Manual flow (recommended)

```bash
forge-linkedin login
```

Opens Chromium. Log in to LinkedIn normally. Session is persisted to `~/.forge-linkedin/chrome-profile/` and reused on subsequent runs.

### .env credentials flow (unattended)

If `LINKEDIN_USERNAME` and `LINKEDIN_PASSWORD` are set in `~/.forge-linkedin/.env`, `forge-linkedin login` will attempt to fill the login form automatically. The browser still opens visibly. You must still confirm any 2FA/verification LinkedIn requests.

---

## 6. Verify

```bash
forge-linkedin status
```

Expected output on a fresh install:

```
forge-linkedin v0.2.0
────────────────────────────────
Today's likes : 0 / 30
Last login    : never
Last run      : never

Recent likes: (none)
```

---

## 7. Schedule recurring runs

### macOS — launchd plist

Create `~/Library/LaunchAgents/com.sbknext.forge-linkedin.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.sbknext.forge-linkedin</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/forge-linkedin</string>
    <string>run</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>10</integer>
    <key>Minute</key>
    <integer>0</integer>
  </dict>
  <key>StandardOutPath</key>
  <string>/tmp/forge-linkedin.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/forge-linkedin.err</string>
</dict>
</plist>
```

Load:

```bash
launchctl load ~/Library/LaunchAgents/com.sbknext.forge-linkedin.plist
```

### Linux — systemd timer

Create `~/.config/systemd/user/forge-linkedin.service`:

```ini
[Unit]
Description=forge-linkedin daily like run

[Service]
Type=oneshot
ExecStart=/home/<you>/.local/bin/forge-linkedin run
```

Create `~/.config/systemd/user/forge-linkedin.timer`:

```ini
[Unit]
Description=Run forge-linkedin once per day

[Timer]
OnCalendar=*-*-* 10:00:00
RandomizedDelaySec=1800
Persistent=true

[Install]
WantedBy=timers.target
```

Enable:

```bash
systemctl --user daemon-reload
systemctl --user enable --now forge-linkedin.timer
```

---

## 8. Uninstall

```bash
# Remove global link
npm unlink -g forge-linkedin
# Or if you used the install script:
rm -f ~/.local/bin/forge-linkedin

# Remove data (optional — contains your session cookies and like history)
rm -rf ~/.forge-linkedin

# macOS: unload launchd agent
launchctl unload ~/Library/LaunchAgents/com.sbknext.forge-linkedin.plist
rm ~/Library/LaunchAgents/com.sbknext.forge-linkedin.plist
```
