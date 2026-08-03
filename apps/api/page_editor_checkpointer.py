"""Durable LangGraph checkpoint storage for the Page Editor Agent."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from langgraph.checkpoint.sqlite import SqliteSaver

DEFAULT_CHECKPOINT_PATH = "./data/a2learn-agent-checkpoints.sqlite3"


def build_page_editor_checkpointer(database_path: str | None = None) -> SqliteSaver:
    """Build a process-long, SQLite-backed saver for resumable agent threads.

    The saver owns its connection for the lifetime of the FastAPI process.
    ``check_same_thread=False`` is required because a streaming response can
    resume on a worker thread; ``SqliteSaver`` serializes its own connection
    access with an internal lock.
    """
    path = (database_path or DEFAULT_CHECKPOINT_PATH).strip()
    if path != ":memory:":
        Path(path).expanduser().parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(path, check_same_thread=False)
    saver = SqliteSaver(connection)
    saver.setup()
    return saver
