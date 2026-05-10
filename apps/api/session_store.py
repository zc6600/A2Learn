from __future__ import annotations

import json
import threading
import uuid
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from agent.engine import run_agent


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def extract_surface_ids(messages: list[dict[str, Any]]) -> list[str]:
    surface_ids: list[str] = []
    seen: set[str] = set()
    for msg in messages:
        create = msg.get("createSurface")
        if isinstance(create, dict):
            sid = create.get("surfaceId")
            if isinstance(sid, str) and sid not in seen:
                seen.add(sid)
                surface_ids.append(sid)
        update = msg.get("updateComponents")
        if isinstance(update, dict):
            sid = update.get("surfaceId")
            if isinstance(sid, str) and sid not in seen:
                seen.add(sid)
                surface_ids.append(sid)
    return surface_ids


@dataclass
class SessionState:
    session_id: str
    resource_path: str
    messages: list[dict[str, Any]]
    surface_ids: list[str]
    components: dict[str, dict[str, Any]] = field(default_factory=dict)
    action_count: int = 0
    created_at: str = field(default_factory=_now_iso)
    updated_at: str = field(default_factory=_now_iso)

    def apply_messages(self, messages: list[dict[str, Any]]) -> None:
        for msg in messages:
            update = msg.get("updateComponents")
            if not isinstance(update, dict):
                continue
            comps = update.get("components")
            if not isinstance(comps, list):
                continue
            for comp in comps:
                if not isinstance(comp, dict):
                    continue
                cid = comp.get("id")
                if not isinstance(cid, str):
                    continue
                existing = self.components.get(cid, {})
                self.components[cid] = {**existing, **deepcopy(comp)}


class SessionStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._sessions: dict[str, SessionState] = {}

    def create(self, resource_path: str) -> SessionState:
        state = run_agent(resource_path)
        messages = self._extract_messages(state)
        session = SessionState(
            session_id=f"sess_{uuid.uuid4().hex[:12]}",
            resource_path=resource_path,
            messages=messages,
            surface_ids=extract_surface_ids(messages),
        )
        session.apply_messages(messages)
        with self._lock:
            self._sessions[session.session_id] = session
        return session

    def get(self, session_id: str) -> SessionState | None:
        with self._lock:
            return self._sessions.get(session_id)

    def append_messages(self, session: SessionState, messages: list[dict[str, Any]]) -> None:
        if not messages:
            return
        session.messages.extend(messages)
        session.apply_messages(messages)
        session.updated_at = _now_iso()
        with self._lock:
            self._sessions[session.session_id] = session

    @staticmethod
    def _extract_messages(state: dict[str, Any]) -> list[dict[str, Any]]:
        messages = state.get("a2ui_messages")
        if isinstance(messages, list):
            return messages
        output_messages_path = state.get("output_messages_path")
        if isinstance(output_messages_path, str) and output_messages_path:
            raw = Path(output_messages_path).read_text(encoding="utf-8")
            loaded = json.loads(raw)
            if isinstance(loaded, list):
                return loaded
        raise ValueError("Unable to extract initial A2UI messages from agent output.")
