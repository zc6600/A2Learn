"""Optional LLM-as-a-Judge semantic scorer for analytical depth and clarity."""

from __future__ import annotations

import json
from typing import Any
from ..dataset import BenchmarkTask


JUDGE_PROMPT_TEMPLATE = """You are an expert AI evaluator for educational data analysis websites.
Evaluate the model's generated A2UI components based on:
1. Analytical Depth: Did it derive meaningful business/scientific insights from the raw data? (0-10)
2. Pedagogical Clarity: Is the cognitive progression intuitive and clear? (0-10)
3. UI Completeness: Are all components well-filled with rich content rather than placeholders? (0-10)

Task Title: {title}
Task Category: {category}
Task Description: {description}

Generated Components JSON:
{components_json}

Return ONLY a valid JSON object with the following schema:
{{
  "analytical_depth": <float 0-10>,
  "pedagogical_clarity": <float 0-10>,
  "ui_completeness": <float 0-10>,
  "overall_judge_score": <float 0-100>,
  "rationale": "<string summary>"
}}
"""


def evaluate_with_llm_judge(
    task: BenchmarkTask,
    components: list[dict[str, Any]],
    judge_llm: Any = None,
) -> tuple[float, list[str], dict[str, Any]]:
    """Evaluate generated components using an LLM judge model."""
    if not judge_llm:
        return 0.0, ["LLM Judge is not enabled."], {}

    prompt = JUDGE_PROMPT_TEMPLATE.format(
        title=task.title,
        category=task.category,
        description=task.description,
        components_json=json.dumps(components[:15], ensure_ascii=False, indent=2),
    )

    try:
        response = judge_llm.invoke(prompt)
        content = response.content if hasattr(response, "content") else str(response)
        parsed = json.loads(content.strip())
        score = float(parsed.get("overall_judge_score", 0.0))
        rationale = parsed.get("rationale", "")
        return max(0.0, min(100.0, score)), [rationale] if rationale else [], parsed
    except Exception as exc:
        return 0.0, [f"LLM Judge execution error: {exc}"], {}
