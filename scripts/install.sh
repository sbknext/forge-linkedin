#!/usr/bin/env sh
# forge-linkedin install script
# Usage: curl -fsSL https://raw.githubusercontent.com/sbknext/forge-linkedin/main/scripts/install.sh | sh
# Idempotent — safe to re-run.

set -euo pipefail

REPO_URL="https://github.com/sbknext/forge-linkedin"
INSTALL_DIR="$HOME/.forge-linkedin/repo"
BIN_DIR="/usr/local/bin"
BIN_NAME="forge-linkedin"

# ── Colours ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
YEL='\033[1;33m'
GRN='\033[0;32m'
ORG='\033[0;33m'
RST='\033[0m'

info()    { printf "${ORG}[forge-linkedin]${RST} %s\n" "$*"; }
success() { printf "${GRN}[forge-linkedin]${RST} %s\n" "$*"; }
warn()    { printf "${YEL}[forge-linkedin] WARN:${RST} %s\n" "$*"; }
die()     { printf "${RED}[forge-linkedin] ERROR:${RST} %s\n" "$*" >&2; exit 1; }

# ── OS detection ───────────────────────────────────────────────────────────────
detect_os() {
  case "$(uname -s)" in
    Darwin) echo "macos" ;;
    Linux)  echo "linux" ;;
    *)      die "Unsupported OS: $(uname -s). Only macOS and Linux are supported." ;;
  esac
}

OS=$(detect_os)
info "Detected OS: $OS"

# ── Rust / rustup ──────────────────────────────────────────────────────────────
install_rust() {
  if command -v rustc >/dev/null 2>&1; then
    RUST_VERSION=$(rustc --version | awk '{print $2}')
    info "Rust already installed: $RUST_VERSION"
    return 0
  fi

  warn "Rust not found."
  printf "${YEL}[forge-linkedin]${RST} Install Rust via rustup? [y/N] "
  read -r REPLY
  case "$REPLY" in
    y|Y|yes|YES)
      info "Installing Rust via rustup..."
      curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path
      # shellcheck disable=SC1090
      . "$HOME/.cargo/env"
      success "Rust installed."
      ;;
    *)
      die "Rust is required. Install it manually from https://rustup.rs/ and re-run this script."
      ;;
  esac
}

install_rust

# Ensure cargo is on PATH
if ! command -v cargo >/dev/null 2>&1; then
  if [ -f "$HOME/.cargo/env" ]; then
    # shellcheck disable=SC1090
    . "$HOME/.cargo/env"
  else
    die "cargo not found after Rust install. Add ~/.cargo/bin to PATH and re-run."
  fi
fi

# ── Clone or update repo ───────────────────────────────────────────────────────
if [ -d "$INSTALL_DIR/.git" ]; then
  info "Repo already cloned at $INSTALL_DIR — pulling latest..."
  git -C "$INSTALL_DIR" pull --ff-only
else
  info "Cloning forge-linkedin to $INSTALL_DIR ..."
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --depth 1 "$REPO_URL" "$INSTALL_DIR"
fi

# ── Build ──────────────────────────────────────────────────────────────────────
info "Building release binary (this may take a minute on first build)..."
cargo build --release --manifest-path "$INSTALL_DIR/Cargo.toml"
BUILT_BIN="$INSTALL_DIR/target/release/$BIN_NAME"

if [ ! -f "$BUILT_BIN" ]; then
  die "Build succeeded but binary not found at $BUILT_BIN — check Cargo.toml [[bin]] name."
fi

success "Build complete."

# ── Install binary ─────────────────────────────────────────────────────────────
if [ -w "$BIN_DIR" ]; then
  ln -sf "$BUILT_BIN" "$BIN_DIR/$BIN_NAME"
  FINAL_BIN="$BIN_DIR/$BIN_NAME"
else
  # Fall back to ~/.cargo/bin (usually already in PATH from rustup)
  CARGO_BIN="$HOME/.cargo/bin"
  mkdir -p "$CARGO_BIN"
  ln -sf "$BUILT_BIN" "$CARGO_BIN/$BIN_NAME"
  FINAL_BIN="$CARGO_BIN/$BIN_NAME"
  warn "$BIN_DIR is not writable. Binary linked to $FINAL_BIN."
  warn "Make sure ~/.cargo/bin is in your PATH:"
  warn "  export PATH=\"\$HOME/.cargo/bin:\$PATH\""
fi

success "Binary installed: $FINAL_BIN"

# ── Init ───────────────────────────────────────────────────────────────────────
info "Running forge-linkedin init..."
"$FINAL_BIN" init

# ── Done ───────────────────────────────────────────────────────────────────────
printf "\n"
success "forge-linkedin is ready."
printf "\n"
printf "${ORG}Next steps:${RST}\n"
printf "  1. Edit secrets:   nano ~/.forge-linkedin/.env\n"
printf "  2. Edit config:    nano ~/.forge-linkedin/config.json\n"
printf "  3. Login once:     forge-linkedin login\n"
printf "  4. Preview:        forge-linkedin dry-run\n"
printf "  5. Run:            forge-linkedin run\n"
printf "\n"
printf "${ORG}Docs:${RST} https://github.com/sbknext/forge-linkedin\n"
