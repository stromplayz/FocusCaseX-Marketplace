#!/usr/bin/env bash
#
# FocusCaseX registry installer.
#
# Installs the FocusCaseX registry command line (fcx) from the FocusCaseX
# registry. The bundle is a single-file Node CLI; the installer checks Node,
# downloads and verifies the bundle, installs it under ~/.focuscasex, and
# wires the command into your PATH.
#
# Usage:
#   curl -fsSL https://stromplayz.github.io/FocusCaseX/install.sh | bash
#   bash install.sh              install or update fcx
#   bash install.sh --uninstall  remove fcx and the PATH entry
#   bash install.sh --help       show this help
#
set -euo pipefail

# --- configuration -----------------------------------------------------------

REGISTRY_BASE="https://stromplayz.github.io/FocusCaseX"
DIST_URL="https://raw.githubusercontent.com/stromplayz/FCX-NPM/main/dist/fcx.mjs"
FCX_HOME="$HOME/.focuscasex"
BIN_DIR="$FCX_HOME/bin"

MARKER_BEGIN="# FocusCaseX registry (fcx)"
MARKER_END="# end FocusCaseX registry (fcx)"
NODE_MIN_MAJOR=18

# --- helpers ------------------------------------------------------------------

say()  { printf '%s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }
die()  { printf 'Error: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'HELP'
FocusCaseX registry installer

Usage:
  bash install.sh              Install or update the fcx command
  bash install.sh --uninstall  Remove fcx and the PATH entry added by this script
  bash install.sh --help       Show this help

The installer:
  1. Checks for Node 18 or newer.
  2. Downloads the fcx bundle from the FocusCaseX registry.
  3. Installs it to ~/.focuscasex/bin/fcx.
  4. Adds ~/.focuscasex/bin to your PATH (bash and zsh).

Docs: https://stromplayz.github.io/FocusCaseX/docs/cli/
HELP
}

# --- flags --------------------------------------------------------------------

case "${1:-}" in
  "") ;;
  --uninstall) uninstall_only=1 ;;
  -h|--help) usage; exit 0 ;;
  *) die "unknown option: ${1} (try --help)" ;;
esac

# --- uninstall ----------------------------------------------------------------

if [ "${uninstall_only:-0}" = "1" ]; then
  step "Removing fcx"
  if [ -f "$BIN_DIR/fcx" ]; then
    rm -f "$BIN_DIR/fcx"
    say "Removed $BIN_DIR/fcx"
  else
    say "No fcx binary found at $BIN_DIR/fcx — nothing to remove."
  fi

  for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
    [ -f "$rc" ] || continue
    if grep -qF "$MARKER_BEGIN" "$rc"; then
      tmp_rc="$(mktemp)"
      awk -v b="$MARKER_BEGIN" -v e="$MARKER_END" '
        $0 == b { skip = 1; next }
        $0 == e { skip = 0; next }
        skip { next }
        { print }
      ' "$rc" > "$tmp_rc"
      cat "$tmp_rc" > "$rc"
      rm -f "$tmp_rc"
      say "Removed the PATH entry from $rc"
    fi
  done

  # Anything else under ~/.focuscasex (activation, workspace) is left in place.
  say ""
  say "fcx removed. Your FocusCaseX data under $FCX_HOME was left untouched."
  say "Open a new terminal so the PATH change takes effect."
  exit 0
fi

# --- 1. node check --------------------------------------------------------------

step "Checking Node"
if ! command -v node >/dev/null 2>&1; then
  say "FocusCaseX needs Node 18 or newer, and node was not found on this machine."
  say "Install Node from the official site: https://nodejs.org/"
  say "Then run this installer again."
  exit 1
fi

node_version="$(node -p 'process.versions.node' 2>/dev/null)" || {
  say "FocusCaseX needs Node 18 or newer, but the installed node could not report its version."
  say "Install a current Node from the official site: https://nodejs.org/"
  say "Then run this installer again."
  exit 1
}
node_major="${node_version%%.*}"
case "$node_major" in
  ''|*[!0-9]*) node_major=0 ;;
esac
if [ "$node_major" -lt "$NODE_MIN_MAJOR" ]; then
  say "FocusCaseX needs Node 18 or newer — this machine has Node ${node_version}."
  say "Install a current Node from the official site: https://nodejs.org/"
  say "Then run this installer again."
  exit 1
fi
say "Node ${node_version} found."

# --- 2. download and verify ------------------------------------------------------

step "Downloading the fcx bundle"
tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

if command -v curl >/dev/null 2>&1; then
  curl -fsSL --retry 3 --retry-delay 2 -o "$tmp_file" "$DIST_URL" \
    || die "download failed — try again"
elif command -v wget >/dev/null 2>&1; then
  wget -q --tries=3 -O "$tmp_file" "$DIST_URL" \
    || die "download failed — try again"
else
  die "download failed — try again (need curl or wget to reach the registry)"
fi

# Verify: non-empty, and the first line is the Node shebang.
[ -s "$tmp_file" ] || die "download failed — try again"
first_line="$(head -n 1 "$tmp_file" | tr -d '\r')"
if [ "$first_line" != "#!/usr/bin/env node" ]; then
  die "download failed — try again"
fi
say "Bundle verified (single-file Node CLI)."

# --- 3. install ------------------------------------------------------------------

step "Installing fcx"
mkdir -p "$BIN_DIR"
mv -f "$tmp_file" "$BIN_DIR/fcx"
chmod 755 "$BIN_DIR/fcx"
say "Installed to $BIN_DIR/fcx"

# --- 4. PATH ---------------------------------------------------------------------

step "Wiring PATH"
export PATH="$BIN_DIR:$PATH"

path_entry() {
  printf '%s\n' "$MARKER_BEGIN"
  printf 'export PATH="%s:$PATH"\n' "$BIN_DIR"
  printf '%s\n' "$MARKER_END"
}

for rc in "$HOME/.bashrc" "$HOME/.zshrc"; do
  # ~/.bashrc is always wired (created if missing); ~/.zshrc only when it exists.
  if [ "$rc" = "$HOME/.zshrc" ] && [ ! -f "$rc" ]; then
    continue
  fi
  if [ ! -f "$rc" ]; then
    : > "$rc" 2>/dev/null || { say "Could not create $rc — add $BIN_DIR to your PATH by hand."; continue; }
  fi
  if grep -qF "$MARKER_BEGIN" "$rc"; then
    say "$rc already has the FocusCaseX registry PATH entry."
  elif [ -w "$rc" ]; then
    path_entry >> "$rc"
    say "Added the FocusCaseX registry PATH entry to $rc."
  else
    say "$rc is not writable — add $BIN_DIR to your PATH by hand."
  fi
done

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) export PATH="$BIN_DIR:$PATH" ;;
esac
say "PATH is ready for this session: $BIN_DIR"

# --- 5. success --------------------------------------------------------------------

installed_version="$("$BIN_DIR/fcx" --version 2>/dev/null || echo "unknown")"

printf '\n'
say "FocusCaseX registry installed."
say ""
say "  Version:      fcx ${installed_version}"
say "  Installed to: $BIN_DIR/fcx"
say ""
say "Next steps:"
say "  1. Open a new terminal, or run: source ~/.bashrc"
say "  2. Run: fcx setup"
say "  3. Run: fcx marketplace to browse Extensions (fcx login when you have your FCX code)"
say ""
say "Docs: ${REGISTRY_BASE}/docs/cli/"
