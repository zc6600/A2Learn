# User Guide: Getting Started

This guide walks you through setting up A2Learn, configuring environment variables, and running showcase generations using both the **Agent Loop** and **Parser** modes.

---

## 1. Prerequisites

Before installing A2Learn, ensure you have the following installed on your system:
- **Python 3.11+**
- **Node.js 18+** & **npm**
- **OpenRouter API Key** (Required for the LLM-based content generation)

---

## 2. Installation and Setup

Initialize the Python virtual environment, download necessary dependencies, and fetch the A2UI framework by running:

```bash
bash setup.sh
```

This script will:
1. Clone the A2UI frontend dependencies.
2. Initialize the Python virtual environment `.venv` and install `requirements.txt`.
3. Install npm packages for both the viewer application and packages.

---

## 3. Configuration

Configure your environment by creating a `.env` file in the root directory:

```env
# Required: Your OpenRouter API Key for calling the LLM
OPENROUTER_API_KEY=your_openrouter_api_key_here

# Optional: LLM model selection (Default: deepseek/deepseek-v4-flash)
OPENROUTER_MODEL=deepseek/deepseek-v4-flash

# Optional: Default directory to look for resource files
# A2LEARN_DEFAULT_RESOURCE_PATH=./docs
```

---

## 4. Run Modes

A2Learn can be run in two execution modes:

### 4.1 Offline Mode (Static Showcases)
Generates a static learning webpage based on your resource input or text prompt, then serves it offline using a Vite server.

```bash
# Using direct text input with the default agent mode
bash start.sh --text "Explain how blockchain works" --port 8010

# Using a local markdown file and the parser mode
bash start.sh --file ./docs/a2learn_product_architecture.md --mode parser --port 8010
```

- **Output Destination**: The generated message list is stored at `outputs/<task_id>/site_messages.json` and synchronized automatically to `apps/viewer/public/generated/site_messages.json`.
- **Preview**: Accessible locally at `http://127.0.0.1:8010`.

### 4.2 Online Mode (Interactive/Session Showcases)
Launches the FastAPI Session API backend alongside the Vite frontend. Clicking on steps in the learning path or interactive elements will trigger a roundtrip request to the backend API, allowing the agent to update and expand components dynamically.

```bash
bash start_interactive.sh --text "Explain how blockchain works" --viewer-port 8010 --api-port 8008
```

- **FastAPI Session API URL**: `http://127.0.0.1:8008`
- **Vite Viewer URL**: `http://127.0.0.1:8010`

---

## 5. Generation Options

When generating content, A2Learn provides two generation modes:

| Generation Mode | CLI Option | Description |
|---|---|---|
| **Agent Loop** | `--mode agent` | Runs a multi-step LangGraph agent pipeline (`plan_curriculum` -> `build_site` -> `generate_messages`). Slow but deeply structured for complex topics. |
| **Parser** | `--mode parser` | Asks the LLM to output a single structured content JSON in one pass, then maps it directly to A2UI components using a Python parser. Faster and more deterministic. |

### CLI Generator Usage Examples
Using the CLI helper script directly:

```bash
# Generate using Agent Loop Mode (Default)
python skill/scripts/a2learn_cli.py generate --text "Explain Neural Networks" --mode agent --output site_messages.json

# Generate using Parser Mode
python skill/scripts/a2learn_cli.py generate --text "Explain Neural Networks" --mode parser --output site_messages.json
```
