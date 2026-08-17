"""LangGraph course generation engine and execution workflow."""

import json
import os
import time
from copy import deepcopy
from typing import Any, TypedDict

from langgraph.graph import END, StateGraph

from ..core.io import (
    create_output_dir,
    export_messages,
    extract_text_from_path,
    write_json,
)
from ..core.validate import validate_a2ui_messages
from .llm import (
    build_llm,
    build_site_plan,
    generate_a2ui_messages,
    generate_a2ui_messages_per_surface,
    generate_structured_json,
    plan_curriculum,
    repair_a2ui_messages,
)
from .media.image_generation import enrich_a2ui_messages_with_images
from .parser import parse_json_to_a2ui
from .profile import load_reference_examples, normalize_generation_profile
from .prompts import load_component_prompts


class AgentState(TypedDict, total=False):
    resource_path: str
    resource_text: str
    api_key: str
    curriculum: dict[str, Any]
    curriculum_path: str
    site_plan: dict[str, Any]
    site_path: str
    a2ui_messages: list[dict[str, Any]]
    output_dir: str
    generated_messages_path: str
    target_language: str
    generation_profile: dict[str, Any]


def _log(msg: str) -> None:
    ts = time.strftime("%H:%M:%S")
    print(f"[A2Learn] [{ts}] {msg}", flush=True)


def _node_init_output(state: AgentState) -> AgentState:
    _log("🚀 Starting A2Learn agent...")
    out = create_output_dir()
    _log(f"📁 Output directory: {out.resolve()}")
    return {"output_dir": str(out.resolve())}


def _node_load_resource(state: AgentState) -> AgentState:
    if state.get("resource_text"):
        _log("📝 Using provided text as resource.")
        return {"resource_text": state["resource_text"]}
    _log(f"📂 Loading resource from: {state['resource_path']}")
    text = extract_text_from_path(state["resource_path"])
    _log(f"✅ Resource loaded ({len(text)} characters).")
    return {"resource_text": text}


def _node_plan_curriculum(state: AgentState) -> AgentState:
    _log("🧠 Step 1/3: Planning curriculum (calling LLM, please wait...)")
    llm = build_llm(api_key=state.get("api_key"))
    curriculum = plan_curriculum(llm, state["resource_text"], state.get("target_language", "zh"))
    _log(f"✅ Curriculum planned: {len(curriculum.get('modules', []))} modules.")
    output_dir = state.get("output_dir")
    if output_dir:
        curriculum_path = write_json(output_dir, "curriculum.json", curriculum)
        return {"curriculum": curriculum, "curriculum_path": curriculum_path}
    return {"curriculum": curriculum}


def _node_build_site(state: AgentState) -> AgentState:
    _log("🏗️  Step 2/3: Building site plan (calling LLM, please wait...)")
    llm = build_llm(api_key=state.get("api_key"))
    profile = normalize_generation_profile(state.get("generation_profile"))
    site_plan = build_site_plan(
        llm,
        state["curriculum"],
        state.get("target_language", "zh"),
        profile.enabled_components,
    )
    _log(f"✅ Site plan built: {len(site_plan.get('surfaces', []))} surfaces.")
    output_dir = state.get("output_dir")
    if output_dir:
        site_path = write_json(output_dir, "site.json", site_plan)
        return {"site_plan": site_plan, "site_path": site_path}
    return {"site_plan": site_plan}


def _validate_or_repair(
    llm: Any,
    messages: list[dict[str, Any]],
    max_repair_attempts: int,
    permitted_custom_components: tuple[str, ...] | None = None,
) -> list[dict[str, Any]]:
    for attempt in range(max_repair_attempts + 1):
        messages = _normalize_a2ui_messages(messages)
        try:
            validate_a2ui_messages(messages, permitted_custom_components=permitted_custom_components)
            return messages
        except ValueError as exc:
            if attempt == max_repair_attempts:
                raise
            _log(
                f"⚠️  Generated A2UI messages failed validation ({exc}); "
                f"asking LLM to repair (attempt {attempt + 1}/{max_repair_attempts})..."
            )
            messages = repair_a2ui_messages(llm, messages, str(exc))
    return messages


