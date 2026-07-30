from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agent.action_response import build_action_response
from agent.engine import run_agent
from agent.validate import validate_a2ui_messages
from apps.api.session_store import SessionState, SessionStore


class SessionStartRequest(BaseModel):
    resource_path: str | None = Field(default=None, description="Path to teaching resources (file or directory)")
    resource_text: str | None = Field(default=None, description="Direct text input to use as teaching resource")


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

class StatelessInitResponse(BaseModel):
    messages: list[dict[str, Any]]

class StatelessActionRequest(BaseModel):
    action: dict[str, Any]
    components: dict[str, dict[str, Any]] = Field(default_factory=dict, description="Current components state")
    surface_ids: list[str] = Field(default_factory=list, description="Current surface IDs")
    action_count: int = Field(default=0, description="Current action count")

class StatelessActionResponse(BaseModel):
    messages: list[dict[str, Any]]


app = FastAPI(title="A2Learn Session API", version="0.1.0")
store = SessionStore()


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
    except Exception:
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


from fastapi import FastAPI, Header, HTTPException


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


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


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
        session = store.create(resource_path=resource_path, resource_text=resource_text, api_key=api_key)
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
        state = run_agent(resource_path=resource_path, resource_text=resource_text, mode=mode, api_key=api_key)
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
        )
        if messages:
            validate_a2ui_messages(messages, require_create_surface=False)
        return StatelessActionResponse(messages=messages or [])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"STATELESS_ACTION_FAILED: {exc}") from exc
