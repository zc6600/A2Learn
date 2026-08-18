"""Benchmark Runner: orchestrates task execution, code sandbox evaluation, arena judging, and reporting."""

from __future__ import annotations

import argparse
import json
import os
import time
from typing import Any

from dotenv import load_dotenv

from .dataset import BenchmarkTask, load_benchmark_suite
from .evaluators.arena_judge import evaluate_batch_arena
from .evaluators.overall import BenchmarkScorecard, evaluate_task_output
from .reporter import print_cli_leaderboard, save_benchmark_report


load_dotenv()


def _get_mock_response_for_task(task: BenchmarkTask, model_name: str) -> list[dict[str, Any]]:
    """Generate a realistic mock A2UI message array with runnable python code for deterministic CI."""
    title = task.title
    func_name = task.expected_criteria.get("test_function_name", "analyze")
    assertions = task.expected_criteria.get("ground_truth_assertions", {})

    code_lines = [
        f"def {func_name}(input_data):",
        "    results = {}",
    ]
    for k, v in assertions.items():
        if isinstance(v, str):
            code_lines.append(f"    results['{k}'] = '{v}'")
        else:
            code_lines.append(f"    results['{k}'] = {v}")
    code_lines.append("    return results")
    runnable_code = "\n".join(code_lines)

    return [
        {
            "version": "v0.9",
            "createSurface": {
                "surfaceId": f"bench-{task.id}",
                "catalogId": "https://a2learn.ai/spec/v1/catalog.json",
            },
        },
        {
            "version": "v0.9",
            "updateComponents": {
                "surfaceId": f"bench-{task.id}",
                "components": [
                    {
                        "id": "intro",
                        "component": "ScenarioDialogue",
                        "speakerA": "Lead Analyst",
                        "speakerB": "Domain Expert",
                        "dialogue": [
                            {"speaker": "Lead Analyst", "text": f"Let us analyze {title}."},
                            {"speaker": "Domain Expert", "text": "We should break down the key anomalies and trade-offs."},
                        ],
                    },
                    {
                        "id": "model",
                        "component": "MentalModel",
                        "title": f"Analysis Framework for {title}",
                        "description": "Multi-dimensional decomposition of findings.",
                        "pillars": [
                            {"title": "Metric Precision", "description": "Accurate quantitative extraction."},
                            {"title": "Strategic Trade-offs", "description": "Actionable decision recommendations."},
                        ],
                    },
                    {
                        "id": "table",
                        "component": "DataTable",
                        "title": "Extracted Dataset Summary",
                        "columns": [
                            {"key": "col1", "label": "Dimension / Entity"},
                            {"key": "col2", "label": "Primary Metric"},
                            {"key": "col3", "label": "Secondary Metric"},
                        ],
                        "rows": [
                            {
                                "id": "r1",
                                "cells": {
                                    "col1": str(task.expected_criteria.get("key_metrics_to_mention", ["Metric A"])[0]),
                                    "col2": "High Performance",
                                    "col3": "Optimal",
                                },
                            },
                            {
                                "id": "r2",
                                "cells": {
                                    "col1": "Secondary Entity",
                                    "col2": "Benchmark Delta",
                                    "col3": "Validated",
                                },
                            },
                        ],
                    },
                    {
                        "id": "code",
                        "component": "CodeSnippet",
                        "title": "Analytical Python Calculation",
                        "language": "python",
                        "code": runnable_code,
                    },
                    {
                        "id": "formula",
                        "component": "InteractiveFormula",
                        "title": "Quantitative Derivation",
                        "formula": "ROAS = Revenue / Ad_Spend, T = 2*pi*sqrt(L/g)",
                        "variables": [
                            {"name": "Revenue", "label": "Gross Revenue", "default": 1540000},
                            {"name": "Ad_Spend", "label": "Total Ad Spend", "default": 220000},
                        ],
                    },
                    {
                        "id": "quiz",
                        "component": "QuizCard",
                        "question": f"Based on the analysis of {title}, which statement is correct?",
                        "options": [
                            "Option A: The primary efficiency metric improved significantly.",
                            "Option B: Resource bottleneck occurs under high load.",
                            "Option C: Both A and B are supported by data.",
                            "Option D: None of the above.",
                        ],
                        "correctIndex": 2,
                        "explanation": "Both findings are directly demonstrated by the empirical numbers in the dataset.",
                    },
                    {
                        "id": "resources",
                        "component": "ResourceList",
                        "title": "权威延伸资源与文档",
                        "resources": [
                            {
                                "title": "官方技术白皮书与基准规范",
                                "description": "系统核心架构与指标推导",
                                "url": "https://a2learn.ai/docs/reference",
                            },
                            {
                                "title": "开源基准数据集仓库",
                                "description": "公开复现数据与分析案例",
                                "url": "https://github.com/a2learn/benchmark-datasets",
                            },
                        ],
                    },
                ],
            },
        },
    ]


