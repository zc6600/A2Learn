from __future__ import annotations

import json
import threading
import uuid
from collections import OrderedDict
from copy import deepcopy
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from agent.core.validate import validate_a2ui_messages
from agent.generation.engine import run_agent


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
    component_surfaces: dict[str, str] = field(default_factory=dict)
    action_count: int = 0
    created_at: str = field(default_factory=_now_iso)
    updated_at: str = field(default_factory=_now_iso)
    # "pending" while the background generation thread is still running the
    # 3-step LLM pipeline (plan_curriculum -> build_site -> generate_a2ui_messages),
    # which routinely takes well over Cloudflare's ~100s edge timeout for a
    # single synchronous request. The frontend polls /api/session/{id}/status
    # until this flips to "ready" (or "error") instead of blocking on /start.
    status: str = "pending"
    error: str | None = None
    target_language: str = "zh"
    generation_profile: dict[str, Any] | None = None

    def apply_messages(self, messages: list[dict[str, Any]]) -> None:
        for msg in messages:
            update = msg.get("updateComponents")
            if not isinstance(update, dict):
                continue
            surface_id = update.get("surfaceId")
            surface_id = surface_id if isinstance(surface_id, str) else ""
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
                if surface_id:
                    self.component_surfaces[cid] = surface_id


class SessionStore:
    def __init__(self, max_capacity: int = 1000) -> None:
        self._lock = threading.Lock()
        self._sessions: OrderedDict[str, SessionState] = OrderedDict()
        self._max_capacity = max_capacity

    def create(
        self,
        resource_path: str | None = None,
        resource_text: str | None = None,
        api_key: str | None = None,
        target_language: str = "zh",
        generation_profile: dict[str, Any] | None = None,
    ) -> SessionState:
        session = SessionState(
            session_id=f"sess_{uuid.uuid4().hex[:12]}",
            resource_path=resource_path or "text-input",
            messages=[],
            surface_ids=[],
            target_language=target_language,
            generation_profile=deepcopy(generation_profile),
        )
        with self._lock:
            if len(self._sessions) >= self._max_capacity:
                self._sessions.popitem(last=False)  # Remove the oldest session
            self._sessions[session.session_id] = session

        thread = threading.Thread(
            target=self._run_generation,
            args=(session, resource_path, resource_text, api_key),
            daemon=True,
        )
        thread.start()
        return session

    def _run_generation(
        self,
        session: SessionState,
        resource_path: str | None,
        resource_text: str | None,
        api_key: str | None,
    ) -> None:
        import os
        try:
            mode = os.getenv("A2LEARN_MODE", "agent")
            state = run_agent(
                resource_path=resource_path,
                resource_text=resource_text,
                mode=mode,
                api_key=api_key,
                target_language=session.target_language,
                generation_profile=session.generation_profile,
            )
            messages = self._extract_messages(state)
            validate_a2ui_messages(messages)
        except Exception as exc:
            with self._lock:
                session.status = "error"
                session.error = str(exc)
                session.updated_at = _now_iso()
            return

        with self._lock:
            session.messages = messages
            session.surface_ids = extract_surface_ids(messages)
            session.apply_messages(messages)
            session.status = "ready"
            session.updated_at = _now_iso()

    def get(self, session_id: str) -> SessionState | None:
        with self._lock:
            if session_id in self._sessions:
                self._sessions.move_to_end(session_id)  # Mark as most recently used
                return self._sessions[session_id]
            return None

    def append_messages(self, session: SessionState, messages: list[dict[str, Any]]) -> None:
        if not messages:
            return
        session.messages.extend(messages)
        session.apply_messages(messages)
        session.updated_at = _now_iso()
        with self._lock:
            self._sessions[session.session_id] = session
            self._sessions.move_to_end(session.session_id)

    @staticmethod
    def _extract_messages(state: dict[str, Any]) -> list[dict[str, Any]]:
        return extract_session_messages(state)


def extract_session_messages(state: dict[str, Any]) -> list[dict[str, Any]]:
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

import sqlite3
from typing import Any, Protocol


class SessionStoreRepository(Protocol):
    def create(
        self,
        resource_path: str | None = None,
        resource_text: str | None = None,
        api_key: str | None = None,
        target_language: str = "zh",
        generation_profile: dict[str, Any] | None = None,
    ) -> SessionState: ...

    def get(self, session_id: str) -> SessionState | None: ...

    def append_messages(self, session: SessionState, messages: list[dict[str, Any]]) -> None: ...


