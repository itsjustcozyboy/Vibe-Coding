#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

MSG="${1:-feat: update workspace changes}"
BRANCH="${2:-main}"
SKIP_HOOKS="${SKIP_HOOKS:-1}"

git add -A

if git diff --cached --quiet; then
  echo "[INFO] No staged changes to commit."
  exit 0
fi

if [[ "$SKIP_HOOKS" == "1" ]]; then
  echo "[INFO] Committing with hooks disabled (SKIP_HOOKS=1)."
  git commit --no-verify -m "$MSG"
else
  git commit -m "$MSG"
fi
git push origin "$BRANCH"

echo "[OK] Pushed to origin/$BRANCH"
