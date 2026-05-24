# forge-linkedin — Install Guide

Not published to crates.io. Build from source — it's one command after the clone.

---

## 1. Prerequisites

| Requirement | Minimum version | Check |
|---|---|---|
| **Rust toolchain** | 1.75 | `rustc --version` |
| **Cargo** | ships with Rust | `cargo --version` |
| **Chrome or Chromium** | any recent stable | `google-chrome --version` or `chromium --version` |
| **OS** | Linux (x86_64, aarch64) or macOS (Intel/Apple Silicon) | — |
| **OpenSSL dev headers** | any current | `pkg-config --libs openssl` |

On Debian/Ubuntu, grab OpenSSL headers with:

```bash
sudo apt-get install -y pkg-config libssl-dev
```

On macOS with Homebrew:

```bash
brew install openssl
```

---

## 2. Option A — One-liner install script (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/sbknext/forge-linkedin/main/scripts/install.sh | sh
```

The script:
- Detects macOS or Linux
- Installs Rust via `rustup` if not found (prompts before doing so)
- Clones the repo to `~/.forge-linkedin/repo/` (or pulls latest if already cloned)
- Builds the release binary
- Symlinks the binary to `~/.cargo/bin/forge-linkedin` (falls back to `/usr/local/bin/` if writable)
- Runs `forge-linkedin init` to scaffold `~/.forge-linkedin/`
- Prints next steps

Safe to re-run — the script is idempotent.

---

## 3. Option B — Build from source manually

```bash
git clone https://github.com/sbknext/forge-linkedin
cd forge-linkedin
cargo build --release
```

The binary lands at `./target/release/forge-linkedin`. Either run it directly or symlink it into your PATH:

```bash
ln -sf "$PWD/target/release/forge-linkedin" "$HOME/.cargo/bin/forge-linkedin"
forge-linkedin init
```

Make sure `~/.cargo/bin` is in your `PATH`:

```bash
export PATH="$HOME/.cargo/bin:$PATH"   # add to ~/.bashrc or ~/.zshrc
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

- `LINKEDIN_USERNAME` / `LINKEDIN_PASSWORD` — only used by the optional unattended login flow (see step 5). Leave blank if you prefer the manual browser flow.
- `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` — optional. Fill these if you want captcha alerts and daily digests via Telegram.
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

See [`config.example.json`](config.example.json) for full field descriptions, or run `forge-linkedin config` after setup.

---

## 5. First login

### Manual flow (recommended)

```bash
forge-linkedin login
```

This opens your configured Chrome/Chromium profile. Log in to LinkedIn normally. When the LinkedIn feed is visible, close the browser — the session cookie is persisted to `~/.forge-linkedin/chrome-profile/` and will be reused on subsequent runs.

### .env credentials flow (unattended)

If `LINKEDIN_USERNAME` and `LINKEDIN_PASSWORD` are set in `~/.forge-linkedin/.env`, `forge-linkedin login` will attempt to fill the login form automatically. The browser still opens visibly (not headless). You must still confirm the login if LinkedIn triggers a verification step.

---

## 6. Verify

```bash
forge-linkedin status
```

Expected output on a fresh install (no runs yet):

```
forge-linkedin v0.1.1
────────────────────
Today's likes : 0 / 30
Last login    : <timestamp>
Last run      : never
Recent likes  : (none)
```

---

## 7. Schedule recurring runs

### Linux — systemd timer

Create `~/.config/systemd/user/forge-linkedin.service`:

```ini
[Unit]
Description=forge-linkedin daily like run

[Service]
Type=oneshot
ExecStart=/usr/local/bin/forge-linkedin run
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

Check:

```bash
systemctl --user status forge-linkedin.timer
```

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

---

## 8. Uninstall

```bash
# Remove binary (if symlinked to ~/.cargo/bin)
rm -f ~/.cargo/bin/forge-linkedin

# Remove binary (if symlinked to /usr/local/bin)
sudo rm -f /usr/local/bin/forge-linkedin

# Remove data (optional — contains your session cookies and like history)
rm -rf ~/.forge-linkedin

# macOS: unload launchd agent if configured
launchctl unload ~/Library/LaunchAgents/com.sbknext.forge-linkedin.plist
rm ~/Library/LaunchAgents/com.sbknext.forge-linkedin.plist

# Linux: disable systemd timer if configured
systemctl --user disable --now forge-linkedin.timer
rm ~/.config/systemd/user/forge-linkedin.{service,timer}
```
