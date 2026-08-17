"""Parser module to convert structured content JSON into A2UI v0.9 messages."""

from typing import Any
from ..core.config import DEFAULT_CATALOG_ID


def _parse_header(data: dict[str, Any]) -> dict[str, Any] | None:
    if data.get("siteTitle"):
        return {
            "id": "header",
            "component": "Text",
            "variant": "h1",
            "text": data["siteTitle"],
        }
    return None


def _parse_description(data: dict[str, Any]) -> dict[str, Any] | None:
    if data.get("description"):
        return {
            "id": "intro-text",
            "component": "Text",
            "text": data["description"],
        }
    return None


def _parse_paper_abstract(pa: Any) -> dict[str, Any] | None:
    if isinstance(pa, dict) and pa.get("title"):
        return {
            "id": "paper-abstract",
            "component": "PaperAbstract",
            "title": pa.get("title"),
            "authors": pa.get("authors", []),
            "venue": pa.get("venue"),
            "year": pa.get("year"),
            "abstract": pa.get("abstract", ""),
            "tldr": pa.get("tldr", ""),
            "pdfUrl": pa.get("pdfUrl"),
            "sourceUrl": pa.get("sourceUrl"),
        }
    return None


def _parse_literature_reference(lr: Any) -> dict[str, Any] | None:
    if isinstance(lr, dict) and lr.get("title"):
        return {
            "id": "literature-reference",
            "component": "LiteratureReference",
            "citation": lr.get("citation", "[1]"),
            "title": lr.get("title"),
            "authors": lr.get("authors", []),
            "url": lr.get("url"),
            "highlightQuote": lr.get("highlightQuote"),
            "onReferenceClick": {"name": "explain_reference", "context": {}},
        }
    return None


def _parse_learning_path(lp: Any) -> dict[str, Any] | None:
    if isinstance(lp, dict) and lp.get("steps"):
        return {
            "id": "learning-path",
            "component": "LearningPath",
            "title": lp.get("title", "Learning Path"),
            "activeStepId": lp["steps"][0].get("id", "1") if lp["steps"] else "1",
            "steps": lp["steps"],
            "onStepSelect": {"name": "learning_path_select", "context": {}},
        }
    return None


def _parse_concept_card(cc: Any) -> dict[str, Any] | None:
    if isinstance(cc, dict) and cc.get("title"):
        return {
            "id": "concept",
            "component": "ConceptCard",
            "title": cc.get("title"),
            "tags": cc.get("tags", []),
            "definition": cc.get("definition", ""),
            "example": cc.get("example", ""),
            "relatedConcepts": cc.get("relatedConcepts", []),
        }
    return None


def _parse_mental_model(mm: Any) -> dict[str, Any] | None:
    if isinstance(mm, dict) and mm.get("title"):
        return {
            "id": "mental-model",
            "component": "MentalModel",
            "title": mm.get("title"),
            "description": mm.get("description", ""),
            "analogy": mm.get("analogy", ""),
            "diagram": mm.get("diagram", ""),
            "pillars": mm.get("pillars", []),
        }
    return None


def _parse_interactive_formula(formula_data: Any) -> dict[str, Any] | None:
    if isinstance(formula_data, dict) and formula_data.get("latex"):
        return {
            "id": "attention-formula",
            "component": "InteractiveFormula",
            "latex": formula_data.get("latex"),
            "description": formula_data.get("description"),
            "variables": formula_data.get("variables", {}),
            "derivationSteps": formula_data.get("derivationSteps", []),
        }
    return None


def _parse_interactive_sandbox(sb: Any) -> dict[str, Any] | None:
    if isinstance(sb, dict) and sb.get("title"):
        return {
            "id": "sandbox",
            "component": "InteractiveSandbox",
            "title": sb.get("title"),
            "description": sb.get("description", ""),
            "language": sb.get("language", "javascript"),
            "code": sb.get("code", ""),
            "status": "success",
            "output": sb.get("output", ""),
            "onRunCode": {"name": "run_sandbox_code", "context": {}},
            "onStatusChange": {"name": "sandbox_status_change", "context": {}},
        }
    return None


def _parse_generative_lab(lab: Any) -> dict[str, Any] | None:
    if not isinstance(lab, dict) or not lab.get("title"):
        return None
    if not isinstance(lab.get("html"), str) or not isinstance(lab.get("javascript"), str):
        return None
    parsed: dict[str, Any] = {
        "id": "generative-lab",
        "component": "GenerativeLab",
        "title": lab["title"],
        "html": lab["html"],
        "javascript": lab["javascript"],
        "onEvent": {"name": "generative_lab_event", "context": {}},
    }
    for key in ("description", "css", "initialProps", "minHeight", "maxHeight"):
        if key in lab:
            parsed[key] = lab[key]
    return parsed


def _parse_quiz_card(qc: Any) -> dict[str, Any] | None:
    if isinstance(qc, dict) and qc.get("questions"):
        return {
            "id": "quiz",
            "component": "QuizCard",
            "title": qc.get("title", "Concept Check"),
            "questions": qc["questions"],
        }
    return None


def _parse_detailed_explanation(de: Any) -> dict[str, Any] | None:
    if isinstance(de, dict) and de.get("title"):
        return {
            "id": "detailed-explanation",
            "component": "DetailedExplanation",
            "title": de.get("title"),
            "estimatedReadTime": de.get("estimatedReadTime", "3 分钟阅读"),
            "content": de.get("content", ""),
        }
    return None


def _parse_resource_list(rl: Any) -> dict[str, Any] | None:
    if isinstance(rl, dict) and rl.get("resources"):
        return {
            "id": "resources",
            "component": "ResourceList",
            "title": rl.get("title", "Reference Resources"),
            "resources": rl["resources"],
        }
    return None


