from __future__ import annotations

import json
import re
import textwrap
from typing import Any

from .llm import build_llm
from .validate import validate_a2ui_messages


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
            updates.append(
                {
                    "id": source_component_id,
                    "component": "LearningPath",
                    "activeStepId": step_id,
                }
            )
    elif component_type == "DeepDivePrompt":
        selected_id = context_obj.get("selectedId")
        if isinstance(selected_id, str) and selected_id:
            updates.append(
                {
                    "id": source_component_id,
                    "component": "DeepDivePrompt",
                    "selectedId": selected_id,
                }
            )
    elif component_type == "SectionNavigator":
        section_id = context_obj.get("sectionId")
        if isinstance(section_id, str) and section_id:
            updates.append(
                {
                    "id": source_component_id,
                    "component": "SectionNavigator",
                    "activeSectionId": section_id,
                }
            )
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
            updates.append(
                {
                    "id": source_component_id,
                    "component": "CourseOutline",
                    "modules": new_modules,
                }
            )
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
) -> list[dict[str, Any]]:
    source_component_id = str(action.get("sourceComponentId") or "")
    component_snapshot = components.get(source_component_id, {})
    target_surface = str(action.get("surfaceId") or "")
    if not target_surface:
        target_surface = surface_ids[0] if surface_ids else "main"

    system_prompt = textwrap.dedent(
        """
        You are an A2Learn interaction engine.
        Produce ONLY a JSON array of A2UI v0.9 messages for incremental update.

        Hard requirements:
        - Return JSON array only, no markdown.
        - Every message must include "version": "v0.9".
        - Use updateComponents only (no createSurface/deleteSurface).
        - Keep component IDs stable.
        - Learner-facing text must be Chinese.
        """
    ).strip()

    user_prompt = textwrap.dedent(
        f"""
        请根据用户动作生成“增量”A2UI messages（仅 updateComponents）。

        Action count: {action_count}
        Target surface id: {target_surface}
        Source component id: {source_component_id}

        Incoming action JSON:
        {json.dumps(action, ensure_ascii=False, indent=2)}

        Source component snapshot:
        {json.dumps(component_snapshot, ensure_ascii=False, indent=2)}

        Existing surface IDs:
        {json.dumps(surface_ids, ensure_ascii=False)}

        只返回 JSON 数组，例如：
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
) -> list[dict[str, Any]]:
    try:
        messages = _build_llm_messages(action, components, surface_ids, action_count)
        if isinstance(messages, list) and messages:
            validate_a2ui_messages(messages, require_create_surface=False)
            return messages
    except Exception:
        pass
    return _fallback_action_response(action, components, surface_ids)
