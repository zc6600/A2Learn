"""LangChain v1 agent for conversational PageDocument editing.

This is intentionally distinct from the course-generation pipeline in
``agent.engine``. It owns a conversational tool loop, while the PageDocument
service remains the sole owner of document state and A2UI synchronization.
"""

from __future__ import annotations

import json
from collections.abc import Iterator, Mapping
from dataclasses import dataclass
from typing import Any

from langchain.agents import create_agent
from langchain.tools import ToolRuntime, tool

from apps.api.page_document_store import (
    DocumentNotFoundError,
    PageDocumentStore,
    RevisionConflictError,
)

from .llm import build_page_editor_llm
from .page_operations import PageOperationError

PAGE_EDITOR_SYSTEM_PROMPT = """You are A2Learn's Page Editor Agent.

You help a user improve the currently selected learning page. The page is a
versioned PageDocument rendered through A2UI.

Rules:
1. Before proposing or applying an edit, call get_page_document to inspect the
   current revision, component IDs, types, and properties.
2. Make edits only with apply_page_operations. Never claim a change succeeded
   until that tool returns ok=true.
3. Preserve component IDs and use the smallest operation set that satisfies
   the user. The available operations are set_props, insert_component, and
   remove_component.
4. If a tool reports a revision conflict, re-read the page, reconsider the
   user's request against the latest state, then retry only if still correct.
5. Explain the result briefly, including the new revision. Do not expose raw
   A2UI protocol details unless the user asks for them.
"""


@dataclass(frozen=True)
class PageEditorContext:
    """Trusted runtime dependencies, hidden from model-controlled arguments."""

    document_id: str
    user_id: str
    page_document_store: PageDocumentStore


@dataclass(frozen=True)
class PageEditorEvent:
    """A frontend-facing event emitted at an agent-loop boundary."""

    event: str
    data: dict[str, Any]


def _sync_response(plan: Any) -> dict[str, Any]:
    return {"mode": plan.mode.value, "reason": plan.reason, "messages": plan.messages}


@tool
def get_page_document(runtime: ToolRuntime[PageEditorContext]) -> dict[str, Any]:
    """Read the current editable page, including its revision and stable component IDs."""
    try:
        document = runtime.context.page_document_store.get(runtime.context.document_id)
    except DocumentNotFoundError:
        return {"ok": False, "error": "PAGE_DOCUMENT_NOT_FOUND"}
    return {"ok": True, "document": document.to_dict()}


@tool
def get_page_history(runtime: ToolRuntime[PageEditorContext]) -> dict[str, Any]:
    """Read recent human and AI edit records for the current page."""
    try:
        changes = runtime.context.page_document_store.history(runtime.context.document_id)
    except DocumentNotFoundError:
        return {"ok": False, "error": "PAGE_DOCUMENT_NOT_FOUND"}
    return {"ok": True, "changes": [change.to_dict() for change in changes]}


@tool
def apply_page_operations(
    base_revision: int,
    operations: list[dict[str, Any]],
    summary: str,
    runtime: ToolRuntime[PageEditorContext],
) -> dict[str, Any]:
    """Apply validated component edits to the current page and return A2UI sync data.

    `base_revision` must come from get_page_document. `operations` is an ordered
    list containing only set_props, insert_component, or remove_component.
    """
    try:
        document, plan = runtime.context.page_document_store.apply_operations(
            runtime.context.document_id,
            operations,
            base_revision=base_revision,
            actor="ai",
            summary=summary,
        )
    except DocumentNotFoundError:
        return {"ok": False, "error": "PAGE_DOCUMENT_NOT_FOUND"}
    except RevisionConflictError as exc:
        return {
            "ok": False,
            "error": "PAGE_DOCUMENT_REVISION_CONFLICT",
            "currentRevision": exc.current_revision,
        }
    except PageOperationError as exc:
        return {"ok": False, "error": "INVALID_PAGE_OPERATION", "detail": str(exc)}
    return {"ok": True, "document": document.to_dict(), "sync": _sync_response(plan)}


PAGE_EDITOR_TOOLS = [get_page_document, get_page_history, apply_page_operations]


def create_page_editor_agent(model: Any, *, checkpointer: Any | None = None) -> Any:
    """Create the LangChain v1 tool-loop agent without binding page state globally."""
    return create_agent(
        model=model,
        tools=PAGE_EDITOR_TOOLS,
        system_prompt=PAGE_EDITOR_SYSTEM_PROMPT,
        context_schema=PageEditorContext,
        checkpointer=checkpointer,
        name="page_editor",
    )


def build_page_editor_agent(api_key: str | None = None, *, checkpointer: Any | None = None) -> Any:
    """Build the production editor-agent graph using the caller's BYOK key."""
    return create_page_editor_agent(build_page_editor_llm(api_key), checkpointer=checkpointer)


def stream_page_editor_agent(
    agent: Any,
    message: str,
    *,
    document_id: str,
    user_id: str,
    page_document_store: PageDocumentStore,
    thread_id: str,
) -> Iterator[PageEditorEvent]:
    """Stream model and tool results in their actual execution order."""
    updates = agent.stream(
        {"messages": [{"role": "user", "content": message}]},
        config={"configurable": {"thread_id": thread_id}},
        context=PageEditorContext(
            document_id=document_id,
            user_id=user_id,
            page_document_store=page_document_store,
        ),
        stream_mode="updates",
    )
    for update in updates:
        for node_update in update.values():
            if not isinstance(node_update, Mapping):
                continue
            messages = node_update.get("messages", [])
            if not isinstance(messages, list):
                continue
            yield from _events_for_messages(messages)
    yield PageEditorEvent("done", {"threadId": thread_id})


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
