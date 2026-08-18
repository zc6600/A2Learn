"""Unit and integration tests for A2Learn High-Discrimination Executable Benchmark."""

from __future__ import annotations

import json
from pathlib import Path
from tempfile import TemporaryDirectory

import pytest

from benchmark.dataset import BenchmarkTask, load_benchmark_suite, load_task
from benchmark.evaluators.arena_judge import evaluate_batch_arena
from benchmark.evaluators.code_execution_evaluator import execute_code_in_sandbox, extract_python_code_blocks
from benchmark.evaluators.data_analyst_evaluator import evaluate_data_analyst_quality
from benchmark.evaluators.overall import evaluate_task_output
from benchmark.evaluators.pedagogy_evaluator import evaluate_pedagogy_and_interactivity
from benchmark.evaluators.schema_evaluator import evaluate_schema_validity
from benchmark.reporter import aggregate_model_results, generate_markdown_report, save_benchmark_report
from benchmark.runner import run_benchmark


@pytest.fixture
def sample_task() -> BenchmarkTask:
    return BenchmarkTask(
        id="sales_test",
        title="Sales KPI Test",
        category="business",
        description="Analyze Q4 regional sales data.",
        input_data={
            "regions": [{"name": "Asia Pacific", "revenue": 1540000, "ad_spend": 220000}],
            "roas": "ROAS = Revenue / Ad Spend",
        },
        expected_criteria={
            "required_component_types": ["DataTable", "InteractiveFormula", "MentalModel", "QuizCard", "CodeSnippet"],
            "key_metrics_to_mention": ["1540000", "Asia Pacific", "ROAS"],
            "ground_truth_assertions": {
                "apac_roas": 7.0,
                "top_region": "Asia Pacific",
            },
            "test_function_name": "analyze_sales",
        },
    )


@pytest.fixture
def valid_a2ui_messages() -> list[dict]:
    return [
        {
            "version": "v0.9",
            "createSurface": {
                "surfaceId": "test-surface",
                "catalogId": "https://a2learn.ai/spec/v1/catalog.json",
            },
        },
        {
            "version": "v0.9",
            "updateComponents": {
                "surfaceId": "test-surface",
                "components": [
                    {
                        "id": "scenario",
                        "component": "ScenarioDialogue",
                        "speakerA": "Manager",
                        "speakerB": "Analyst",
                        "dialogue": [
                            {"speaker": "Manager", "text": "Why is Asia Pacific leading with 1540000 revenue?"},
                            {"speaker": "Analyst", "text": "Because the ROAS achieved a record 7.0x."},
                        ],
                    },
                    {
                        "id": "model",
                        "component": "MentalModel",
                        "title": "ROAS Efficiency Engine",
                        "pillars": [
                            {"title": "High Conversion", "description": "15% conversion rate in APAC."},
                            {"title": "Low CAC", "description": "Lower cost per acquisition."},
                        ],
                    },
                    {
                        "id": "table",
                        "component": "DataTable",
                        "title": "Regional Performance",
                        "columns": [
                            {"key": "region", "label": "Region"},
                            {"key": "revenue", "label": "Revenue"},
                        ],
                        "rows": [
                            {"id": "1", "cells": {"region": "Asia Pacific", "revenue": "1540000"}},
                        ],
                    },
                    {
                        "id": "code",
                        "component": "CodeSnippet",
                        "title": "Sales Analysis Script",
                        "language": "python",
                        "code": "def analyze_sales(input_data):\n    return {'apac_roas': 7.0, 'top_region': 'Asia Pacific'}",
                    },
                    {
                        "id": "formula",
                        "component": "InteractiveFormula",
                        "title": "ROAS Equation",
                        "formula": "ROAS = Revenue / Ad_Spend",
                    },
                    {
                        "id": "quiz",
                        "component": "QuizCard",
                        "question": "Which region had the highest revenue?",
                        "options": ["Asia Pacific", "Europe", "North America"],
                        "correctIndex": 0,
                        "explanation": "Asia Pacific had 1540000 in revenue.",
                    },
                    {
                        "id": "resources",
                        "component": "ResourceList",
                        "title": "Further Reading",
                        "resources": [{"title": "Q4 Detailed Financials", "url": "https://example.com"}],
                    },
                ],
            },
        },
    ]


