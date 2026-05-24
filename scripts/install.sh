#!/usr/bin/env bash
# forge-linkedin install script (v0.2.0 — TypeScript + Playwright)
# Usage: curl -fsSL https://raw.githubusercontent.com/sbknext/forge-linkedin/main/scripts/install.sh | sh
# Idempotent — safe to re-run.

set -euo pipefail

REPO_URL="https://github.com/sbknext/forge-linkedin"
INSTALL_DIR="$HOME/.forge-linkedin/repo"
BIN_DIR="$HOME/.local/bin"
BIN_NAME="forge-linkedin"

echo "forge-linkedin installer (v0.2.0)"
echo "=================================="

# ── Check Node 20+ ─────────────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js not found. Install Node 20+ via nvm or brew, then re-run."
  echo "  macOS:  brew install node"
  echo "  Linux:  https://nodejs.org/en/download/package-manager/"
  exit 1
fi

NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERROR: Node 20+ required (found $(node --version))."
  exit 1
fi

echo "Node $(node --version) — OK"

# ── Clone or update repo ───────────────────────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  echo "Updating existing install at $INSTALL_DIR ..."
  git -C "$INSTALL_DIR" pull --ff-only --quiet
else
  echo "Cloning into $INSTALL_DIR ..."
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --quiet "$REPO_URL" "$INSTALL_DIR"
fi

cd "$INSTALL_DIR"

# ── Install npm dependencies + build ──────────────────────────────────────────
echo "Installing npm dependencies..."
npm install --quiet

echo "Building TypeScript..."
npm run build

# ── Install Playwright Chromium ───────────────────────────────────────────────
echo "Installing Playwright Chromium..."
npx playwright install chromium

# ── Symlink binary ─────────────────────────────────────────────────────────────
mkdir -p "$BIN_DIR"
chmod +x "$INSTALL_DIR/dist/cli.js"
ln -sf "$INSTALL_DIR/dist/cli.js" "$BIN_DIR/$BIN_NAME"
echo "Binary linked: $BIN_DIR/$BIN_NAME"

# ── Scaffold ~/.forge-linkedin/ ────────────────────────────────────────────────
node "$INSTALL_DIR/dist/cli.js" init

# ── Done ───────────────────────────────────────────────────────────────────────
echo ""
echo "forge-linkedin is ready."
echo ""
echo "Make sure ~/.local/bin is on your PATH:"
echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
echo ""
echo "Next:"
echo "  forge-linkedin login"
echo "  forge-linkedin dry-run"
echo "  forge-linkedin run"
echo ""
echo "Docs: https://github.com/sbknext/forge-linkedin"
