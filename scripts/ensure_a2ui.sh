#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

A2UI_DIR="${A2UI_DIR:-third_party/A2UI}"
A2UI_LOCK_FILE="${A2UI_LOCK_FILE:-.a2ui-ref.lock}"
A2UI_REF_VALUE="${A2UI_REF:-}"

mkdir -p "$(dirname "$A2UI_DIR")"
if [ ! -d "$A2UI_DIR/.git" ]; then
  echo "[A2Learn] Cloning A2UI into $A2UI_DIR ..."
  rm -rf "$A2UI_DIR"
  git clone https://github.com/google/A2UI "$A2UI_DIR"
else
  echo "[A2Learn] $A2UI_DIR already present (has .git), skipping clone."
fi

# Keep npm file: dependencies stable (apps/viewer expects third_party/A2UI).
if [ "$A2UI_DIR" != "third_party/A2UI" ]; then
  mkdir -p third_party
  ln -sfn "$A2UI_DIR" "third_party/A2UI"
fi

if [ -z "$A2UI_REF_VALUE" ] && [ -f "$A2UI_LOCK_FILE" ]; then
  A2UI_REF_VALUE="$(tr -d '[:space:]' < "$A2UI_LOCK_FILE")"
fi

if [ -n "$A2UI_REF_VALUE" ]; then
  (
    cd "$A2UI_DIR"
    git fetch --tags --quiet || true
    git checkout "$A2UI_REF_VALUE"
  )
fi

if [ ! -d "$A2UI_DIR/renderers/web_core/dist" ]; then
  (cd "$A2UI_DIR/renderers/web_core" && npm install && npm run build)
fi

if [ ! -d "$A2UI_DIR/renderers/lit/dist" ]; then
  (cd "$A2UI_DIR/renderers/lit" && npm install && npm run build)
fi

if [ ! -d "$A2UI_DIR/renderers/markdown/markdown-it/dist" ]; then
  (cd "$A2UI_DIR/renderers/markdown/markdown-it" && npm install && npm run build)
fi

CURRENT_REF="$(cd "$A2UI_DIR" && git rev-parse HEAD)"
if [ ! -f "$A2UI_LOCK_FILE" ] || [ -n "${A2UI_REF:-}" ]; then
  printf "%s\n" "$CURRENT_REF" > "$A2UI_LOCK_FILE"
fi

echo "[A2Learn] A2UI_DIR: $A2UI_DIR"
echo "[A2Learn] A2UI_REF: $CURRENT_REF"