class SqliteSessionStore:
    """Durable Session repository backed by a SQLite database.

    Enables persistence and cross-process sharing for multi-worker FastAPI deployments.
    """

    def __init__(self, database_path: str | Path) -> None:
        self._database_path = str(database_path)
        if self._database_path != ":memory:":
            Path(self._database_path).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._connection = sqlite3.connect(self._database_path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        self._initialize_schema()

    def close(self) -> None:
        with self._lock:
            self._connection.close()

    def _initialize_schema(self) -> None:
        with self._lock:
            self._connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    resource_path TEXT NOT NULL,
                    messages_json TEXT NOT NULL,
                    surface_ids_json TEXT NOT NULL,
                    components_json TEXT NOT NULL,
                    component_surfaces_json TEXT NOT NULL,
                    action_count INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    error TEXT,
                    target_language TEXT NOT NULL,
                    generation_profile_json TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at DESC);
                """
            )

    def _save_session(self, session: SessionState) -> None:
        with self._lock:
            self._connection.execute(
                """
                INSERT OR REPLACE INTO sessions (
                    session_id, resource_path, messages_json, surface_ids_json,
                    components_json, component_surfaces_json, action_count,
                    status, error, target_language, generation_profile_json,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session.session_id,
                    session.resource_path,
                    json.dumps(session.messages, ensure_ascii=False),
                    json.dumps(session.surface_ids, ensure_ascii=False),
                    json.dumps(session.components, ensure_ascii=False),
                    json.dumps(session.component_surfaces, ensure_ascii=False),
                    session.action_count,
                    session.status,
                    session.error,
                    session.target_language,
                    json.dumps(session.generation_profile, ensure_ascii=False) if session.generation_profile else None,
                    session.created_at,
                    session.updated_at,
                ),
            )
            self._connection.commit()

    def create(
        self,
        resource_path: str | None = None,
        resource_text: str | None = None,
        api_key: str | None = None,
        target_language: str = "zh",
        generation_profile: dict[str, Any] | None = None,
    ) -> SessionState:
        session = SessionState(
            session_id=f"sess_{uuid.uuid4().hex[:12]}",
            resource_path=resource_path or "text-input",
            messages=[],
            surface_ids=[],
            target_language=target_language,
            generation_profile=deepcopy(generation_profile),
        )
        self._save_session(session)

        thread = threading.Thread(
            target=self._run_generation,
            args=(session, resource_path, resource_text, api_key),
            daemon=True,
        )
        thread.start()
        return session

    def _run_generation(
        self,
        session: SessionState,
        resource_path: str | None,
        resource_text: str | None,
        api_key: str | None,
    ) -> None:
        import os
        try:
            mode = os.getenv("A2LEARN_MODE", "agent")
            state = run_agent(
                resource_path=resource_path,
                resource_text=resource_text,
                mode=mode,
                api_key=api_key,
                target_language=session.target_language,
                generation_profile=session.generation_profile,
            )
            messages = extract_session_messages(state)
            validate_a2ui_messages(messages)
        except Exception as exc:
            session.status = "error"
            session.error = str(exc)
            session.updated_at = _now_iso()
            self._save_session(session)
            return

        session.messages = messages
        session.surface_ids = extract_surface_ids(messages)
        session.apply_messages(messages)
        session.status = "ready"
        session.updated_at = _now_iso()
        self._save_session(session)

    def get(self, session_id: str) -> SessionState | None:
        with self._lock:
            row = self._connection.execute(
                "SELECT * FROM sessions WHERE session_id = ?", (session_id,)
            ).fetchone()
        if row is None:
            return None
        return SessionState(
            session_id=row["session_id"],
            resource_path=row["resource_path"],
            messages=json.loads(row["messages_json"]),
            surface_ids=json.loads(row["surface_ids_json"]),
            components=json.loads(row["components_json"]),
            component_surfaces=json.loads(row["component_surfaces_json"]),
            action_count=row["action_count"],
            status=row["status"],
            error=row["error"],
            target_language=row["target_language"],
            generation_profile=json.loads(row["generation_profile_json"]) if row["generation_profile_json"] else None,
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def append_messages(self, session: SessionState, messages: list[dict[str, Any]]) -> None:
        if not messages:
            return
        session.messages.extend(messages)
        session.apply_messages(messages)
        session.updated_at = _now_iso()
        self._save_session(session)


def build_session_store(database_path: str | None = None) -> SessionStoreRepository:
    """Build the durable SQLite session store when configured, otherwise use memory."""
    if database_path and database_path.strip():
        return SqliteSessionStore(database_path.strip())
    return SessionStore()
