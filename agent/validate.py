from typing import Any

from .config import DEFAULT_CATALOG_ID


def validate_a2ui_messages(
    messages: list[dict[str, Any]],
    require_create_surface: bool = True,
    require_update_components: bool = True,
) -> None:
    if not isinstance(messages, list) or not messages:
        raise ValueError("a2ui_messages must be a non-empty list.")

    create_surface_count = 0
    update_components_count = 0

    for i, msg in enumerate(messages):
        if not isinstance(msg, dict):
            raise ValueError(f"Message at index {i} is not an object.")

        version = msg.get("version")
        if version != "v0.9":
            raise ValueError(f"Message at index {i} must have version 'v0.9'.")

        if "createSurface" in msg:
            create_surface_count += 1
            create = msg["createSurface"]
            if not isinstance(create, dict):
                raise ValueError("createSurface must be an object.")
            if "surfaceId" not in create:
                raise ValueError("createSurface.surfaceId is required.")
            if create.get("catalogId") != DEFAULT_CATALOG_ID:
                raise ValueError(
                    f"createSurface.catalogId must be '{DEFAULT_CATALOG_ID}'."
                )

        if "updateComponents" in msg:
            update_components_count += 1
            update = msg["updateComponents"]
            if not isinstance(update, dict):
                raise ValueError("updateComponents must be an object.")
            if "surfaceId" not in update:
                raise ValueError("updateComponents.surfaceId is required.")
            components = update.get("components")
            if not isinstance(components, list) or not components:
                raise ValueError("updateComponents.components must be a non-empty list.")
            for c in components:
                if not isinstance(c, dict):
                    raise ValueError("Each component in updateComponents must be an object.")
                if "id" not in c or "component" not in c:
                    raise ValueError("Each component must contain both 'id' and 'component'.")

    if require_create_surface and create_surface_count == 0:
        raise ValueError("At least one createSurface message is required.")
    if require_update_components and update_components_count == 0:
        raise ValueError("At least one updateComponents message is required.")
