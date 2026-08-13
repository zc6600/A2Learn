import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from fastapi.testclient import TestClient

from apps.api.knowledge_store import KnowledgeStore
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

    def test_root_endpoint_returns_ok(self) -> None:
        resp = self.client.get("/")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "ok")

    def test_example_audio_endpoint_serves_whitelisted_assets(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            audio_root = Path(temporary)
            expected = b"fake-mp3"
            (audio_root / "hash-table.zh.mp3").write_bytes(expected)
            with patch("apps.api.main.example_audio_dir", audio_root):
                response = self.client.get("/api/example-audio/hash-table.zh.mp3")

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.content, expected)
            self.assertEqual(response.headers["content-type"], "audio/mpeg")
            self.assertIn("immutable", response.headers["cache-control"])

    def test_example_audio_endpoint_rejects_unknown_assets(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            with patch("apps.api.main.example_audio_dir", Path(temporary)):
                response = self.client.get("/api/example-audio/unknown.zh.mp3")

        self.assertEqual(response.status_code, 404)

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

    def test_upload_source_then_start_session_from_source_id(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source_store = KnowledgeStore(root / "knowledge.sqlite3", root / "files")
            with patch("apps.api.main.knowledge_store", source_store):
                uploaded = self.client.post(
                    "/api/knowledge/sources",
                    files={"file": ("notes.md", b"# Vectors\n\nA vector has magnitude and direction.", "text/markdown")},
                )
                self.assertEqual(uploaded.status_code, 201)
                source_id = uploaded.json()["source"]["sourceId"]

                session = SessionState(session_id="sess_source", resource_path="text-input", messages=[], surface_ids=[])
                with patch("apps.api.main.store.create", return_value=session) as create:
                    response = self.client.post("/api/session/start", json={"sourceIds": [source_id], "resourceQuery": "vector"})

                self.assertEqual(response.status_code, 200)
                self.assertIn("[Source: notes, page 1]", create.call_args.kwargs["resource_text"])

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

    def test_page_operations_endpoint_returns_a2ui_incremental_patch(self) -> None:
        document = {
            "documentId": "editor-api-page",
            "revision": 1,
            "surfaceId": "editor-api-page",
            "components": [
                {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                {"id": "title", "component": "Text", "props": {"text": "Initial"}},
            ],
        }
        created = self.client.post(
            "/api/page-documents",
            json={"actor": "human", "document": document},
        )
        self.assertEqual(created.status_code, 201)

        response = self.client.post(
            "/api/page-documents/editor-api-page/operations",
            json={
                "actor": "ai",
                "baseRevision": 1,
                "summary": "Make the title clearer",
                "operations": [
                    {"op": "set_props", "component_id": "title", "props": {"text": "Edited by AI"}}
                ],
            },
        )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["document"]["revision"], 2)
        self.assertEqual(body["sync"]["mode"], "incremental")
        changed = body["sync"]["messages"][0]["updateComponents"]["components"]
        self.assertEqual(changed[0]["text"], "Edited by AI")

    def test_page_revision_endpoint_returns_complete_source_snapshot(self) -> None:
        document = {
            "documentId": "revision-api-page",
            "revision": 1,
            "surfaceId": "revision-api-page",
            "components": [
                {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                {"id": "title", "component": "Text", "props": {"text": "Initial"}},
            ],
        }
        self.assertEqual(
            self.client.post("/api/page-documents", json={"actor": "human", "document": document}).status_code,
            201,
        )
        self.client.post(
            "/api/page-documents/revision-api-page/operations",
            json={
                "actor": "ai",
                "baseRevision": 1,
                "operations": [{"op": "set_props", "component_id": "title", "props": {"text": "Edited"}}],
            },
        )

        response = self.client.get("/api/page-documents/revision-api-page/revisions/1")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["document"]["revision"], 1)
        self.assertEqual(response.json()["document"]["components"][1]["props"]["text"], "Initial")

    def test_project_restore_endpoint_restores_a_snapshot_as_a_new_revision(self) -> None:
        document = {
            "documentId": "restore-project:main",
            "revision": 1,
            "surfaceId": "main",
            "components": [
                {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                {"id": "title", "component": "Text", "props": {"text": "Initial"}},
            ],
        }
        self.assertEqual(
            self.client.post(
                "/api/projects",
                json={"projectId": "restore-project", "source": "generated", "actor": "human", "documents": [document]},
            ).status_code,
            201,
        )
        self.assertEqual(
            self.client.post(
                "/api/page-documents/restore-project:main/operations",
                json={
                    "actor": "ai",
                    "baseRevision": 1,
                    "operations": [{"op": "set_props", "component_id": "title", "props": {"text": "Edited"}}],
                },
            ).status_code,
            200,
        )

        response = self.client.post(
            "/api/projects/restore-project/restore",
            json={"documentId": "restore-project:main", "revision": 1, "actor": "human"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["document"]["revision"], 3)
        self.assertEqual(response.json()["document"]["components"][1]["props"]["text"], "Initial")

    def test_project_endpoint_registers_multiple_page_documents(self) -> None:
        documents = [
            {
                "documentId": "generated-project:main",
                "revision": 1,
                "surfaceId": "main",
                "components": [
                    {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                    {"id": "title", "component": "Text", "props": {"text": "Main"}},
                ],
            },
            {
                "documentId": "generated-project:detail",
                "revision": 1,
                "surfaceId": "detail",
                "components": [
                    {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                    {"id": "title", "component": "Text", "props": {"text": "Detail"}},
                ],
            },
        ]

        response = self.client.post(
            "/api/projects",
            json={"projectId": "generated-project", "source": "generated", "actor": "ai", "documents": documents},
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["project"]["source"], "generated")
        self.assertEqual(response.json()["project"]["documentIds"], ["generated-project:main", "generated-project:detail"])
        fetched = self.client.get("/api/projects/generated-project")
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(len(fetched.json()["documents"]), 2)

    def test_project_component_endpoint_applies_a_human_props_replacement(self) -> None:
        document = {
            "documentId": "manual-project:main",
            "revision": 1,
            "surfaceId": "main",
            "components": [
                {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                {"id": "title", "component": "Text", "props": {"text": "Initial", "variant": "h1"}},
            ],
        }
        self.assertEqual(
            self.client.post(
                "/api/projects",
                json={"projectId": "manual-project", "source": "generated", "actor": "human", "documents": [document]},
            ).status_code,
            201,
        )

        response = self.client.post(
            "/api/projects/manual-project/components/title",
            json={"surfaceId": "main", "props": {"text": "Updated manually"}, "replaceProps": True},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["document"]["revision"], 2)
        self.assertEqual(response.json()["document"]["components"][1]["props"], {"text": "Updated manually"})
        self.assertEqual(response.json()["sync"]["mode"], "incremental")

    def test_example_project_endpoint_imports_hash_table_by_project_id(self) -> None:
        response = self.client.post("/api/projects/hash-table/ensure-example", json={"language": "zh"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["project"]["projectId"], "hash-table")
        self.assertEqual(len(response.json()["documents"]), 4)

        snapshot = self.client.get("/api/projects/hash-table/a2ui")
        self.assertEqual(snapshot.status_code, 200)
        self.assertGreater(len(snapshot.json()["messages"]), 4)

    def test_example_project_can_use_a_language_specific_storage_id(self) -> None:
        response = self.client.post(
            "/api/projects/example-en-hash-table/ensure-example",
            json={"language": "en", "exampleId": "hash-table"},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["project"]["projectId"], "example-en-hash-table")
        self.assertTrue(response.json()["documents"][0]["documentId"].startswith("example-en-hash-table:"))

    def test_create_project_from_session(self) -> None:
        session = SessionState(
            session_id="sess_to_project",
            resource_path="./docs",
            messages=_initial_messages(),
            surface_ids=["main"],
            status="ready",
        )
        with patch("apps.api.main.store.get", return_value=session):
            resp = self.client.post(
                "/api/projects/from-session",
                json={"sessionId": "sess_to_project", "projectId": "project-from-sess"},
            )
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        self.assertEqual(body["project"]["projectId"], "project-from-sess")
        self.assertEqual(body["project"]["source"], "generated")
        self.assertGreaterEqual(len(body["documents"]), 1)
        self.assertEqual(body["documents"][0]["surfaceId"], "main")

    def test_project_agent_targets_requested_surface(self) -> None:
        document = {
            "documentId": "project-agent:main",
            "revision": 1,
            "surfaceId": "main",
            "components": [
                {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                {"id": "title", "component": "Text", "props": {"text": "Main"}},
            ],
        }
        self.client.post(
            "/api/projects",
            json={"projectId": "project-agent", "source": "generated", "actor": "ai", "documents": [document]},
        )
        fake_agent = object()
        fake_events = [SimpleNamespace(event="done", data={"threadId": "project-thread"})]
        with patch("apps.api.main.build_page_editor_agent", return_value=fake_agent) as builder, patch(
            "apps.api.main.stream_page_editor_agent", return_value=iter(fake_events)
        ) as runner:
            response = self.client.post(
                "/api/projects/project-agent/agent",
                json={
                    "message": "Improve the page",
                    "surfaceId": "main",
                    "threadId": "project-thread",
                    "approvalMode": "review",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(runner.call_args.kwargs["selected_component_id"] is None)
        self.assertEqual(runner.call_args.kwargs["document_id"], "project-agent:main")
        self.assertTrue(builder.call_args.kwargs["review_before_apply"])

    def test_project_question_agent_uses_the_read_only_agent(self) -> None:
        document = {
            "documentId": "project-question:main",
            "revision": 1,
            "surfaceId": "main",
            "components": [
                {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                {"id": "title", "component": "Text", "props": {"text": "Question target"}},
            ],
        }
        self.client.post(
            "/api/projects",
            json={"projectId": "project-question", "source": "generated", "actor": "ai", "documents": [document]},
        )
        fake_events = [SimpleNamespace(event="done", data={"threadId": "question-thread"})]
        with patch("apps.api.main.build_page_question_agent", return_value=object()) as question_builder, patch(
            "apps.api.main.build_page_editor_agent"
        ) as editor_builder, patch(
            "apps.api.main.stream_page_editor_agent", return_value=iter(fake_events)
        ) as runner:
            response = self.client.post(
                "/api/projects/project-question/agent",
                json={
                    "message": "Why is this title phrased this way?",
                    "threadId": "question-thread",
                    "surfaceId": "main",
                    "componentId": "title",
                    "agentMode": "ask",
                },
            )

        self.assertEqual(response.status_code, 200)
        question_builder.assert_called_once()
        editor_builder.assert_not_called()
        self.assertEqual(runner.call_args.kwargs["selected_component_id"], "title")

    def test_project_agent_resume_rejects_a_changed_agent_mode(self) -> None:
        document = {
            "documentId": "project-question-policy:main",
            "revision": 1,
            "surfaceId": "main",
            "components": [
                {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                {"id": "title", "component": "Text", "props": {"text": "Question target"}},
            ],
        }
        self.client.post(
            "/api/projects",
            json={"projectId": "project-question-policy", "source": "generated", "actor": "ai", "documents": [document]},
        )
        with patch("apps.api.main.build_page_question_agent", return_value=object()), patch(
            "apps.api.main.stream_page_editor_agent", return_value=iter([SimpleNamespace(event="done", data={"threadId": "question-policy-thread"})])
        ):
            started = self.client.post(
                "/api/projects/project-question-policy/agent",
                json={"message": "Explain this", "threadId": "question-policy-thread", "surfaceId": "main", "agentMode": "ask"},
            )

        response = self.client.post(
            "/api/projects/project-question-policy/agent/resume",
            json={"threadId": "question-policy-thread", "surfaceId": "main", "agentMode": "edit", "response": "Continue"},
        )

        self.assertEqual(started.status_code, 200)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["detail"], "AGENT_THREAD_POLICY_MISMATCH")

    def test_project_agent_resume_uses_the_requested_surface_and_response(self) -> None:
        document = {
            "documentId": "project-agent-resume:main",
            "revision": 1,
            "surfaceId": "main",
            "components": [
                {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                {"id": "title", "component": "Text", "props": {"text": "Main"}},
            ],
        }
        self.client.post(
            "/api/projects",
            json={"projectId": "project-agent-resume", "source": "generated", "actor": "ai", "documents": [document]},
        )
        fake_agent = object()
        fake_events = [SimpleNamespace(event="done", data={"threadId": "project-thread"})]
        with patch("apps.api.main.build_page_editor_agent", return_value=fake_agent), patch(
            "apps.api.main.stream_page_editor_agent", side_effect=[iter(fake_events), iter(fake_events)]
        ) as runner:
            started = self.client.post(
                "/api/projects/project-agent-resume/agent",
                json={"message": "Improve the page", "threadId": "project-resume-thread", "surfaceId": "main"},
            )
            response = self.client.post(
                "/api/projects/project-agent-resume/agent/resume",
                json={"threadId": "project-resume-thread", "surfaceId": "main", "response": "Use the detailed option."},
            )

        self.assertEqual(started.status_code, 200)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(runner.call_args.kwargs["document_id"], "project-agent-resume:main")
        self.assertEqual(runner.call_args.kwargs["thread_id"], "project-resume-thread")
        self.assertEqual(runner.call_args.kwargs["human_response"], "Use the detailed option.")

    def test_project_agent_resume_requires_a_response_for_respond(self) -> None:
        response = self.client.post(
            "/api/projects/missing/agent/resume",
            json={"threadId": "thread-without-answer", "decision": "respond"},
        )

        self.assertEqual(response.status_code, 422)

    def test_project_agent_resume_rejects_a_changed_approval_policy(self) -> None:
        document = {
            "documentId": "project-policy:main",
            "revision": 1,
            "surfaceId": "main",
            "components": [
                {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                {"id": "title", "component": "Text", "props": {"text": "Main"}},
            ],
        }
        self.client.post(
            "/api/projects",
            json={"projectId": "project-policy", "source": "generated", "actor": "ai", "documents": [document]},
        )
        with patch("apps.api.main.build_page_editor_agent", return_value=object()), patch(
            "apps.api.main.stream_page_editor_agent", return_value=iter([SimpleNamespace(event="done", data={"threadId": "policy-thread"})])
        ):
            started = self.client.post(
                "/api/projects/project-policy/agent",
                json={"message": "Improve the page", "threadId": "policy-thread", "surfaceId": "main", "approvalMode": "review"},
            )

        response = self.client.post(
            "/api/projects/project-policy/agent/resume",
            json={"threadId": "policy-thread", "surfaceId": "main", "approvalMode": "direct", "response": "Confirm"},
        )

        self.assertEqual(started.status_code, 200)
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["detail"], "AGENT_THREAD_POLICY_MISMATCH")

    def test_put_can_restore_a_previous_snapshot_as_a_new_human_revision(self) -> None:
        document = {
            "documentId": "rollback-api-page",
            "revision": 1,
            "surfaceId": "rollback-api-page",
            "components": [
                {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                {"id": "title", "component": "Text", "props": {"text": "Initial"}},
            ],
        }
        self.assertEqual(
            self.client.post("/api/page-documents", json={"actor": "human", "document": document}).status_code,
            201,
        )
        edited = {**document, "revision": 1, "components": [document["components"][0], {"id": "title", "component": "Text", "props": {"text": "Edited"}}]}
        self.assertEqual(
            self.client.put(
                "/api/page-documents/rollback-api-page",
                json={"actor": "ai", "baseRevision": 1, "document": edited},
            ).status_code,
            200,
        )

        previous = self.client.get("/api/page-documents/rollback-api-page/revisions/1").json()["document"]
        previous["revision"] = 2
        response = self.client.put(
            "/api/page-documents/rollback-api-page",
            json={
                "actor": "human",
                "baseRevision": 2,
                "summary": "Restore initial title",
                "document": previous,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["document"]["revision"], 3)
        self.assertEqual(response.json()["document"]["components"][1]["props"]["text"], "Initial")

    def test_page_editor_agent_endpoint_streams_tool_and_assistant_events(self) -> None:
        document = {
            "documentId": "editor-chat-page",
            "revision": 1,
            "surfaceId": "editor-chat-page",
            "components": [
                {"id": "root", "component": "Column", "props": {"children": ["title"]}},
                {"id": "title", "component": "Text", "props": {"text": "Initial"}},
            ],
        }
        created = self.client.post("/api/page-documents", json={"actor": "human", "document": document})
        self.assertEqual(created.status_code, 201)
        fake_agent = object()
        fake_events = [
            SimpleNamespace(event="tool_start", data={"tool": "apply_page_operations"}),
            SimpleNamespace(event="tool_end", data={"tool": "apply_page_operations", "result": {"ok": True}}),
            SimpleNamespace(event="assistant_message", data={"text": "I updated the title."}),
            SimpleNamespace(event="done", data={"threadId": "editor-thread-1"}),
        ]
        with patch("apps.api.main.build_page_editor_agent", return_value=fake_agent), patch(
            "apps.api.main.stream_page_editor_agent", return_value=iter(fake_events)
        ) as runner:
            response = self.client.post(
                "/api/page-documents/editor-chat-page/agent",
                json={"message": "Make the title clearer", "threadId": "editor-thread-1"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("text/event-stream", response.headers["content-type"])
        self.assertIn("event: tool_start", response.text)
        self.assertIn("event: tool_end", response.text)
        self.assertIn("event: assistant_message", response.text)
        self.assertEqual(runner.call_args.kwargs["document_id"], "editor-chat-page")
        self.assertEqual(runner.call_args.kwargs["thread_id"], "editor-thread-1")

    def test_project_agent_auto_imports_example_project_if_missing(self) -> None:
        fake_events = [SimpleNamespace(event="done", data={"threadId": "auto-import-thread"})]
        with patch("apps.api.main.build_page_editor_agent", return_value=object()), patch(
            "apps.api.main.stream_page_editor_agent", return_value=iter(fake_events)
        ) as runner:
            response = self.client.post(
                "/api/projects/example-zh-hash-table/agent",
                json={"message": "Explain hash table", "surfaceId": "unknown-surface"},
            )

        self.assertEqual(response.status_code, 200)
        # Verify surface fallback to first document
        self.assertTrue(runner.call_args.kwargs["document_id"].startswith("example-zh-hash-table:"))

    def test_project_agent_auto_imports_database_lesson(self) -> None:
        fake_events = [SimpleNamespace(event="done", data={"threadId": "lesson-thread"})]
        with patch("apps.api.main.build_page_editor_agent", return_value=object()), patch(
            "apps.api.main.stream_page_editor_agent", return_value=iter(fake_events)
        ) as runner:
            response = self.client.post(
                "/api/projects/example-zh-database-basics-lesson-1/agent",
                json={"message": "What is a database?"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(runner.call_args.kwargs["document_id"], "example-zh-database-basics-lesson-1:database-basics-lesson-1")

    def test_all_examples_and_lessons_agent_endpoint_returns_200(self) -> None:
        from apps.api.example_projects import EXAMPLE_IDS
        fake_events = [SimpleNamespace(event="done", data={"threadId": "test-thread"})]
        with patch("apps.api.main.build_page_editor_agent", return_value=object()), patch(
            "apps.api.main.stream_page_editor_agent", return_value=iter(fake_events)
        ):
            for example_id in EXAMPLE_IDS:
                for prefix in ("example-zh-", "example-en-", ""):
                    project_id = f"{prefix}{example_id}" if prefix else example_id
                    with self.subTest(project_id=project_id):
                        response = self.client.post(
                            f"/api/projects/{project_id}/agent",
                            json={"message": "Test prompt"},
                        )
                        self.assertEqual(
                            response.status_code,
                            200,
                            f"Agent endpoint returned {response.status_code} for project {project_id}: {response.text}",
                        )


if __name__ == "__main__":
    unittest.main()
