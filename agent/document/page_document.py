"""A small PageDocument-to-A2UI compiler used by the collaboration POC.

``PageDocument`` is deliberately the source of truth. A2UI messages are a
transport projection for one renderer session and must never be edited or
persisted as the authoring document.
"""

from __future__ import annotations

from collections.abc import Mapping
from copy import deepcopy
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any

from ..core.config import DEFAULT_CATALOG_ID


class SyncMode(StrEnum):
    SNAPSHOT = "snapshot"
    INCREMENTAL = "incremental"
    REPLACE_SURFACE = "replace_surface"


@dataclass(frozen=True)
class PageComponent:
    """An authoring component with a stable identity and catalog properties."""

    id: str
    component: str
    props: Mapping[str, Any] = field(default_factory=dict)

    def to_a2ui(self) -> dict[str, Any]:
        return {"id": self.id, "component": self.component, **deepcopy(dict(self.props))}


@dataclass(frozen=True)
class PageDocument:
    """Versioned, renderer-independent source document for one A2UI surface."""

    document_id: str
    revision: int
    surface_id: str
    components: tuple[PageComponent, ...]
    data: Mapping[str, Any] = field(default_factory=dict)
    catalog_id: str = DEFAULT_CATALOG_ID
    theme: Mapping[str, Any] | None = None

    def __post_init__(self) -> None:
        if not self.document_id:
            raise ValueError("document_id is required.")
        if self.revision < 1:
            raise ValueError("revision must be at least 1.")
        if not self.surface_id:
            raise ValueError("surface_id is required.")
        if not self.catalog_id:
            raise ValueError("catalog_id is required.")
        ids = [component.id for component in self.components]
        if not ids or "root" not in ids:
            raise ValueError("PageDocument must contain a component with id 'root'.")
        if len(ids) != len(set(ids)):
            raise ValueError("PageDocument component IDs must be unique.")
        for component in self.components:
            if not component.id or not component.component:
                raise ValueError("Every component needs a non-empty id and component type.")

    @classmethod
    def from_dict(cls, value: Mapping[str, Any]) -> PageDocument:
        raw_components = value.get("components")
        if not isinstance(raw_components, list):
            raise TypeError("components must be a list.")
        components: list[PageComponent] = []
        for raw in raw_components:
            if not isinstance(raw, Mapping):
                raise TypeError("Each component must be an object.")
            component_id = raw.get("id")
            component_type = raw.get("component")
            if not isinstance(component_id, str) or not isinstance(component_type, str):
                raise TypeError("Each component needs string id and component fields.")
            props = raw.get("props", {})
            if not isinstance(props, Mapping):
                raise TypeError("component.props must be an object.")
            components.append(PageComponent(component_id, component_type, deepcopy(dict(props))))

        data = value.get("data", {})
        if not isinstance(data, Mapping):
            raise TypeError("data must be an object.")
        theme = value.get("theme")
        if theme is not None and not isinstance(theme, Mapping):
            raise TypeError("theme must be an object when supplied.")
        document_id = value.get("documentId")
        surface_id = value.get("surfaceId")
        revision = value.get("revision", 1)
        catalog_id = value.get("catalogId", DEFAULT_CATALOG_ID)
        if not isinstance(document_id, str) or not isinstance(surface_id, str):
            raise TypeError("documentId and surfaceId must be strings.")
        if not isinstance(revision, int) or isinstance(revision, bool):
            raise TypeError("revision must be an integer.")
        if not isinstance(catalog_id, str):
            raise TypeError("catalogId must be a string.")
        return cls(
            document_id=document_id,
            revision=revision,
            surface_id=surface_id,
            catalog_id=catalog_id,
            components=tuple(components),
            data=deepcopy(dict(data)),
            theme=deepcopy(dict(theme)) if theme is not None else None,
        )

    def to_dict(self) -> dict[str, Any]:
        result: dict[str, Any] = {
            "documentId": self.document_id,
            "revision": self.revision,
            "surfaceId": self.surface_id,
            "catalogId": self.catalog_id,
            "components": [
                {"id": component.id, "component": component.component, "props": deepcopy(dict(component.props))}
                for component in self.components
            ],
            "data": deepcopy(dict(self.data)),
        }
        if self.theme is not None:
            result["theme"] = deepcopy(dict(self.theme))
        return result