def _normalize_component_type(value: Any) -> str | None:
    """Recover a component type from common model-produced object wrappers."""
    if isinstance(value, str) and value.strip():
        return value.strip()
    if isinstance(value, dict):
        for key in ("component", "type", "name"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()
    return None


def _normalize_a2ui_messages(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Make recoverable LLM component trees safe for the flat A2UI renderer.

    Some providers occasionally return a nested tree, omit an id, or wrap the
    component type as ``{name: \"Column\"}``. These are structural slips rather
    than content errors, so repair them deterministically before asking the
    model to spend another request rewriting the entire document.
    """
    if not isinstance(messages, list):
        return messages

    normalized = deepcopy(messages)
    for message in normalized:
        if not isinstance(message, dict):
            continue
        update = message.get("updateComponents")
        if not isinstance(update, dict) or not isinstance(update.get("components"), list):
            continue

        flattened: list[dict[str, Any]] = []
        used_ids: set[str] = set()
        generated_count = 0

        def unique_id(preferred: Any, component_type: str) -> str:
            nonlocal generated_count
            if isinstance(preferred, str) and preferred.strip() and preferred.strip() not in used_ids:
                component_id = preferred.strip()
            else:
                stem = "".join(char.lower() if char.isalnum() else "-" for char in component_type).strip("-") or "component"
                generated_count += 1
                component_id = f"generated-{stem}-{generated_count}"
                while component_id in used_ids:
                    generated_count += 1
                    component_id = f"generated-{stem}-{generated_count}"
            used_ids.add(component_id)
            return component_id

        def visit(raw: Any) -> str | None:
            if not isinstance(raw, dict):
                return None
            component_type = _normalize_component_type(raw.get("component")) or _normalize_component_type(raw.get("type"))
            if component_type is None:
                # A wrapper without its own component type can still contain
                # a model-produced component tree.
                nested = raw.get("components") or raw.get("children")
                if isinstance(nested, list):
                    for child in nested:
                        visit(child)
                return None

            component_id = unique_id(raw.get("id"), component_type)
            # A2UI component properties are flat.  Some models instead use the
            # conventional UI-JSON shape ``{component, props: {...}}``; retain
            # any explicit top-level value but unwrap that recoverable wrapper
            # before the message reaches the renderer.
            wrapped_props = raw.get("props")
            props = deepcopy(wrapped_props) if isinstance(wrapped_props, dict) else {}
            component = {
                key: deepcopy(value)
                for key, value in raw.items()
                if key not in {"id", "component", "type", "children", "components", "props"}
            }
            for key, value in props.items():
                component.setdefault(key, value)
            component["id"] = component_id
            component["component"] = component_type

            child_ids: list[str] = []
            raw_children = raw.get("children")
            if not isinstance(raw_children, list):
                wrapped_children = props.get("children")
                raw_children = wrapped_children if isinstance(wrapped_children, list) else raw_children
            if isinstance(raw_children, list):
                for child in raw_children:
                    if isinstance(child, str):
                        child_ids.append(child)
                    else:
                        child_id = visit(child)
                        if child_id:
                            child_ids.append(child_id)
            nested_components = raw.get("components")
            if isinstance(nested_components, list):
                for child in nested_components:
                    child_id = visit(child)
                    if child_id:
                        child_ids.append(child_id)
            if child_ids:
                component["children"] = child_ids
            elif isinstance(raw_children, list):
                component["children"] = []
            flattened.append(component)
            return component_id

        top_level_ids = [component_id for raw in update["components"] if (component_id := visit(raw))]
        if flattened and not any(component["id"] == "root" for component in flattened):
            flattened.insert(0, {"id": "root", "component": "Column", "children": top_level_ids})
        if flattened:
            update["components"] = flattened
    return normalized


def _node_generate_messages(state: AgentState) -> AgentState:
    _log("✨ Step 3/3: Generating A2UI messages (calling LLM, please wait...)")
    llm = build_llm(api_key=state.get("api_key"))
    profile = normalize_generation_profile(state.get("generation_profile"))
    resource_text = state["resource_text"]
    site_plan = state.get("site_plan")
    per_surface = os.getenv("A2LEARN_PER_SURFACE_GENERATION", "0") == "1"
    if site_plan and per_surface:
        messages = generate_a2ui_messages_per_surface(
            llm,
            resource_text,
            site_plan,
            state.get("target_language", "zh"),
            profile.enabled_components,
            profile.example_ids,
            profile.visual_intent,
            profile.image_generation_limit,
            profile.reference_pack_ids,
        )
    else:
        if site_plan:
            resource_text = (
                resource_text
                + "\n\n# SITE PLAN\n"
                + json.dumps(site_plan, ensure_ascii=False)
            )
        messages = generate_a2ui_messages(
            llm,
            resource_text,
            state.get("target_language", "zh"),
            profile.enabled_components,
            profile.example_ids,
            profile.visual_intent,
            profile.image_generation_limit,
            profile.reference_pack_ids,
        )
    max_repair_attempts = int(os.getenv("A2LEARN_MAX_REPAIR_ATTEMPTS", "2"))
    messages = _validate_or_repair(
        llm,
        messages,
        max_repair_attempts,
        profile.enabled_components,
    )
    if profile.image_generation_limit:
        _log(f"🖼️  Creating up to {profile.image_generation_limit} automatic illustration(s)...")
        enrich_a2ui_messages_with_images(
            messages,
            image_limit=profile.image_generation_limit,
            api_key=state.get("api_key"),
        )
    _log(f"✅ Generated {len(messages)} A2UI messages.")
    return {"a2ui_messages": messages}


def _node_export(state: AgentState) -> AgentState:
    return export_messages(state["a2ui_messages"], output_dir=state.get("output_dir"))


def build_agent_graph():
    graph = StateGraph(AgentState)
    graph.add_node("init_output", _node_init_output)
    graph.add_node("load_resource", _node_load_resource)
    graph.add_node("plan_curriculum", _node_plan_curriculum)
    graph.add_node("build_site", _node_build_site)
    graph.add_node("generate_messages", _node_generate_messages)
    graph.add_node("export", _node_export)
    graph.set_entry_point("init_output")
    graph.add_edge("init_output", "load_resource")
    graph.add_edge("load_resource", "plan_curriculum")
    graph.add_edge("plan_curriculum", "build_site")
    graph.add_edge("build_site", "generate_messages")
    graph.add_edge("generate_messages", "export")
    graph.add_edge("export", END)
    return graph.compile()


def run_parser_mode(
    resource_path: str = None,
    resource_text: str = None,
    api_key: str = None,
    target_language: str = "zh",
    generation_profile: dict[str, Any] | None = None,
) -> AgentState:
    from pathlib import Path

    _log("🚀 Starting A2Learn parser mode...")
    out = create_output_dir()
    output_dir = str(out.resolve())
    _log(f"📁 Output directory: {output_dir}")

    if resource_text:
        _log("📝 Using provided text as resource.")
        text = resource_text
    elif resource_path:
        _log(f"📂 Loading resource from: {resource_path}")
        text = extract_text_from_path(resource_path)
        _log(f"✅ Resource loaded ({len(text)} characters).")
    else:
        raise ValueError("Either resource_path or resource_text must be provided")

    prompt_file = Path(__file__).resolve().parent.parent.parent / "skill" / "references" / "parser_mode_prompt.txt"
    if not prompt_file.exists():
        raise FileNotFoundError(f"Parser prompt template not found at {prompt_file}")
    prompt_template = prompt_file.read_text(encoding="utf-8")
    profile = normalize_generation_profile(generation_profile)
    if profile.enabled_components is not None:
        parser_field_map = {
            "LearningPath": "learningPath",
            "PaperAbstract": "paperAbstract",
            "LiteratureReference": "literatureReference",
            "ConceptCard": "conceptCard",
            "MentalModel": "mentalModel",
            "InteractiveFormula": "interactiveFormula",
            "InteractiveSandbox": "interactiveSandbox",
            "GenerativeLab": "generativeLab",
            "QuizCard": "quizCard",
            "DetailedExplanation": "detailedExplanation",
            "ResourceList": "resourceList",
        }
        supported_fields = [
            field for component, field in parser_field_map.items() if component in profile.enabled_components
        ]
        prompt_template += (
            "\n\nGeneration selection:\n"
            "Only populate these optional JSON objects: "
            + ", ".join(supported_fields or ["none"])
            + ". Omit every other optional component object from the schema."
        )
    component_prompts = load_component_prompts(profile.enabled_components)
    if component_prompts:
        prompt_template += "\n\n" + component_prompts
    reference_examples = load_reference_examples(profile.example_ids, target_language)
    if reference_examples:
        prompt_template += (
            "\n\nThe following selected A2UI pages are style and structure references only. "
            "Still return the structured JSON schema requested above, not A2UI messages."
            + reference_examples
        )

    _log("✨ Generating structured JSON (calling LLM, please wait...)")
    llm = build_llm(api_key=api_key)
    structured_data = generate_structured_json(llm, text, prompt_template, target_language)

    write_json(output_dir, "course_content.json", structured_data)
    _log("✅ Structured course JSON generated.")

    _log("⚙️ Parsing JSON to A2UI messages...")
    messages = parse_json_to_a2ui(structured_data, profile.enabled_components)
    validate_a2ui_messages(messages, permitted_custom_components=profile.enabled_components)
    _log(f"✅ Generated {len(messages)} A2UI messages from parser.")

    export_res = export_messages(messages, output_dir=output_dir)

    return {
        "resource_path": resource_path or "",
        "resource_text": text,
        "a2ui_messages": messages,
        "output_dir": output_dir,
        "generated_messages_path": export_res["generated_messages_path"],
    }


def run_agent(
    resource_path: str = None,
    resource_text: str = None,
    mode: str = "agent",
    api_key: str = None,
    target_language: str = "zh",
    generation_profile: dict[str, Any] | None = None,
) -> AgentState:
    if mode == "parser":
        return run_parser_mode(
            resource_path,
            resource_text,
            api_key=api_key,
            target_language=target_language,
            generation_profile=generation_profile,
        )

    app = build_agent_graph()
    initial_state = {}
    if resource_path:
        initial_state["resource_path"] = resource_path
    if resource_text:
        initial_state["resource_text"] = resource_text
    if api_key:
        initial_state["api_key"] = api_key
    initial_state["target_language"] = target_language
    if generation_profile is not None:
        normalize_generation_profile(generation_profile)
        initial_state["generation_profile"] = generation_profile

    if not resource_path and not resource_text:
        raise ValueError("Either resource_path or resource_text must be provided")

    return app.invoke(initial_state)
