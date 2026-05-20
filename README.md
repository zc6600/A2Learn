# A2Learn

A2Learn is an AI-driven, interactive knowledge showcase generator. It takes static teaching resources (such as Markdown files or documentation directories) and automatically generates an interactive, component-based educational website using the A2UI framework.

## 🌟 Overview

The core workflow of A2Learn is:
1. **Understand**: The AI Agent (powered by OpenRouter and LangGraph) reads your local knowledge resources.
2. **Plan & Generate**: The Agent plans a curriculum, structures the site, and generates A2UI v0.9 component messages in one pass.
3. **Render**: The frontend Viewer (built with React + Vite and A2UI) renders these messages into a beautiful, interactive learning website.
4. **Interact (Online Mode)**: When users interact with components (e.g., answering a quiz or selecting a learning step), the actions are sent back to the Session API, which returns incremental UI updates.

### 🏗 Architecture

- **Agent Pipeline (`agent/`)**: Python-based LangGraph application that uses an LLM to generate the site structure and interactive components (like `LearningPath`, `QuizCard`, `InteractiveSandbox`).
- **Session API (`apps/api/`)**: FastAPI backend for interactive (online) mode. It stores session states and processes incremental user actions.
- **Viewer (`apps/viewer/`)**: React + Vite frontend that parses A2UI messages and renders the user interface.
- **Catalog & Embed (`packages/`)**: Contains the A2UI components catalog (`a2learn-catalog`) and integration tools (`@a2learn/embed`).

---

## 🚀 Prerequisites

Ensure you have the following installed on your system:
- **Python 3.11+**
- **Node.js 18+** & **npm**
- **OpenRouter API Key** (for the LLM Agent)

---

## 🛠 Installation

Run the setup script to initialize the Python virtual environment, install dependencies, and fetch the A2UI repository:

```bash
bash setup.sh
```

*(Optional)* You can lock the A2UI version to a specific commit or tag:
```bash
A2UI_REF=<commit_or_tag> bash setup.sh
```

---

## ⚙️ Configuration

Create a `.env` file in the project root directory and configure your OpenRouter API key:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=deepseek/deepseek-v4-flash
# Optional: Set default resource path
# A2LEARN_DEFAULT_RESOURCE_PATH=./docs
```

---

## 🎯 How to Run

### 1. Offline Mode (Static Generation)
If you only want the Agent to generate a static, one-time interactive website based on your resource:

```bash
bash start.sh --file ./docs [--port 8010]
# OR using direct text input
bash start.sh --text "Explain how blockchain works" [--port 8010]
```
This will:
1. Parse the resource or text.
2. Generate `outputs/<task_id>/site_messages.json`.
3. Sync the messages to `apps/viewer/public/generated/site_messages.json`.
4. Launch the Viewer at `http://127.0.0.1:8010`.

### 2. Online Mode (Interactive Chat/Updates)
If you want the components to be fully interactive (e.g., clicking a button requests new content from the Agent):

```bash
# Start both the Session API and the Viewer
bash start_interactive.sh --file ./docs [--viewer-port 8010] [--api-port 8008]
# OR using direct text input
bash start_interactive.sh --text "Explain how blockchain works"
```
- **Viewer URL**: `http://127.0.0.1:8010`
- **API URL**: `http://127.0.0.1:8008` (The Viewer automatically connects to this API).

### 3. Integration Mode (Stateless API)
If you want to integrate A2Learn into an existing enterprise application (where your backend manages user state and database, instead of A2Learn's memory), you can use the pure stateless endpoints:

```bash
# Ensure the API is running
python -m uvicorn apps.api.main:app --host 127.0.0.1 --port 8008
```

1. **Init Generation (`/api/stateless/init`)**: Send `resource_path` or `resource_text` to generate the initial UI JSON without creating any session in memory.
2. **Stateless Action (`/api/stateless/action`)**: Send the user's `action` payload *along with* the current `components` and `surface_ids` state (which your system reads from your own DB). The A2Learn API will return the new incremental messages and forget about it.

## 🧪 Testing

### Running the Test Suite
The project uses `pytest` for backend testing. Make sure your virtual environment is activated, then run:

```bash
source .venv/bin/activate
PYTHONPATH=. pytest tests
```

### Running a Generation Demo
You can easily test the Agent's generation capability using the provided `run_agent.py` script. 

**Test with a sample document:**
```bash
python run_agent.py --resource docs/a2learn_product_architecture.md
```

**Test with direct text:**
```bash
python run_agent.py --text "Explain how a hash map works"
```
*Expected Output:*
```text
[A2Learn] OPENROUTER_MODEL: deepseek/deepseek-v4-flash
[A2Learn] OPENROUTER_API_KEY loaded: yes
[A2Learn] output_dir: /path/to/outputs/20231010-120000-xxxx
[A2Learn] a2ui_messages: /path/to/outputs/20231010-120000-xxxx/site_messages.json
[A2Learn] A2UI message generation completed.
```
You can then preview the generated `site_messages.json` directly in the viewer by running `bash start.sh docs/a2learn_product_architecture.md`.

---

## 📦 Workspace Commands

If you need to work on specific parts of the project, you can run these npm scripts from the root:

```bash
npm run viewer:dev     # Start only the frontend Viewer
npm run viewer:gallery # View the A2UI component gallery
npm run viewer:build   # Build the Viewer for production
npm run embed:build    # Build the embed SDK
npm run build          # Build everything
```

---

## 🔗 Embed & Integration

You can integrate the generated interactive pages into other platforms:
- **iframe**: Deploy `apps/viewer/dist` statically and embed via `<iframe src="...">`.
- **SDK**: Use `@a2learn/embed` to dynamically inject parameters into host websites.

Detailed instructions: `docs/integration.md`.
Minimal examples: `examples/`.
