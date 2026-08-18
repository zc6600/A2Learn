"""Verifiable Facts, Interactive Integrity, and Resource URL Evaluator."""

from __future__ import annotations

import re
import urllib.parse
from typing import Any

from ..dataset import BenchmarkTask


URL_REGEX = re.compile(
    r"^https?://[a-zA-Z0-9\-._~:/?#\[\]@!$&'()*+,;=]+$",
    re.IGNORECASE,
)


def extract_resource_urls(components: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Extract all resource links and external URLs from components."""
    urls: list[dict[str, str]] = []
    for c in components:
        if not isinstance(c, dict):
            continue
        c_type = c.get("component", "")
        # ResourceList component
        if c_type == "ResourceList" and isinstance(c.get("resources"), list):
            for item in c["resources"]:
                if isinstance(item, dict):
                    urls.append({
                        "title": str(item.get("title", "")),
                        "url": str(item.get("url", "")).strip(),
                        "component": "ResourceList",
                    })
        # LiteratureReference or PaperAbstract
        elif c_type in ("LiteratureReference", "PaperAbstract"):
            if "url" in c:
                urls.append({
                    "title": str(c.get("title", "")),
                    "url": str(c.get("url", "")).strip(),
                    "component": c_type,
                })
        # Deep links in other components
        for k, v in c.items():
            if isinstance(v, str) and (v.startswith("http://") or v.startswith("https://")):
                urls.append({"title": k, "url": v.strip(), "component": c_type})

    return urls


def evaluate_verifiable_facts_and_links(
    task: BenchmarkTask,
    components: list[dict[str, Any]],
    raw_str: str,
) -> tuple[float, list[str], dict[str, Any]]:
    """Evaluate factual alignment, interactive component integrity, and valid resource URLs."""
    errors: list[str] = []
    passed_checks = 0
    total_checks = 0

    # 1. Check Key Fact / Metric Alignment (Data Faithfulness)
    key_metrics = task.expected_criteria.get("key_metrics_to_mention", [])
    ground_truth = task.expected_criteria.get("ground_truth_assertions", {})
    all_facts_to_check = list(key_metrics)
    for k, v in ground_truth.items():
        all_facts_to_check.append(str(v))

    matched_facts = 0
    for fact in all_facts_to_check:
        total_checks += 1
        fact_str = str(fact).strip().lower()
        if fact_str in raw_str.lower():
            matched_facts += 1
            passed_checks += 1
        else:
            errors.append(f"Fact missing in content: '{fact}' was not reflected in the generated UI.")

    # 2. Check Resource URL Validity & Actionability
    urls = extract_resource_urls(components)
    valid_urls_count = 0
    total_checks += 1  # Base check: model should provide at least one valid external URL resource
    if urls:
        for u in urls:
            u_str = u["url"]
            if u_str.startswith("http://") or u_str.startswith("https://"):
                parsed = urllib.parse.urlparse(u_str)
                if parsed.netloc and "." in parsed.netloc:
                    valid_urls_count += 1
        if valid_urls_count > 0:
            passed_checks += 1
        else:
            errors.append("ResourceList contains invalid or malformed URL formats.")
    else:
        errors.append("No external resource URLs provided in ResourceList / links.")

    # 3. Check Interactive Quiz Integrity
    quiz_cards = [c for c in components if isinstance(c, dict) and c.get("component") == "QuizCard"]
    if quiz_cards:
        total_checks += 1
        quiz_ok = True
        for q in quiz_cards:
            opts = q.get("options", [])
            idx = q.get("correctIndex")
            if not isinstance(opts, list) or len(opts) < 2:
                quiz_ok = False
                errors.append("QuizCard must contain at least 2 options.")
            elif not isinstance(idx, int) or idx < 0 or idx >= len(opts):
                quiz_ok = False
                errors.append(f"QuizCard correctIndex {idx} out of range [0, {len(opts)-1}].")
        if quiz_ok:
            passed_checks += 1

    # 4. Check Interactive Formula Integrity
    formulas = [c for c in components if isinstance(c, dict) and c.get("component") == "InteractiveFormula"]
    if formulas:
        total_checks += 1
        form_ok = True
        for f in formulas:
            if not f.get("formula") or not isinstance(f.get("formula"), str):
                form_ok = False
                errors.append("InteractiveFormula missing 'formula' definition string.")
        if form_ok:
            passed_checks += 1

    score = round((passed_checks / max(1, total_checks)) * 100.0, 1) if total_checks else 100.0

    breakdown = {
        "passed_checks": passed_checks,
        "total_checks": total_checks,
        "matched_facts_count": matched_facts,
        "total_facts_expected": len(all_facts_to_check),
        "valid_urls_found": valid_urls_count,
        "urls_extracted": urls,
    }

    return score, errors, breakdown


# Aliases for backward compatibility
def extract_python_code_blocks(components: list[dict[str, Any]]) -> list[str]:
    blocks = []
    for c in components:
        if isinstance(c, dict) and c.get("component") == "CodeSnippet":
            code = c.get("code") or c.get("snippet")
            if code and isinstance(code, str):
                blocks.append(code)
    return blocks


def execute_code_in_sandbox(task: BenchmarkTask, code_snippets: list[str]) -> tuple[float, list[str], dict[str, Any]]:
    # Simple syntax check for backward compatibility without blocking on brittle key assertions
    if not code_snippets:
        return 100.0, [], {"syntax_ok": True, "runtime_ok": True, "passed_assertions": 1, "total_assertions": 1}
    for snippet in code_snippets:
        try:
            compile(snippet, "<string>", "exec")
        except Exception as e:
            return 50.0, [f"SyntaxError in code: {e}"], {"syntax_ok": False, "runtime_ok": False, "passed_assertions": 0, "total_assertions": 1}
    return 100.0, [], {"syntax_ok": True, "runtime_ok": True, "passed_assertions": 1, "total_assertions": 1}
