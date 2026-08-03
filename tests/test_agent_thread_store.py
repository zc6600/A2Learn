import sqlite3
import tempfile
import unittest
from pathlib import Path

from apps.api.agent_thread_store import AgentThreadRecord, SqliteAgentThreadStore


class AgentThreadStoreTests(unittest.TestCase):
    def test_existing_editor_threads_are_migrated_to_edit_mode(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            database_path = Path(temporary_directory) / "threads.sqlite3"
            connection = sqlite3.connect(database_path)
            connection.execute(
                """
                CREATE TABLE page_editor_threads (
                    thread_id TEXT PRIMARY KEY,
                    project_id TEXT NOT NULL,
                    document_id TEXT NOT NULL,
                    surface_id TEXT NOT NULL,
                    approval_mode TEXT NOT NULL
                )
                """
            )
            connection.execute(
                "INSERT INTO page_editor_threads VALUES ('legacy-thread', 'project', 'document', 'surface', 'direct')"
            )
            connection.commit()
            connection.close()

            store = SqliteAgentThreadStore(str(database_path))
            legacy = store.get("legacy-thread")
            created = store.create_or_get(
                AgentThreadRecord("question-thread", "project", "document", "surface", "direct", "ask")
            )

        self.assertEqual(legacy.agent_mode, "edit")
        self.assertEqual(created.agent_mode, "ask")


if __name__ == "__main__":
    unittest.main()
