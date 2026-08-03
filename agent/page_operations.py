"""Deterministic, constrained edits for a :class:`PageDocument`.

These operations are the write contract exposed to an editing agent. Keeping
them separate from the LLM means the server, not the model, owns component IDs,
parent/child integrity, and the next document revision.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from copy import deepcopy
from dataclasses import replace
from typing import Any

from .page_document import PageComponent, PageDocument


class PageOperationError(ValueError):
    pass


def apply_page_operations(document: PageDocument, operations: Sequence[Mapping[str, Any]]) -> PageDocument:
    """Apply an ordered, validated set of authoring operations.

    This function intentionally does *not* advance ``document.revision``. The
    store applies optimistic concurrency and assigns the next revision only
    after every operation has passed validation.
    """

    components = {component.id: component for component in document.components}
    order = [component.id for component in document.components]
    for operation in operations:
        if not isinstance(operation, Mapping):
            raise PageOperationError("Every operation must be an object.")
        op = operation.get("op")
        if op == "set_props":
            _set_props(components, operation)
        elif op == "insert_component":
            _insert_component(components, order, operation)
        elif op == "remove_component":
            _remove_component(components, order, operation)
        else:
            raise PageOperationError(f"Unsupported page operation: {op!r}.")
    return replace(document, components=tuple(components[component_id] for component_id in order))


def _component_id(operation: Mapping[str, Any], field: str = "component_id") -> str:
    value = operation.get(field)
    if not isinstance(value, str) or not value:
        raise PageOperationError(f"{field} must be a non-empty string.")
    return value


def _set_props(components: dict[str, PageComponent], operation: Mapping[str, Any]) -> None:
    component_id = _component_id(operation)
    current = components.get(component_id)
    if current is None:
        raise PageOperationError(f"Component does not exist: {component_id}.")
    props = operation.get("props")
    if not isinstance(props, Mapping):
        raise PageOperationError("set_props.props must be an object.")
    # ``id`` and ``component`` are stable identity fields, not mutable props.
    forbidden = {key for key in props if key in {"id", "component"}}
    if forbidden:
        raise PageOperationError(f"set_props cannot change identity fields: {sorted(forbidden)}.")
    components[component_id] = replace(current, props={**deepcopy(dict(current.props)), **deepcopy(dict(props))})


def _insert_component(
    components: dict[str, PageComponent], order: list[str], operation: Mapping[str, Any]
) -> None:
    parent_id = _component_id(operation, "parent_id")
    parent = components.get(parent_id)
    if parent is None:
        raise PageOperationError(f"Parent component does not exist: {parent_id}.")
    raw_component = operation.get("component")
    if not isinstance(raw_component, Mapping):
        raise PageOperationError("insert_component.component must be an object.")
    child_id = raw_component.get("id")
    child_type = raw_component.get("component")
    child_props = raw_component.get("props", {})
    if not isinstance(child_id, str) or not child_id or not isinstance(child_type, str) or not child_type:
        raise PageOperationError("Inserted component needs non-empty id and component fields.")
    if child_id in components:
        raise PageOperationError(f"Component ID already exists: {child_id}.")
    if not isinstance(child_props, Mapping):
        raise PageOperationError("Inserted component props must be an object.")

    parent_props = deepcopy(dict(parent.props))
    children = parent_props.get("children")
    if not isinstance(children, list) or not all(isinstance(child, str) for child in children):
        raise PageOperationError("insert_component requires a parent with a string children list.")
    index = operation.get("index", len(children))
    if not isinstance(index, int) or isinstance(index, bool) or not 0 <= index <= len(children):
        raise PageOperationError("insert_component.index must be a valid children-list index.")
    children.insert(index, child_id)
    parent_props["children"] = children
    components[parent_id] = replace(parent, props=parent_props)
    components[child_id] = PageComponent(id=child_id, component=child_type, props=deepcopy(dict(child_props)))
    order.append(child_id)


def _remove_component(
    components: dict[str, PageComponent], order: list[str], operation: Mapping[str, Any]
) -> None:
    component_id = _component_id(operation)
    if component_id == "root":
        raise PageOperationError("The root component cannot be removed.")
    target = components.get(component_id)
    if target is None:
        raise PageOperationError(f"Component does not exist: {component_id}.")
    # Removing a subtree requires a general graph operation and a component
    # catalog. The first tool surface deliberately permits leaf removal only.
    if isinstance(target.props.get("children"), list) and target.props["children"]:
        raise PageOperationError("remove_component currently supports leaf components only.")
    parent_ids: list[str] = []
    for candidate_id, candidate in components.items():
        children = candidate.props.get("children")
        if isinstance(children, list) and component_id in children:
            parent_ids.append(candidate_id)
    if len(parent_ids) != 1:
        raise PageOperationError("A removable component must have exactly one children-list parent.")
    parent_id = parent_ids[0]
    parent = components[parent_id]
    parent_props = deepcopy(dict(parent.props))
    parent_props["children"] = [child for child in parent_props["children"] if child != component_id]
    components[parent_id] = replace(parent, props=parent_props)
    del components[component_id]
    order.remove(component_id)
