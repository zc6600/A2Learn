#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: bash start.sh <resource_path> [port]"
  echo "Example: bash start.sh ./docs 8010"
  exit 1
fi

RESOURCE_PATH="$1"
PORT="${2:-8010}"

if [ -d ".venv" ]; then
  source .venv/bin/activate
fi

export A2LEARN_SYNC_VIEWER="${A2LEARN_SYNC_VIEWER:-1}"
export A2LEARN_VIEWER_MESSAGES_PATH="${A2LEARN_VIEWER_MESSAGES_PATH:-apps/viewer/public/generated/site_messages.json}"
python run_agent.py --resource "$RESOURCE_PATH"

./scripts/ensure_a2ui.sh

if [ ! -d "node_modules" ]; then
  npm install
fi
cd apps/viewer
VITE_A2LEARN_MESSAGES_URL="${VITE_A2LEARN_MESSAGES_URL:-/generated/site_messages.json}" \
  npm run dev -- --host 127.0.0.1 --port "$PORT"
