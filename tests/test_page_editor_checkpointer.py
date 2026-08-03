import tempfile
import unittest
import uuid
from pathlib import Path

from apps.api.page_editor_checkpointer import build_page_editor_checkpointer


class PageEditorCheckpointerTests(unittest.TestCase):
    def test_sqlite_checkpoint_survives_reopening_the_database(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            database_path = Path(temporary_directory) / "agent-checkpoints.sqlite3"
            config = {"configurable": {"thread_id": "thread-1", "checkpoint_ns": ""}}
            checkpoint = {
                "v": 1,
                "id": str(uuid.uuid4()),
                "ts": "2026-08-03T00:00:00+00:00",
                "channel_values": {},
                "channel_versions": {},
                "versions_seen": {},
                "pending_sends": [],
            }
            saver = build_page_editor_checkpointer(str(database_path))
            saver.put(config, checkpoint, {}, {})
            saver.conn.close()

            reopened = build_page_editor_checkpointer(str(database_path))
            stored = reopened.get_tuple(config)
            reopened.conn.close()

        self.assertIsNotNone(stored)
        self.assertEqual(stored.config["configurable"]["thread_id"], "thread-1")
