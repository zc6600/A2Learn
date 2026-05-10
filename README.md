# A2Learn

## Overview

Input: resources (file or directory)

Agent Pipeline (OpenRouter + LangGraph):
- understand resource
- generate A2UI v0.9 messages in one pass
- render website by A2UI framework (@a2ui/lit + @a2ui/web_core)
- return local preview url
- agentic building (explore filesystem when building)

Output: Interactive Learning website: url

## Start

```bash 
bash setup.sh
# Optional: Pin A2UI version (commit/tag)
# A2UI_REF=<commit_or_tag> bash setup.sh
# Optional: Lock file path (default .a2ui-ref.lock)
# A2UI_LOCK_FILE=.a2ui-ref.lock bash setup.sh
```

## Run

```bash
# Recommended to put in .env (will be loaded automatically)
# OPENROUTER_API_KEY=your_key
# OPENROUTER_MODEL=deepseek/deepseek-v4-flash

# run with a resource path (A2UI renderer)
bash start.sh ./docs 8010

# Optional: Output agent results to a custom path (default syncs to viewer public)
# A2LEARN_VIEWER_MESSAGES_PATH=apps/viewer/public/generated/site_messages.json bash start.sh ./docs 8010

# Optional: Output only to outputs, do not sync to viewer directory
# A2LEARN_SYNC_VIEWER=0 bash start.sh ./docs 8010
```

This will:

- generate `outputs/<task_id>/site_messages.json`
- copy messages to `apps/viewer/public/generated/site_messages.json`
- launch A2UI viewer at `http://127.0.0.1:8010`

## Run (Interactive Online Mode)

When you want component interactive actions (e.g., `onStepSelect`) to be sent back to the Agent in real-time and receive incremental A2UI messages:

```bash
# 1) Start Session API + Viewer (one command)
bash start_interactive.sh ./docs 8010 8008
```

Default behavior:

- API Address: `http://127.0.0.1:8008`
- Viewer Address: `http://127.0.0.1:8010`
- Viewer will automatically enable online mode via `VITE_A2LEARN_API_URL`

## Workspace Commands

The project supports root workspace entry points (`apps/*` + `packages/*`):

```bash
# Run in the repository root
npm run viewer:dev
npm run viewer:gallery
npm run viewer:build
npm run embed:build
npm run build
```

## Embed / Integration

You can integrate the preview page into other websites in two ways:

- **iframe**: Deploy `apps/viewer/dist` as a static site and embed it using an iframe (supports selecting offline/online mode via URL parameters).
- **SDK / Custom Elements**: Use `@a2learn/embed` to inject parameters at runtime on the host website (suitable for online mode requiring authentication headers).

Detailed instructions: `docs/integration.md`.

Minimal examples: `examples/`.

## Runtime Config

- `A2UI_DIR`: A2UI code directory, default `third_party/A2UI`
- `A2UI_REF`: Optional, if specified, will checkout to this commit/tag and refresh the lock file
- `A2UI_LOCK_FILE`: A2UI version lock file (default `.a2ui-ref.lock`), used if `A2UI_REF` is not provided
- `A2LEARN_SYNC_VIEWER`: Whether to sync Agent results to the viewer, default `1`
- `A2LEARN_VIEWER_MESSAGES_PATH`: Sync target file, default `apps/viewer/public/generated/site_messages.json`
- `VITE_A2LEARN_MESSAGES_URL`: URL for viewer to read messages, default `/generated/site_messages.json`
- `VITE_A2LEARN_API_URL`: Session API address for viewer online mode (activates online mode when set)
- `VITE_A2LEARN_RESOURCE_PATH`: Default resource path for session startup in online mode (optional)
- `A2LEARN_DEFAULT_RESOURCE_PATH`: Default resource path used by API if `resource_path` is not provided

## A2UI Version Lock

To ensure reproducibility across team members and CI:

```bash
# 1) Specify a version once (will be written to .a2ui-ref.lock)
A2UI_REF=<commit_or_tag> bash setup.sh

# 2) Subsequent runs without A2UI_REF will automatically use the version from the lock file
bash setup.sh
```

## Docs

- `docs/discussion-summary.md`
- `docs/a2ui-integration-notes.md`
- `docs/fast-mode-design.md`
- `docs/integration.md`
- `docs/a2learn_component_design.md`
- `docs/a2learn_course_generation_architecture.md`
- `docs/a2learn_product_architecture.md`
- `docs/a2learn_website_architecture.md`

## Resources

### Review in Notion 

<https://www.notion.so/A2UI-34e2580dd0b68088822fd0e650266c97>

### A2UI

``` bash 
git clone https://github.com/google/A2UI
```
