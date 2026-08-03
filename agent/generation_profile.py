"""Server-side validation and prompt resources for generation preferences."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


MAX_ENABLED_COMPONENTS = 20
MAX_REFERENCE_EXAMPLES = 10

# These are content components exposed by the Settings UI. Layout primitives
# such as Column and Text are intentionally not here: the generator always
# needs them to build a valid A2UI component tree.
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
        "SmartAnnotationBoard",
        "DocumentFigure",
        "QuizCard",
        "ClozeTest",
        "DragAndDropMatch",
        "Flashcard",
        "InteractiveSandbox",
        "InteractiveFormula",
        "DeepDivePrompt",
        "CodeSnippet",
    }
)

SUPPORTED_EXAMPLE_IDS = frozenset(
    {
        "hash-table",
        "agent-react",
        "js-async",
        "conversational",
        "non-linear",
        "paper-attention",
        "biophysics-ai",
    }
)

EXAMPLE_COMPONENTS: dict[str, frozenset[str]] = {
    "hash-table": frozenset({"AnalogyCard", "ClozeTest", "ConceptCard", "DetailedExplanation", "InteractiveSandbox", "LearningPath", "MentalModel", "QuizCard", "ScenarioDialogue"}),
    "agent-react": frozenset({"AnalogyCard", "ConceptCard", "DetailedExplanation", "MentalModel", "QuizCard", "ScenarioDialogue"}),
    "js-async": frozenset({"AnalogyCard", "ConceptCard", "DetailedExplanation", "MentalModel", "QuizCard", "ResourceList", "ScenarioDialogue"}),
    "conversational": frozenset({"AnalogyCard", "ConceptCard", "DetailedExplanation", "MentalModel", "QuizCard", "ResourceList", "ScenarioDialogue"}),
    "non-linear": frozenset({"AnalogyCard", "ConceptCard", "DetailedExplanation", "LearningPath", "MentalModel", "QuizCard", "ResourceList", "ScenarioDialogue"}),
    "paper-attention": frozenset({"AnalogyCard", "InteractiveFormula", "MentalModel", "PaperAbstract", "QuizCard", "ResourceList", "ScenarioDialogue", "Timeline"}),
    "biophysics-ai": frozenset({"AnalogyCard", "ClozeTest", "ConceptCard", "DeepDivePrompt", "DetailedExplanation", "DragAndDropMatch", "LearningPath", "MentalModel", "QuizCard", "ResourceList", "ScenarioDialogue", "Timeline"}),
}


@dataclass(frozen=True)
class GenerationProfile:
    """Validated, request-scoped generation preferences.

    ``enabled_components=None`` represents a legacy request with no profile,
    so CLI and API callers keep their pre-settings behaviour.
    """

    enabled_components: tuple[str, ...] | None = None
    example_ids: tuple[str, ...] = ()
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

    enabled_components = _read_ids(
        raw.get("enabledComponents"),
        "enabledComponents",
        SUPPORTED_COMPONENTS,
        MAX_ENABLED_COMPONENTS,
    )
    example_ids = _read_ids(
        raw.get("exampleIds", []),
        "exampleIds",
        SUPPORTED_EXAMPLE_IDS,
        MAX_REFERENCE_EXAMPLES,
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
    return GenerationProfile(
        enabled_components=enabled_components,
        example_ids=example_ids,
        visual_intent=visual_intent.strip()[:500],
    )


def load_reference_examples(example_ids: tuple[str, ...], target_language: str) -> str:
    """Load only the user-selected, bundled A2UI websites for few-shot use."""
    if not example_ids:
        return ""
    repo_root = Path(__file__).resolve().parent.parent
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
            # IDs are validated above. A missing bundled file should not make a
            # learner-facing request fail; it simply contributes no example.
            continue
    if not examples:
        return ""
    return "\n\nReference A2UI websites selected for this generation:\n" + "\n\n".join(examples)
