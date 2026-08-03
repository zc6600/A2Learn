# PageDocument → A2UI POC

This branch proves the synchronization boundary needed for shared human/AI page editing.

`PageDocument` is the persisted authoring model. Both a human editor and an AI agent submit a new, versioned document (or a domain operation which produces one). The compiler alone produces A2UI v0.9 messages for a renderer session.

```text
human editor / AI agent
          │  revisioned PageDocument
          ▼
  PageDocument service ── previous + current ──> A2uiCompiler
                                                   │
                          ┌────────────────────────┴───────────────────────┐
                          ▼                                                ▼
                      incremental                                      reset + snapshot
              updateComponents / updateDataModel       deleteSurface → createSurface → full state
```

The prototype uses these rules:

| Condition | A2UI output |
| --- | --- |
| Renderer has no prior document | `createSurface` + all components + complete data model |
| Same surface, same catalog/theme, only a local component or data change | changed `updateComponents` entries and/or JSON-Pointer `updateDataModel` patches |
| Component removed | reset the surface, then send a snapshot |
| Surface ID, catalog, or theme changed | reset the surface, then send a snapshot |
| At least 60% of components changed | reset the surface, then send a snapshot |

The reset rule is important: A2UI v0.9 can upsert components but has no single-component deletion message. Re-sending a full `updateComponents` list into the old surface leaves deleted component records in the client model. A `deleteSurface` followed by `createSurface` is the safe full-refresh operation.

The executable POC is in `agent/page_document.py`, with coverage in `tests/test_page_document.py`.

## API proof of concept

The FastAPI server exposes one write path for both actors:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/page-documents` | Create revision 1 and return an A2UI snapshot. |
| `GET /api/page-documents/{id}` | Read the current source document. |
| `GET /api/page-documents/{id}/revisions/{revision}` | Read an immutable complete PageDocument snapshot. |
| `PUT /api/page-documents/{id}` | Submit an edited document with `baseRevision`; return an incremental patch or a reset/snapshot plan. |
| `POST /api/page-documents/{id}/operations` | Apply a constrained human or AI operation against `baseRevision`. |
| `GET /api/page-documents/{id}/a2ui` | Get a fresh snapshot for a newly connected or resynchronized renderer. |
| `GET /api/page-documents/{id}/history` | Inspect human/AI revision metadata. |

The update request includes `actor` (`human` or `ai`), `summary`, `baseRevision`, and `document`. The submitted document keeps the base revision. The server validates the optimistic lock and assigns the next revision atomically. A stale write receives `409 PAGE_DOCUMENT_REVISION_CONFLICT` with the current revision.

The constrained operations endpoint uses the same operation contract as the
Agent tool. For example, a human client changes one component with:

```json
{
  "actor": "human",
  "baseRevision": 3,
  "operations": [
    {"op": "set_props", "component_id": "title", "props": {"text": "New title"}}
  ]
}
```

The currently supported operations are `set_props`, `insert_component`, and
leaf-only `remove_component`. The snake_case fields are intentional: this is
the shared tool contract, not a separately shaped browser-only API.

This store is intentionally in-memory and is suitable only for the POC. Production should persist both documents and revision records in a transactional database, with authentication-derived actor identity rather than a caller-provided `actor` field.

For a persistent local POC, configure the SQLite path before starting FastAPI:

```bash
export A2LEARN_PAGE_DOCUMENT_DB_PATH=./data/page-documents.sqlite3
uv run uvicorn apps.api.main:app --reload
```

If the variable is unset, the API uses the in-memory repository. This keeps
tests and disposable experiments isolated; the SQLite repository creates its
parent directory and schema on first startup.

The Page Editor Agent's LangGraph checkpoint is SQLite-backed as well. It
defaults to `./data/a2learn-agent-checkpoints.sqlite3`, or shares
`A2LEARN_PAGE_DOCUMENT_DB_PATH` when that variable is configured. Set
`A2LEARN_AGENT_CHECKPOINT_DB_PATH` only when checkpoints should use a separate
database file. This makes a paused human-in-the-loop approval resumable after
an API restart.

## Floating Editor Agent

The Viewer keeps its existing learning-page structure, surface tabs, and hash
navigation. It adds only a small fixed bottom-right `修改案例` launcher
(`Edit case` in English). The
launcher derives the current example/project from the existing selection and
sends Agent requests with the current surface as context. A successful
`tool_end` applies `result.sync.messages` to the existing `MessageProcessor`;
the final `assistant_message` is explanatory text only.

The panel also creates a minimal generated project without replacing the
Viewer shell. Its explicit component-picker mode uses the A2UI component IDs
stamped into rendered Shadow DOM nodes, so ordinary component interaction is
unaffected. The selected ID is sent to the editor Agent as trusted context.

Revision numbers remain an internal concurrency/audit mechanism. They are not
shown as editor UI to learners.

## Project identity compatibility layer

Examples and user-generated pages use a project-level identity such as
`hash-table` or `user-project-123`. A project groups one or more surface-level
PageDocuments without changing the existing PageDocument endpoints:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/projects` | Register an example or generated project with one or more PageDocuments. |
| `GET /api/projects/{id}` | Read the project metadata and its current surface documents. |
| `POST /api/projects/{id}/ensure-example` | Import a bundled example by stable project ID on first access. |
| `GET /api/projects/{id}/history` | Aggregate revision history across the project's surfaces. |
| `GET /api/projects/{id}/a2ui` | Return the combined A2UI snapshot for all project surfaces. |
| `POST /api/projects/{id}/agent` | Run the editing Agent against the requested `surfaceId`. |

