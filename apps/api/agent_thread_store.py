"""Persistent ownership and policy records for Page Editor Agent threads."""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Literal, Protocol

ApprovalMode = Literal["direct", "review"]
AgentMode = Literal["ask", "edit"]


class AgentThreadNotFoundError(KeyError):
    pass


class AgentThreadConflictError(ValueError):
    pass


@dataclass(frozen=True)
class AgentThreadRecord:
    thread_id: str
    project_id: str
    document_id: str
    surface_id: str
    approval_mode: ApprovalMode
    agent_mode: AgentMode = "edit"


class AgentThreadRepository(Protocol):
    def create_or_get(self, record: AgentThreadRecord) -> AgentThreadRecord: ...

    def get(self, thread_id: str) -> AgentThreadRecord: ...


class SqliteAgentThreadStore:
    """Small SQLite registry that prevents a thread changing its agent policy."""

    def __init__(self, database_path: str) -> None:
        self._database_path = database_path
        if database_path != ":memory:":
            Path(database_path).expanduser().parent.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        self._connection = sqlite3.connect(database_path, check_same_thread=False)
        self._connection.row_factory = sqlite3.Row
        with self._connection:
            self._connection.execute(
                """
                CREATE TABLE IF NOT EXISTS page_editor_threads (
                    thread_id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    document_id TEXT NOT NULL,
                    surface_id TEXT NOT NULL,
                    approval_mode TEXT NOT NULL CHECK (approval_mode IN ('direct', 'review')),
                    agent_mode TEXT NOT NULL DEFAULT 'edit' CHECK (agent_mode IN ('ask', 'edit'))
                )
                """
            )
            columns = {row["name"] for row in self._connection.execute("PRAGMA table_info(page_editor_threads)")}
            if "agent_mode" not in columns:
                # Existing databases predate the read-only Q&A mode. Their
                # threads were all editor threads, so this default preserves
                # the old permission boundary during a rolling upgrade.
                self._connection.execute(
                    "ALTER TABLE page_editor_threads ADD COLUMN agent_mode TEXT NOT NULL DEFAULT 'edit'"
                )

    def create_or_get(self, record: AgentThreadRecord) -> AgentThreadRecord:
        with self._lock, self._connection:
            row = self._connection.execute(
                "SELECT thread_id, project_id, document_id, surface_id, approval_mode, agent_mode FROM page_editor_threads WHERE thread_id = ?",
                (record.thread_id,),
            ).fetchone()
            if row is None:
                self._connection.execute(
                    "INSERT INTO page_editor_threads (thread_id, project_id, document_id, surface_id, approval_mode, agent_mode) VALUES (?, ?, ?, ?, ?, ?)",
                    (record.thread_id, record.project_id, record.document_id, record.surface_id, record.approval_mode, record.agent_mode),
                )
                return record
        return self._record_from_row(row)

    def get(self, thread_id: str) -> AgentThreadRecord:
        with self._lock:
            row = self._connection.execute(
                "SELECT thread_id, project_id, document_id, surface_id, approval_mode, agent_mode FROM page_editor_threads WHERE thread_id = ?",
                (thread_id,),
            ).fetchone()
        if row is None:
            raise AgentThreadNotFoundError(thread_id)
        return self._record_from_row(row)

    @staticmethod
    def _record_from_row(row: sqlite3.Row) -> AgentThreadRecord:
        return AgentThreadRecord(
            thread_id=row["thread_id"],
            project_id=row["project_id"],
            document_id=row["document_id"],
            surface_id=row["surface_id"],
            approval_mode=row["approval_mode"],
            agent_mode=row["agent_mode"],
        )
