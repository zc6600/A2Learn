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
from langchain.agents.middleware import HumanInTheLoopMiddleware
from langchain.tools import ToolRuntime, tool
from langgraph.types import Command

from apps.api.page_document_store import (
    DocumentNotFoundError,
    PageDocumentRepository,
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
3. If the user's request leaves a meaningful content, tone, scope, or visual
   direction choice unresolved, call ask_user before writing. Offer 2–4 short,
   concrete options (including a conservative option when appropriate), then
   wait for the user's reply. Do not ask when the intended change is clear.
4. Preserve component IDs and use the smallest operation set that satisfies
   the user. The available operations are set_props, insert_component, and
   remove_component. Operation field names are snake_case exactly as shown
   below; do not use componentId, parentId, id, properties, update_component,
   or a raw A2UI message.

   To change a title or any existing component property, use exactly:
   {"op": "set_props", "component_id": "the-exact-id-from-the-read", "props": {"text": "new text"}}

   To insert, use exactly:
   {"op": "insert_component", "parent_id": "parent-id", "component": {"id": "new-id", "component": "Text", "props": {"text": "..."}}}

   To remove a leaf, use exactly:
   {"op": "remove_component", "component_id": "leaf-id"}
5. If a tool reports a revision conflict, re-read the page, reconsider the
   user's request against the latest state, then retry only if still correct.
   Do not retry INVALID_PAGE_OPERATION: report the failure briefly instead.
6. Explain the result briefly, including the new revision. Do not expose raw
   A2UI protocol details unless the user asks for them.
7. The page context may name a selected component. When it does, treat that
   component as the user's intended target unless their request clearly says
   otherwise.
"""

PAGE_QUESTION_SYSTEM_PROMPT = """You are A2Learn's learning Q&A assistant.

Answer questions about the currently selected learning page. Before answering a
question about page content, call get_page_document so your answer is grounded
in the current document. If a selected component is supplied, focus on it
unless the learner explicitly asks about the whole page. You may call
get_page_history when the learner asks about previous edits.

Explain clearly, use small examples when helpful, and answer in the learner's
language. You are strictly read-only: never claim to have changed the page and
never suggest that a page edit was applied. If the learner asks for a change,
briefly tell them to switch to Edit mode.
"""


@dataclass(frozen=True)
class PageEditorContext:
    """Trusted runtime dependencies, hidden from model-controlled arguments."""

    document_id: str
    user_id: str
    # ToolRuntime's context is converted into a Pydantic schema by LangChain.
    # Protocols are structural typing constructs, not runtime-valid Pydantic
    # instance types, so keep this injected dependency out of that schema.
    page_document_store: Any
    selected_component_id: str | None = None


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
    selected_component = next(
        (component.to_a2ui() for component in document.components if component.id == runtime.context.selected_component_id),
        None,
    )
    return {
        "ok": True,
        "document": document.to_dict(),
        "selectedComponentId": runtime.context.selected_component_id,
        "selectedComponent": selected_component,
    }


@tool
def get_page_history(runtime: ToolRuntime[PageEditorContext]) -> dict[str, Any]:
    """Read recent human and AI edit records for the current page."""
    try:
        changes = runtime.context.page_document_store.history(runtime.context.document_id)
    except DocumentNotFoundError:
        return {"ok": False, "error": "PAGE_DOCUMENT_NOT_FOUND"}
    return {"ok": True, "changes": [change.to_dict() for change in changes]}


@tool
def ask_user(question: str, options: list[str]) -> str:
    """Pause and ask the user to choose between concrete editing directions.

    Use only when a meaningful choice cannot be inferred safely. The human's
    reply is supplied by the runtime before this tool body is ever executed.
    """
    # HumanInTheLoopMiddleware intercepts this tool before execution. Keeping
    # a defensive return makes the tool safe if the middleware is ever removed.
    return f"No user response was supplied for: {question}. Options: {options}"


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


PAGE_EDITOR_TOOLS = [get_page_document, get_page_history, ask_user, apply_page_operations]
PAGE_QUESTION_TOOLS = [get_page_document, get_page_history]


def create_page_editor_agent(
    model: Any,
    *,
    checkpointer: Any | None = None,
    review_before_apply: bool = False,
) -> Any:
    """Create the LangChain v1 tool-loop agent without binding page state globally."""
    review_instruction = ""
    if review_before_apply:
        review_instruction = (
            "\nThe user selected review-first mode. Every apply_page_operations call "
            "will wait for confirmation, so make summary a concise, user-facing "
            "description of the exact proposed change before calling it.\n"
        )
    return create_agent(
        model=model,
        tools=PAGE_EDITOR_TOOLS,
        middleware=[
            HumanInTheLoopMiddleware(
                interrupt_on={
                    "ask_user": {"allowed_decisions": ["respond"]},
                    "apply_page_operations": {"allowed_decisions": ["approve", "reject"]}
                    if review_before_apply else False,
                },
            ),
        ],
        system_prompt=PAGE_EDITOR_SYSTEM_PROMPT + review_instruction,
        context_schema=PageEditorContext,
        checkpointer=checkpointer,
        name="page_editor",
    )


def create_page_question_agent(model: Any, *, checkpointer: Any | None = None) -> Any:
    """Create a read-only learning Q&A agent for the current PageDocument."""
    return create_agent(
        model=model,
        tools=PAGE_QUESTION_TOOLS,
        system_prompt=PAGE_QUESTION_SYSTEM_PROMPT,
        context_schema=PageEditorContext,
        checkpointer=checkpointer,
        name="page_question",
    )


def build_page_editor_agent(
    api_key: str | None = None,
    *,
    checkpointer: Any | None = None,
    review_before_apply: bool = False,
) -> Any:
    """Build the production editor-agent graph using the caller's BYOK key."""
    return create_page_editor_agent(
        build_page_editor_llm(api_key),
        checkpointer=checkpointer,
        review_before_apply=review_before_apply,
    )


def build_page_question_agent(
    api_key: str | None = None,
    *,
    checkpointer: Any | None = None,
) -> Any:
    """Build the production read-only PageDocument Q&A agent."""
    return create_page_question_agent(build_page_editor_llm(api_key), checkpointer=checkpointer)


def stream_page_editor_agent(
    agent: Any,
    message: str | None,
    *,
    document_id: str,
    user_id: str,
    page_document_store: PageDocumentRepository,
    thread_id: str,
    selected_component_id: str | None = None,
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
        ),
        stream_mode="updates",
    )
    for update in updates:
        if isinstance(update, Mapping) and "__interrupt__" in update:
            yield PageEditorEvent("human_input_required", _human_input_request(update["__interrupt__"], thread_id))
            return
        for node_update in update.values():
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
