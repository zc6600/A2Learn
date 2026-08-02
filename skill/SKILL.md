---
name: a2learn
description: >-
  Generate A2Learn interactive educational websites from a topic or teaching
  resource. Use this skill when the user wants a learning showcase, course
  page, quiz, learning path, interactive explanation, or A2UI website. The
  agent authors the course JSON; local A2Learn code converts it to messages
  and serves the viewer. No OpenRouter API key or external LLM pipeline is
  required.
---

# A2Learn

Use this workflow to turn a topic or local teaching material into an
interactive A2Learn website.

## Operating model

The agent is the content generator. Do not call the old LangChain/LLM
generation loop and do not ask for an OpenRouter key.

```text
topic or resource
  -> inspect the relevant rules and examples
  -> write course_content.json
  -> run the local parser and validator
  -> start the viewer
  -> return the viewer URL and output paths
```

## Locate the repository

This skill is intentionally usable when only this file was fetched from
GitHub. If the A2Learn repository is not already the current workspace, clone
it first:

```bash
git clone https://github.com/zc6600/A2Learn.git
cd A2Learn
```

Run all commands below from the repository root. Set up the local Python and
Node dependencies with:

```bash
A2LEARN_SKIP_LLM_SETUP=1 bash setup.sh
```

The local JSON-to-A2UI workflow below does not require an API key. The setup
script still supports the repository's legacy LLM generation mode, but the
environment flag skips that optional configuration for this workflow. If
dependencies are already installed, do not run setup again.

## Read only the relevant references

Before writing JSON, inspect:

- `skill/references/parser_mode_prompt.txt` for the complete content schema.
- One or two matching files in `skill/references/examples/` for final A2UI
  layout and component usage. These examples are message arrays, not the
  intermediate `course_content.json` format.
- `agent/parser.py` to verify field-to-component mappings.
- `docs/a2learn_component_design.md` when selecting unfamiliar components.

Choose examples by topic:

| Topic | Start with |
| --- | --- |
| Programming or coding | `js-async.json`, `agent-react.json` |
| Academic paper or formula | `paper-attention.json` |
| Multi-module course | `biophysics-ai.json` |
| Navigation-heavy course | `non-linear.json` |
| Dialogue or conceptual teaching | `conversational.json` |

Do not copy an example blindly. Preserve its valid structure, but write
accurate content for the user's topic. Use Chinese learner-facing text unless
the user requests another language. Only include `interactiveSandbox` for
programming topics.

## Generate and parse

Create a task directory and write the Agent-authored intermediate JSON there:

```bash
TASK_ID="$(date +%Y%m%d-%H%M%S)"
mkdir -p "outputs/$TASK_ID"
```

Write:

```text
outputs/<task_id>/course_content.json
```

The file must be a JSON object matching the schema in
`skill/references/parser_mode_prompt.txt`. Then run the deterministic local
conversion:

```bash
python -m agent.parse_course_content \
  --input "outputs/<task_id>/course_content.json" \
  --output "outputs/<task_id>/site_messages.json" \
  --sync-viewer
```

The command performs JSON parsing, conversion through `agent/parser.py`, and
A2UI validation. It makes no network or model call. Stop and fix the
intermediate JSON if validation fails.

## Legacy generation mode

The repository's existing `run_agent.py` and `skill/scripts/a2learn_cli.py`
generation commands remain supported for users who explicitly want the old
LLM-backed pipeline. Do not remove or rewrite that path when extending this
skill. This skill's default path is the local parser workflow above.

## Start the viewer

```bash
npm run viewer:dev -- --host 127.0.0.1 --port 8010
```

Return the URL shown by the dev server, normally:

```text
http://127.0.0.1:8010
```

Also report these files:

```text
outputs/<task_id>/course_content.json
outputs/<task_id>/site_messages.json
apps/viewer/public/generated/site_messages.json
```

The parser creates JSON files; only the viewer creates the browser URL.

## Failure handling

- Missing or invalid JSON: inspect and repair `course_content.json`.
- A2UI validation error: compare the relevant field with `agent/parser.py`
  and an example JSON; do not hand-edit the generated A2UI messages first.
- Viewer dependency error: run `A2LEARN_SKIP_LLM_SETUP=1 bash setup.sh`, then
  retry the viewer.
- Never expose API keys in `course_content.json`, logs, or committed files.
