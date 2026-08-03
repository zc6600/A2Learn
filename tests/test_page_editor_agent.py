import unittest
from types import SimpleNamespace
from unittest.mock import patch

from langchain_openai import ChatOpenAI
from langgraph.types import Command

from agent.page_editor_agent import (
    PAGE_EDITOR_TOOLS,
    build_page_editor_agent,
    create_page_editor_agent,
    stream_page_editor_agent,
)
from apps.api.page_document_store import PageDocumentStore


class PageEditorAgentTests(unittest.TestCase):
    def test_agent_uses_current_create_agent_api_with_tools(self) -> None:
        # Construction is local: this does not call OpenAI/OpenRouter. It
        # verifies that the installed LangChain v1 accepts the runtime-aware
        # tools and returns a compiled graph.
        model = ChatOpenAI(model="test-model", api_key="test-key", base_url="https://example.invalid/v1")

        agent = create_page_editor_agent(model)

        self.assertEqual(agent.name, "page_editor")
        self.assertEqual([tool.name for tool in PAGE_EDITOR_TOOLS], [
            "get_page_document",
            "get_page_history",
            "ask_user",
            "apply_page_operations",
        ])

    def test_build_page_editor_agent_uses_editor_specific_llm_factory(self) -> None:
        model = ChatOpenAI(model="test-model", api_key="test-key", base_url="https://example.invalid/v1")

        with patch("agent.page_editor_agent.build_page_editor_llm", return_value=model) as factory:
            agent = build_page_editor_agent("visitor-key")

        factory.assert_called_once_with("visitor-key")
        self.assertEqual(agent.name, "page_editor")

    def test_stream_emits_tool_then_assistant_events_in_execution_order(self) -> None:
        sync = {"mode": "incremental", "reason": "localized", "messages": [{"version": "v0.9"}]}
        fake_agent = SimpleNamespace(
            stream=lambda *_args, **_kwargs: [
                {"model": {"messages": [SimpleNamespace(tool_calls=[{"name": "apply_page_operations"}], type="ai")]}},
                {"tools": {"messages": [SimpleNamespace(name="apply_page_operations", content={"ok": True, "sync": sync}, type="tool")]}},
                {"model": {"messages": [SimpleNamespace(content="Title updated.", type="ai", tool_calls=[])]}},
            ]
        )
        events = list(stream_page_editor_agent(
            fake_agent,
            "Make the title clearer",
            document_id="lesson-1",
            user_id="user-1",
            page_document_store=PageDocumentStore(),
            thread_id="thread-1",
        ))

        self.assertEqual([event.event for event in events], ["tool_start", "tool_end", "assistant_message", "done"])
        self.assertEqual(events[1].data["result"]["sync"], sync)
        self.assertEqual(events[2].data["text"], "Title updated.")

    def test_stream_stops_after_an_invalid_page_operation(self) -> None:
        fake_agent = SimpleNamespace(
            stream=lambda *_args, **_kwargs: [
                {"model": {"messages": [SimpleNamespace(tool_calls=[{"name": "apply_page_operations"}], type="ai")]}},
                {"tools": {"messages": [SimpleNamespace(
                    name="apply_page_operations",
                    content={"ok": False, "error": "INVALID_PAGE_OPERATION", "detail": "component_id must be a non-empty string."},
                    type="tool",
                )]}},
                {"model": {"messages": [SimpleNamespace(content="This must not be emitted.", type="ai", tool_calls=[])]}},
            ]
        )

        events = list(stream_page_editor_agent(
            fake_agent,
            "Make the title more sophisticated",
            document_id="lesson-1",
            user_id="user-1",
            page_document_store=PageDocumentStore(),
            thread_id="thread-1",
        ))

        self.assertEqual([event.event for event in events], ["tool_start", "tool_end", "error", "done"])
        self.assertIn("component_id must be a non-empty string", events[2].data["message"])

    def test_stream_emits_a_frontend_safe_human_input_request(self) -> None:
        fake_agent = SimpleNamespace(
            stream=lambda *_args, **_kwargs: [
                {"__interrupt__": (SimpleNamespace(value={"action_requests": [{
                    "name": "ask_user",
                    "arguments": {"question": "Which tone should I use?", "options": ["Concise", "Detailed"]},
                }]}),)},
            ]
        )

        events = list(stream_page_editor_agent(
            fake_agent,
            "Improve the title",
            document_id="lesson-1",
            user_id="user-1",
            page_document_store=PageDocumentStore(),
            thread_id="thread-1",
        ))

        self.assertEqual([event.event for event in events], ["human_input_required"])
        self.assertEqual(events[0].data, {
            "threadId": "thread-1",
            "kind": "question",
            "question": "Which tone should I use?",
            "options": ["Concise", "Detailed"],
        })

    def test_stream_emits_a_confirmation_request_before_a_page_write(self) -> None:
        fake_agent = SimpleNamespace(
            stream=lambda *_args, **_kwargs: [
                {"__interrupt__": (SimpleNamespace(value={"action_requests": [{
                    "name": "apply_page_operations",
                    "arguments": {"summary": "Replace the title with a more academic version."},
                }]}),)},
            ]
        )

        events = list(stream_page_editor_agent(
            fake_agent,
            "Improve the title",
            document_id="lesson-1",
            user_id="user-1",
            page_document_store=PageDocumentStore(),
            thread_id="thread-1",
        ))

        self.assertEqual(events[0].data, {
            "threadId": "thread-1",
            "kind": "approval",
            "question": "Replace the title with a more academic version.",
            "options": [],
        })

    def test_stream_resumes_the_same_thread_with_a_human_response(self) -> None:
        calls: list[tuple[object, dict]] = []

        def stream(input_value: object, **kwargs: object) -> list[dict]:
            calls.append((input_value, kwargs))
            return [{"model": {"messages": [SimpleNamespace(content="Updated after confirmation.", type="ai", tool_calls=[])]}}]

        fake_agent = SimpleNamespace(stream=stream)
        events = list(stream_page_editor_agent(
            fake_agent,
            None,
            document_id="lesson-1",
            user_id="user-1",
            page_document_store=PageDocumentStore(),
            thread_id="thread-1",
            human_response="Use the detailed option.",
        ))

        self.assertIsInstance(calls[0][0], Command)
        self.assertEqual(calls[0][0].resume, {"decisions": [{"type": "respond", "message": "Use the detailed option."}]})
        self.assertEqual(calls[0][1]["config"], {"configurable": {"thread_id": "thread-1"}, "recursion_limit": 8})
        self.assertEqual([event.event for event in events], ["assistant_message", "done"])

    def test_stream_resumes_a_reviewed_write_with_an_approval(self) -> None:
        calls: list[tuple[object, dict]] = []

        def stream(input_value: object, **kwargs: object) -> list[dict]:
            calls.append((input_value, kwargs))
            return []

        list(stream_page_editor_agent(
            SimpleNamespace(stream=stream),
            None,
            document_id="lesson-1",
            user_id="user-1",
            page_document_store=PageDocumentStore(),
            thread_id="thread-1",
            human_decision="approve",
        ))

        self.assertIsInstance(calls[0][0], Command)
        self.assertEqual(calls[0][0].resume, {"decisions": [{"type": "approve"}]})


if __name__ == "__main__":
    unittest.main()
