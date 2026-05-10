from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agent.action_response import build_action_response
from agent.validate import validate_a2ui_messages
from apps.api.session_store import SessionState, SessionStore


class SessionStartRequest(BaseModel):
    resource_path: str | None = Field(default=None, description="Path to teaching resources (file or directory)")


class SessionStartResponse(BaseModel):
    session_id: str
    mode: str = "online"
    messages: list[dict[str, Any]]


class SessionActionRequest(BaseModel):
    action: dict[str, Any]


class SessionActionResponse(BaseModel):
    session_id: str
    messages: list[dict[str, Any]]
    action_count: int


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
    if not candidate.is_absolute():
        candidate = (root / candidate).resolve()
    else:
        candidate = candidate.resolve()

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


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/session/start", response_model=SessionStartResponse)
def start_session(payload: SessionStartRequest) -> SessionStartResponse:
    resource_path = _resolve_resource_path(payload.resource_path)
    try:
        session = store.create(resource_path)
        validate_a2ui_messages(session.messages)
        return SessionStartResponse(session_id=session.session_id, messages=session.messages)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"SESSION_START_FAILED: {exc}") from exc


@app.post("/api/session/{session_id}/action", response_model=SessionActionResponse)
def handle_action(session_id: str, payload: SessionActionRequest) -> SessionActionResponse:
    session = _require_session(session_id)
    try:
        session.action_count += 1
        messages = build_action_response(
            action=payload.action,
            components=session.components,
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