def test_load_benchmark_suite():
    tasks = load_benchmark_suite()
    assert len(tasks) >= 5
    task_ids = {t.id for t in tasks}
    assert "sales_kpi_analysis" in task_ids
    assert "algorithm_benchmark_data" in task_ids
    assert "student_exam_distribution" in task_ids
    assert "system_metrics_timeseries" in task_ids
    assert "scientific_experiment_dataset" in task_ids


def test_schema_evaluator_valid(valid_a2ui_messages):
    score, errors, components = evaluate_schema_validity(valid_a2ui_messages)
    assert score == 100.0
    assert len(errors) == 0
    assert len(components) == 7


def test_schema_evaluator_invalid_props():
    invalid_messages = [
        {
            "version": "v0.9",
            "createSurface": {"surfaceId": "test"},
        },
        {
            "version": "v0.9",
            "updateComponents": {
                "surfaceId": "test",
                "components": [
                    {
                        "id": "bad-comp",
                        "component": "DataTable",
                        "props": {"columns": []},  # Invalid props wrapper
                    }
                ],
            },
        },
    ]
    score, errors, components = evaluate_schema_validity(invalid_messages)
    assert score < 90.0
    assert any("props" in err for err in errors)


def test_verifiable_facts_and_urls(sample_task, valid_a2ui_messages):
    from benchmark.evaluators.code_execution_evaluator import evaluate_verifiable_facts_and_links
    _, _, components = evaluate_schema_validity(valid_a2ui_messages)
    raw_str = json.dumps(valid_a2ui_messages)
    score, errors, breakdown = evaluate_verifiable_facts_and_links(sample_task, components, raw_str)
    assert score >= 70.0
    assert breakdown["valid_urls_found"] >= 1
    assert breakdown["matched_facts_count"] >= 2


def test_data_analyst_evaluator(sample_task, valid_a2ui_messages):
    _, _, components = evaluate_schema_validity(valid_a2ui_messages)
    score, feedback, breakdown = evaluate_data_analyst_quality(sample_task, components)
    assert score >= 80.0
    assert breakdown["metric_coverage_score"] == 40.0
    assert breakdown["table_quality_score"] > 0


def test_pedagogy_evaluator(sample_task, valid_a2ui_messages):
    _, _, components = evaluate_schema_validity(valid_a2ui_messages)
    score, feedback, breakdown = evaluate_pedagogy_and_interactivity(sample_task, components)
    assert score >= 80.0
    assert breakdown["pedagogical_steps_covered"] == 5
    assert breakdown["unique_rich_components"] >= 4


def test_evaluate_task_output_full_flow(sample_task, valid_a2ui_messages):
    scorecard = evaluate_task_output(
        task=sample_task,
        model_name="mock-model",
        raw_output=json.dumps(valid_a2ui_messages),
        latency_seconds=1.25,
        token_usage={"total_tokens": 1000},
        arena_eval={"mock-model": {"overall_pedagogy_score": 95.0, "explanatory_clarity": 9.5}},
    )
    assert scorecard.passed is True
    assert scorecard.syntax.valid is True
    assert scorecard.verifiable_facts.matched_facts >= 3
    assert scorecard.verifiable_facts.valid_urls_count == 1
    assert scorecard.inventory.component_count == 7
    assert scorecard.pedagogy_judge.overall_pedagogy_score == 95.0


def test_batch_arena_judge(sample_task):
    outputs = {
        "model_A": {"a2ui_messages": [{"version": "v0.9"}]},
        "model_B": {"a2ui_messages": [{"version": "v0.9"}]},
    }
    arena_res = evaluate_batch_arena(sample_task, outputs, mock=True)
    assert len(arena_res["comparative_ranking"]) == 2
    assert arena_res["comparative_ranking"][0]["rank"] == 1


def test_mock_benchmark_runner_with_arena():
    with TemporaryDirectory() as tmp_dir:
        scorecards = run_benchmark(
            models=["mock-model-a", "mock-model-b"],
            task_ids=["sales_kpi_analysis", "algorithm_benchmark_data"],
            mock=True,
            reports_dir=tmp_dir,
            enable_arena_judge=True,
        )
        assert len(scorecards) == 4
        summary = aggregate_model_results(scorecards)
        assert len(summary) == 2

        md_path = Path(tmp_dir) / "latest_leaderboard.md"
        json_path = Path(tmp_dir) / "latest_report.json"
        assert md_path.exists()
        assert json_path.exists()
