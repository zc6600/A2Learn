"""Multi-panel diagnostic reporter presenting distinct benchmark evaluation dimensions."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from .evaluators.overall import BenchmarkScorecard


DEFAULT_REPORTS_DIR = Path("reports/benchmark")


def aggregate_model_results(
    scorecards: list[BenchmarkScorecard],
    arena_critique_map: dict[str, str] | None = None,
) -> list[dict[str, Any]]:
    """Group scorecards by model and calculate distinct dimensional metrics."""
    by_model: dict[str, list[BenchmarkScorecard]] = {}
    for sc in scorecards:
        by_model.setdefault(sc.model, []).append(sc)

    summary_list: list[dict[str, Any]] = []
    for model, cards in by_model.items():
        n = max(1, len(cards))
        syntax_valid_count = sum(1 for c in cards if c.syntax.valid)
        syntax_pass_rate = (syntax_valid_count / n) * 100.0

        avg_facts_score = sum(c.verifiable_facts.score for c in cards) / n
        total_valid_urls = sum(c.verifiable_facts.valid_urls_count for c in cards)

        avg_clarity = sum(c.pedagogy_judge.explanatory_clarity for c in cards) / n
        avg_problem = sum(c.pedagogy_judge.problem_driven for c in cards) / n
        avg_jargon = sum(c.pedagogy_judge.cognitive_load_and_jargon for c in cards) / n
        avg_coherence = sum(c.pedagogy_judge.structural_coherence for c in cards) / n
        avg_pedagogy_score = sum(c.pedagogy_judge.overall_pedagogy_score for c in cards) / n

        avg_chars = sum(c.inventory.total_characters for c in cards) / n
        avg_comps = sum(c.inventory.component_count for c in cards) / n
        avg_latency = sum(c.latency_seconds for c in cards) / n

        # Aggregate total component inventory
        all_comp_types: dict[str, int] = {}
        for c in cards:
            for c_name, count in c.inventory.component_breakdown.items():
                all_comp_types[c_name] = all_comp_types.get(c_name, 0) + count

        summary_list.append({
            "model": model,
            "tasks_count": n,
            "syntax_pass_rate": round(syntax_pass_rate, 1),
            "avg_facts_score": round(avg_facts_score, 1),
            "total_valid_urls": total_valid_urls,
            "pedagogy": {
                "explanatory_clarity": round(avg_clarity, 1),
                "problem_driven": round(avg_problem, 1),
                "cognitive_load_and_jargon": round(avg_jargon, 1),
                "structural_coherence": round(avg_coherence, 1),
                "overall_pedagogy_score": round(avg_pedagogy_score, 1),
            },
            "inventory": {
                "avg_characters": int(avg_chars),
                "avg_components": round(avg_comps, 1),
                "component_frequency": all_comp_types,
                "total_valid_urls": total_valid_urls,
            },
            "avg_latency_seconds": round(avg_latency, 2),
            "scorecards": [c.to_dict() for c in cards],
        })

    # Sort by pedagogy overall score if available, otherwise facts score
    summary_list.sort(key=lambda x: (x["pedagogy"]["overall_pedagogy_score"], x["avg_facts_score"]), reverse=True)
    return summary_list


def generate_markdown_report(
    summary_list: list[dict[str, Any]],
    run_id: str,
    arena_critique_map: dict[str, str] | None = None,
) -> str:
    """Generate a cleanly segregated multi-panel Markdown benchmark report."""
    md_lines: list[str] = [
        f"# 🎓 A2Learn 教学质量与系统能力多维评测报告",
        f"\n**Run ID:** `{run_id}` | **Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n",
        "> [!NOTE]",
        "> 本评测报告将 **语法正确性**、**事实一致性与资源链接**、**组件使用清单** 与 **LLM-as-a-Judge 教学质量打分** 分项独立呈现。\n",
        "## 🏛️ Part 1: 教学质量评测 (LLM-as-a-Judge 5 维打分)\n",
        "| 模型 | 综合教学分 (0-100) | 阐释清晰度 (0-10) | 问题驱动性 (0-10) | 术语负荷控制 (0-10) | 整体连贯度 (0-10) | 平均耗时 |",
        "| :--- | :---: | :---: | :---: | :---: | :---: | :---: |",
    ]

    for item in summary_list:
        p = item["pedagogy"]
        md_lines.append(
            f"| **`{item['model']}`** | **{p['overall_pedagogy_score']}** | {p['explanatory_clarity']} | {p['problem_driven']} | {p['cognitive_load_and_jargon']} | {p['structural_coherence']} | {item['avg_latency_seconds']}s |"
        )

    md_lines.append("\n---\n")
    md_lines.append("## 🔬 Part 2: 事实一致性与有效网址链接 (Verifiable Facts & Valid URLs)\n")
    md_lines.append("| 模型 | 语法合规率 | 事实与数据一致性得分 | 提供有效网址数 | 状态 |")
    md_lines.append("| :--- | :---: | :---: | :---: | :---: |")

    for item in summary_list:
        status = "✅ PASS" if item["syntax_pass_rate"] >= 80.0 and item["avg_facts_score"] >= 60.0 else "⚠️ WARN"
        md_lines.append(
            f"| **`{item['model']}`** | {item['syntax_pass_rate']}% | {item['avg_facts_score']} / 100 | {item['total_valid_urls']} 个 | {status} |"
        )

    md_lines.append("\n---\n")
    md_lines.append("## 📦 Part 3: 长度与组件使用统计清单 (Component Inventory & Length Stats)\n")
    md_lines.append("| 模型 | 平均字符数 | 平均组件数 | 核心组件使用频率分布 |")
    md_lines.append("| :--- | :---: | :---: | :--- |")

    for item in summary_list:
        inv = item["inventory"]
        freq_str = ", ".join(f"`{k}`: {v}" for k, v in sorted(inv["component_frequency"].items(), key=lambda x: x[1], reverse=True))
        md_lines.append(
            f"| **`{item['model']}`** | {inv['avg_characters']} | {inv['avg_components']} | {freq_str} |"
        )

    if arena_critique_map:
        md_lines.append("\n---\n")
        md_lines.append("## ⚖️ Part 4: 裁判模型交叉点评 (Judge Arena Critique)\n")
        for task_id, critique in arena_critique_map.items():
            md_lines.append(f"### 任务: `{task_id}` 综合点评\n")
            md_lines.append(f"> {critique}\n")

    md_lines.append("\n---\n")
    md_lines.append("## 🔍 Task-by-Task 详细诊断明细\n")

    for item in summary_list:
        md_lines.append(f"### 模型: `{item['model']}`\n")
        md_lines.append("| 任务 ID | 语法状态 | 事实吻合与有效网址 | 教学亮点与主要反馈 |")
        md_lines.append("| :--- | :---: | :---: | :--- |")
        for sc in item["scorecards"]:
            syn_status = "✅ 规范" if sc["syntax"]["valid"] else f"❌ 错误: {len(sc['syntax']['errors'])}处"
            vf = sc["verifiable_facts"]
            facts_str = f"事实吻合: {vf['matched_facts']}/{vf['total_facts']}, 网址: {vf['valid_urls_count']}个"

            pj = sc["pedagogy_judge"]
            ped_comment = f"**优势**: {pj['strengths']}<br>**不足**: {pj['flaws']}" if (pj['strengths'] or pj['flaws']) else "良好"
            ped_comment = ped_comment.replace("|", "\\|")

            md_lines.append(
                f"| `{sc['task_id']}` | {syn_status} | {facts_str} | {ped_comment} |"
            )
        md_lines.append("\n")

    return "\n".join(md_lines)


def print_cli_leaderboard(summary_list: list[dict[str, Any]]) -> None:
    """Print multi-panel terminal presentation."""
    print("\n" + "=" * 115)
    print("🎓 A2LEARN 教学质量与系统能力多维评测报告 (分项呈现)")
    print("=" * 115)
    
    print("\n[Part 1: 教学质量打分 - 5 维]")
    print(f"{'Model':<32} {'Pedagogy':<10} {'Clarity':<10} {'Problem':<10} {'Jargon':<10} {'Coherence':<10} {'Latency':<8}")
    print("-" * 115)
    for item in summary_list:
        p = item["pedagogy"]
        print(
            f"{item['model'][:30]:<32} {p['overall_pedagogy_score']:<10} {p['explanatory_clarity']:<10} "
            f"{p['problem_driven']:<10} {p['cognitive_load_and_jargon']:<10} {p['structural_coherence']:<10} "
            f"{str(item['avg_latency_seconds'])+'s':<8}"
        )

    print("\n[Part 2: 事实一致性与资源链接 (Verifiable Facts & URLs)]")
    print(f"{'Model':<32} {'SyntaxPass%':<14} {'FactsScore':<14} {'ValidURLs':<12}")
    print("-" * 115)
    for item in summary_list:
        print(
            f"{item['model'][:30]:<32} {str(item['syntax_pass_rate'])+'%':<14} "
            f"{str(item['avg_facts_score'])+'/100':<14} {str(item['total_valid_urls'])+' urls':<12}"
        )

    print("\n[Part 3: 长度与组件使用概览]")
    for item in summary_list:
        inv = item["inventory"]
        comps = ", ".join(f"{k}:{v}" for k, v in list(inv["component_frequency"].items())[:6])
        print(f"• {item['model'][:30]}: 均字数 {inv['avg_characters']}, 均组件数 {inv['avg_components']} -> [{comps}]")

    print("=" * 115 + "\n")


def save_benchmark_report(
    scorecards: list[BenchmarkScorecard],
    reports_dir: str | Path | None = None,
    run_id: str | None = None,
    arena_critique_map: dict[str, str] | None = None,
) -> tuple[str, str]:
    """Save both markdown and JSON multi-panel report."""
    out_dir = Path(reports_dir) if reports_dir else DEFAULT_REPORTS_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    rid = run_id or datetime.now().strftime("run_%Y%m%d_%H%M%S")
    summary = aggregate_model_results(scorecards, arena_critique_map=arena_critique_map)

    json_path = out_dir / f"{rid}_report.json"
    json_payload = {
        "run_id": rid,
        "timestamp": datetime.now().isoformat(),
        "models_summary": summary,
        "arena_critique_map": arena_critique_map or {},
        "raw_scorecards": [c.to_dict() for c in scorecards],
    }
    json_path.write_text(json.dumps(json_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    md_content = generate_markdown_report(summary, rid, arena_critique_map=arena_critique_map)
    md_path = out_dir / f"{rid}_leaderboard.md"
    md_path.write_text(md_content, encoding="utf-8")

    latest_md = out_dir / "latest_leaderboard.md"
    latest_json = out_dir / "latest_report.json"
    latest_md.write_text(md_content, encoding="utf-8")
    latest_json.write_text(json.dumps(json_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    return str(md_path.resolve()), str(json_path.resolve())
