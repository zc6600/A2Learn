"""LangChain tool definitions for Page Editor and Q&A agents."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from langchain.tools import ToolRuntime, tool

from apps.api.page_document_store import (
    DocumentNotFoundError,
    RevisionConflictError,
)

from ..document.page_operations import PageOperationError
from ..generation.media.narration import rewrite_page_narration, synthesize


@dataclass(frozen=True)
class PageEditorContext:
    """Trusted runtime dependencies, hidden from model-controlled arguments."""

    document_id: str
    user_id: str
    page_document_store: Any
    selected_component_id: str | None = None
    audio_url_prefix: str = "/api/audio"
    api_key: str | None = None
    llm: Any | None = None


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
def generate_page_narration(runtime: ToolRuntime[PageEditorContext]) -> dict[str, Any]:
    """Generate a complete presenter script and optional MP3 for the current page."""
    try:
        document = runtime.context.page_document_store.get(runtime.context.document_id)
        if runtime.context.llm is None:
            return {"ok": False, "error": "NARRATION_MODEL_NOT_AVAILABLE"}
        script = rewrite_page_narration(document.to_dict(), llm=runtime.context.llm)
        audio_id, _ = synthesize(script, language="zh", api_key=runtime.context.api_key)
        return {"ok": True, "script": script, "audioUrl": f"{runtime.context.audio_url_prefix}/{audio_id}.mp3"}
    except DocumentNotFoundError:
        return {"ok": False, "error": "PAGE_DOCUMENT_NOT_FOUND"}
    except Exception as exc:
        return {"ok": False, "error": "TTS_GENERATION_FAILED", "detail": str(exc)}


@tool
def ask_user(question: str, options: list[str]) -> str:
    """Pause and ask the user to choose between concrete editing directions.

    Use only when a meaningful choice cannot be inferred safely. The human's
    reply is supplied by the runtime before this tool body is ever executed.
    """
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


PAGE_EDITOR_TOOLS = [get_page_document, get_page_history, generate_page_narration, ask_user, apply_page_operations]
PAGE_QUESTION_TOOLS = [get_page_document, get_page_history]
