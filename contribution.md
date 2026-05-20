# A2Learn Contribution Guide

Welcome to the A2Learn project! This document outlines how to debug the application, add new A2UI components, and modify or add new LLM generation templates.

## 🐛 Debugging Methods

A2Learn consists of a Python-based LLM Agent pipeline, a FastAPI Session backend, and a React-based Viewer frontend. Depending on the issue, you can use the following methods:

### 1. Reviewing Generated Outputs
When the Agent processes a resource, it creates a folder under `outputs/<timestamp_id>/`.
- **`curriculum.json`**: The high-level learning objectives and modules generated.
- **`site.json`**: The structured layout plan.
- **`site_messages.json`**: The final A2UI v0.9 messages used to render the frontend.
If the frontend is not displaying as expected, always check `outputs/.../site_messages.json` first to see if the LLM generated correct JSON and A2UI schema.

### 2. Testing Offline Mode vs Online Mode
- **Offline Mode (`bash start.sh`)**: Good for debugging the static generation pipeline (`agent/`). It only runs the generation once and starts the Vite dev server. Supports `--file` and `--text` arguments.
- **Online Mode (`bash start_interactive.sh`)**: Good for debugging dynamic interactions (e.g., clicking a button on a component that triggers an API call). It runs both the FastAPI server (port 8008 by default) and the Vite dev server (port 8010). Check the terminal output of the FastAPI server for backend errors. Supports `--file` and `--text` arguments.
- **Component Gallery (`npm run viewer:gallery`)**: Start a local gallery to preview all A2UI components in isolation, which is very helpful when debugging component UI without invoking the LLM agent.

### 3. Running Unit Tests
The project uses `pytest`. If you modify the agent logic, validate logic, or the API endpoints, run the tests:
```bash
source .venv/bin/activate
PYTHONPATH=. pytest tests -v
```

### 4. Bypassing Frontend (API Testing)
You can directly test the Python agent without starting the frontend Viewer:
```bash
source .venv/bin/activate
python run_agent.py --text "Explain how blockchain works"
# or
python run_agent.py --resource ./docs/some_file.md
```
This prints the path to the generated `site_messages.json`.

---

## 🧩 Adding a New Component

A2Learn uses the `@a2ui/lit` framework for its component catalog. To add a new interactive component (e.g., `CodeSandbox`), follow these steps:

### Step 1: Define the API Schema
Open `packages/a2learn-catalog/api.ts` and define the Zod schema for your component. This tells the LLM what properties it can generate:
```typescript
import { z } from "zod";
import { ComponentApi, DynamicStringSchema } from "@a2ui/web_core/v0_9";

export const CodeSandboxApi = {
  name: "CodeSandbox",
  schema: z.object({
    code: DynamicStringSchema.describe("Initial code to display"),
    language: z.string().default("javascript"),
  }).strict(),
} satisfies ComponentApi;
```

### Step 2: Create the Lit Element
Create a new file `packages/a2learn-catalog/components/CodeSandbox.ts`:
```typescript
import { html, css } from "lit";
import { A2uiLitElement } from "@a2ui/lit/v0_9";
import { CodeSandboxApi } from "../api";

export class A2learnCodeSandboxElement extends A2uiLitElement<typeof CodeSandboxApi> {
  static styles = css`
    .sandbox { background: #f4f4f4; padding: 16px; border-radius: 8px; }
  `;

  render() {
    const { code, language } = this.props;
    return html\`
      <div class="sandbox">
        <span class="lang-badge">\${language}</span>
        <pre><code>\${code}</code></pre>
      </div>
    \`;
  }
}
```

### Step 3: Export and Register
1. Export the component in `packages/a2learn-catalog/index.ts`:
   ```typescript
   export * from "./components/CodeSandbox";
   ```
2. Update the frontend Viewer (`apps/viewer/src/main.ts` or component registry) to ensure the new custom element is registered, typically done automatically if imported correctly.
3. Make sure to update the LLM prompt in `agent/llm.py` so the Agent knows this new component exists and when to use it!

---

## 📝 Adding or Modifying LLM Templates

The LLM prompts dictate how resources are transformed into A2UI components. The logic resides in `agent/llm.py` and `agent/engine.py`.

### Modifying Existing Prompts
Open `agent/llm.py`. You will find functions with hardcoded system prompts:
- `plan_curriculum(llm, resource_text)`: Decides the structure of the course.
- `build_site_plan(llm, curriculum)`: Maps the curriculum to a site layout.
- `generate_a2ui_messages(llm, resource_text)`: The main prompt that generates `createSurface` and `updateComponents` JSON arrays.
**To tweak behavior**, edit the `system_prompt` strings inside these functions.

### Adding a New Prompt / Step (LangGraph Node)
If you want to add a new intermediate step (e.g., "extract key vocabulary" before planning the curriculum):

1. **Update State**: Add your new field to `AgentState` in `agent/engine.py`:
   ```python
   class AgentState(TypedDict, total=False):
       ...
       vocabulary: list[str]
   ```
2. **Create LLM Function**: In `agent/llm.py`, create a new function `extract_vocabulary(llm, text)` that formats a prompt and parses the JSON response.
3. **Create Node**: In `agent/engine.py`, add a node function:
   ```python
   def _node_extract_vocab(state: AgentState) -> AgentState:
       llm = build_llm()
       vocab = extract_vocabulary(llm, state["resource_text"])
       return {"vocabulary": vocab}
   ```
4. **Wire the Graph**: In `build_agent_graph()` inside `agent/engine.py`, add the node and adjust the edges:
   ```python
   graph.add_node("extract_vocab", _node_extract_vocab)
   
   # Adjust edges
   graph.add_edge("load_resource", "extract_vocab")
   graph.add_edge("extract_vocab", "plan_curriculum")
   ```
