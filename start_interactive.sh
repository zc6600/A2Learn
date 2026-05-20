#!/usr/bin/env bash
set -euo pipefail

RESOURCE_PATH=""
RESOURCE_TEXT=""
VIEWER_PORT="8010"
API_PORT="8008"

while [[ $# -gt 0 ]]; do
  case $1 in
    --file|-f)
      RESOURCE_PATH="$2"
      shift 2
      ;;
    --text|-t)
      RESOURCE_TEXT="$2"
      shift 2
      ;;
    --viewer-port)
      VIEWER_PORT="$2"
      shift 2
      ;;
    --api-port)
      API_PORT="$2"
      shift 2
      ;;
    *)
      if [[ -z "$RESOURCE_PATH" && -z "$RESOURCE_TEXT" && ! "$1" =~ ^- ]]; then
        RESOURCE_PATH="$1"
        shift
      elif [[ "$1" =~ ^[0-9]+$ && "$VIEWER_PORT" == "8010" ]]; then
        VIEWER_PORT="$1"
        shift
      elif [[ "$1" =~ ^[0-9]+$ && "$API_PORT" == "8008" ]]; then
        API_PORT="$1"
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
  echo "  bash start_interactive.sh <resource_path> [viewer_port] [api_port]"
  echo "  bash start_interactive.sh --text \"Some topic\" [--viewer-port 8010] [--api-port 8008]"
  echo "  bash start_interactive.sh --file ./docs"
  exit 1
fi

if [ -d ".venv" ]; then
  source .venv/bin/activate
fi

./scripts/ensure_a2ui.sh

if [ ! -d "node_modules" ]; then
  npm install
fi

export A2LEARN_DEFAULT_RESOURCE_PATH="$RESOURCE_PATH"
export A2LEARN_DEFAULT_RESOURCE_TEXT="$RESOURCE_TEXT"

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
