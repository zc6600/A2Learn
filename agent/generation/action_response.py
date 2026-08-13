"""Generator for incremental A2UI v0.9 updates in response to user actions."""

from __future__ import annotations

import json
import re
import textwrap
from typing import Any

from ..core.validate import validate_a2ui_messages
from .llm import build_llm


def _truncate_value(
    value: Any,
    *,
    max_str_len: int,
    max_list_len: int,
    max_dict_items: int,
    max_depth: int,
) -> Any:
    if max_depth <= 0:
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        return "<truncated>"
    if isinstance(value, str):
        if len(value) <= max_str_len:
            return value
        return value[: max(0, max_str_len - 1)] + "…"
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    if isinstance(value, list):
        sliced = value[:max_list_len]
        out = [
            _truncate_value(
                x,
                max_str_len=max_str_len,
                max_list_len=max_list_len,
                max_dict_items=max_dict_items,
                max_depth=max_depth - 1,
            )
            for x in sliced
        ]
        if len(value) > max_list_len:
            out.append(f"<{len(value) - max_list_len} more items>")
        return out
    if isinstance(value, dict):
        items = list(value.items())[:max_dict_items]
        out: dict[str, Any] = {}
        for k, v in items:
            out[str(k)] = _truncate_value(
                v,
                max_str_len=max_str_len,
                max_list_len=max_list_len,
                max_dict_items=max_dict_items,
                max_depth=max_depth - 1,
            )
        if len(value) > max_dict_items:
            out["<more_keys>"] = len(value) - max_dict_items
        return out
    return str(value)


def _components_index(
    components: dict[str, dict[str, Any]],
    component_surfaces: dict[str, str] | None,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for cid, comp in components.items():
        if not isinstance(comp, dict):
            continue
        out.append(
            {
                "id": cid,
                "component": comp.get("component"),
                "surfaceId": (component_surfaces or {}).get(cid),
            }
        )
    out.sort(key=lambda x: (str(x.get("surfaceId") or ""), str(x.get("component") or ""), str(x.get("id") or "")))
    return out


def _select_components_for_prompt(
    *,
    components: dict[str, dict[str, Any]],
    component_surfaces: dict[str, str] | None,
    target_surface: str,
    source_component_id: str,
    max_components: int,
) -> list[dict[str, Any]]:
    surface_map = component_surfaces or {}

    def score(cid: str) -> tuple[int, int, str]:
        if cid == source_component_id:
            return (0, 0, cid)
        sid = surface_map.get(cid, "")
        if target_surface and sid == target_surface:
            return (1, 0, cid)
        if sid:
            return (2, 0, cid)
        return (3, 0, cid)

    selected_ids = [cid for cid in sorted(components.keys(), key=score)][:max_components]
    out: list[dict[str, Any]] = []
    for cid in selected_ids:
        comp = components.get(cid)
        if not isinstance(comp, dict):
            continue
        out.append(
            {
                "surfaceId": surface_map.get(cid),
                **_truncate_value(
                    {"id": cid, **comp},
                    max_str_len=1800,
                    max_list_len=80,
                    max_dict_items=160,
                    max_depth=6,
                ),
            }
        )
    return out


def _extract_json_array(text: str) -> list[dict[str, Any]]:
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    candidate = (fenced.group(1) if fenced else text).strip()
    try:
        parsed = json.loads(candidate)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict) and isinstance(parsed.get("a2ui_messages"), list):
            return parsed["a2ui_messages"]
    except Exception:
        pass

    matches = re.findall(r"\[[\s\S]*?\]", candidate)
    for raw in matches:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            continue
    raise ValueError("LLM did not return a valid JSON array.")


