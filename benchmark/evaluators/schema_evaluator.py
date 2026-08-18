"""Deterministic schema and format validator for A2UI / course_content outputs."""

from __future__ import annotations

import json
import re
from typing import Any

from agent.core.config import DEFAULT_CATALOG_ID


REGISTERED_COMPONENTS = {
    "Text",
    "Column",
    "AnalogyCard",
    "ClozeTest",
    "CodeSnippet",
    "ConceptCard",
    "CourseOutline",
    "DataTable",
    "DeepDivePrompt",
    "DetailedExplanation",
    "DocumentFigure",
    "DragAndDropMatch",
    "Flashcard",
    "GenerativeLab",
    "InteractiveFormula",
    "InteractiveSandbox",
    "KnowledgeTree",
    "LearningPath",
    "LearningSection",
    "LiteratureReference",
    "MentalModel",
    "PaperAbstract",
    "QuizCard",
    "RelationshipMatch",
    "ResourceList",
    "ScenarioDialogue",
    "SmartAnnotationBoard",
    "SocialMoments",
    "Timeline",
}


def parse_raw_llm_json(raw_text: str) -> Any:
    """Safely extract and parse JSON from LLM raw output."""
    text = raw_text.strip()
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict) and isinstance(parsed.get("a2ui_messages"), list):
            return parsed["a2ui_messages"]
        if isinstance(parsed, dict) and isinstance(parsed.get("messages"), list):
            return parsed["messages"]
        return parsed
    except Exception:
        pass

    # Try extracting markdown code fence ```json ... ```
    for fenced in re.finditer(r"```(?:json)?\s*([\s\S]*?)\s*```", text):
        candidate = fenced.group(1).strip()
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict) and isinstance(parsed.get("a2ui_messages"), list):
                return parsed["a2ui_messages"]
            if isinstance(parsed, dict) and isinstance(parsed.get("messages"), list):
                return parsed["messages"]
            return parsed
        except Exception:
            continue

    # Try finding first valid JSON array or object using balanced scanning
    for start_char, end_char in (("[", "]"), ("{", "}")):
        first_idx = text.find(start_char)
        if first_idx != -1:
            last_idx = text.rfind(end_char)
            if last_idx > first_idx:
                candidate = text[first_idx : last_idx + 1]
                try:
                    parsed = json.loads(candidate)
                    if isinstance(parsed, dict) and isinstance(parsed.get("a2ui_messages"), list):
                        return parsed["a2ui_messages"]
                    if isinstance(parsed, dict) and isinstance(parsed.get("messages"), list):
                        return parsed["messages"]
                    return parsed
                except Exception:
                    pass

    # Fallback: scan regex blocks
    matches = re.findall(r"\[[\s\S]*?\]", text)
    for raw in matches:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            continue

    raise ValueError(f"Failed to parse valid JSON from model output (length {len(text)}).")


