"""Server-side validation and prompt resources for generation preferences."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


MAX_ENABLED_COMPONENTS = 20
MAX_REFERENCE_EXAMPLES = 10
MAX_AUTO_GENERATED_IMAGES = 20
MAX_REFERENCE_PACKS = 4
SUPPORTED_TEMPLATE_IDS = frozenset({"beginner", "theory-lab", "project", "research", "poetry", "custom"})
LEGACY_TEMPLATE_IDS = {"general": "beginner", "computing": "theory-lab", "paper": "research", "poetry-reading": "poetry"}
TEMPLATE_GUIDANCE = {
    "beginner": "面向完全初学者：从实际问题和生活场景开始，用简单语言逐步解释术语，保留具体数据、丰富行间注释、小练习和总结。",
    "theory-lab": "先解释技术原理解决的工程痛点，再用具体数据逐步演算，并提供可以运行的代码实验，不只给抽象定义。",
    "project": "围绕一个小而完整的计算机项目组织课程：先拆需求和数据，再边实现边解释，最后用验收清单检查项目。",
    "research": "面向有基础的计算机学习者：先交代论文问题和贡献，再拆解方法、公式、证据与局限，区分事实、直觉和批判性问题。",
    "poetry": "面向诗词学习：先保留完整原文，再用逐句解释、意象关系、情绪推进和适量练习帮助理解，不要把诗词改写成技术课程。",
}
TEMPLATE_DEFAULTS = {
    "beginner": {
        "components": ("LearningPath", "AnalogyCard", "ConceptCard", "MentalModel", "DetailedExplanation", "DataTable", "ScenarioDialogue", "InteractiveSandbox", "QuizCard", "ResourceList"),
        "examples": ("database-basics", "conversational"),
        "packs": ("database-basics-series",),
    },
    "theory-lab": {
        "components": ("LearningPath", "AnalogyCard", "ConceptCard", "MentalModel", "DetailedExplanation", "InteractiveSandbox", "CodeSnippet", "DataTable", "QuizCard", "ClozeTest", "ScenarioDialogue", "ResourceList"),
        "examples": ("hash-table", "js-async", "agent-react"),
        "packs": ("hash-table-lab",),
    },
    "project": {
        "components": ("LearningPath", "AnalogyCard", "ConceptCard", "DetailedExplanation", "DataTable", "InteractiveSandbox", "CodeSnippet", "QuizCard", "ScenarioDialogue", "MentalModel", "ResourceList"),
        "examples": ("database-basics", "agent-react", "js-async", "non-linear"),
        "packs": ("database-basics-series",),
    },
    "research": {
        "components": ("LearningPath", "PaperAbstract", "AnalogyCard", "ConceptCard", "MentalModel", "DetailedExplanation", "InteractiveFormula", "DataTable", "RelationshipMatch", "QuizCard", "ResourceList", "ScenarioDialogue", "Timeline", "DeepDivePrompt", "DragAndDropMatch", "ClozeTest"),
        "examples": ("paper-attention", "biophysics-ai"),
        "packs": ("computer-paper-deep-dive",),
    },
    "poetry": {
        "components": ("LearningPath", "DetailedExplanation", "RelationshipMatch", "ScenarioDialogue", "Timeline", "QuizCard", "DeepDivePrompt", "DragAndDropMatch"),
        "examples": ("poetry-social", "deng-gao"),
        "packs": ("poetry-reading",),
    },
}

SUPPORTED_COMPONENTS = frozenset(
    {
        "LearningPath",
        "ConceptCard",
        "MentalModel",
        "DetailedExplanation",
        "AnalogyCard",
        "Timeline",
        "PaperAbstract",
        "LiteratureReference",
        "ResourceList",
        "ScenarioDialogue",
        "SocialMoments",
        "SmartAnnotationBoard",
        "DocumentFigure",
        "QuizCard",
        "ClozeTest",
        "RelationshipMatch",
        "DragAndDropMatch",
        "Flashcard",
        "InteractiveSandbox",
        "DataTable",
        "InteractiveFormula",
        "DeepDivePrompt",
        "CodeSnippet",
    }
)

SUPPORTED_EXAMPLE_IDS = frozenset(
    {
        "hash-table",
        "database-basics",
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

EXAMPLE_COMPONENTS: dict[str, frozenset[str]] = {
    "hash-table": frozenset({"AnalogyCard", "ClozeTest", "ConceptCard", "DetailedExplanation", "InteractiveSandbox", "LearningPath", "MentalModel", "QuizCard", "ScenarioDialogue"}),
    "database-basics": frozenset({"AnalogyCard", "ConceptCard", "DataTable", "DetailedExplanation", "InteractiveSandbox", "LearningPath", "MentalModel", "QuizCard", "ScenarioDialogue"}),
    "agent-react": frozenset({"AnalogyCard", "ConceptCard", "DetailedExplanation", "MentalModel", "QuizCard", "ScenarioDialogue"}),
    "js-async": frozenset({"AnalogyCard", "ConceptCard", "DetailedExplanation", "MentalModel", "QuizCard", "ResourceList", "ScenarioDialogue"}),
    "conversational": frozenset({"AnalogyCard", "ConceptCard", "DetailedExplanation", "MentalModel", "QuizCard", "ResourceList", "ScenarioDialogue"}),
    "non-linear": frozenset({"AnalogyCard", "ConceptCard", "DetailedExplanation", "LearningPath", "MentalModel", "QuizCard", "ResourceList", "ScenarioDialogue"}),
    "paper-attention": frozenset({"AnalogyCard", "InteractiveFormula", "MentalModel", "PaperAbstract", "QuizCard", "ResourceList", "ScenarioDialogue", "Timeline"}),
    "biophysics-ai": frozenset({"AnalogyCard", "ClozeTest", "ConceptCard", "DeepDivePrompt", "DetailedExplanation", "LearningPath", "MentalModel", "QuizCard", "RelationshipMatch", "DragAndDropMatch", "ResourceList", "ScenarioDialogue", "Timeline"}),
    "poetry-social": frozenset({"DetailedExplanation", "RelationshipMatch", "DragAndDropMatch", "ScenarioDialogue", "Timeline"}),
    "deng-gao": frozenset({"DeepDivePrompt", "DetailedExplanation", "DragAndDropMatch", "ScenarioDialogue", "Timeline"}),
}

REFERENCE_PACK_FILES: dict[str, tuple[str, ...]] = {
    "database-basics-series": (
        "01-what-is-a-database.json",
        "02-ask-the-database.json",
        "03-change-data.json",
        "04-design-a-table.json",
        "05-connect-tables.json",
        "06-build-a-small-project.json",
    ),
    "hash-table-lab": (),
    "computer-paper-deep-dive": (),
    "poetry-reading": (),
}


@dataclass(frozen=True)
class GenerationProfile:
    """Validated, request-scoped generation preferences."""

    enabled_components: tuple[str, ...] | None = None
    example_ids: tuple[str, ...] = ()
    reference_pack_ids: tuple[str, ...] = ()
    template_id: str = "custom"
    image_generation_limit: int = 2
    visual_intent: str = ""


def _read_ids(raw: Any, name: str, allowed: frozenset[str], maximum: int) -> tuple[str, ...]:
    if not isinstance(raw, list):
        raise TypeError(f"generationProfile.{name} must be an array.")
    if len(raw) > maximum:
        raise ValueError(f"generationProfile.{name} may contain at most {maximum} items.")
    if not all(isinstance(value, str) for value in raw):
        raise ValueError(f"generationProfile.{name} must contain only strings.")
    values = tuple(dict.fromkeys(raw))
    unsupported = sorted(set(values) - allowed)
    if unsupported:
        raise ValueError(f"generationProfile.{name} includes unsupported values: {', '.join(unsupported)}.")
    return values


def normalize_generation_profile(raw: Any | None) -> GenerationProfile:
    if raw is None:
        return GenerationProfile()
    if not isinstance(raw, dict):
        raise TypeError("generationProfile must be an object.")

    template_id = raw.get("templateId", "custom")
    if isinstance(template_id, str):
        template_id = LEGACY_TEMPLATE_IDS.get(template_id, template_id)
    if not isinstance(template_id, str) or template_id not in SUPPORTED_TEMPLATE_IDS:
        raise ValueError(f"generationProfile.templateId includes unsupported value: {template_id}.")
    template_defaults = TEMPLATE_DEFAULTS.get(template_id, {})
    use_template_defaults = template_id != "custom"
    enabled_components = _read_ids(
        list(template_defaults.get("components", [])) if use_template_defaults else raw.get("enabledComponents"),
        "enabledComponents",
        SUPPORTED_COMPONENTS,
        MAX_ENABLED_COMPONENTS,
    )
    example_ids = _read_ids(
        list(template_defaults.get("examples", [])) if use_template_defaults else raw.get("exampleIds", []),
        "exampleIds",
        SUPPORTED_EXAMPLE_IDS,
        MAX_REFERENCE_EXAMPLES,
    )
    reference_pack_ids = _read_ids(
        list(template_defaults.get("packs", [])) if use_template_defaults else raw.get("referencePackIds", []),
        "referencePackIds",
        frozenset(REFERENCE_PACK_FILES),
        MAX_REFERENCE_PACKS,
    )
    missing_components = {
        component
        for example_id in example_ids
        for component in EXAMPLE_COMPONENTS[example_id]
        if component not in enabled_components
    }
    if missing_components:
        raise ValueError(
            "generationProfile.exampleIds requires its example components to be enabled: "
            + ", ".join(sorted(missing_components))
            + "."
        )
    visual_intent = raw.get("visualIntent", "")
    if not isinstance(visual_intent, str):
        raise TypeError("generationProfile.visualIntent must be a string.")
    image_generation_limit = raw.get("imageGenerationLimit", 2)
    if isinstance(image_generation_limit, bool) or not isinstance(image_generation_limit, int):
        raise TypeError("generationProfile.imageGenerationLimit must be an integer.")
    if not 0 <= image_generation_limit <= MAX_AUTO_GENERATED_IMAGES:
        raise ValueError(
            f"generationProfile.imageGenerationLimit must be between 0 and {MAX_AUTO_GENERATED_IMAGES}."
        )
    return GenerationProfile(
        enabled_components=enabled_components,
        example_ids=example_ids,
        reference_pack_ids=reference_pack_ids,
        template_id=template_id,
        image_generation_limit=image_generation_limit,
        visual_intent=(visual_intent.strip() or TEMPLATE_GUIDANCE.get(template_id, ""))[:500],
    )


def load_reference_examples(
    example_ids: tuple[str, ...],
    target_language: str,
    reference_pack_ids: tuple[str, ...] = (),
) -> str:
    """Load selected examples and compact, curated reference-course samples."""
    if not example_ids and not reference_pack_ids:
        return ""
    repo_root = Path(__file__).resolve().parent.parent.parent
    examples_dir = (
        repo_root / "apps" / "viewer" / "public" / "examples" / "en"
        if target_language == "en"
        else repo_root / "packages" / "a2learn-catalog" / "examples" / "Website"
    )
    examples: list[str] = []
    for example_id in example_ids:
        path = examples_dir / f"{example_id}.json"
        try:
            messages = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(messages, list):
                examples.append(
                    f"Reference example ({example_id}):\n"
                    + json.dumps({"a2ui_messages": messages}, ensure_ascii=False)
                )
        except (OSError, json.JSONDecodeError):
            continue

    # A reference pack is intentionally represented by its first and final
    # lesson rather than injecting all six full lessons into every prompt.
    # This keeps the series' teaching arc visible without wasting the model's
    # generation budget on repeated examples.
    course_dir = (
        repo_root
        / "packages"
        / "a2learn-catalog"
        / "examples"
        / "Website"
        / "Course"
        / "database-basics"
    )
    for pack_id in reference_pack_ids:
        files = REFERENCE_PACK_FILES.get(pack_id, ())
        if not files:
            continue
        examples.append(
            f"Reference pack ({pack_id}): a six-lesson beginner course. "
            "Its arc is: practical problem -> plain-language model -> concrete operation -> annotated code -> quiz and takeaway."
        )
        for file_name in (files[0], files[-1]):
            try:
                messages = json.loads((course_dir / file_name).read_text(encoding="utf-8"))
                if isinstance(messages, list):
                    examples.append(
                        f"Reference lesson ({pack_id}/{file_name}):\n"
                        + json.dumps({"a2ui_messages": messages}, ensure_ascii=False)
                    )
            except (OSError, json.JSONDecodeError):
                continue
    if not examples:
        return ""
    return "\n\nReference A2UI websites selected for this generation:\n" + "\n\n".join(examples)