`source` is either `example` or `generated`. When
`A2LEARN_PAGE_DOCUMENT_DB_PATH` is configured, project metadata is persisted
in that same SQLite database alongside the PageDocuments. Without it, both
stores intentionally remain in memory for tests and disposable local runs.
The SQLite ProjectStore owns project creation and uses the PageDocument
repository's shared transaction, so a failed project-map insert rolls back the
new PageDocuments as well.
This is an anonymous workspace model: project IDs are opaque UUIDs, not user
accounts or permissions. The Editor/Agent context is bound to
`projectId + surfaceId`, while the legacy `/api/page-documents/*` routes stay
available.

## Anonymous workspace history

Every PageDocument revision stores a complete source snapshot. The restore
endpoints make an earlier snapshot the *next* revision rather than mutating
history:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/page-documents/{id}/revisions/{revision}/restore` | Restore one document snapshot. |
| `POST /api/projects/{id}/restore` | Restore a document owned by a project. |

The floating editor lists change summaries and timestamps, not revision
numbers. A restore is explicit and produces normal A2UI sync messages, so the
currently rendered surface updates immediately.

## Human component edits

The Viewer supports direct human editing without exposing component JSON.
Double-clicking a supported rendered component opens a small field-based editor
beside it. The schema covers scalar fields and editable list entries for the
learning cards, paths, sections, resources, timelines, dialogues, quizzes,
code, flashcards, figures, knowledge trees, course outlines, papers,
references, matching exercises, and formula derivations. It sends only changed props through
`POST /api/projects/{id}/components/{componentId}`, using a human-authored
`set_props` operation. This keeps human and AI changes on the same
PageDocument history and renderer sync path.

For example, the first access to `hash-table` can import its four bundled
surfaces with:

```bash
curl -X POST http://localhost:8008/api/projects/hash-table/ensure-example \
  -H 'Content-Type: application/json' \
  -d '{"language":"zh"}'
```

## Page Editor Agent POC

`agent/page_editor_agent.py` defines a separate LangChain v1 `create_agent`
agent for conversational editing. It receives `document_id`, user identity, and
the PageDocument Store through LangChain runtime context, so the model does not
choose those trusted values. It can call `get_page_document`,
`get_page_history`, and `apply_page_operations`.

`POST /api/page-documents/{id}/agent` accepts a chat message and optional
`threadId`, returning a Server-Sent Events stream. The stream preserves the
actual agent-loop ordering: `tool_start`, `tool_end`, `assistant_message`, and
`done`. A successful `tool_end` contains
`data.result.sync.messages`, which the frontend applies immediately through
the existing A2UI `MessageProcessor`; only then does the Agent's final text
arrive. The endpoint uses an in-memory LangGraph checkpointer only for this
POC; production must use a durable checkpointer and derive user identity from
authentication.
