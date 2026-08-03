import unittest
from types import SimpleNamespace
from unittest.mock import patch

from langchain_openai import ChatOpenAI

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


if __name__ == "__main__":
    unittest.main()
