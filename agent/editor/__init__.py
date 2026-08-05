"""Interactive Page Editor Agent package."""

from .agent import (
    build_page_editor_agent,
    build_page_question_agent,
    create_page_editor_agent,
    create_page_question_agent,
)
from .prompts import PAGE_EDITOR_SYSTEM_PROMPT, PAGE_QUESTION_SYSTEM_PROMPT
from .stream import PageEditorEvent, stream_page_editor_agent
from .tools import (
    PAGE_EDITOR_TOOLS,
    PAGE_QUESTION_TOOLS,
    PageEditorContext,
    apply_page_operations,
    ask_user,
    generate_page_narration,
    get_page_document,
    get_page_history,
)

__all__ = [
    "PAGE_EDITOR_SYSTEM_PROMPT",
    "PAGE_QUESTION_SYSTEM_PROMPT",
    "PageEditorContext",
    "PageEditorEvent",
    "PAGE_EDITOR_TOOLS",
    "PAGE_QUESTION_TOOLS",
    "apply_page_operations",
    "ask_user",
    "build_page_editor_agent",
    "build_page_question_agent",
    "create_page_editor_agent",
    "create_page_question_agent",
    "generate_page_narration",
    "get_page_document",
    "get_page_history",
    "stream_page_editor_agent",
]
