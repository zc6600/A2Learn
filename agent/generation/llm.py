"""LLM model construction, JSON output parsing, and structured generation functions."""

import json
import os
import re
from typing import Any

from dotenv import load_dotenv

from ..core.config import DEFAULT_MODEL
from .prompts import (
    a2ui_system_prompt,
    curriculum_system_prompt,
    repair_system_prompt,
    site_plan_system_prompt,
)

try:
    from langchain_openai import ChatOpenAI
except Exception:  # pragma: no cover
    ChatOpenAI = None


load_dotenv()


def build_llm(api_key: str | None = None) -> Any:
    key = api_key or os.getenv("OPENROUTER_API_KEY") or os.getenv("OPEN_ROUTER_API_KEY")
    if not key or ChatOpenAI is None:
        raise RuntimeError(
            "API Key is required. Please set your OpenRouter API Key in Settings or env."
        )
    model = os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL)
    max_tokens = int(os.getenv("OPENROUTER_MAX_TOKENS", "200000"))
    return ChatOpenAI(
        model=model,
        api_key=key,
        base_url="https://openrouter.ai/api/v1",
        temperature=0.2,
        max_tokens=max_tokens,
        model_kwargs={"response_format": {"type": "json_object"}},
    )


def build_page_editor_llm(api_key: str | None = None) -> Any:
    """Build a tool-calling model for the conversational Page Editor Agent."""
    key = api_key or os.getenv("OPENROUTER_API_KEY") or os.getenv("OPEN_ROUTER_API_KEY")
    if not key or ChatOpenAI is None:
        raise RuntimeError(
            "API Key is required. Please set your OpenRouter API Key in Settings or env."
        )
    model = os.getenv("OPENROUTER_EDITOR_MODEL") or os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL)
    max_tokens = int(os.getenv("OPENROUTER_EDITOR_MAX_TOKENS", "8192"))
    return ChatOpenAI(
        model=model,
        api_key=key,
        base_url="https://openrouter.ai/api/v1",
        temperature=0.1,
        max_tokens=max_tokens,
    )


def _extract_json_array(text: str) -> list[dict[str, Any]]:
    try:
        parsed = json.loads(text.strip())
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict) and isinstance(parsed.get("a2ui_messages"), list):
            return parsed["a2ui_messages"]
    except Exception:
        pass

    fenced = re.search(r"```(?:json)?\s*([\s\S]*)\s*```", text)
    if fenced:
        candidate = fenced.group(1).strip()
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, list):
                return parsed
            if isinstance(parsed, dict) and isinstance(parsed.get("a2ui_messages"), list):
                return parsed["a2ui_messages"]
        except Exception:
            pass

    matches = re.findall(r"\[[\s\S]*?\]", text)
    for raw in matches:
        try:
            parsed = json.loads(raw)
            if not isinstance(parsed, list):
                continue
            if any(
                isinstance(x, dict)
                and ("createSurface" in x or "updateComponents" in x or "deleteSurface" in x)
                for x in parsed
            ):
                return parsed
        except Exception:
            continue

    raise ValueError("LLM did not return a valid A2UI message array.")


def _extract_json_object(text: str) -> dict[str, Any]:
    try:
        parsed = json.loads(text.strip())
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass

    fenced = re.search(r"```(?:json)?\s*([\s\S]*)\s*```", text)
    candidate = fenced.group(1).strip() if fenced else text.strip()

    if fenced:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    start = candidate.find("{")
    end = candidate.rfind("}")
    if start != -1 and end != -1 and end > start:
        sliced = candidate[start : end + 1]
        try:
            parsed = json.loads(sliced)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass

    raise ValueError("LLM did not return a valid JSON object.")


def _invoke_and_parse(
    llm: Any,
    messages: list[dict[str, str]],
    parser: Any,
    max_attempts: int = 3,
) -> Any:
    last_exc: Exception | None = None
    for _attempt in range(max_attempts):
        response = None
        try:
            response = llm.invoke(messages)
            content = getattr(response, "content", "")
            if isinstance(content, list):
                content = "".join(str(x) for x in content)
            return parser(str(content))
        except Exception as exc:
            finish_reason = (
                (getattr(response, "response_metadata", None) or {}).get("finish_reason")
                if response is not None
                else None
            )
            truncated = finish_reason == "length" or "length limit was reached" in str(exc)
            if truncated:
                last_exc = ValueError(
                    "LLM response was truncated (hit the token/length limit) before finishing valid JSON. "
                    "Raise OPENROUTER_MAX_TOKENS or shorten the request."
                )
            else:
                last_exc = exc
            continue
    assert last_exc is not None
    raise last_exc


def plan_curriculum(llm: Any, resource_text: str, target_language: str = "zh") -> dict[str, Any]:
    system_prompt = curriculum_system_prompt(target_language)
    user_prompt = (
        "Based on the following teaching resource, plan a curriculum.\n\n"
        f"Resource text:\n{resource_text}"
    )
    return _invoke_and_parse(
        llm,
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        _extract_json_object,
    )


