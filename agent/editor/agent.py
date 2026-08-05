"""Factory functions for creating Page Editor and Q&A agents."""

from __future__ import annotations

from typing import Any

from langchain.agents import create_agent
from langchain.agents.middleware import HumanInTheLoopMiddleware

from ..generation.llm import build_page_editor_llm
from .prompts import PAGE_EDITOR_SYSTEM_PROMPT, PAGE_QUESTION_SYSTEM_PROMPT
from .tools import PAGE_EDITOR_TOOLS, PAGE_QUESTION_TOOLS, PageEditorContext


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
    llm = build_page_editor_llm(api_key)
    agent = create_page_editor_agent(
        llm,
        checkpointer=checkpointer,
        review_before_apply=review_before_apply,
    )
    agent._a2learn_llm = llm
    return agent


def build_page_question_agent(
    api_key: str | None = None,
    *,
    checkpointer: Any | None = None,
) -> Any:
    """Build the production read-only PageDocument Q&A agent."""
    return create_page_question_agent(build_page_editor_llm(api_key), checkpointer=checkpointer)
