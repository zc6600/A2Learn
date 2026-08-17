"""MCP tools for compiling Agent-generated course JSON into A2UI messages.

This MCP server deliberately does not call an LLM.  The calling Agent creates
the structured course JSON from the published schema, while A2Learn performs
the deterministic JSON-to-A2UI conversion and validation.
"""

from __future__ import annotations

import os
import uuid
from typing import Any, Literal
from urllib.parse import urlencode

from mcp.server.fastmcp import FastMCP
from mcp.server.transport_security import TransportSecuritySettings

from agent.core.validate import validate_a2ui_messages
from agent.document.page_document import PageComponent, PageDocument
from agent.generation.parser import parse_json_to_a2ui
from apps.api.project_store import ProjectRepository


MCP_THEME_IDS = (
    "learning-default",
    "poetry-ink",
    "poetry-night",
    "editorial",
    "minimal",
    "ppt-stage",
)

MCPThemeId = Literal[
    "learning-default",
    "poetry-ink",
    "poetry-night",
    "editorial",
    "minimal",
    "ppt-stage",
]

_project_store: ProjectRepository | None = None
_viewer_public_url = "https://a2learn.zc6600.wiki"


def configure_mcp_publisher(project_store: ProjectRepository, viewer_public_url: str | None = None) -> None:
    """Connect the stateless MCP tool to the API's configured project store."""

    global _project_store, _viewer_public_url
    _project_store = project_store
    if viewer_public_url and viewer_public_url.strip():
        _viewer_public_url = viewer_public_url.strip().rstrip("/")

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
        "generativeLab": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
                "html": {"type": "string"},
                "css": {"type": "string"},
                "javascript": {"type": "string"},
                "initialProps": {"type": "object"},
                "minHeight": {"type": "integer", "minimum": 160, "maximum": 1200},
                "maxHeight": {"type": "integer", "minimum": 160, "maximum": 1400},
            },
            "required": ["title", "html", "javascript"],
        },
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
        "timeline": {
            "type": "object",
            "properties": {
                "events": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "time": {"type": "string"},
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                        },
                        "required": ["id", "time", "title"],
                    },
                },
                "orientation": {"type": "string", "enum": ["vertical", "horizontal"]},
                "variant": {"type": "string", "enum": ["default", "journey"]},
            },
            "required": ["events"],
        },
        "scenarioDialogue": {
            "type": "object",
            "properties": {
                "variant": {"type": "string", "enum": ["dialogue", "wechat-group", "correspondence"]},
                "topic": {"type": "string"},
                "groupName": {"type": "string"},
                "groupNotice": {"type": "string"},
                "characters": {
                    "type": "object",
                    "additionalProperties": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "avatar": {"type": "string"},
                            "alignment": {"type": "string", "enum": ["left", "right"]},
                        },
                        "required": ["name", "alignment"],
                    },
                },
                "messages": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "characterId": {"type": "string"},
                            "content": {"type": "string"},
                            "imageUrl": {"type": "string"},
                            "imagePrompt": {"type": "string"},
                            "imageAlt": {"type": "string"},
                            "delayMs": {"type": "number"},
                        },
                        "required": ["characterId", "content"],
                    },
                },
            },
            "required": ["characters", "messages"],
        },
        "dragAndDropMatch": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "instruction": {"type": "string"},
                "leftLabel": {"type": "string"},
                "rightLabel": {"type": "string"},
                "leftItems": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {"id": {"type": "string"}, "content": {"type": "string"}},
                        "required": ["id", "content"],
                    },
                },
                "rightItems": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {"id": {"type": "string"}, "content": {"type": "string"}},
                        "required": ["id", "content"],
                    },
                },
                "correctMatches": {"type": "object", "additionalProperties": {"type": "string"}},
                "successMessage": {"type": "string"},
                "incorrectMessage": {"type": "string"},
                "matchExplanations": {"type": "object", "additionalProperties": {"type": "string"}},
            },
            "required": ["leftItems", "rightItems", "correctMatches"],
        },
        "relationshipMatch": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "instruction": {"type": "string"},
                "leftLabel": {"type": "string"},
                "rightLabel": {"type": "string"},
                "leftItems": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {"id": {"type": "string"}, "content": {"type": "string"}},
                        "required": ["id", "content"],
                    },
                },
                "rightItems": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {"id": {"type": "string"}, "content": {"type": "string"}},
                        "required": ["id", "content"],
                    },
                },
                "correctMatches": {"type": "object", "additionalProperties": {"type": "string"}},
                "successMessage": {"type": "string"},
                "incorrectMessage": {"type": "string"},
                "matchExplanations": {"type": "object", "additionalProperties": {"type": "string"}},
            },
            "required": ["leftItems", "rightItems", "correctMatches"],
        },
        "deepDivePrompt": {
            "type": "object",
            "properties": {
                "prompts": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "label": {"type": "string"},
                            "icon": {"type": "string"},
                        },
                        "required": ["id", "label"],
                    },
                },
                "selectedId": {"type": "string"},
            },
            "required": ["prompts"],
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
    "GenerativeLab",
    "QuizCard",
    "DetailedExplanation",
    "ResourceList",
    "Timeline",
    "ScenarioDialogue",
    "DragAndDropMatch",
    "RelationshipMatch",
    "DeepDivePrompt",
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
        "supported_themes": list(MCP_THEME_IDS),
        "instructions": [
            "Return one JSON object, not Markdown or a JSON code fence.",
            "Include siteTitle or description and at least one content component.",
            "Only include fields described by course_json_schema.",
            "After generating JSON, send it to compile_course_json.",
            "Use publish_course when the learner needs a shareable A2Learn webpage URL.",
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


def _page_document_from_messages(project_id: str, messages: list[dict[str, Any]]) -> PageDocument:
    create = next((message.get("createSurface") for message in messages if "createSurface" in message), None)
    update = next((message.get("updateComponents") for message in messages if "updateComponents" in message), None)
    if not isinstance(create, dict) or not isinstance(update, dict):
        raise ValueError("Compiled course is missing a surface snapshot.")

    surface_id = update.get("surfaceId")
    catalog_id = create.get("catalogId")
    raw_components = update.get("components")
    if not isinstance(surface_id, str) or not isinstance(catalog_id, str) or not isinstance(raw_components, list):
        raise ValueError("Compiled course contains an invalid surface snapshot.")

    components: list[PageComponent] = []
    for raw_component in raw_components:
        if not isinstance(raw_component, dict):
            raise ValueError("Compiled course contains an invalid component.")
        component_id = raw_component.get("id")
        component_type = raw_component.get("component")
        if not isinstance(component_id, str) or not isinstance(component_type, str):
            raise ValueError("Compiled course component IDs and types must be strings.")
        props = {
            key: value
            for key, value in raw_component.items()
            if key not in {"id", "component"}
        }
        components.append(PageComponent(component_id, component_type, props))

    return PageDocument(
        document_id=f"{project_id}:{surface_id}",
        revision=1,
        surface_id=surface_id,
        catalog_id=catalog_id,
        components=tuple(components),
    )


@mcp.tool()
def publish_course(
    course_json: dict[str, Any],
    theme_id: MCPThemeId = "learning-default",
    enabled_components: list[str] | None = None,
    owner_id: str | None = None,
) -> dict[str, Any]:
    """Validate, persist, and publish a course as a shareable A2Learn URL.

    The Agent supplies structured course content, not arbitrary HTML, CSS, or
    JavaScript. The server compiles it through the allowlisted A2UI catalog,
    stores the resulting PageDocument, and returns a viewer URL. ``theme_id``
    selects one of the frontend's built-in themes and never becomes executable
    CSS supplied by the caller.
    """

    if theme_id not in MCP_THEME_IDS:
        return {
            "ok": False,
            "error": f"Unsupported theme_id: {theme_id}",
            "supported_themes": list(MCP_THEME_IDS),
        }
    if _project_store is None:
        return {
            "ok": False,
            "error": "MCP publisher is not connected to the API project store.",
        }

    compiled = compile_course_json(course_json, enabled_components=enabled_components)
    if not compiled.get("ok"):
        return compiled

    project_id = f"mcp-{uuid.uuid4().hex}"
    try:
        document = _page_document_from_messages(project_id, compiled["messages"])
        project = _project_store.create(
            project_id,
            [document],
            source="generated",
            owner_id=owner_id,
            actor="ai",
        )
    except (TypeError, ValueError) as exc:
        return {"ok": False, "error": f"PUBLISH_FAILED: {exc}"}

    query = urlencode({"project": project_id, "themeId": theme_id})
    viewer_url = f"{_viewer_public_url}/?{query}"
    return {
        "ok": True,
        "projectId": project.project_id,
        "title": course_json.get("siteTitle") or "A2Learn Course",
        "url": viewer_url,
        "a2uiUrl": f"{_viewer_public_url}/api/projects/{project_id}/a2ui",
        "themeId": theme_id,
        "surfaceId": document.surface_id,
        "componentCount": len(document.components),
    }


# ``streamable_http_app`` creates the ASGI app mounted by apps.api.main.
# The host FastAPI app owns the lifespan because mounted app lifespans are not
# entered automatically.
mcp_http_app = mcp.streamable_http_app()
