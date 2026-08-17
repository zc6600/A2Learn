"""Shape and size checks for browser-only ``GenerativeLab`` source fields.

``GenerativeLab`` is deliberately a general browser component: generated
source may use network APIs, external modules, WebGL, workers, and embedded
content. Its boundary is the opaque-origin iframe in the frontend host, not a
feature blacklist here.
"""

from __future__ import annotations

from typing import Any


MAX_SOURCE_CHARS = 80_000
MAX_INITIAL_PROPS_CHARS = 16_000

def _literal_string(value: Any, field: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"GenerativeLab.{field} must be a string.")
    return value


def validate_generative_lab_component(component: dict[str, Any]) -> None:
    """Validate the bounded general-purpose source contract for one lab."""

    html = _literal_string(component.get("html"), "html")
    css = component.get("css", "")
    javascript = _literal_string(component.get("javascript"), "javascript")
    if not isinstance(css, str):
        raise ValueError("GenerativeLab.css must be a string when supplied.")
    source = "\n".join((html, css, javascript))
    if len(source) > MAX_SOURCE_CHARS:
        raise ValueError(f"GenerativeLab source exceeds {MAX_SOURCE_CHARS} characters.")
    initial_props = component.get("initialProps", {})
    if not isinstance(initial_props, dict):
        raise ValueError("GenerativeLab.initialProps must be an object when supplied.")
    if len(str(initial_props)) > MAX_INITIAL_PROPS_CHARS:
        raise ValueError(f"GenerativeLab.initialProps exceeds {MAX_INITIAL_PROPS_CHARS} characters.")
