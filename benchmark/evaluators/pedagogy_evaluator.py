"""Pedagogy, Component Diversity, and Interactivity Quality Evaluator."""

from __future__ import annotations

from typing import Any
from ..dataset import BenchmarkTask


STEP_1_COMPONENTS = {"ScenarioDialogue", "AnalogyCard", "PaperAbstract"}
STEP_2_COMPONENTS = {"MentalModel", "ConceptCard", "KnowledgeTree"}
STEP_3_COMPONENTS = {
    "DetailedExplanation",
    "DataTable",
    "InteractiveFormula",
    "CodeSnippet",
    "GenerativeLab",
    "InteractiveSandbox",
    "Timeline",
    "DocumentFigure",
}
STEP_4_COMPONENTS = {
    "QuizCard",
    "ClozeTest",
    "DragAndDropMatch",
    "RelationshipMatch",
    "Flashcard",
}
STEP_5_COMPONENTS = {
    "ResourceList",
    "LiteratureReference",
    "CourseOutline",
    "LearningPath",
    "SmartAnnotationBoard",
    "AnalogyCard",
}


def evaluate_pedagogy_and_interactivity(
    task: BenchmarkTask,
    components: list[dict[str, Any]],
) -> tuple[float, list[str], dict[str, Any]]:
    """Evaluate 5-step pedagogical flow, component diversity, and interactive configuration.

    Returns:
        score: float between 0.0 and 100.0
        feedback: list of feedback/warning strings
        breakdown: detailed metrics dictionary
    """
    feedback: list[str] = []
    if not components:
        return 0.0, ["No components to evaluate."], {}

    comp_types = [c.get("component") for c in components if c.get("component")]
    unique_comp_types = set(comp_types)

    # 1. 5-Step Teaching Framework Coverage (40 points)
    covered_steps = 0
    step_breakdown = {
        "step_1_hook": bool(unique_comp_types.intersection(STEP_1_COMPONENTS)),
        "step_2_mental_model": bool(unique_comp_types.intersection(STEP_2_COMPONENTS)),
        "step_3_deep_dive": bool(unique_comp_types.intersection(STEP_3_COMPONENTS)),
        "step_4_reinforcement": bool(unique_comp_types.intersection(STEP_4_COMPONENTS)),
        "step_5_recap": bool(unique_comp_types.intersection(STEP_5_COMPONENTS)),
    }
    covered_steps = sum(1 for v in step_breakdown.values() if v)
    pedagogy_score = (covered_steps / 5.0) * 40.0

    if covered_steps < 3:
        feedback.append(
            f"Weak pedagogical flow: only {covered_steps}/5 framework steps covered."
        )

    # 2. Component Diversity & Richness (30 points)
    # Non-text rich components
    rich_components = [t for t in unique_comp_types if t not in {"Text", "Column"}]
    num_rich = len(rich_components)
    if num_rich >= 4:
        diversity_score = 30.0
    elif num_rich == 3:
        diversity_score = 25.0
    elif num_rich == 2:
        diversity_score = 18.0
    elif num_rich == 1:
        diversity_score = 10.0
    else:
        diversity_score = 0.0
        feedback.append("Over-reliant on plain text; lacks interactive UI components.")

    # 3. Interactive Mechanics Configuration (30 points)
    interactivity_score = 0.0
    quizzes = [c for c in components if c.get("component") in {"QuizCard", "ClozeTest"}]
    if quizzes:
        q = quizzes[0]
        # Check quiz structure
        has_question = bool(q.get("question") or q.get("prompt") or q.get("title"))
        options = q.get("options", [])
        has_options = isinstance(options, list) and len(options) >= 2
        has_answer = "correctIndex" in q or "answer" in q or "correctOption" in q
        has_explanation = bool(q.get("explanation"))

        q_score = 0.0
        if has_question:
            q_score += 5.0
        if has_options:
            q_score += 5.0
        if has_answer:
            q_score += 5.0
        if has_explanation:
            q_score += 5.0
        interactivity_score += q_score
    else:
        # Check if match / interactive sandbox is provided
        other_interactive = [
            c for c in components
            if c.get("component") in {"DragAndDropMatch", "RelationshipMatch", "GenerativeLab", "InteractiveSandbox"}
        ]
        if other_interactive:
            interactivity_score += 15.0
        else:
            feedback.append("No interactive assessment component (QuizCard/ClozeTest/Match) provided.")

    # Check formula / lab interactive sliders/variables
    interactive_tools = [
        c for c in components
        if c.get("component") in {"InteractiveFormula", "GenerativeLab", "InteractiveSandbox", "SmartAnnotationBoard"}
    ]
    if interactive_tools:
        interactivity_score += 10.0
    else:
        interactivity_score += 5.0 if num_rich >= 3 else 0.0

    interactivity_score = min(30.0, interactivity_score)
    total_score = pedagogy_score + diversity_score + interactivity_score
    total_score = max(0.0, min(100.0, total_score))

    breakdown = {
        "pedagogical_steps_covered": covered_steps,
        "step_breakdown": step_breakdown,
        "pedagogy_score": round(pedagogy_score, 1),
        "unique_rich_components": num_rich,
        "rich_component_list": sorted(list(rich_components)),
        "diversity_score": round(diversity_score, 1),
        "interactivity_score": round(interactivity_score, 1),
    }

    return round(total_score, 1), feedback, breakdown