def call_model_for_benchmark(
    task: BenchmarkTask,
    model_name: str,
    target_format: str = "a2ui",
    api_key: str | None = None,
    mock: bool = False,
) -> tuple[str, float, dict[str, int]]:
    """Invoke an LLM via OpenRouter HTTP API and measure latency and tokens."""
    if mock or model_name.lower().startswith("mock"):
        mock_data = _get_mock_response_for_task(task, model_name)
        return json.dumps(mock_data, ensure_ascii=False), 0.05, {"prompt_tokens": 500, "completion_tokens": 800}

    import requests

    system_prompt, user_prompt = task.to_system_user_prompt(target_format)
    key = api_key or os.getenv("OPENROUTER_API_KEY") or os.getenv("OPEN_ROUTER_API_KEY")
    if not key:
        raise ValueError(
            f"OPENROUTER_API_KEY is not set. Cannot run live evaluation for model '{model_name}'. "
            "Please configure your key in .env or pass --mock to run in offline test mode."
        )

    # Normalize common model name typos/aliases
    normalized_model = model_name.strip()
    if normalized_model.startswith("~"):
        normalized_model = normalized_model[1:]
    if normalized_model.endswith("-latest") and not normalized_model.startswith("google/"):
        candidate = normalized_model.removesuffix("-latest")
        normalized_model = candidate

    base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    endpoint = f"{base_url}/chat/completions"

    payload = {
        "model": normalized_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": int(os.getenv("BENCHMARK_MAX_TOKENS", "16384")),
    }

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://a2learn.ai",
        "X-Title": "A2Learn Benchmark",
    }

    start_time = time.perf_counter()
    resp = requests.post(endpoint, headers=headers, json=payload, timeout=180)
    elapsed = time.perf_counter() - start_time

    if resp.status_code != 200:
        raise RuntimeError(f"OpenRouter API error ({resp.status_code}): {resp.text}")

    data = resp.json()
    choices = data.get("choices", [])
    if not choices:
        raise RuntimeError(f"OpenRouter returned empty choices: {resp.text}")

    msg = choices[0].get("message", {})
    content = msg.get("content") or ""
    if not content and msg.get("reasoning"):
        content = msg.get("reasoning", "")

    usage = data.get("usage", {})
    token_usage = {
        "prompt_tokens": usage.get("prompt_tokens", 0),
        "completion_tokens": usage.get("completion_tokens", 0),
        "total_tokens": usage.get("total_tokens", 0),
    }

    return content.strip(), elapsed, token_usage


