"""Import bundled A2UI examples into the PageDocument project model."""

from __future__ import annotations

import json
import os
from copy import deepcopy
from pathlib import Path
from typing import Any, Literal

from agent.document.page_document import PageDocument

ExampleLanguage = Literal["zh", "en"]

DATABASE_LESSON_FILES: dict[str, str] = {
    "database-basics-lesson-1": "01-what-is-a-database.json",
    "database-basics-lesson-2": "02-ask-the-database.json",
    "database-basics-lesson-3": "03-change-data.json",
    "database-basics-lesson-4": "04-design-a-table.json",
    "database-basics-lesson-5": "05-connect-tables.json",
    "database-basics-lesson-6": "06-build-a-small-project.json",
}

EXAMPLE_IDS = frozenset(
    {
        "hash-table",
        "agent-react",
        "js-async",
        "conversational",
        "non-linear",
        "paper-attention",
        "biophysics-ai",
        "poetry-social",
        "deng-gao",
        "database-basics",
        *DATABASE_LESSON_FILES.keys(),
    }
)


def _find_example_file(project_id: str, language: ExampleLanguage = "zh") -> Path | None:
    repo_root = Path(__file__).resolve().parents[2]
    # 1. Check custom or default viewer examples root
    root = Path(os.getenv("A2LEARN_EXAMPLES_ROOT", repo_root / "apps/viewer/public/examples"))
    path = root / ("en" if language == "en" else "") / f"{project_id}.json"
    if path.is_file():
        return path

    # 2. Check if it is a database lesson
    if project_id in DATABASE_LESSON_FILES:
        course_file = DATABASE_LESSON_FILES[project_id]
        course_dir = repo_root / "packages/a2learn-catalog/examples/Website/Course/database-basics"
        course_path = course_dir / course_file
        if course_path.is_file():
            return course_path

    # 3. Check Website catalog examples
    website_dir = repo_root / "packages/a2learn-catalog/examples/Website"
    if (website_dir / f"{project_id}.json").is_file():
        return website_dir / f"{project_id}.json"

    # 4. Check Component catalog examples
    component_dir = repo_root / "packages/a2learn-catalog/examples/Component"
    if component_dir.is_dir():
        for match in component_dir.glob(f"**/{project_id}.json"):
            if match.is_file():
                return match

    return None


def parse_messages_to_page_documents(
    messages: list[dict[str, Any]],
    document_project_id: str,
) -> list[PageDocument]:
    """Convert a sequence of A2UI messages into surface PageDocuments."""
    surfaces: dict[str, dict[str, Any]] = {}
    for message in messages:
        if not isinstance(message, dict):
            continue
        create = message.get("createSurface")
        if isinstance(create, dict) and isinstance(create.get("surfaceId"), str):
            surface_id = create["surfaceId"]
            surfaces.setdefault(surface_id, {"catalogId": create.get("catalogId"), "components": []})
        update = message.get("updateComponents")
        if not isinstance(update, dict) or not isinstance(update.get("surfaceId"), str):
            continue
        surface_id = update["surfaceId"]
        surface = surfaces.setdefault(surface_id, {"catalogId": None, "components": []})
        raw_components = update.get("components")
        if isinstance(raw_components, list):
            surface["components"] = deepcopy(raw_components)

    documents: list[PageDocument] = []
    for surface_id, surface in surfaces.items():
        components = surface["components"]
        if not isinstance(components, list) or not components:
            continue
        has_root = any(item.get("id") == "root" for item in components if isinstance(item, dict))
        normalized_components = [item for item in components if isinstance(item, dict) and "id" in item and "component" in item]
        if not normalized_components:
            continue
        if not has_root:
            child_ids = [item["id"] for item in normalized_components]
            normalized_components = [
                {"id": "root", "component": "Column", "children": child_ids},
                *normalized_components,
            ]
        documents.append(
            PageDocument.from_dict(
                {
                    "documentId": f"{document_project_id}:{surface_id}",
                    "revision": 1,
                    "surfaceId": surface_id,
                    "catalogId": surface.get("catalogId") or "https://a2learn.ai/spec/v1/catalog.json",
                    "components": [
                        {
                            "id": component["id"],
                            "component": component["component"],
                            "props": {
                                key: deepcopy(value)
                                for key, value in component.items()
                                if key not in {"id", "component"}
                            },
                        }
                        for component in normalized_components
                    ],
                    "data": {},
                }
            )
        )
    return documents


def load_example_documents(
    project_id: str,
    language: ExampleLanguage = "zh",
    *,
    document_project_id: str | None = None,
) -> list[PageDocument]:
    """Convert one bundled A2UI example into surface PageDocuments.

    This is an import boundary only. Once imported, PageDocument becomes the
    source of truth and later edits do not read or mutate the static JSON file.
    """
    path = _find_example_file(project_id, language)
    if path is None or not path.is_file():
        if project_id not in EXAMPLE_IDS:
            raise ValueError(f"Unknown example project: {project_id}")
        raise FileNotFoundError(f"Example source not found for: {project_id}")
    document_project_id = document_project_id or project_id
    messages = json.loads(path.read_text(encoding="utf-8"))
    documents = parse_messages_to_page_documents(messages, document_project_id)
    if not documents:
        raise ValueError(f"Example project {project_id} contains no valid surfaces.")
    return documents
