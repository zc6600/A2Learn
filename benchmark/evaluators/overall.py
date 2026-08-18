"""Multi-panel scorecard generation for A2Learn benchmark."""

from __future__ import annotations

from collections import Counter
from dataclasses import asdict, dataclass, field
from typing import Any

from ..dataset import BenchmarkTask
from .code_execution_evaluator import evaluate_verifiable_facts_and_links, extract_resource_urls
from .schema_evaluator import evaluate_schema_validity


@dataclass
class SyntaxCard:
    valid: bool
    score: float
    errors: list[str] = field(default_factory=list)


@dataclass
class VerifiableFactsCard:
    passed_checks: int
    total_checks: int
    matched_facts: int
    total_facts: int
    valid_urls_count: int
    urls: list[dict[str, str]] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    score: float = 0.0

    @property
    def passed_assertions(self) -> int:
        return self.passed_checks

    @property
    def total_assertions(self) -> int:
        return self.total_checks

    @property
    def code_executed(self) -> bool:
        return True

    @property
    def code_runtime_ok(self) -> bool:
        return self.score >= 50.0


@dataclass
class ComponentInventoryCard:
    total_characters: int
    total_tokens: int
    component_count: int
    component_breakdown: dict[str, int] = field(default_factory=dict)
    resource_urls_count: int = 0


@dataclass
class PedagogyJudgeCard:
    explanatory_clarity: float = 0.0
    problem_driven: float = 0.0
    cognitive_load_and_jargon: float = 0.0
    structural_coherence: float = 0.0
    overall_pedagogy_score: float = 0.0
    strengths: str = ""
    flaws: str = ""


@dataclass
class BenchmarkScorecard:
    """Consolidated multi-panel scorecard presenting distinct evaluation dimensions."""

    task_id: str
    model: str
    syntax: SyntaxCard
    verifiable_facts: VerifiableFactsCard
    inventory: ComponentInventoryCard
    pedagogy_judge: PedagogyJudgeCard
    latency_seconds: float = 0.0
    passed: bool = True
    raw_output: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def evaluate_task_output(
    task: BenchmarkTask,
    model_name: str,
    raw_output: str | Any,
    latency_seconds: float = 0.0,
    token_usage: dict[str, int] | None = None,
    arena_eval: dict[str, Any] | None = None,
) -> BenchmarkScorecard:
    """Compute multi-panel diagnostics for a task output."""
    raw_str = raw_output if isinstance(raw_output, str) else str(raw_output)

    # 1. Syntax & Schema Validity
    schema_score, schema_errors, components = evaluate_schema_validity(raw_output)
    syntax_card = SyntaxCard(
        valid=schema_score >= 80.0,
        score=schema_score,
        errors=schema_errors,
    )

    # 2. Verifiable Facts, URLs, and Component Integrity
    v_score, v_errors, v_breakdown = evaluate_verifiable_facts_and_links(task, components, raw_str)
    verifiable_card = VerifiableFactsCard(
        passed_checks=v_breakdown.get("passed_checks", 0),
        total_checks=v_breakdown.get("total_checks", 0),
        matched_facts=v_breakdown.get("matched_facts_count", 0),
        total_facts=v_breakdown.get("total_facts_expected", 0),
        valid_urls_count=v_breakdown.get("valid_urls_found", 0),
        urls=v_breakdown.get("urls_extracted", []),
        errors=v_errors,
        score=v_score,
    )

    # 3. Component Inventory & Length Statistics (Descriptive Metrics)
    comp_types = [c.get("component", "Unknown") for c in components if isinstance(c, dict)]
    comp_counts = dict(Counter(comp_types))
    total_tok = (token_usage or {}).get("total_tokens", len(raw_str) // 4)

    inventory_card = ComponentInventoryCard(
        total_characters=len(raw_str),
        total_tokens=total_tok,
        component_count=len(components),
        component_breakdown=comp_counts,
        resource_urls_count=verifiable_card.valid_urls_count,
    )

    # 4. Pedagogical LLM Judge Card (from batch arena evaluation if available)
    judge_data = (arena_eval or {}).get("model_evaluations", {}).get(model_name, {})
    if not judge_data and arena_eval and model_name in arena_eval:
        judge_data = arena_eval[model_name]

    pedagogy_card = PedagogyJudgeCard(
        explanatory_clarity=float(judge_data.get("explanatory_clarity", 0.0)),
        problem_driven=float(judge_data.get("problem_driven", 0.0)),
        cognitive_load_and_jargon=float(judge_data.get("cognitive_load_and_jargon", 0.0)),
        structural_coherence=float(judge_data.get("structural_coherence", 0.0)),
        overall_pedagogy_score=float(judge_data.get("overall_pedagogy_score", 0.0)),
        strengths=judge_data.get("strengths", ""),
        flaws=judge_data.get("flaws", ""),
    )

    passed = syntax_card.valid and verifiable_card.score >= 50.0

    return BenchmarkScorecard(
        task_id=task.id,
        model=model_name,
        syntax=syntax_card,
        verifiable_facts=verifiable_card,
        inventory=inventory_card,
        pedagogy_judge=pedagogy_card,
        latency_seconds=round(latency_seconds, 2),
        passed=passed,
        raw_output=raw_str,
    )