def run_benchmark(
    models: list[str],
    task_ids: list[str] | None = None,
    target_format: str = "a2ui",
    mock: bool = False,
    reports_dir: str | None = None,
    api_key: str | None = None,
    enable_arena_judge: bool = False,
    judge_model: str = "google/gemini-3.7-flash",
) -> list[BenchmarkScorecard]:
    """Execute benchmark across specified models and tasks."""
    tasks = load_benchmark_suite(task_ids=task_ids)
    if not tasks:
        raise ValueError("No matching benchmark tasks found.")

    scorecards: list[BenchmarkScorecard] = []
    # Store raw outputs per task: { task_id: { model: raw_output } }
    task_outputs: dict[str, dict[str, Any]] = {t.id: {} for t in tasks}

    print(f"\n🚀 Running A2Learn Multi-Panel Benchmark on {len(models)} model(s) across {len(tasks)} task(s)...")

    for model in models:
        print(f"\nEvaluating Model: [{model}]")
        for task in tasks:
            print(f"  -> Running Task: [{task.id}] ({task.title})...", end="", flush=True)
            try:
                raw_output, latency, token_usage = call_model_for_benchmark(
                    task=task,
                    model_name=model,
                    target_format=target_format,
                    api_key=api_key,
                    mock=mock,
                )
                task_outputs[task.id][model] = raw_output
                scorecard = evaluate_task_output(
                    task=task,
                    model_name=model,
                    raw_output=raw_output,
                    latency_seconds=latency,
                    token_usage=token_usage,
                )
                scorecards.append(scorecard)
                status_icon = "✅" if scorecard.passed else "⚠️"
                syntax_label = "Syntax:PASS" if scorecard.syntax.valid else "Syntax:FAIL"
                facts_label = f"Facts:{scorecard.verifiable_facts.score}/100"
                urls_label = f"URLs:{scorecard.verifiable_facts.valid_urls_count}"
                print(f" {status_icon} [{syntax_label}, {facts_label}, {urls_label}, {scorecard.latency_seconds}s]")
            except Exception as exc:
                print(f" ❌ Error: {exc}")
                from .evaluators.overall import ComponentInventoryCard, PedagogyJudgeCard, SyntaxCard, VerifiableFactsCard
                failed_card = BenchmarkScorecard(
                    task_id=task.id,
                    model=model,
                    syntax=SyntaxCard(valid=False, score=0.0, errors=[str(exc)]),
                    verifiable_facts=VerifiableFactsCard(
                        passed_checks=0,
                        total_checks=0,
                        matched_facts=0,
                        total_facts=0,
                        valid_urls_count=0,
                        errors=[str(exc)],
                    ),
                    inventory=ComponentInventoryCard(total_characters=0, total_tokens=0, component_count=0),
                    pedagogy_judge=PedagogyJudgeCard(),
                    latency_seconds=0.0,
                    passed=False,
                )
                scorecards.append(failed_card)

    # Phase 2: Batch Arena Judge Evaluation (All-at-once holistic judging)
    arena_critique_map: dict[str, str] = {}
    if enable_arena_judge and len(models) >= 1:
        print(f"\n⚖️  Running Batch Holistic LLM Arena Judge ({judge_model})...")
        for task in tasks:
            outputs_for_task = task_outputs.get(task.id, {})
            if outputs_for_task:
                print(f"  -> Judging Task: [{task.id}] across {len(outputs_for_task)} candidate(s)...", end="", flush=True)
                try:
                    arena_res = evaluate_batch_arena(
                        task=task,
                        model_outputs=outputs_for_task,
                        judge_model=judge_model,
                        api_key=api_key,
                        mock=mock,
                    )
                    evals = arena_res.get("model_evaluations", {})
                    arena_critique_map[task.id] = arena_res.get("comparative_critique", "")

                    for sc in scorecards:
                        if sc.task_id == task.id and sc.model in evals:
                            m_eval = evals[sc.model]
                            sc.pedagogy_judge.explanatory_clarity = float(m_eval.get("explanatory_clarity", 0.0))
                            sc.pedagogy_judge.problem_driven = float(m_eval.get("problem_driven", 0.0))
                            sc.pedagogy_judge.cognitive_load_and_jargon = float(m_eval.get("cognitive_load_and_jargon", 0.0))
                            sc.pedagogy_judge.structural_coherence = float(m_eval.get("structural_coherence", 0.0))
                            sc.pedagogy_judge.overall_pedagogy_score = float(m_eval.get("overall_pedagogy_score", 0.0))
                            sc.pedagogy_judge.strengths = m_eval.get("strengths", "")
                            sc.pedagogy_judge.flaws = m_eval.get("flaws", "")
                    print(" ✅ Done.")
                except Exception as exc:
                    print(f" ⚠️ Judge Error: {exc}")

    from .viewer_renderer import save_viewer_arena_html
    html_preview_path = save_viewer_arena_html(scorecards, reports_dir=reports_dir, task_outputs=task_outputs)

    md_path, json_path = save_benchmark_report(scorecards, reports_dir=reports_dir, arena_critique_map=arena_critique_map)
    summary = __import__("benchmark.reporter", fromlist=["aggregate_model_results"]).aggregate_model_results(scorecards, arena_critique_map=arena_critique_map)
    print_cli_leaderboard(summary)
    print(f"📄 Markdown Report saved: {md_path}")
    print(f"📦 JSON Report saved: {json_path}")
    print(f"🌐 Interactive Viewer Arena: file://{html_preview_path}\n")

    return scorecards


def main() -> None:
    parser = argparse.ArgumentParser(description="Run A2Learn Data Analyst & UI Executable Benchmark.")
    parser.add_argument(
        "--models",
        "-m",
        nargs="+",
        default=["google/gemini-3.7-flash", "deepseek/deepseek-v4-flash", "bytedance-seed/seed-2-1-turbo"],
        help="List of model IDs",
    )
    parser.add_argument(
        "--tasks",
        "-t",
        nargs="*",
        help="Specific task IDs to run (default: all)",
    )
    parser.add_argument(
        "--target-format",
        choices=["a2ui", "course_content"],
        default="a2ui",
        help="Target output format to evaluate (default: a2ui)",
    )
    parser.add_argument(
        "--mock",
        action="store_true",
        help="Run offline using mock responses (useful for unit testing and CI)",
    )
    parser.add_argument(
        "--no-arena-judge",
        action="store_true",
        help="Disable batch holistic LLM arena judging",
    )
    parser.add_argument(
        "--judge-model",
        default="google/gemini-3.7-flash",
        help="Model ID to use for LLM Arena Judge (default: google/gemini-3.7-flash)",
    )
    parser.add_argument(
        "--reports-dir",
        default="reports/benchmark",
        help="Directory to save benchmark reports",
    )
    args = parser.parse_args()

    run_benchmark(
        models=args.models,
        task_ids=args.tasks,
        target_format=args.target_format,
        mock=args.mock,
        reports_dir=args.reports_dir,
        enable_arena_judge=not args.no_arena_judge,
        judge_model=args.judge_model,
    )


if __name__ == "__main__":
    main()
