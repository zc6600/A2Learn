"""Batch Holistic LLM-as-a-Judge Comparative Arena Evaluator on Pedagogical Dimensions."""

from __future__ import annotations

import json
import os
from typing import Any

from ..dataset import BenchmarkTask


PEDAGOGICAL_ARENA_PROMPT = """You are a distinguished, rigorous Professor of Educational Technology and AI Instructional Design.
Your job is to evaluate and compare the pedagogical quality of multiple AI models' generated interactive teaching websites (A2UI JSON) on the EXACT same topic and dataset.

You will receive the candidate models' full generated JSON outputs for side-by-side comparative judging.

Evaluate each candidate model strictly across these 5 pedagogical dimensions (0-10 score each):
1. explanatory_clarity (0-10): 是否阐释清楚内容？概念是否讲透、比喻是否直观通俗、核心因果链条是否清晰？
2. problem_driven (0-10): 是否问题驱动？是否以真实的痛点、认知冲突或探究性问题引入，而不是枯燥的死板灌输？
3. cognitive_load_and_jargon (0-10): 术语与认知负荷控制。是否无预警堆砌过难/生僻的专业黑话？是否提供了清晰的铺垫、降低了学习者的理解门槛？
4. structural_coherence (0-10): 内容整体性与连贯度。各组件之间是否环环相扣、层层递进（痛点→心智模型→数据推导→测验诊断），还是脱节碎片化的拼盘？
5. overall_pedagogy (0-100): 综合教学质量分。

CRITICAL INSTRUCTIONS:
- Be discriminative. Differentiate between excellent instructional design and superficial component-dumping.
- Compare models directly: who built the better intuitive bridge? who created the most insightful diagnostic questions?

Return ONLY a valid JSON object matching this schema:
{
  "model_evaluations": {
    "<model_name>": {
      "explanatory_clarity": <float 0-10>,
      "problem_driven": <float 0-10>,
      "cognitive_load_and_jargon": <float 0-10>,
      "structural_coherence": <float 0-10>,
      "overall_pedagogy_score": <float 0-100>,
      "strengths": "<key pedagogical strengths>",
      "flaws": "<pedagogical flaws or weaknesses>"
    }
  },
  "comparative_ranking": [
    {"rank": 1, "model": "<model_name>", "one_sentence_verdict": "<summary>"},
    ...
  ],
  "comparative_critique": "<Detailed comparative analysis explaining the ranking>"
}
"""


def evaluate_batch_arena(
    task: BenchmarkTask,
    model_outputs: dict[str, Any],
    judge_model: str = "google/gemini-3.7-flash",
    api_key: str | None = None,
    mock: bool = False,
) -> dict[str, Any]:
    """Pass all model outputs simultaneously to a Judge LLM for batch comparative pedagogical scoring."""
    if mock:
        models = list(model_outputs.keys())
        evals = {}
        rankings = []
        for i, m in enumerate(models):
            score = round(92.0 - (i * 4.0), 1)
            evals[m] = {
                "explanatory_clarity": round(9.0 - (i * 0.5), 1),
                "problem_driven": round(8.8 - (i * 0.4), 1),
                "cognitive_load_and_jargon": round(9.2 - (i * 0.3), 1),
                "structural_coherence": round(9.0 - (i * 0.5), 1),
                "overall_pedagogy_score": score,
                "strengths": "Strong cognitive progression and clear analogies.",
                "flaws": "Minor jargon without annotation." if i > 0 else "None",
            }
            rankings.append({
                "rank": i + 1,
                "model": m,
                "one_sentence_verdict": f"Demonstrated high pedagogical structure with score {score}.",
            })
        return {
            "model_evaluations": evals,
            "comparative_ranking": rankings,
            "comparative_critique": "Top model achieved superior explanatory clarity and intuitive mental model scaffolding.",
        }

    from langchain_core.messages import HumanMessage, SystemMessage
    from langchain_openai import ChatOpenAI

    key = api_key or os.getenv("OPENROUTER_API_KEY") or os.getenv("OPEN_ROUTER_API_KEY")
    if not key:
        return {
            "model_evaluations": {
                m: {
                    "explanatory_clarity": 7.0,
                    "problem_driven": 7.0,
                    "cognitive_load_and_jargon": 7.0,
                    "structural_coherence": 7.0,
                    "overall_pedagogy_score": 70.0,
                    "strengths": "N/A",
                    "flaws": "API key missing for Judge",
                }
                for m in model_outputs
            },
            "comparative_ranking": [],
            "comparative_critique": "LLM Judge API key not configured.",
        }

    import requests

    candidates_text = []
    for model_name, output in model_outputs.items():
        out_str = json.dumps(output, ensure_ascii=False) if isinstance(output, (dict, list)) else str(output)
        if len(out_str) > 6000:
            out_str = out_str[:6000] + "\n... [truncated]"
        candidates_text.append(f"### CANDIDATE MODEL: [{model_name}]\n```json\n{out_str}\n```\n")

    user_prompt = f"""# Educational Task: {task.title}
Category: {task.category}
Teaching Goal: {task.description}

## Source Input Data & Ground Truth:
```json
{json.dumps(task.input_data, ensure_ascii=False, indent=2)}
```

---
## Candidate Models Teaching Sites (JSON) to Compare:
{"".join(candidates_text)}

Evaluate all models side-by-side across the 5 pedagogical dimensions. Return strictly the JSON report.
"""

    base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/")
    endpoint = f"{base_url}/chat/completions"

    payload = {
        "model": judge_model,
        "messages": [
            {"role": "system", "content": PEDAGOGICAL_ARENA_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.1,
        "max_tokens": 4096,
    }

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://a2learn.ai",
        "X-Title": "A2Learn Arena Judge",
    }

    try:
        resp = requests.post(endpoint, headers=headers, json=payload, timeout=180)
        data = resp.json()
        content = data["choices"][0]["message"].get("content") or ""
        from .schema_evaluator import parse_raw_llm_json
        parsed = parse_raw_llm_json(content)
        return parsed
    except Exception as exc:
        return {
            "model_evaluations": {
                m: {
                    "explanatory_clarity": 7.0,
                    "problem_driven": 7.0,
                    "cognitive_load_and_jargon": 7.0,
                    "structural_coherence": 7.0,
                    "overall_pedagogy_score": 70.0,
                    "strengths": "N/A",
                    "flaws": f"Judge error: {exc}",
                }
                for m in model_outputs
            },
            "comparative_ranking": [],
            "comparative_critique": f"Judge execution error: {exc}",
        }
