#!/usr/bin/env bash
set -euo pipefail

python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

mkdir -p third_party
if [ ! -d "third_party/A2UI" ]; then
  git clone https://github.com/google/A2UI third_party/A2UI
fi

if [ -d "apps/viewer" ]; then
  (cd apps/viewer && npm install)
fi

if [ -d "third_party/A2UI/renderers/web_core" ]; then
  (cd third_party/A2UI/renderers/web_core && npm install && npm run build)
fi

if [ -d "third_party/A2UI/renderers/lit" ]; then
  (cd third_party/A2UI/renderers/lit && npm install && npm run build)
fi

echo "Setup completed."
echo "Activate env with: source .venv/bin/activate"
