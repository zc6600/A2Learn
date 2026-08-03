from __future__ import annotations

import json
import os
import uuid
from collections.abc import Iterator
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from langgraph.checkpoint.memory import InMemorySaver
from pydantic import BaseModel, Field

from agent.action_response import build_action_response
from agent.engine import run_agent
from agent.page_document import PageDocument
from agent.page_editor_agent import build_page_editor_agent, stream_page_editor_agent
from agent.page_operations import PageOperationError
from agent.validate import validate_a2ui_messages
from apps.api.page_document_store import (
    DocumentAlreadyExistsError,
    DocumentNotFoundError,
    PageDocumentStore,
    RevisionConflictError,
)
from apps.api.session_store import SessionState, SessionStore


class SessionStartRequest(BaseModel):
    resource_path: str | None = Field(default=None, description="Path to teaching resources (file or directory)")
    resource_text: str | None = Field(default=None, description="Direct text input to use as teaching resource")
    language: Literal["zh", "en"] = Field(default="zh", description="Learner-facing content language")


class SessionStartResponse(BaseModel):
    session_id: str
    mode: str = "online"
    # "pending" immediately after /start returns — the LLM pipeline keeps
    # running in a background thread (see SessionStore._run_generation) and
    # the caller must poll /api/session/{id}/status until this is "ready" or
    # "error". Kept synchronous+non-empty would routinely blow past
    # Cloudflare's ~100s edge timeout for a single request.
    status: str = "pending"
    messages: list[dict[str, Any]] = Field(default_factory=list)


class SessionStatusResponse(BaseModel):
    session_id: str
    status: str
    messages: list[dict[str, Any]] = Field(default_factory=list)
    error: str | None = None


class SessionActionRequest(BaseModel):
    action: dict[str, Any]


class SessionActionResponse(BaseModel):
    session_id: str
    messages: list[dict[str, Any]]
    action_count: int


class StatelessInitRequest(BaseModel):
    resource_path: str | None = Field(default=None, description="Path to teaching resources")
    resource_text: str | None = Field(default=None, description="Direct text input")
    language: Literal["zh", "en"] = Field(default="zh", description="Learner-facing content language")

class StatelessInitResponse(BaseModel):
    messages: list[dict[str, Any]]

class StatelessActionRequest(BaseModel):
    action: dict[str, Any]
    components: dict[str, dict[str, Any]] = Field(default_factory=dict, description="Current components state")
    surface_ids: list[str] = Field(default_factory=list, description="Current surface IDs")
    action_count: int = Field(default=0, description="Current action count")
    language: Literal["zh", "en"] = Field(default="zh", description="Learner-facing content language")

class StatelessActionResponse(BaseModel):
    messages: list[dict[str, Any]]


class PageDocumentWriteRequest(BaseModel):
    document: dict[str, Any]
    actor: Literal["human", "ai"]
    summary: str | None = Field(default=None, max_length=500)
    base_revision: int | None = Field(default=None, alias="baseRevision")


class PageDocumentResponse(BaseModel):
    document: dict[str, Any]
    sync: dict[str, Any] | None = None


class PageDocumentHistoryResponse(BaseModel):
    changes: list[dict[str, Any]]


class PageOperationsRequest(BaseModel):
    actor: Literal["human", "ai"]
    base_revision: int = Field(alias="baseRevision", ge=1)
    operations: list[dict[str, Any]] = Field(min_length=1, max_length=100)
    summary: str | None = Field(default=None, max_length=500)


class PageEditorAgentRequest(BaseModel):
    message: str = Field(min_length=1, max_length=20_000)
    thread_id: str | None = Field(default=None, alias="threadId", max_length=200)


app = FastAPI(title="A2Learn Session API", version="0.1.0")
store = SessionStore()
page_document_store = PageDocumentStore()
# POC-only short-term memory. A production deployment replaces this with a
# durable checkpointer keyed by the authenticated user's conversation thread.
page_editor_checkpointer = InMemorySaver()


def _cors_allowed_origins() -> list[str]:
    raw = os.getenv("A2LEARN_ALLOWED_ORIGINS", "*")
    raw = raw.strip()
    if not raw:
        return ["*"]
    if raw == "*":
        return ["*"]
    parts = [p.strip() for p in raw.split(",")]
    origins = [p for p in parts if p]
    return origins or ["*"]


_allowed_origins = _cors_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials="*" not in _allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _resolve_resource_path(req_path: str | None) -> str:
    raw_root = os.getenv("A2LEARN_RESOURCE_ROOT", "./docs")
    root = Path(raw_root).expanduser().resolve()

    default_path = os.getenv("A2LEARN_DEFAULT_RESOURCE_PATH")
    if not default_path:
        default_path = str(root)

    chosen = req_path.strip() if req_path and req_path.strip() else default_path
    candidate = Path(chosen).expanduser()
    if candidate.is_absolute():
        candidate = candidate.resolve()
    else:
        candidate_cwd = (Path.cwd() / candidate).resolve()
        if candidate_cwd.exists():
            candidate = candidate_cwd
        else:
            candidate = (root / candidate).resolve()

    try:
        common = os.path.commonpath([str(candidate), str(root)])
    except ValueError:
        common = ""
    if common != str(root):
        raise HTTPException(status_code=400, detail="RESOURCE_PATH_OUT_OF_SCOPE")
    if not candidate.exists():
        raise HTTPException(status_code=400, detail=f"Resource path not found: {candidate}")
    return str(candidate)