def evaluate_schema_validity(raw_output: str | Any) -> tuple[float, list[str], list[dict[str, Any]]]:
    """Evaluate JSON & A2UI schema conformance.

    Returns:
        score: float between 0.0 and 100.0
        errors: list of error/warning strings
        components: extracted list of component dictionaries
    """
    errors: list[str] = []
    components: list[dict[str, Any]] = []

    # 1. Parse JSON
    try:
        if isinstance(raw_output, str):
            data = parse_raw_llm_json(raw_output)
        else:
            data = raw_output
    except Exception as exc:
        return 0.0, [f"JSON Parse Error: {exc}"], []

    score = 100.0

    # 2. Check if data is A2UI message list, direct component list, or course_content dict
    if isinstance(data, list):
        if not data:
            return 0.0, ["A2UI message array is empty."], []

        # Check if list contains A2UI message envelope (createSurface/updateComponents)
        has_envelope = any(
            isinstance(item, dict) and ("createSurface" in item or "updateComponents" in item)
            for item in data
        )

        if not has_envelope:
            errors.append("Output is a direct component array instead of full A2UI v0.9 envelope (missing createSurface/updateComponents).")
            score -= 25.0
            for comp in data:
                if not isinstance(comp, dict):
                    errors.append(f"Element in component array is not an object: {comp}")
                    score -= 10.0
                    continue
                # Normalize component type field if model used 'type' or 'componentType'
                if "component" not in comp and "type" in comp:
                    comp["component"] = comp["type"]
                elif "component" not in comp and "componentType" in comp:
                    comp["component"] = comp["componentType"]

                components.append(comp)
                c_id = comp.get("id")
                c_type = comp.get("component")
                if not c_id or not isinstance(c_id, str):
                    errors.append("Component is missing a valid non-empty 'id' string.")
                    score -= 5.0
                if not c_type or not isinstance(c_type, str):
                    errors.append("Component is missing a valid non-empty 'component' type string.")
                    score -= 5.0
                elif c_type not in REGISTERED_COMPONENTS:
                    errors.append(f"Unregistered component type '{c_type}' used.")
                    score -= 8.0

                if "props" in comp:
                    errors.append(
                        f"Component '{c_id}' illegally wrapped properties inside a 'props' object; "
                        "A2UI requires top-level fields."
                    )
                    score -= 15.0
        else:
            has_create_surface = False
            has_update_components = False

            for i, msg in enumerate(data):
                if not isinstance(msg, dict):
                    errors.append(f"Message at index {i} is not a JSON object.")
                    score -= 15.0
                    continue

                version = msg.get("version")
                if version != "v0.9":
                    errors.append(f"Message at index {i} has invalid or missing version '{version}' (expected 'v0.9').")
                    score -= 10.0

                if "createSurface" in msg:
                    has_create_surface = True
                    create = msg["createSurface"]
                    if not isinstance(create, dict) or "surfaceId" not in create:
                        errors.append(f"Message {i}: createSurface must contain surfaceId.")
                        score -= 10.0
                    if isinstance(create, dict) and create.get("catalogId") not in {DEFAULT_CATALOG_ID, None}:
                        errors.append(f"Message {i}: catalogId '{create.get('catalogId')}' is non-standard.")
                        score -= 5.0

                if "updateComponents" in msg:
                    has_update_components = True
                    update = msg["updateComponents"]
                    if not isinstance(update, dict) or "surfaceId" not in update:
                        errors.append(f"Message {i}: updateComponents must contain surfaceId.")
                        score -= 10.0
                    comp_list = update.get("components", []) if isinstance(update, dict) else []
                    if not isinstance(comp_list, list) or not comp_list:
                        errors.append(f"Message {i}: updateComponents.components must be a non-empty list.")
                        score -= 15.0
                    else:
                        for comp in comp_list:
                            if not isinstance(comp, dict):
                                errors.append(f"Component in updateComponents is not an object: {comp}")
                                score -= 10.0
                                continue
                            components.append(comp)
                            c_id = comp.get("id")
                            c_type = comp.get("component")
                            if not c_id or not isinstance(c_id, str):
                                errors.append("Component is missing a valid non-empty 'id' string.")
                                score -= 5.0
                            if not c_type or not isinstance(c_type, str):
                                errors.append("Component is missing a valid non-empty 'component' type string.")
                                score -= 5.0
                            elif c_type not in REGISTERED_COMPONENTS:
                                errors.append(f"Unregistered component type '{c_type}' used.")
                                score -= 8.0

                            if "props" in comp:
                                errors.append(
                                    f"Component '{c_id}' illegally wrapped properties inside a 'props' object; "
                                    "A2UI requires top-level fields."
                                )
                                score -= 15.0

            if not has_create_surface:
                errors.append("Missing required createSurface message.")
                score -= 20.0
            if not has_update_components:
                errors.append("Missing required updateComponents message.")
                score -= 30.0

    elif isinstance(data, dict):
        # High-level course_content format
        required_fields = {"siteTitle", "description"}
        missing = [f for f in required_fields if f not in data]
        if missing:
            errors.append(f"course_content.json missing top-level fields: {missing}")
            score -= 20.0

        # Check section payloads
        recognized_sections = {
            "dialogue",
            "conceptCard",
            "mentalModel",
            "detailedExplanation",
            "quiz",
            "clozeTest",
            "dataTable",
            "formula",
            "timeline",
            "codeSnippets",
        }
        found_sections = recognized_sections.intersection(data.keys())
        if not found_sections:
            errors.append("No recognized pedagogical sections found in course_content dict.")
            score -= 40.0

        # Synthesize virtual components list for downstream evaluators
        if "siteTitle" in data:
            components.append({"id": "header", "component": "Text", "text": data["siteTitle"]})
        if "dataTable" in data:
            components.append({"id": "data-table", "component": "DataTable", **data["dataTable"]})
        if "mentalModel" in data:
            components.append({"id": "mental-model", "component": "MentalModel", **data["mentalModel"]})
        if "quiz" in data:
            components.append({"id": "quiz", "component": "QuizCard", **data["quiz"]})
        if "dialogue" in data:
            components.append({"id": "dialogue", "component": "ScenarioDialogue", **data["dialogue"]})
        if "formula" in data:
            components.append({"id": "formula", "component": "InteractiveFormula", **data["formula"]})
    else:
        return 0.0, ["Model output must be a JSON array or JSON object."], []

    final_score = max(0.0, min(100.0, score))
    return final_score, errors, components
