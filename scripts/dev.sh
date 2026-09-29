#!/usr/bin/env bash
# Ensure Node 16 before webpack/electron-webpack (Node 17+ breaks Webpack 4).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)"
if [[ "$MAJOR" -gt 16 ]]; then
  cat >&2 <<EOF
error: Node $(node -v) is too new for this project (Webpack 4 / Electron 11).

Use Node 16 in this terminal, then retry:

  nvm use
  # if that fails:
  nvm install 16 && nvm use 16

  yarn dev

(Your shell shows conda "(base)" — run nvm use after activating the project directory.)
EOF
  exit 1
fi

bash scripts/fix-dev-electron-identity.sh
exec yarn electron-webpack dev
