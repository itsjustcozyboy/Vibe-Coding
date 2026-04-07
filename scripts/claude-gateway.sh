#!/usr/bin/env bash
set -euo pipefail

# Run Claude Code using gateway credentials from environment variables or .env file.
# Priority:
# 1) Existing shell env vars
# 2) Variables loaded from .env in workspace root

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

# Normalize values loaded from .env (common CRLF/whitespace issues).
if [[ -n "${ANTHROPIC_BASE_URL:-}" ]]; then
  ANTHROPIC_BASE_URL="$(printf '%s' "$ANTHROPIC_BASE_URL" | tr -d '\r' | sed 's/[[:space:]]*$//')"
  export ANTHROPIC_BASE_URL
fi

if [[ -n "${ANTHROPIC_AUTH_TOKEN:-}" ]]; then
  ANTHROPIC_AUTH_TOKEN="$(printf '%s' "$ANTHROPIC_AUTH_TOKEN" | tr -d '\r' | sed 's/^[[:space:]]*//' | sed 's/[[:space:]]*$//')"
  export ANTHROPIC_AUTH_TOKEN
fi

if ! command -v claude >/dev/null 2>&1; then
  echo "[ERROR] claude command not found. Run ./scripts/setup-claude-code.sh first." >&2
  exit 1
fi

if [[ -n "${ANTHROPIC_BASE_URL:-}" && -n "${ANTHROPIC_AUTH_TOKEN:-}" ]]; then
  if [[ "$ANTHROPIC_AUTH_TOKEN" == "replace_with_your_token" ]]; then
    echo "[WARN] .env token looks like placeholder text. Auth will likely fail with 401." >&2
  fi

  # Ensure OAuth/API key path does not override gateway-based auth.
  unset ANTHROPIC_API_KEY || true
  exec claude "$@"
fi

if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  exec claude "$@"
fi

cat >&2 <<'ERR'
[ERROR] Missing auth environment variables.
Set either:
- ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN (gateway mode), or
- ANTHROPIC_API_KEY (direct mode)

Example gateway mode:
  export ANTHROPIC_BASE_URL="https://claude.1000.school"
  export ANTHROPIC_AUTH_TOKEN="YOUR_AUTH_TOKEN"
  ./scripts/claude-gateway.sh

If you see 401 (invalid or revoked token):
- Reissue/rotate token on gateway side and update .env
- Remove hidden spaces/line breaks in token
- Ensure BASE_URL and token are from the same gateway project
ERR

exit 1