def _require_session(session_id: str) -> SessionState:
    session = store.get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="SESSION_NOT_FOUND")
    return session


def _sync_plan_response(plan: Any) -> dict[str, Any]:
    return {"mode": plan.mode.value, "reason": plan.reason, "messages": plan.messages}


def _parse_page_document(raw: dict[str, Any]) -> PageDocument:
    try:
        return PageDocument.from_dict(raw)
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"INVALID_PAGE_DOCUMENT: {exc}") from exc


def _extract_api_key(
    authorization: str | None = None,
    x_openrouter_api_key: str | None = None,
    x_api_key: str | None = None,
) -> str | None:
    if x_openrouter_api_key and x_openrouter_api_key.strip():
        return x_openrouter_api_key.strip()
    if x_api_key and x_api_key.strip():
        return x_api_key.strip()
    if authorization and authorization.strip():
        raw = authorization.strip()
        if raw.lower().startswith("bearer "):
            return raw[7:].strip()
        return raw
    return None


@app.get("/")
def root() -> dict[str, str]:
    return {"status": "ok", "service": "A2Learn Session API"}


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/page-documents", response_model=PageDocumentResponse, status_code=201)
def create_page_document(payload: PageDocumentWriteRequest) -> PageDocumentResponse:
    document = _parse_page_document(payload.document)
    try:
        saved, plan = page_document_store.create(document, actor=payload.actor, summary=payload.summary)
        return PageDocumentResponse(document=saved.to_dict(), sync=_sync_plan_response(plan))
    except DocumentAlreadyExistsError as exc:
        raise HTTPException(status_code=409, detail="PAGE_DOCUMENT_ALREADY_EXISTS") from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"INVALID_PAGE_DOCUMENT: {exc}") from exc


@app.get("/api/page-documents/{document_id}", response_model=PageDocumentResponse)
def get_page_document(document_id: str) -> PageDocumentResponse:
    try:
        document = page_document_store.get(document_id)
        return PageDocumentResponse(document=document.to_dict())
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc


@app.put("/api/page-documents/{document_id}", response_model=PageDocumentResponse)
def update_page_document(document_id: str, payload: PageDocumentWriteRequest) -> PageDocumentResponse:
    if payload.base_revision is None:
        raise HTTPException(status_code=422, detail="baseRevision is required for updates.")
    document = _parse_page_document(payload.document)
    try:
        saved, plan = page_document_store.update(
            document_id,
            document,
            base_revision=payload.base_revision,
            actor=payload.actor,
            summary=payload.summary,
        )
        return PageDocumentResponse(document=saved.to_dict(), sync=_sync_plan_response(plan))
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc
    except RevisionConflictError as exc:
        raise HTTPException(
            status_code=409,
            detail={"code": "PAGE_DOCUMENT_REVISION_CONFLICT", "currentRevision": exc.current_revision},
        ) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"INVALID_PAGE_DOCUMENT: {exc}") from exc


@app.post("/api/page-documents/{document_id}/operations", response_model=PageDocumentResponse)
def apply_page_document_operations(document_id: str, payload: PageOperationsRequest) -> PageDocumentResponse:
    try:
        saved, plan = page_document_store.apply_operations(
            document_id,
            payload.operations,
            base_revision=payload.base_revision,
            actor=payload.actor,
            summary=payload.summary,
        )
        return PageDocumentResponse(document=saved.to_dict(), sync=_sync_plan_response(plan))
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc
    except RevisionConflictError as exc:
        raise HTTPException(
            status_code=409,
            detail={"code": "PAGE_DOCUMENT_REVISION_CONFLICT", "currentRevision": exc.current_revision},
        ) from exc
    except PageOperationError as exc:
        raise HTTPException(status_code=422, detail=f"INVALID_PAGE_OPERATION: {exc}") from exc


def _encode_sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/api/page-documents/{document_id}/agent")
def run_page_document_editor_agent(
    document_id: str,
    payload: PageEditorAgentRequest,
    authorization: str | None = Header(default=None),
    x_openrouter_api_key: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> StreamingResponse:
    try:
        page_document_store.get(document_id)
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc

    thread_id = payload.thread_id or f"editor_{document_id}_{uuid.uuid4().hex}"
    api_key = _extract_api_key(authorization, x_openrouter_api_key, x_api_key)
    try:
        agent = build_page_editor_agent(api_key, checkpointer=page_editor_checkpointer)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=f"PAGE_EDITOR_AGENT_UNAVAILABLE: {exc}") from exc

    def events() -> Iterator[str]:
        try:
            for event in stream_page_editor_agent(
                agent,
                payload.message,
                document_id=document_id,
                # Authentication has not yet been introduced to this POC. Do
                # not accept an arbitrary user id from the caller; use a
                # neutral value until middleware derives it from verified
                # auth claims.
                user_id="anonymous",
                page_document_store=page_document_store,
                thread_id=thread_id,
            ):
                yield _encode_sse(event.event, event.data)
        except Exception as exc:  # noqa: BLE001 - provider errors can occur after response headers are sent.
            yield _encode_sse("error", {"message": str(exc)})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/page-documents/{document_id}/a2ui")