def _fallback_action_response(
    action: dict[str, Any],
    components: dict[str, dict[str, Any]],
    surface_ids: list[str],
) -> list[dict[str, Any]]:
    name = str(action.get("name") or "")
    source_component_id = str(action.get("sourceComponentId") or "")
    surface_id = str(action.get("surfaceId") or "")
    context = action.get("context")
    context_obj = context if isinstance(context, dict) else {}
    target_surface = surface_id or (surface_ids[0] if surface_ids else "main")

    updates: list[dict[str, Any]] = []
    current = components.get(source_component_id, {})
    component_type = current.get("component")

    if component_type == "LearningPath":
        step_id = context_obj.get("stepId")
        if isinstance(step_id, str) and step_id:
            updates.append({"id": source_component_id, "component": "LearningPath", "activeStepId": step_id})
    elif component_type == "DeepDivePrompt":
        selected_id = context_obj.get("selectedId")
        if isinstance(selected_id, str) and selected_id:
            updates.append({"id": source_component_id, "component": "DeepDivePrompt", "selectedId": selected_id})
    elif component_type == "CourseOutline":
        modules = current.get("modules")
        module_id = context_obj.get("moduleId")
        if isinstance(modules, list) and isinstance(module_id, str):
            new_modules: list[dict[str, Any]] = []
            for item in modules:
                if not isinstance(item, dict):
                    continue
                new_item = dict(item)
                sid = new_item.get("id")
                if sid == module_id:
                    new_item["status"] = "expanded"
                elif new_item.get("status") == "expanded":
                    new_item["status"] = "completed"
                new_modules.append(new_item)
            updates.append({"id": source_component_id, "component": "CourseOutline", "modules": new_modules})
    elif component_type == "InteractiveSandbox" and name:
        code = context_obj.get("code")
        if isinstance(code, str):
            updates.append(
                {
                    "id": source_component_id,
                    "component": "InteractiveSandbox",
                    "status": "success",
                    "output": f"Agent received code and processed action '{name}'.\n\n{code}",
                }
            )
    elif component_type == "SmartAnnotationBoard":
        content = context_obj.get("content")
        if isinstance(content, str):
            updates.append(
                {
                    "id": source_component_id,
                    "component": "SmartAnnotationBoard",
                    "status": "reviewed",
                    "userContent": content,
                    "feedback": {
                        "score": 80,
                        "overallComment": "已收到提交内容。当前为降级回执，后续可接入更深入 AI 批注。",
                        "inlineAnnotations": [],
                    },
                }
            )

    if not updates and source_component_id and isinstance(component_type, str):
        updates.append({"id": source_component_id, "component": component_type})

    if not updates:
        return []

    return [
        {
            "version": "v0.9",
            "updateComponents": {
                "surfaceId": target_surface,
                "components": updates,
            },
        }
    ]


def _build_llm_messages(
    action: dict[str, Any],
    components: dict[str, dict[str, Any]],
    surface_ids: list[str],
    action_count: int,
    component_surfaces: dict[str, str] | None = None,
    target_language: str = "zh",
) -> list[dict[str, Any]]:
    source_component_id = str(action.get("sourceComponentId") or "")
    component_snapshot = components.get(source_component_id, {})
    target_surface = str(action.get("surfaceId") or "")
    if not target_surface:
        target_surface = surface_ids[0] if surface_ids else "main"

    all_components_index = _components_index(components, component_surfaces)
    components_snapshot = _select_components_for_prompt(
        components=components,
        component_surfaces=component_surfaces,
        target_surface=target_surface,
        source_component_id=source_component_id,
        max_components=200,
    )

    learner_language = "English" if target_language == "en" else "Simplified Chinese"
    system_prompt = textwrap.dedent(
        f"""
        You are an A2Learn interaction engine.
        Produce ONLY a JSON array of A2UI v0.9 messages for incremental update.

        Hard requirements:
        - Return JSON array only, no markdown.
        - Every message must include "version": "v0.9".
        - Use updateComponents only (no createSurface/deleteSurface).
        - Keep component IDs stable.
        - Learner-facing text must be in {learner_language}.
        """
    ).strip()

    user_prompt = textwrap.dedent(
        f"""
        Generate incremental A2UI messages based on the user action (updateComponents only).

        Action count: {action_count}
        Target surface id: {target_surface}
        Source component id: {source_component_id}

        Incoming action JSON:
        {json.dumps(action, ensure_ascii=False, indent=2)}

        Source component snapshot:
        {json.dumps(component_snapshot, ensure_ascii=False, indent=2)}

        All components index (id/component/surfaceId):
        {json.dumps(all_components_index, ensure_ascii=False, indent=2)}

        Selected components snapshot (prioritize same surface; truncated):
        {json.dumps(components_snapshot, ensure_ascii=False, indent=2)}

        Existing surface IDs:
        {json.dumps(surface_ids, ensure_ascii=False)}

        Return only a JSON array, for example:
        [
          {{
            "version":"v0.9",
            "updateComponents": {{
              "surfaceId":"{target_surface}",
              "components":[{{"id":"{source_component_id}", "component":"<same component type>"}}]
            }}
          }}
        ]
        """
    ).strip()

    llm = build_llm()
    response = llm.invoke(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    )
    content = getattr(response, "content", "")
    if isinstance(content, list):
        content = "".join(str(x) for x in content)
    return _extract_json_array(str(content))


def build_action_response(
    action: dict[str, Any],
    components: dict[str, dict[str, Any]],
    surface_ids: list[str],
    action_count: int,
    component_surfaces: dict[str, str] | None = None,
    target_language: str = "zh",
) -> list[dict[str, Any]]:
    try:
        messages = _build_llm_messages(
            action, components, surface_ids, action_count, component_surfaces, target_language
        )
        if isinstance(messages, list) and messages:
            validate_a2ui_messages(messages, require_create_surface=False)
            return messages
    except Exception:
        pass
    return _fallback_action_response(action, components, surface_ids)
