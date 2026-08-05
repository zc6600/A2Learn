"""Import bundled A2UI examples into the PageDocument project model."""

from __future__ import annotations

import json
import os
from copy import deepcopy
from pathlib import Path
from typing import Any, Literal

from agent.document.page_document import PageDocument

ExampleLanguage = Literal["zh", "en"]

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
    }
)


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

    if project_id not in EXAMPLE_IDS:
        raise ValueError(f"Unknown example project: {project_id}")
    document_project_id = document_project_id or project_id
    root = Path(os.getenv("A2LEARN_EXAMPLES_ROOT", Path(__file__).resolve().parents[2] / "apps/viewer/public/examples"))
    path = root / ("en" if language == "en" else "") / f"{project_id}.json"
    if not path.is_file():
        raise FileNotFoundError(f"Example source not found: {path}")
    messages = json.loads(path.read_text(encoding="utf-8"))
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
        if not isinstance(components, list) or not any(item.get("id") == "root" for item in components if isinstance(item, dict)):
            raise ValueError(f"Example surface {surface_id} does not contain a root component.")
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
                        for component in components
                        if isinstance(component, dict)
                    ],
                    "data": {},
                }
            )
        )
    if not documents:
        raise ValueError(f"Example project {project_id} contains no surfaces.")
    return documents
