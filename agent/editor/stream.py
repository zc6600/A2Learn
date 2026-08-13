"""Streaming runner and event handling for Page Editor and Q&A agents."""

from __future__ import annotations

import json
from collections.abc import Iterator, Mapping
from dataclasses import dataclass
from typing import Any

from langgraph.types import Command

from apps.api.page_document_store import PageDocumentRepository

from .tools import PageEditorContext


@dataclass(frozen=True)
class PageEditorEvent:
    """A frontend-facing event emitted at an agent-loop boundary."""

    event: str
    data: dict[str, Any]


def stream_page_editor_agent(
    agent: Any,
    message: str | None,
    *,
    document_id: str,
    user_id: str,
    page_document_store: PageDocumentRepository,
    thread_id: str,
    selected_component_id: str | None = None,
    api_key: str | None = None,
    human_response: str | None = None,
    human_decision: str = "respond",
) -> Iterator[PageEditorEvent]:
    """Stream model and tool results in their actual execution order."""
    decision: dict[str, Any] = {"type": human_decision}
    if human_response:
        decision["message"] = human_response
    input_value: Any = Command(resume={"decisions": [decision]}) if human_response is not None or human_decision != "respond" else {
        "messages": [{"role": "user", "content": message or ""}]
    }
    updates = agent.stream(
        input_value,
        config={"configurable": {"thread_id": thread_id}, "recursion_limit": 8},
        context=PageEditorContext(
            document_id=document_id,
            user_id=user_id,
            selected_component_id=selected_component_id,
            page_document_store=page_document_store,
            api_key=api_key,
            llm=getattr(agent, "_a2learn_llm", None),
        ),
        stream_mode=["messages", "updates"],
    )
    for item in updates:
        mode = "updates"
        data = item
        if isinstance(item, tuple) and len(item) == 2 and isinstance(item[0], str):
            mode, data = item

        if mode == "messages":
            chunk = data[0] if isinstance(data, (tuple, list)) and data else data
            tool_chunks = getattr(chunk, "tool_call_chunks", None)
            if not tool_chunks:
                content = getattr(chunk, "content", None)
                if isinstance(content, str) and content:
                    yield PageEditorEvent("text_delta", {"delta": content})
                elif isinstance(content, list):
                    for part in content:
                        if isinstance(part, dict) and part.get("type") == "text" and part.get("text"):
                            yield PageEditorEvent("text_delta", {"delta": part["text"]})
            continue

        if mode == "updates" and isinstance(data, Mapping):
            if "__interrupt__" in data:
                yield PageEditorEvent("human_input_required", _human_input_request(data["__interrupt__"], thread_id))
                return
            for node_update in data.values():
                if not isinstance(node_update, Mapping):
                    continue
                messages = node_update.get("messages", [])
                if not isinstance(messages, list):
                    continue
                events = tuple(_events_for_messages(messages))
                yield from events
                failed_operation = next(
                    (
                        event.data["result"]
                        for event in events
                        if event.event == "tool_end"
                        and isinstance(event.data.get("result"), dict)
                        and event.data["result"].get("error") == "INVALID_PAGE_OPERATION"
                    ),
                    None,
                )
                if failed_operation is not None:
                    detail = failed_operation.get("detail")
                    message = "The Agent generated an invalid page edit."
                    if isinstance(detail, str) and detail:
                        message = f"{message} {detail}"
                    yield PageEditorEvent("error", {"message": message})
                    yield PageEditorEvent("done", {"threadId": thread_id})
                    return
    yield PageEditorEvent("done", {"threadId": thread_id})


def _human_input_request(interrupts: Any, thread_id: str) -> dict[str, Any]:
    """Reduce LangGraph's interrupt object to stable frontend data."""
    interrupt = interrupts[0] if isinstance(interrupts, (list, tuple)) and interrupts else None
    value = getattr(interrupt, "value", {})
    if not isinstance(value, Mapping):
        return {"threadId": thread_id, "question": "The Agent needs your input.", "options": []}
    requests = value.get("action_requests")
    request = next(
        (
            item
            for item in requests
            if isinstance(item, Mapping) and item.get("name") in {"ask_user", "apply_page_operations"}
        ),
        None,
    ) if isinstance(requests, list) else None
    arguments = request.get("arguments") if isinstance(request, Mapping) else None
    if isinstance(request, Mapping) and request.get("name") == "apply_page_operations":
        summary = arguments.get("summary") if isinstance(arguments, Mapping) else None
        return {
            "threadId": thread_id,
            "kind": "approval",
            "question": summary if isinstance(summary, str) and summary else "The Agent proposes a page edit.",
            "options": [],
        }
    question = arguments.get("question") if isinstance(arguments, Mapping) else None
    raw_options = arguments.get("options") if isinstance(arguments, Mapping) else None
    options = [item for item in raw_options if isinstance(item, str) and item] if isinstance(raw_options, list) else []
    return {
        "threadId": thread_id,
        "kind": "question",
        "question": question if isinstance(question, str) and question else "The Agent needs your input.",
        "options": options,
    }


def _events_for_messages(messages: list[Any]) -> Iterator[PageEditorEvent]:
    for message in messages:
        tool_calls = getattr(message, "tool_calls", None)
        if isinstance(tool_calls, list):
            for call in tool_calls:
                if isinstance(call, Mapping) and call.get("name") == "apply_page_operations":
                    yield PageEditorEvent("tool_start", {"tool": "apply_page_operations"})

        if getattr(message, "name", None) == "apply_page_operations":
            result = _parse_tool_content(getattr(message, "content", None))
            if result is not None:
                yield PageEditorEvent("tool_end", {"tool": "apply_page_operations", "result": result})
            continue

        if getattr(message, "type", None) == "ai" and not tool_calls:
            content = getattr(message, "content", "")
            text = content if isinstance(content, str) else str(content)
            yield PageEditorEvent("assistant_message", {"text": text})


def _parse_tool_content(content: Any) -> dict[str, Any] | None:
    if isinstance(content, str):
        try:
            content = json.loads(content)
        except json.JSONDecodeError:
            return None
    return content if isinstance(content, dict) else None
