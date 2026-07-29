# A2Learn

A2Learn is an AI-driven, interactive knowledge showcase generator. It reads static teaching resources or text prompts and automatically generates an interactive, component-based educational website using the A2UI framework — with a curated library of **7 reference examples** that demonstrate the platform's full design philosophy.

---

## 🌟 Overview

The core workflow of A2Learn is:
1. **Understand**: Reads local files or direct text prompts using either an **Agent Loop** (detailed syllabus planning) or **Parser Mode** (direct structured JSON generation).
2. **Generate**: Converts knowledge content into A2UI v0.9 component layouts following the **5-Step Problem-Driven Teaching Framework**.
3. **Render**: The Vite Viewer rendering engine mounts these components into an interactive showcase website.
4. **Interact**: User actions are evaluated in online mode to return incremental UI updates.

---

## 📐 5-Step Problem-Driven Teaching Framework

All A2Learn-generated content follows a structured 5-step pedagogical flow:

| Step | Component | Purpose |
|---|---|---|
| 1 | `AnalogyCard` + `ScenarioDialogue` | Hook learner with a **real pain point**, then explore via **peer researcher dialogue** |
| 2 | `MentalModel` + `ConceptCard` | Build intuition with analogies, ASCII diagrams, and structural pillars |
| 3 | `DetailedExplanation` | Go deep with **clean code examples** (direct library calls + minimal pseudocode) |
| 4 | `QuizCard` / `ClozeTest` / `DragAndDropMatch` | Reinforce with interactive self-assessment and instant explanations |
| 5 | `AnalogyCard` (summary mode) | Dual-layer summary: plain-English recap + `📌 术语总结` with `<dfn>` hover annotations |

> [!NOTE]
> This framework prioritizes **problem-driven learning over lecture-style explanations**, and **peer researcher dialogue over teacher-student Q&A**. Code examples should always use direct library calls or minimal pseudocode — never fake simulations of things that cannot be run.

---

## 📚 Example Catalog

A2Learn ships with **7 fully-realized reference examples** in `skill/references/examples/` (also synced to `apps/viewer/public/examples/`), all conforming to the 5-Step Framework:

| Example | Topic | Deep-Dive Implementation |
|---|---|---|
| `hash-table.json` | Hash Tables & Collision Resolution | Python `hash()` + simple hash pseudocode |
| `agent-react.json` | ReAct Agent Architecture | Hand-written ReAct `while` loop engine |
| `js-async.json` | JS Async & Event Loop | Hand-written `Promise.all` implementation |
| `conversational.json` | JS Closures & Lexical Scope | Closure Module Pattern with private vars |
| `non-linear.json` | CSS Grid 2D Layout | Zero-media-query responsive grid formula |
| `paper-attention.json` | Transformer Attention Mechanism | 4-step Scaled Dot-Product Attention derivation |
| `biophysics-ai.json` | AI-Driven Biophysics (AlphaFold) | AlphaFold3 Diffusion vs. Structure Module |

### Quick Preview

With the viewer running (`npm run viewer:dev`), navigate directly to any example:
```
http://localhost:5173/?messagesUrl=/examples/hash-table.json
http://localhost:5173/?messagesUrl=/examples/agent-react.json
http://localhost:5173/?messagesUrl=/examples/js-async.json
http://localhost:5173/?messagesUrl=/examples/conversational.json
http://localhost:5173/?messagesUrl=/examples/non-linear.json
http://localhost:5173/?messagesUrl=/examples/paper-attention.json
http://localhost:5173/?messagesUrl=/examples/biophysics-ai.json
```

---

## 📖 Documentation & Guides

For detailed setup, concepts, and usage instructions, please refer to the organized guides:

* **[User Guide (user-guide/)](docs/user-guide/README.md)**
  - [Getting Started & Installation](docs/user-guide/getting-started.md) (Prerequisites, env setup, and CLI commands)
  - [Features & Core Concepts](docs/user-guide/features-and-concepts.md) (Interactive component catalog and 5-Step Framework)
  - [Integration Guide](docs/user-guide/integration.md) (iframe embedding, JS SDK, and Stateless API endpoints)

* **[Developer Guide (developer-guide/)](docs/developer-guide/README.md)**
  - [System Architecture](docs/developer-guide/architecture.md) (LangGraph, FastAPI Session API, and JIT Course expansion)
  - [How to Add a Component](docs/developer-guide/add-component.md) (Schema validation, Lit element components, and LLM prompt updates)
  - [A2UI Integration Spec](docs/developer-guide/a2ui-integration.md) (Catalog registration and client loop details)

* **[Contribution Guide](contribution.md)** — Debugging, adding components, and contributing new examples

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

### 3. Preview Built-In Examples (No LLM Required)
```bash
# Start the Vite dev server
npm run viewer:dev
```
Then open any example URL listed in the [Example Catalog](#-example-catalog) section above.

### 4. Generate & Launch Showcase (Offline Preview)
```bash
# Launch offline viewer with default showcase (or specify --text)
bash start.sh
```
Open `http://127.0.0.1:8010` in your browser.

### 5. Running Web App & Backend API (Online Interactive Mode)
```bash
# Start Web App (FastAPI backend + Frontend viewer)
bash start_interactive.sh
```
Open `http://127.0.0.1:8010` in your browser to enter topics directly in the Web UI!

### 6. Component Gallery (Isolated Component Preview)
```bash
npm run viewer:gallery
```
Preview all A2UI components in isolation — useful for debugging component UI without invoking the LLM agent.

### 7. Running Tests
```bash
PYTHONPATH=. .venv/bin/pytest tests
```
