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

python run_agent.py --resource "$RESOURCE_PATH"

if [ ! -d "third_party/A2UI/renderers/web_core/dist" ]; then
  (cd third_party/A2UI/renderers/web_core && npm install && npm run build)
fi

if [ ! -d "third_party/A2UI/renderers/lit/dist" ]; then
  (cd third_party/A2UI/renderers/lit && npm install && npm run build)
fi

cd apps/viewer
if [ ! -d "node_modules" ]; then
  npm install
fi
npm run dev -- --host 127.0.0.1 --port "$PORT"
