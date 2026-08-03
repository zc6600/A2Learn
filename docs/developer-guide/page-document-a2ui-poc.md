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
| `PUT /api/page-documents/{id}` | Submit an edited document with `baseRevision`; return an incremental patch or a reset/snapshot plan. |
| `GET /api/page-documents/{id}/a2ui` | Get a fresh snapshot for a newly connected or resynchronized renderer. |
| `GET /api/page-documents/{id}/history` | Inspect human/AI revision metadata. |

The update request includes `actor` (`human` or `ai`), `summary`, `baseRevision`, and `document`. The submitted document keeps the base revision. The server validates the optimistic lock and assigns the next revision atomically. A stale write receives `409 PAGE_DOCUMENT_REVISION_CONFLICT` with the current revision.

This store is intentionally in-memory and is suitable only for the POC. Production should persist both documents and revision records in a transactional database, with authentication-derived actor identity rather than a caller-provided `actor` field.

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
