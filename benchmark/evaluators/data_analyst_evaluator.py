"""Data Analyst Quality and Analytical Faithfulness Evaluator."""

from __future__ import annotations

import json
from typing import Any
from ..dataset import BenchmarkTask


def _extract_all_text_content(components: list[dict[str, Any]]) -> str:
    """Flatten all text content from all components into a single searchable corpus."""
    corpus: list[str] = []
    for comp in components:
        for k, v in comp.items():
            if isinstance(v, str):
                corpus.append(v)
            elif isinstance(v, list):
                for item in v:
                    if isinstance(item, str):
                        corpus.append(item)
                    elif isinstance(item, dict):
                        for sub_k, sub_v in item.items():
                            if isinstance(sub_v, str):
                                corpus.append(sub_v)
                            elif isinstance(sub_v, (int, float)):
                                corpus.append(str(sub_v))
            elif isinstance(v, dict):
                for sub_k, sub_v in v.items():
                    if isinstance(sub_v, str):
                        corpus.append(sub_v)
                    elif isinstance(sub_v, (int, float)):
                        corpus.append(str(sub_v))
            elif isinstance(v, (int, float)):
                corpus.append(str(v))
    return " ".join(corpus).lower()


def evaluate_data_analyst_quality(
    task: BenchmarkTask,
    components: list[dict[str, Any]],
) -> tuple[float, list[str], dict[str, Any]]:
    """Evaluate how faithfully and accurately the components analyze the input dataset.

    Returns:
        score: float between 0.0 and 100.0
        feedback: list of feedback/warning strings
        breakdown: detailed metrics dictionary
    """
    feedback: list[str] = []
    if not components:
        return 0.0, ["No components available to evaluate data analysis quality."], {}

    score = 100.0
    corpus = _extract_all_text_content(components)

    # 1. Key Metrics & Entity Coverage (40% weight)
    key_metrics = task.expected_criteria.get("key_metrics_to_mention", [])
    found_metrics = 0
    missing_metrics: list[str] = []
    if key_metrics:
        for metric in key_metrics:
            if str(metric).lower() in corpus:
                found_metrics += 1
            else:
                missing_metrics.append(str(metric))

        coverage_ratio = found_metrics / len(key_metrics)
        metric_score = coverage_ratio * 40.0
        if missing_metrics:
            feedback.append(f"Missing key analytical metrics/entities: {missing_metrics}")
    else:
        metric_score = 40.0

    # 2. DataTable Quality & Fidelity (30% weight)
    table_score = 0.0
    data_tables = [c for c in components if c.get("component") == "DataTable"]
    if data_tables:
        table = data_tables[0]
        cols = table.get("columns", [])
        rows = table.get("rows", [])
        if isinstance(cols, list) and len(cols) >= 2:
            table_score += 15.0
            # Validate column format
            has_valid_cols = all(isinstance(col, dict) and "key" in col for col in cols)
            if has_valid_cols:
                table_score += 5.0
            else:
                feedback.append("DataTable columns lack required 'key' identifier fields.")

        if isinstance(rows, list) and len(rows) >= 2:
            table_score += 10.0
            # Validate cell alignment
            has_cells = all(isinstance(r, dict) and "cells" in r for r in rows)
            if not has_cells:
                table_score -= 5.0
                feedback.append("DataTable rows lack structured 'cells' mappings.")
    else:
        # Check if another structured component was used instead
        has_structured = any(
            c.get("component") in {"Timeline", "GenerativeLab", "InteractiveSandbox", "SmartAnnotationBoard"}
            for c in components
        )
        if has_structured:
            table_score = 20.0
        else:
            feedback.append("No structured tabular/time-series data presentation (e.g. DataTable) provided.")
            table_score = 5.0

    # 3. Mathematical Formula / Quantitative Reasoning (15% weight)
    formula_score = 0.0
    formulas = [c for c in components if c.get("component") == "InteractiveFormula"]
    code_snippets = [c for c in components if c.get("component") == "CodeSnippet"]
    if formulas:
        f = formulas[0]
        formula_score += 10.0
        if f.get("formula") or f.get("latex") or f.get("expression"):
            formula_score += 5.0
    elif code_snippets:
        formula_score += 12.0
    else:
        # Check if formula exists in text
        if any(char in corpus for char in ["=", "+", "*", "/", "sum", "sqrt", "%"]):
            formula_score += 8.0
        else:
            feedback.append("Lacks explicit quantitative formulas or algorithm code derivations.")

    # 4. Analytical Insights & Categorical Breakdowns (15% weight)
    insight_score = 0.0
    mental_models = [c for c in components if c.get("component") == "MentalModel"]
    if mental_models:
        mm = mental_models[0]
        pillars = mm.get("pillars", [])
        if isinstance(pillars, list) and len(pillars) >= 2:
            insight_score += 15.0
        else:
            insight_score += 10.0
    else:
        detailed_explanations = [c for c in components if c.get("component") == "DetailedExplanation"]
        if detailed_explanations:
            insight_score += 10.0
        else:
            insight_score += 5.0

    total_score = metric_score + table_score + formula_score + insight_score
    total_score = max(0.0, min(100.0, total_score))

    breakdown = {
        "metric_coverage_score": round(metric_score, 1),
        "found_metrics_ratio": round(found_metrics / max(1, len(key_metrics)), 2) if key_metrics else 1.0,
        "table_quality_score": round(table_score, 1),
        "formula_score": round(formula_score, 1),
        "insight_score": round(insight_score, 1),
    }

    return round(total_score, 1), feedback, breakdown