@dataclass(frozen=True)
class SyncPlan:
    mode: SyncMode
    reason: str
    messages: list[dict[str, Any]]


def _message(kind: str, payload: Mapping[str, Any]) -> dict[str, Any]:
    return {"version": "v0.9", kind: deepcopy(dict(payload))}


def _escape_json_pointer(part: str) -> str:
    return part.replace("~", "~0").replace("/", "~1")


def _data_changes(before: Any, after: Any, path: str = "") -> list[tuple[str, Any, bool]]:
    if isinstance(before, Mapping) and isinstance(after, Mapping):
        changes: list[tuple[str, Any, bool]] = []
        keys = set(before) | set(after)
        for key in sorted(keys):
            child_path = f"{path}/{_escape_json_pointer(str(key))}"
            if key not in after:
                changes.append((child_path, None, True))
            elif key not in before:
                changes.append((child_path, after[key], False))
            else:
                changes.extend(_data_changes(before[key], after[key], child_path))
        return changes
    if before != after:
        return [(path or "/", after, False)]
    return []


class A2uiCompiler:
    """Selects an A2UI snapshot, incremental patch, or safe surface reset."""

    def __init__(self, replacement_threshold: float = 0.60) -> None:
        if not 0 < replacement_threshold <= 1:
            raise ValueError("replacement_threshold must be in (0, 1].")
        self.replacement_threshold = replacement_threshold

    def snapshot(self, document: PageDocument) -> SyncPlan:
        create: dict[str, Any] = {
            "surfaceId": document.surface_id,
            "catalogId": document.catalog_id,
        }
        if document.theme is not None:
            create["theme"] = deepcopy(dict(document.theme))
        messages = [
            _message("createSurface", create),
            _message(
                "updateComponents",
                {"surfaceId": document.surface_id, "components": [component.to_a2ui() for component in document.components]},
            ),
        ]
        if document.data:
            messages.append(_message("updateDataModel", {"surfaceId": document.surface_id, "path": "/", "value": document.data}))
        return SyncPlan(SyncMode.SNAPSHOT, "initial renderer synchronization", messages)

    def compile(self, previous: PageDocument | None, current: PageDocument) -> SyncPlan:
        if previous is None:
            return self.snapshot(current)
        if previous.document_id != current.document_id:
            raise ValueError("Cannot compile updates across different PageDocuments.")
        if current.revision <= previous.revision:
            raise ValueError("current revision must be greater than previous revision.")

        if previous.surface_id != current.surface_id or previous.catalog_id != current.catalog_id or previous.theme != current.theme:
            return self._replace_surface(previous, current, "surface configuration changed")

        before = {component.id: component.to_a2ui() for component in previous.components}
        after = {component.id: component.to_a2ui() for component in current.components}
        removed_ids = set(before) - set(after)
        changed = [
            component.to_a2ui()
            for component in current.components
            if before.get(component.id) != component.to_a2ui()
        ]
        total = max(len(before), len(after), 1)

        if removed_ids:
            return self._replace_surface(previous, current, "components were removed")
        if len(changed) / total >= self.replacement_threshold:
            return self._replace_surface(previous, current, "component change ratio exceeded threshold")

        messages: list[dict[str, Any]] = []
        if changed:
            messages.append(
                _message("updateComponents", {"surfaceId": current.surface_id, "components": changed})
            )
        for path, value, should_delete in _data_changes(previous.data, current.data):
            payload: dict[str, Any] = {"surfaceId": current.surface_id, "path": path}
            if not should_delete:
                payload["value"] = value
            messages.append(_message("updateDataModel", payload))
        return SyncPlan(SyncMode.INCREMENTAL, "stable surface with localized changes", messages)

    def _replace_surface(self, previous: PageDocument, current: PageDocument, reason: str) -> SyncPlan:
        snapshot = self.snapshot(current)
        return SyncPlan(
            SyncMode.REPLACE_SURFACE,
            reason,
            [_message("deleteSurface", {"surfaceId": previous.surface_id}), *snapshot.messages],
        )
