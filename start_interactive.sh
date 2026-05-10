#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: bash start_interactive.sh <resource_path> [viewer_port] [api_port]"
  echo "Example: bash start_interactive.sh ./docs 8010 8008"
  exit 1
fi

RESOURCE_PATH="$1"
VIEWER_PORT="${2:-8010}"
API_PORT="${3:-8008}"

if [ -d ".venv" ]; then
  source .venv/bin/activate
fi

./scripts/ensure_a2ui.sh

if [ ! -d "node_modules" ]; then
  npm install
fi

export A2LEARN_DEFAULT_RESOURCE_PATH="$RESOURCE_PATH"
python -m uvicorn apps.api.main:app --host 127.0.0.1 --port "$API_PORT" &
API_PID=$!

cleanup() {
  if ps -p "$API_PID" >/dev/null 2>&1; then
    kill "$API_PID" || true
  fi
}
trap cleanup EXIT

cd apps/viewer
VITE_A2LEARN_API_URL="http://127.0.0.1:${API_PORT}" \
  npm run dev -- --host 127.0.0.1 --port "$VIEWER_PORT"