def build_site_plan(
    llm: Any,
    curriculum: dict[str, Any],
    target_language: str = "zh",
    enabled_components: tuple[str, ...] | None = None,
) -> dict[str, Any]:
    system_prompt = site_plan_system_prompt(target_language, enabled_components)
    user_prompt = "Turn the following curriculum into a site plan. Each surface is one learning page.\n\n" + json.dumps(
        curriculum, ensure_ascii=False
    )
    return _invoke_and_parse(
        llm,
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        _extract_json_object,
    )


def generate_a2ui_messages(
    llm: Any,
    resource_text: str,
    target_language: str = "zh",
    enabled_components: tuple[str, ...] | None = None,
    example_ids: tuple[str, ...] | None = None,
    visual_intent: str = "",
    image_generation_limit: int = 2,
) -> list[dict[str, Any]]:
    system_prompt = a2ui_system_prompt(
        target_language,
        'Return ONLY a JSON object of the form {"a2ui_messages": [...]}, where '
        "the array holds ALL A2UI messages for the ENTIRE course (every "
        "surface's createSurface + updateComponents), no explanation.",
        enabled_components,
        example_ids,
        visual_intent,
        image_generation_limit,
    )
    user_prompt = (
        "Based on the following teaching resource, directly generate the A2UI message array (component tree).\n\n"
        f"Resource text:\n{resource_text}"
    )

    return _invoke_and_parse(
        llm,
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        _extract_json_array,
    )


def generate_a2ui_messages_per_surface(
    llm: Any,
    resource_text: str,
    site_plan: dict[str, Any],
    target_language: str = "zh",
    enabled_components: tuple[str, ...] | None = None,
    example_ids: tuple[str, ...] | None = None,
    visual_intent: str = "",
    image_generation_limit: int = 2,
) -> list[dict[str, Any]]:
    surfaces = site_plan.get("surfaces") if isinstance(site_plan, dict) else None
    if not surfaces:
        return generate_a2ui_messages(
            llm, resource_text, target_language, enabled_components, example_ids, visual_intent, image_generation_limit
        )

    site_overview = json.dumps(
        {"siteTitle": site_plan.get("siteTitle"), "surfaces": surfaces},
        ensure_ascii=False,
    )

    all_messages: list[dict[str, Any]] = []
    for surface in surfaces:
        surface_id = surface.get("surfaceId")
        if not surface_id:
            continue
        system_prompt = a2ui_system_prompt(
            target_language,
            'Return ONLY a JSON object of the form {"a2ui_messages": [...]}, '
            "containing EXACTLY ONE createSurface message and its matching "
            f'updateComponents message, both for surfaceId "{surface_id}" — '
            "do not generate any other surface, no explanation.",
            enabled_components,
            example_ids,
            visual_intent,
            image_generation_limit,
        )
        user_prompt = (
            "Generate A2UI messages (createSurface + updateComponents) only for the specified surface, "
            f'surfaceId 为 "{surface_id}"。\n\n'
            f"Resource text:\n{resource_text}\n\n"
            "# Full site structure (for context only; do not repeat other surfaces)\n"
            f"{site_overview}\n\n"
            "# This surface's plan\n"
            f"{json.dumps(surface, ensure_ascii=False)}"
        )
        surface_messages = _invoke_and_parse(
            llm,
            [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            _extract_json_array,
        )
        all_messages.extend(surface_messages)
    return all_messages


def repair_a2ui_messages(
    llm: Any,
    messages: list[dict[str, Any]],
    error: str,
    max_attempts: int = 2,
) -> list[dict[str, Any]]:
    system_prompt = repair_system_prompt()
    user_prompt = (
        "The following a2ui_messages array failed validation.\n\n"
        f"Validation error:\n{error}\n\n"
        "a2ui_messages:\n"
        f"{json.dumps(messages, ensure_ascii=False)}"
    )
    return _invoke_and_parse(
        llm,
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        _extract_json_array,
        max_attempts=max_attempts,
    )


def generate_structured_json(
    llm: Any,
    resource_text: str,
    prompt_template: str,
    target_language: str = "zh",
) -> dict[str, Any]:
    system_prompt = prompt_template.strip()
    system_prompt = system_prompt.replace(
        "{TARGET_LANGUAGE}",
        "English" if target_language == "en" else "Simplified Chinese",
    )
    if target_language == "en":
        system_prompt = system_prompt.replace(
            "Use Chinese for learner-facing strings.",
            "Use English for learner-facing strings.",
        ).replace(
            "in Chinese",
            "in English",
        )
    user_prompt = f"Based on the following teaching resource, generate a structured course JSON object.\n\nResource text:\n{resource_text}"
    return _invoke_and_parse(
        llm,
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        _extract_json_object,
    )
