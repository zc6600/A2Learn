---
name: a2learn
description: >-
  Create, preview, or refine an A2Learn interactive educational website from a
  topic or teaching resource. Use this skill whenever the user asks for a
  learning showcase, course page, quiz, learning path, interactive explanation,
  A2UI site, or wants to edit an existing A2Learn example/project. For a new
  static course, author structured JSON and use the local deterministic parser;
  use the API-backed Viewer only for live generation, source-library workflows,
  narration, or project/page editing.
---

# A2Learn

Turn a topic or local teaching material into a learner-facing A2Learn site.

## Choose the workflow

Use the smallest workflow that satisfies the request.

| User goal | Use |
| --- | --- |
| Create or revise a static course without an LLM service | **Local parser workflow** below. This is the default. |
| Browse a shipped example or component gallery | `npm run viewer:dev` or `npm run viewer:gallery`. |
| Edit an example/project in the floating editor, use uploaded sources, generate narration, or request live LLM generation | **API-backed Viewer workflow** below. |
| Embed an existing A2UI message file in another app | Read `docs/user-guide/integration.md`. |

Do not invoke the legacy LangGraph/OpenRouter generation pipeline, and do not
ask for an API key, for a static course. That pipeline remains available only
when the user explicitly asks for live LLM generation.

## Set up the repository

If this skill was obtained separately and the repository is not the current
workspace, clone it first:

```bash
git clone https://github.com/zc6600/A2Learn.git
cd A2Learn
```

Run commands from the repository root. If dependencies are missing, use:

```bash
A2LEARN_SKIP_LLM_SETUP=1 bash setup.sh
```

This installs Python, Node, and A2UI dependencies without prompting for an
OpenRouter key. Do not rerun setup when the dependencies are already present.

## Local parser workflow (default)

The agent writes the learning content; the repository deterministically turns
it into valid A2UI v0.9 messages. This path performs no network or model call.

```text
topic or resource
  -> inspect the parser contract and relevant examples
  -> write course_content.json
  -> parse and validate it locally
  -> serve the Viewer
  -> report the resulting paths and URL
```

### 1. Inspect the authoritative contract

Read these before authoring:

- `skill/references/parser_mode_prompt.txt` for the intermediate JSON shape.
- `agent/generation/parser.py` for the authoritative field-to-component
  mapping and component order.
- One or two relevant A2UI message examples:
  - `apps/viewer/public/examples/` for shipped, single-page examples;
  - `packages/a2learn-catalog/examples/Website/` for current catalog examples
    and multi-lesson course material;
  - `packages/a2learn-catalog/examples/Component/` only when inspecting the
    exact props of a component not produced by the parser.

Useful shipped examples include `hash-table`, `agent-react`, `js-async`,
`database-basics`, `paper-attention`, `poetry-social`, and `deng-gao`. Use the
same learner-facing language requested by the user; default to Chinese when
none is specified. Do not copy an example’s factual content.

The local parser deliberately supports a focused set of course fields. Do not
put raw A2UI messages, `CourseOutline`, `Flashcard`, `CodeSnippet`,
`KnowledgeTree`, or other arbitrary catalog components into
`course_content.json`: they are not parser inputs. For those layouts, start
from a matching A2UI example and edit its message array deliberately.

### 2. Author course content

Create an ignored task directory:

```bash
TASK_ID="$(date +%Y%m%d-%H%M%S)"
mkdir -p "outputs/$TASK_ID"
```

Write one JSON object to:

```text
outputs/<task_id>/course_content.json
```

Keep the page purposeful rather than filling every optional field. A typical
lesson combines a title and introduction, `LearningPath`, a `MentalModel` or
`ConceptCard`, a `DetailedExplanation`, and one appropriate practice activity.
Use `InteractiveSandbox` only when the code is genuinely runnable and useful;
never present fabricated execution results as real output. For literature or
poetry, `Timeline`, `ScenarioDialogue`, and matching exercises are often a
better fit than a sandbox.

### 3. Parse, validate, and sync the Viewer

```bash
python -m agent.parse_course_content \
  --input "outputs/<task_id>/course_content.json" \
  --output "outputs/<task_id>/site_messages.json" \
  --sync-viewer
```

This validates the A2UI messages after conversion. If it fails, repair
`course_content.json` using the parser contract and mapping; do not first
hand-edit the generated `site_messages.json`.

### 4. Preview the generated course

```bash
npm run viewer:dev -- --host 127.0.0.1 --port 8010
```

Open `http://127.0.0.1:8010`. The parser’s `--sync-viewer` flag supplies the
Viewer at `apps/viewer/public/generated/site_messages.json`.

Report:

```text
outputs/<task_id>/course_content.json
outputs/<task_id>/site_messages.json
apps/viewer/public/generated/site_messages.json
http://127.0.0.1:8010
```

## API-backed Viewer workflow

Use this only when the task needs API features: source ingestion, real-time
LLM generation, narration, an online interaction loop, or project/page edits.

Start the API and Viewer together:

```bash
bash start_interactive.sh --viewer-port 8010 --api-port 8008
```

The Viewer is at `http://127.0.0.1:8010` and the API is at
`http://127.0.0.1:8008`. Configure an OpenRouter key only before making a
request that calls an LLM; browsing bundled examples and direct human edits do
not need one.

For persistent local projects and editor-agent checkpoints, set
`A2LEARN_PAGE_DOCUMENT_DB_PATH` before starting the API. The Viewer’s floating
`修改案例` / `Edit case` panel supports component selection, direct human edits,
AI edit proposals with optional confirmation, history, and restore. Treat its
project and surface IDs as server-owned context; do not invent or bypass the
PageDocument API contract.

For API routes, project behavior, or embedding, read the relevant current
guide rather than relying on this summary:

- `docs/developer-guide/page-document-a2ui-poc.md` — PageDocument/project
  editing and sync semantics.
- `docs/user-guide/integration.md` — iframe, SDK, Web Component, stateless API,
  and knowledge-source integration.

## Failure handling

- Invalid JSON or validation error: fix `course_content.json` against
  `agent/generation/parser.py`; preserve the generated messages as diagnostic
  output only.
- Missing Viewer dependencies: run
  `A2LEARN_SKIP_LLM_SETUP=1 bash setup.sh`, then retry.
- API/editor failure: check `http://127.0.0.1:8008/healthz`, the configured API
  URL, and whether the requested action actually requires an LLM key.
- Never put API keys, source secrets, or private source material in generated
  course JSON, logs, examples, or commits.
