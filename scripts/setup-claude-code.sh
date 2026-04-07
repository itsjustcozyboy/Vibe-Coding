#!/usr/bin/env bash
set -euo pipefail

# Install Claude Code CLI globally in the current Codespaces environment.
# This script is idempotent and can be re-run safely.

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is not installed. Install Node.js 18+ first." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm is not installed. Install npm first." >&2
  exit 1
fi

echo "[INFO] Node version: $(node -v)"
echo "[INFO] npm version:  $(npm -v)"

echo "[INFO] Installing Claude Code CLI..."
npm install -g @anthropic-ai/claude-code

echo "[INFO] Verifying installation..."
if command -v claude >/dev/null 2>&1; then
  echo "[OK] Claude CLI installed: $(claude --version || echo 'version check failed')"
else
  NPM_BIN="$(npm config get prefix)/bin"
  if [[ -x "$NPM_BIN/claude" ]]; then
    echo "[WARN] Claude installed but not on PATH."
    echo "[INFO] Add this to your shell: export PATH=\"$NPM_BIN:\$PATH\""
  else
    echo "[ERROR] Claude CLI was not found after install." >&2
    exit 1
  fi
fi

chmod +x scripts/claude-gateway.sh 2>/dev/null || true

cat <<'NEXT'

[Next step]
1) Choose one auth method for this shell session:
  A) Direct API key
    export ANTHROPIC_API_KEY="YOUR_API_KEY"

  B) Custom gateway (Base URL + Auth Token)
    export ANTHROPIC_BASE_URL="https://your-gateway.example"
    export ANTHROPIC_AUTH_TOKEN="YOUR_AUTH_TOKEN"

2) Optional: persist settings in ~/.bashrc:
  echo 'export ANTHROPIC_API_KEY="YOUR_API_KEY"' >> ~/.bashrc
  # or
  echo 'export ANTHROPIC_BASE_URL="https://your-gateway.example"' >> ~/.bashrc
  echo 'export ANTHROPIC_AUTH_TOKEN="YOUR_AUTH_TOKEN"' >> ~/.bashrc
  source ~/.bashrc

3) Start Claude Code:
  ./scripts/claude-gateway.sh

NEXT
