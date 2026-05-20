#!/usr/bin/env bash
set -euo pipefail

RESOURCE_PATH=""
RESOURCE_TEXT=""
PORT="8010"

while [[ $# -gt 0 ]]; do
  case $1 in
    --file|-f)
      RESOURCE_PATH="$2"
      RESOURCE_TEXT=""
      shift 2
      ;;
    --text|-t)
      RESOURCE_TEXT="$2"
      RESOURCE_PATH=""
      shift 2
      ;;
    --port|-p)
      PORT="$2"
      shift 2
      ;;
    *)
      if [[ -z "$RESOURCE_PATH" && -z "$RESOURCE_TEXT" && ! "$1" =~ ^- ]]; then
        RESOURCE_PATH="$1"
        shift
      elif [[ "$1" =~ ^[0-9]+$ ]]; then
        PORT="$1"
        shift
      else
        echo "Unknown argument: $1"
        exit 1
      fi
      ;;
  esac
done

if [[ -z "$RESOURCE_PATH" && -z "$RESOURCE_TEXT" ]]; then
  echo "Usage:"
  echo "  bash start.sh <resource_path> [port]"
  echo "  bash start.sh --text \"Some topic to teach\" [--port 8010]"
  echo "  bash start.sh --file ./docs [--port 8010]"
  exit 1
fi

if [ -d ".venv" ]; then
  source .venv/bin/activate
fi

export A2LEARN_SYNC_VIEWER="${A2LEARN_SYNC_VIEWER:-1}"
export A2LEARN_VIEWER_MESSAGES_PATH="${A2LEARN_VIEWER_MESSAGES_PATH:-apps/viewer/public/generated/site_messages.json}"
python_args=(python run_agent.py)
if [[ -n "$RESOURCE_TEXT" ]]; then
  python_args+=(--text "$RESOURCE_TEXT")
else
  python_args+=(--resource "$RESOURCE_PATH")
fi
"${python_args[@]}"

./scripts/ensure_a2ui.sh

if [ ! -d "node_modules" ]; then
  npm install
fi
cd apps/viewer
VITE_A2LEARN_MESSAGES_URL="${VITE_A2LEARN_MESSAGES_URL:-/generated/site_messages.json}" \
  npm run dev -- --host 127.0.0.1 --port "$PORT"