def page_document_a2ui_snapshot(document_id: str) -> dict[str, Any]:
    try:
        return _sync_plan_response(page_document_store.snapshot(document_id))
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc


@app.get("/api/page-documents/{document_id}/history", response_model=PageDocumentHistoryResponse)
def page_document_history(document_id: str) -> PageDocumentHistoryResponse:
    try:
        return PageDocumentHistoryResponse(changes=[change.to_dict() for change in page_document_store.history(document_id)])
    except DocumentNotFoundError as exc:
        raise HTTPException(status_code=404, detail="PAGE_DOCUMENT_NOT_FOUND") from exc


@app.post("/api/session/start", response_model=SessionStartResponse)
def start_session(
    payload: SessionStartRequest,
    authorization: str | None = Header(default=None),
    x_openrouter_api_key: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> SessionStartResponse:
    api_key = _extract_api_key(authorization, x_openrouter_api_key, x_api_key)
    resource_path = None
    resource_text = payload.resource_text or os.getenv("A2LEARN_DEFAULT_RESOURCE_TEXT")

    if not resource_text:
        if not payload.resource_path and not os.getenv("A2LEARN_DEFAULT_RESOURCE_PATH"):
            raise HTTPException(status_code=400, detail="Either resource_path or resource_text must be provided")
        resource_path = _resolve_resource_path(payload.resource_path)
        
    try:
        session = store.create(
            resource_path=resource_path,
            resource_text=resource_text,
            api_key=api_key,
            target_language=payload.language,
        )
        return SessionStartResponse(session_id=session.session_id, status=session.status, messages=session.messages)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"SESSION_START_FAILED: {exc}") from exc


@app.get("/api/session/{session_id}/status", response_model=SessionStatusResponse)
def session_status(session_id: str) -> SessionStatusResponse:
    session = _require_session(session_id)
    return SessionStatusResponse(
        session_id=session.session_id,
        status=session.status,
        messages=session.messages if session.status == "ready" else [],
        error=session.error,
    )


@app.post("/api/session/{session_id}/action", response_model=SessionActionResponse)
def handle_action(session_id: str, payload: SessionActionRequest) -> SessionActionResponse:
    session = _require_session(session_id)
    try:
        session.action_count += 1
        messages = build_action_response(
            action=payload.action,
            components=session.components,
            component_surfaces=session.component_surfaces,
            surface_ids=session.surface_ids,
            action_count=session.action_count,
            target_language=session.target_language,
        )
        if messages:
            validate_a2ui_messages(messages, require_create_surface=False)
            store.append_messages(session, messages)
        return SessionActionResponse(
            session_id=session.session_id,
            messages=messages,
            action_count=session.action_count,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"ACTION_HANDLE_FAILED: {exc}") from exc


@app.post("/api/stateless/init", response_model=StatelessInitResponse)
def stateless_init(
    payload: StatelessInitRequest,
    authorization: str | None = Header(default=None),
    x_openrouter_api_key: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> StatelessInitResponse:
    api_key = _extract_api_key(authorization, x_openrouter_api_key, x_api_key)
    resource_path = None
    resource_text = payload.resource_text or os.getenv("A2LEARN_DEFAULT_RESOURCE_TEXT")

    if not resource_text:
        if not payload.resource_path and not os.getenv("A2LEARN_DEFAULT_RESOURCE_PATH"):
            raise HTTPException(status_code=400, detail="Either resource_path or resource_text must be provided")
        resource_path = _resolve_resource_path(payload.resource_path)
        
    try:
        mode = os.getenv("A2LEARN_MODE", "agent")
        state = run_agent(
            resource_path=resource_path,
            resource_text=resource_text,
            mode=mode,
            api_key=api_key,
            target_language=payload.language,
        )
        messages = SessionStore._extract_messages(state)
        validate_a2ui_messages(messages)
        return StatelessInitResponse(messages=messages)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"STATELESS_INIT_FAILED: {exc}") from exc


@app.post("/api/stateless/action", response_model=StatelessActionResponse)
def stateless_action(payload: StatelessActionRequest) -> StatelessActionResponse:
    try:
        messages = build_action_response(
            action=payload.action,
            components=payload.components,
            surface_ids=payload.surface_ids,
            action_count=payload.action_count + 1,
            target_language=payload.language,
        )
        if messages:
            validate_a2ui_messages(messages, require_create_surface=False)
        return StatelessActionResponse(messages=messages or [])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"STATELESS_ACTION_FAILED: {exc}") from exc
