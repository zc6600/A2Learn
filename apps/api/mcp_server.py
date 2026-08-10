"""MCP tools for compiling Agent-generated course JSON into A2UI messages.

This MCP server deliberately does not call an LLM.  The calling Agent creates
the structured course JSON from the published schema, while A2Learn performs
the deterministic JSON-to-A2UI conversion and validation.
"""

from __future__ import annotations

import os
from typing import Any

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from agent.core.validate import validate_a2ui_messages
from agent.generation.parser import parse_json_to_a2ui

COURSE_JSON_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "siteTitle": {"type": "string", "description": "Course title."},
        "description": {"type": "string", "description": "Short course introduction."},
        "paperAbstract": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "authors": {"type": "array", "items": {"type": "string"}},
                "venue": {"type": ["string", "null"]},
                "year": {"type": ["integer", "null"]},
                "abstract": {"type": "string"},
                "tldr": {"type": "string"},
                "pdfUrl": {"type": ["string", "null"]},
                "sourceUrl": {"type": ["string", "null"]},
            },
            "required": ["title"],
        },
        "literatureReference": {
            "type": "object",
            "properties": {
                "citation": {"type": "string"},
                "title": {"type": "string"},
                "authors": {"type": "array", "items": {"type": "string"}},
                "url": {"type": ["string", "null"]},
                "highlightQuote": {"type": ["string", "null"]},
            },
            "required": ["title"],
        },
        "learningPath": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "steps": {"type": "array", "items": {"type": "object"}},
            },
            "required": ["steps"],
        },
        "conceptCard": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "tags": {"type": "array", "items": {"type": "string"}},
                "definition": {"type": "string"},
                "example": {"type": "string"},
                "relatedConcepts": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["title"],
        },
        "mentalModel": {"type": "object", "required": ["title"]},
        "interactiveFormula": {"type": "object", "required": ["latex"]},
        "interactiveSandbox": {"type": "object", "required": ["title"]},
        "quizCard": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "questions": {"type": "array", "items": {"type": "object"}},
            },
            "required": ["questions"],
        },
        "detailedExplanation": {"type": "object", "required": ["title"]},
        "resourceList": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "resources": {"type": "array", "items": {"type": "object"}},
            },
            "required": ["resources"],
        },
    },
}

SUPPORTED_COMPONENTS = (
    "PaperAbstract",
    "LiteratureReference",
    "LearningPath",
    "ConceptCard",
    "MentalModel",
    "InteractiveFormula",
    "InteractiveSandbox",
    "QuizCard",
    "DetailedExplanation",
    "ResourceList",
)


def _csv_env(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if raw is None:
        return default
    return [value.strip() for value in raw.split(",") if value.strip()]


mcp = FastMCP(
    "A2Learn Course Compiler",
    streamable_http_path="/mcp",
    stateless_http=True,
    json_response=True,
    transport_security=TransportSecuritySettings(
        allowed_hosts=_csv_env(
            "A2LEARN_MCP_ALLOWED_HOSTS",
            ["localhost", "127.0.0.1"],
        ),
        allowed_origins=_csv_env("A2LEARN_MCP_ALLOWED_ORIGINS", []),
    ),
)


@mcp.tool()
def get_course_generation_spec() -> dict[str, Any]:
    """Return the JSON contract used to create an A2Learn learning page."""

    return {
        "format": "A2Learn course JSON",
        "a2ui_version": "v0.9",
        "supported_components": list(SUPPORTED_COMPONENTS),
        "instructions": [
            "Return one JSON object, not Markdown or a JSON code fence.",
            "Include siteTitle or description and at least one content component.",
            "Only include fields described by course_json_schema.",
            "After generating JSON, send it to compile_course_json.",
        ],
        "course_json_schema": COURSE_JSON_SCHEMA,
    }


@mcp.tool()
def compile_course_json(
    course_json: dict[str, Any],
    enabled_components: list[str] | None = None,
) -> dict[str, Any]:
    """Convert Agent-generated course JSON into validated A2UI messages.

    ``enabled_components`` can restrict custom A2Learn components.  When it is
    omitted, all components supported by this compiler are permitted.
    """

    permitted = tuple(enabled_components) if enabled_components else None
    try:
        messages = parse_json_to_a2ui(
            course_json,
            permitted_custom_components=permitted,
        )
        validate_a2ui_messages(
            messages,
            permitted_custom_components=permitted,
        )
    except (TypeError, ValueError) as exc:
        return {
            "ok": False,
            "error": str(exc),
            "messages": [],
        }

    update = next(
        message["updateComponents"]
        for message in messages
        if "updateComponents" in message
    )
    return {
        "ok": True,
        "a2ui_version": "v0.9",
        "surface_id": update["surfaceId"],
        "component_count": len(update["components"]),
        "messages": messages,
    }


# ``streamable_http_app`` creates the ASGI app mounted by apps.api.main.
# The host FastAPI app owns the lifespan because mounted app lifespans are not
# entered automatically.
mcp_http_app = mcp.streamable_http_app()
