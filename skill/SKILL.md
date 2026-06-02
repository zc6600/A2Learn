---
name: a2learn
description: >-
  AI-driven interactive knowledge showcase generator. Takes static teaching resources (like Markdown files or documentation directories) or text prompts, and generates interactive educational websites with components like quizzes, learning paths, and interactive sandboxes.
---

# A2Learn Agent Skill Guide

This skill enables an autonomous agent to set up, run, generate, and embed A2Learn interactive educational showcases.

---

## 1. Installation & Environment Setup

To initialize the project environment, run the following commands sequentially:

```bash
# 1. Clone the project repository
git clone https://github.com/zc6600/A2Learn
cd A2Learn

# 2. Run the environment setup script (initializes .venv, npm installs, builds embed SDK)
bash setup.sh
```

### Dependency Checklist
- **Python 3.11+** (used automatically inside `.venv`)
- **Node.js 18+** & **npm**

---

## 2. OpenRouter API Key Prerequisites

- **When it is NOT required**:
  If you have already generated or designed a schema-compliant course JSON file directly (e.g. following the templates under references), **you do NOT need to configure the OpenRouter API key**. You can map and preview the showcase entirely offline:
  ```bash
  # Directly serving and previewing a pre-existing JSON message file
  python skill/scripts/a2learn_cli.py start-offline --file skill/references/examples/paper-attention.json --port 8010
  ```
- **When it IS required**:
  You only need to export `OPENROUTER_API_KEY` (or define it in a `.env` file in the repository root) if you want to run the full LLM planning and generation pipelines:
  ```bash
  export OPENROUTER_API_KEY="your_openrouter_api_key"
  ```

---

## 3. Usage Cases

### Case 1: Direct Generation (Standalone Preview)
Use this case to generate a standalone interactive learning site and preview it locally.

#### Option A: Direct JSON Parser Mode (Recommended - Faster & Deterministic)
1. Write the topic details or parse materials into a structured JSON file matching the schema defined in [parser_mode_prompt.txt](file:///Users/frank/github_project/A2Learn/skill/references/parser_mode_prompt.txt).
2. Generate A2UI messages and run the offline viewer:
   ```bash
   python skill/scripts/a2learn_cli.py start-offline --file skill/references/examples/js-async.json --mode parser --port 8010
   ```

#### Option B: Multi-step Agent Loop Mode (Requires LLM API Key)
1. Plan the syllabus and generate messages in a LangGraph loop from raw text:
   ```bash
   python skill/scripts/a2learn_cli.py start-offline --text "Explain how Neural Networks work" --mode agent --port 8010
   ```

---

### Case 2: Project Integration (Embedded Canvas)
Use this case to integrate the interactive rendering canvas into third-party web portals or learning platforms.

- **Option A: iframe Embedding (Zero Coupling)**:
  Serve the build output under `apps/viewer/dist` via Nginx or CDN, then embed the iframe in the host website:
  ```html
  <iframe src="https://your-viewer-host/?embed=1&mode=offline&messagesUrl=https%3A%2F%2Fexample.com%2Fsite_messages.json" style="width: 100%; border: 0; min-height: 600px;"></iframe>
  ```
- **Option B: JS SDK & Web Components**:
  Import the `@a2learn/embed` JS SDK inside your host application to control authentication headers and themes:
  ```javascript
  import { createA2LearnEmbed } from "@a2learn/embed";
  createA2LearnEmbed({
    container: document.getElementById("learning-container"),
    viewerUrl: "https://your-viewer-host/",
    source: { mode: "offline", messagesUrl: "https://example.com/site_messages.json" }
  });
  ```
- **Option C: Stateless API Integration**:
  If the host platform wants to manage state in its own database, it can use the stateless endpoint `/api/stateless/action` of our backend, passing the current component map and receiving only incremental updates.

For complete integration and stateless API specifications, refer to [Integration Modes & Component Updates Guide](file:///Users/frank/github_project/A2Learn/skill/references/integration_modes.md).

---

## 4. Reference Templates & Files

All supplementary and reference materials are located under the `skill/references/` directory:

- **LLM Prompt Templates**:
  - [parser_mode_prompt.txt](file:///Users/frank/github_project/A2Learn/skill/references/parser_mode_prompt.txt): Schema and prompts for the direct JSON parser mode.
  - [curriculum_planner_prompt.txt](file:///Users/frank/github_project/A2Learn/skill/references/curriculum_planner_prompt.txt): System prompt for planning syllabus modules.
  - [site_planner_prompt.txt](file:///Users/frank/github_project/A2Learn/skill/references/site_planner_prompt.txt): System prompt for routing layout structures.
  - [message_generator_prompt.txt](file:///Users/frank/github_project/A2Learn/skill/references/message_generator_prompt.txt): System prompt for full A2UI message payload generation.
- **Reference Layouts under `skill/references/examples/`**:
  - [paper-attention.json](file:///Users/frank/github_project/A2Learn/skill/references/examples/paper-attention.json): Academic paper deep dive showcase (Transformer).
  - [js-async.json](file:///Users/frank/github_project/A2Learn/skill/references/examples/js-async.json): Coding lab showcase with Interactive Sandbox.
  - [non-linear.json](file:///Users/frank/github_project/A2Learn/skill/references/examples/non-linear.json): Chapter navigation using SectionNavigator.
  - [conversational.json](file:///Users/frank/github_project/A2Learn/skill/references/examples/conversational.json): Dialogue mentor showcase with InteractiveDialog.
  - [biophysics-ai.json](file:///Users/frank/github_project/A2Learn/skill/references/examples/biophysics-ai.json): Multi-surface academic course.
  - [agent-react.json](file:///Users/frank/github_project/A2Learn/skill/references/examples/agent-react.json): Agent-oriented React tutorial.

