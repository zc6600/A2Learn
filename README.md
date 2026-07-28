# A2Learn

A2Learn is an AI-driven, interactive knowledge showcase generator. It reads static teaching resources or text prompts and automatically generates an interactive, component-based educational website using the A2UI framework.

---

## 🌟 Overview

The core workflow of A2Learn is:
1. **Understand**: Reads local files or direct text prompts using either an **Agent Loop** (detailed syllabus planning) or **Parser Mode** (direct structured JSON generation).
2. **Generate**: Converts knowledge content into A2UI v0.9 component layouts (including learning paths, sandboxes, and quizzes).
3. **Render**: The React + Vite Viewer rendering engine mounts these components into an interactive showcase website.
4. **Interact**: User actions are evaluated in online mode to return incremental UI updates.

---

## 📖 Documentation & Guides

For detailed setup, concepts, and usage instructions, please refer to the organized guides:

* **[User Guide (user-guide/)](file:///Users/frank/github_project/A2Learn/docs/user-guide/README.md)**
  - [Getting Started & Installation](file:///Users/frank/github_project/A2Learn/docs/user-guide/getting-started.md) (Prerequisites, env setup, and CLI commands)
  - [Features & Core Concepts](file:///Users/frank/github_project/A2Learn/docs/user-guide/features-and-concepts.md) (Interactive component catalog and page layouts)
  - [Integration Guide](file:///Users/frank/github_project/A2Learn/docs/user-guide/integration.md) (iframe embedding, JS SDK, and Stateless API endpoints)

* **[Developer Guide (developer-guide/)](file:///Users/frank/github_project/A2Learn/docs/developer-guide/README.md)**
  - [System Architecture](file:///Users/frank/github_project/A2Learn/docs/developer-guide/architecture.md) (LangGraph, FastAPI Session API, and JIT Course expansion)
  - [How to Add a Component](file:///Users/frank/github_project/A2Learn/docs/developer-guide/add-component.md) (Schema validation, Lit element components, and LLM prompt updates)
  - [A2UI Integration Spec](file:///Users/frank/github_project/A2Learn/docs/developer-guide/a2ui-integration.md) (Catalog registration and client loop details)

---

## ⚡ Quick Start Reference

### 1. Installation
```bash
# Initialize venv and fetch A2UI dependencies
bash setup.sh
```

### 2. Configure API Key
Create a `.env` file in the root directory:
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

### 3. Generate & Launch Showcase (Offline Preview)
```bash
# Launch offline viewer with default showcase (or specify --text)
bash start.sh
```
Open `http://127.0.0.1:8010` in your browser.

### 4. Running Web App & Backend API (Online Interactive Mode)
```bash
# Start Web App (FastAPI backend + Frontend viewer)
bash start_interactive.sh
```
Open `http://127.0.0.1:8010` in your browser to enter topics directly in the Web UI!

### 5. Running Tests
```bash
PYTHONPATH=. .venv/bin/pytest tests
```
