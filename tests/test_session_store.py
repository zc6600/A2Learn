import threading
import time
import unittest
from unittest.mock import patch

from agent.core.config import DEFAULT_CATALOG_ID
from apps.api.session_store import SessionStore


def _wait_until_not_pending(store: SessionStore, session_id: str, timeout: float = 2.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        session = store.get(session_id)
        if session is not None and session.status != "pending":
            return
        time.sleep(0.01)
    raise AssertionError(f"session {session_id} still pending after {timeout}s")


class SessionStoreAsyncGenerationTests(unittest.TestCase):
    def test_create_returns_pending_immediately_then_becomes_ready(self) -> None:
        messages = [
            {
                "version": "v0.9",
                "createSurface": {"surfaceId": "main", "catalogId": DEFAULT_CATALOG_ID},
            },
            {
                "version": "v0.9",
                "updateComponents": {
                    "surfaceId": "main",
                    "components": [{"id": "c1", "component": "Text"}],
                },
            },
        ]
        generation_started = threading.Event()

        def fake_run_agent(**kwargs):
            generation_started.set()
            time.sleep(0.05)
            return {"a2ui_messages": messages}

        store = SessionStore()
        with patch("apps.api.session_store.run_agent", side_effect=fake_run_agent):
            session = store.create(resource_text="hello world")
            # The background thread may or may not have flipped status yet by
            # this point (that race is expected and fine); what matters is it
            # was actually started and the caller got its session_id back
            # without blocking on the sleep above.
            generation_started.wait(timeout=1.0)

        self.assertTrue(generation_started.is_set())

        _wait_until_not_pending(store, session.session_id)

        ready = store.get(session.session_id)
        self.assertEqual(ready.status, "ready")
        self.assertEqual(ready.messages, messages)
        self.assertEqual(ready.surface_ids, ["main"])
        self.assertIsNone(ready.error)

    def test_create_surfaces_generation_failures_as_error_status(self) -> None:
        def fake_run_agent(**kwargs):
            raise RuntimeError("boom: LLM call failed")

        store = SessionStore()
        with patch("apps.api.session_store.run_agent", side_effect=fake_run_agent):
            session = store.create(resource_text="hello world")

        # Whether the background thread has already flipped status by the
        # time create() returns is a race (it raises instantly here with no
        # I/O to yield on) — only the eventual state matters.
        _wait_until_not_pending(store, session.session_id)

        failed = store.get(session.session_id)
        self.assertEqual(failed.status, "error")
        self.assertIn("boom", failed.error or "")
        self.assertEqual(failed.messages, [])

    def test_client_session_id_makes_start_idempotent(self) -> None:
        generation_release = threading.Event()
        call_count = 0

        def fake_run_agent(**kwargs):
            nonlocal call_count
            call_count += 1
            generation_release.wait(timeout=1.0)
            return {
                "a2ui_messages": [
                    {
                        "version": "v0.9",
                        "createSurface": {"surfaceId": "main", "catalogId": DEFAULT_CATALOG_ID},
                    },
                    {
                        "version": "v0.9",
                        "updateComponents": {
                            "surfaceId": "main",
                            "components": [{"id": "c1", "component": "Text"}],
                        },
                    },
                ]
            }

        store = SessionStore()
        with patch("apps.api.session_store.run_agent", side_effect=fake_run_agent):
            first = store.create(resource_text="refresh-safe", session_id="sess_refresh123")
            second = store.create(resource_text="refresh-safe", session_id="sess_refresh123")
            self.assertIs(first, second)
            generation_release.set()
            _wait_until_not_pending(store, first.session_id)

        self.assertEqual(call_count, 1)

    def test_sqlite_session_store_persistence_and_factory(self) -> None:
        from apps.api.session_store import SqliteSessionStore, build_session_store

        messages = [
            {
                "version": "v0.9",
                "createSurface": {"surfaceId": "main", "catalogId": DEFAULT_CATALOG_ID},
            },
            {
                "version": "v0.9",
                "updateComponents": {
                    "surfaceId": "main",
                    "components": [{"id": "c1", "component": "Text"}],
                },
            },
        ]

        def fake_run_agent(**kwargs):
            return {"a2ui_messages": messages}

        # Factory returns SqliteSessionStore when path provided
        store1 = build_session_store(":memory:")
        self.assertIsInstance(store1, SqliteSessionStore)

        with patch("apps.api.session_store.run_agent", side_effect=fake_run_agent):
            session = store1.create(resource_text="hello world")
            _wait_until_not_pending(store1, session.session_id)

        fetched = store1.get(session.session_id)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.status, "ready")
        self.assertEqual(fetched.messages, messages)
        self.assertEqual(fetched.surface_ids, ["main"])


if __name__ == "__main__":
    unittest.main()
