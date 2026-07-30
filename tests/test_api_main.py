import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from apps.api.main import app
from apps.api.session_store import SessionState


def _initial_messages() -> list[dict]:
    return [
        {
            "version": "v0.9",
            "createSurface": {
                "surfaceId": "main",
                "catalogId": "https://a2learn.ai/spec/v1/catalog.json",
            },
        },
        {
            "version": "v0.9",
            "updateComponents": {
                "surfaceId": "main",
                "components": [
                    {"id": "lp-1", "component": "LearningPath", "activeStepId": "step1"}
                ],
            },
        },
    ]


class ApiMainTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_start_session_returns_messages(self) -> None:
        session = SessionState(
            session_id="sess_test",
            resource_path="./docs",
            messages=_initial_messages(),
            surface_ids=["main"],
        )
        session.apply_messages(session.messages)

        with patch("apps.api.main.store.create", return_value=session):
            resp = self.client.post("/api/session/start", json={"resource_path": "./docs"})

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["session_id"], "sess_test")
        self.assertGreaterEqual(len(body["messages"]), 2)

    def test_session_status_pending_omits_messages(self) -> None:
        session = SessionState(
            session_id="sess_pending",
            resource_path="./docs",
            messages=[],
            surface_ids=[],
        )
        # status defaults to "pending"

        with patch("apps.api.main.store.get", return_value=session):
            resp = self.client.get("/api/session/sess_pending/status")

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "pending")
        self.assertEqual(body["messages"], [])
        self.assertIsNone(body["error"])

    def test_session_status_ready_includes_messages(self) -> None:
        session = SessionState(
            session_id="sess_ready",
            resource_path="./docs",
            messages=_initial_messages(),
            surface_ids=["main"],
            status="ready",
        )

        with patch("apps.api.main.store.get", return_value=session):
            resp = self.client.get("/api/session/sess_ready/status")

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "ready")
        self.assertGreaterEqual(len(body["messages"]), 2)

    def test_session_status_error_surfaces_error_message(self) -> None:
        session = SessionState(
            session_id="sess_error",
            resource_path="./docs",
            messages=[],
            surface_ids=[],
            status="error",
            error="LLM call failed",
        )

        with patch("apps.api.main.store.get", return_value=session):
            resp = self.client.get("/api/session/sess_error/status")

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "error")
        self.assertEqual(body["messages"], [])
        self.assertEqual(body["error"], "LLM call failed")

    def test_session_status_unknown_session_returns_404(self) -> None:
        with patch("apps.api.main.store.get", return_value=None):
            resp = self.client.get("/api/session/sess_missing/status")

        self.assertEqual(resp.status_code, 404)

    def test_action_accepts_incremental_update_without_create_surface(self) -> None:
        session = SessionState(
            session_id="sess_action",
            resource_path="./docs",
            messages=_initial_messages(),
            surface_ids=["main"],
        )
        session.apply_messages(session.messages)

        incremental = [
            {
                "version": "v0.9",
                "updateComponents": {
                    "surfaceId": "main",
                    "components": [
                        {"id": "lp-1", "component": "LearningPath", "activeStepId": "step2"}
                    ],
                },
            }
        ]

        with patch("apps.api.main.store.get", return_value=session), patch(
            "apps.api.main.build_action_response", return_value=incremental
        ), patch("apps.api.main.store.append_messages") as append_mock:
            resp = self.client.post(
                "/api/session/sess_action/action",
                json={
                    "action": {
                        "name": "onStepSelect",
                        "surfaceId": "main",
                        "sourceComponentId": "lp-1",
                        "context": {"stepId": "step2"},
                    }
                },
            )

        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["session_id"], "sess_action")
        self.assertEqual(len(body["messages"]), 1)
        append_mock.assert_called_once()


if __name__ == "__main__":
    unittest.main()