def _parse_timeline(timeline: Any) -> dict[str, Any] | None:
    if isinstance(timeline, dict) and timeline.get("events"):
        return {
            "id": "timeline",
            "component": "Timeline",
            "events": timeline["events"],
            "orientation": timeline.get("orientation", "vertical"),
            "variant": timeline.get("variant", "default"),
            "onEventSelect": {"name": "timeline_event_select", "context": {}},
        }
    return None


def _parse_scenario_dialogue(dialogue: Any) -> dict[str, Any] | None:
    if isinstance(dialogue, dict) and dialogue.get("characters") and dialogue.get("messages"):
        parsed: dict[str, Any] = {
            "id": "scenario-dialogue",
            "component": "ScenarioDialogue",
            "characters": dialogue["characters"],
            "messages": dialogue["messages"],
        }
        for key in ("variant", "topic", "groupName", "groupNotice"):
            if key in dialogue:
                parsed[key] = dialogue[key]
        return parsed
    return None


def _parse_match(data: Any, component: str, component_id: str) -> dict[str, Any] | None:
    if isinstance(data, dict) and data.get("leftItems") and data.get("rightItems") and data.get("correctMatches"):
        parsed: dict[str, Any] = {
            "id": component_id,
            "component": component,
            "leftItems": data["leftItems"],
            "rightItems": data["rightItems"],
            "correctMatches": data["correctMatches"],
        }
        for key in (
            "title",
            "instruction",
            "leftLabel",
            "rightLabel",
            "successMessage",
            "incorrectMessage",
            "matchExplanations",
        ):
            if key in data:
                parsed[key] = data[key]
        parsed["onMatchComplete"] = {"name": "match_complete", "context": {}}
        return parsed
    return None


def _parse_deep_dive_prompt(deep_dive: Any) -> dict[str, Any] | None:
    if isinstance(deep_dive, dict) and deep_dive.get("prompts"):
        parsed: dict[str, Any] = {
            "id": "deep-dive-prompts",
            "component": "DeepDivePrompt",
            "prompts": deep_dive["prompts"],
            "onPromptSelect": {"name": "deep_dive_prompt_select", "context": {}},
        }
        if "selectedId" in deep_dive:
            parsed["selectedId"] = deep_dive["selectedId"]
        return parsed
    return None


def parse_json_to_a2ui(
    data: dict[str, Any],
    permitted_custom_components: tuple[str, ...] | None = None,
) -> list[dict[str, Any]]:
    """Converts structured course content JSON into standard A2UI messages list."""
    surface_id = "main"
    catalog_id = DEFAULT_CATALOG_ID

    components = []
    children = []

    def is_enabled(component: str) -> bool:
        return permitted_custom_components is None or component in permitted_custom_components

    # Component definitions and parsing mappings
    mappings: list[tuple[str, Any]] = [
        ("header", _parse_header(data)),
        ("intro-text", _parse_description(data)),
        ("paper-abstract", _parse_paper_abstract(data.get("paperAbstract")) if is_enabled("PaperAbstract") else None),
        ("literature-reference", _parse_literature_reference(data.get("literatureReference")) if is_enabled("LiteratureReference") else None),
        ("learning-path", _parse_learning_path(data.get("learningPath")) if is_enabled("LearningPath") else None),
        ("concept", _parse_concept_card(data.get("conceptCard")) if is_enabled("ConceptCard") else None),
        ("mental-model", _parse_mental_model(data.get("mentalModel")) if is_enabled("MentalModel") else None),
        ("attention-formula", _parse_interactive_formula(data.get("interactiveFormula")) if is_enabled("InteractiveFormula") else None),
        ("sandbox", _parse_interactive_sandbox(data.get("interactiveSandbox")) if is_enabled("InteractiveSandbox") else None),
        ("generative-lab", _parse_generative_lab(data.get("generativeLab")) if is_enabled("GenerativeLab") else None),
        ("quiz", _parse_quiz_card(data.get("quizCard")) if is_enabled("QuizCard") else None),
        ("detailed-explanation", _parse_detailed_explanation(data.get("detailedExplanation")) if is_enabled("DetailedExplanation") else None),
        ("resources", _parse_resource_list(data.get("resourceList")) if is_enabled("ResourceList") else None),
        ("timeline", _parse_timeline(data.get("timeline")) if is_enabled("Timeline") else None),
        ("scenario-dialogue", _parse_scenario_dialogue(data.get("scenarioDialogue")) if is_enabled("ScenarioDialogue") else None),
        ("drag-and-drop-match", _parse_match(data.get("dragAndDropMatch"), "DragAndDropMatch", "drag-and-drop-match") if is_enabled("DragAndDropMatch") else None),
        ("relationship-match", _parse_match(data.get("relationshipMatch"), "RelationshipMatch", "relationship-match") if is_enabled("RelationshipMatch") else None),
        ("deep-dive-prompts", _parse_deep_dive_prompt(data.get("deepDivePrompt")) if is_enabled("DeepDivePrompt") else None),
    ]

    for comp_id, parsed in mappings:
        if parsed is not None:
            components.append(parsed)
            children.append(comp_id)

    # Insert root Column at the beginning of components
    components.insert(0, {
        "id": "root",
        "component": "Column",
        "children": children,
    })

    return [
        {
            "version": "v0.9",
            "createSurface": {
                "surfaceId": surface_id,
                "catalogId": catalog_id,
            },
        },
        {
            "version": "v0.9",
            "updateComponents": {
                "surfaceId": surface_id,
                "components": components,
            },
        },
    ]
