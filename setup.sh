#!/usr/bin/env bash
set -euo pipefail

python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt

mkdir -p third_party
./scripts/ensure_a2ui.sh

npm install

echo ""
echo "=== Environment Setup ==="
if [ ! -f .env ]; then
    touch .env
    echo "Created .env file."
fi

if [ "${A2LEARN_SKIP_LLM_SETUP:-0}" != "1" ]; then
    read -p "Enter OPENROUTER_API_KEY (leave blank to skip): " api_key_input
    if [ -n "$api_key_input" ]; then
        if grep -q "^OPENROUTER_API_KEY=" .env; then
            sed -i.bak "s|^OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=$api_key_input|" .env
            rm -f .env.bak
        else
            echo "OPENROUTER_API_KEY=$api_key_input" >> .env
        fi
        echo "✔ OPENROUTER_API_KEY saved to .env"
    fi

    read -p "Enter OPENROUTER_MODEL (e.g. anthropic/claude-3.5-sonnet, leave blank to skip): " model_input
    if [ -n "$model_input" ]; then
        if grep -q "^OPENROUTER_MODEL=" .env; then
            sed -i.bak "s|^OPENROUTER_MODEL=.*|OPENROUTER_MODEL=$model_input|" .env
            rm -f .env.bak
        else
            echo "OPENROUTER_MODEL=$model_input" >> .env
        fi
        echo "✔ OPENROUTER_MODEL saved to .env"
    fi
else
    echo "Skipping optional LLM configuration."
fi
echo "========================="
echo ""

echo "Setup completed."
echo "Activate env with: source .venv/bin/activate"
