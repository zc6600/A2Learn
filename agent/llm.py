import json
import os
import re
import textwrap
from typing import Any

from dotenv import load_dotenv

from .config import DEFAULT_CATALOG_ID, DEFAULT_MODEL
from .generation_profile import load_reference_examples

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
    # Full A2UI message arrays for a multi-module course are large JSON
    # documents. Without an explicit max_tokens, some models/providers cap
    # completions well below what that needs, so the response gets cut off
    # mid-JSON and every parse attempt fails (see _invoke_and_parse's
    # finish_reason check, which turns that into an actionable error instead
    # of a bare JSON-decode failure).
    # qwen/qwen3.7-flash is a reasoning model: a chunk of its completion
    # tokens go to a hidden reasoning trace before the final JSON, so it
    # needs a much bigger budget than the visible output alone suggests —
    # a real production run hit completion_tokens=67389 (reasoning_tokens
    # 1849 of that) and still got cut off at the old 65536 ceiling.
    max_tokens = int(os.getenv("OPENROUTER_MAX_TOKENS", "200000"))
    # Constrains the model to emit raw JSON instead of prose wrapped in a
    # ```json fence. This is the real fix for the whole class of bugs where
    # a regex had to guess where the fence ends (see _extract_json_array/
    # _extract_json_object) — with this on, there's no fence to mis-parse in
    # the first place. Both qwen/qwen3.7-flash and deepseek/deepseek-v4-flash
    # confirmed to support it via OpenRouter. The extractors keep their
    # fence-stripping fallback for models/providers that ignore this.
    return ChatOpenAI(
        model=model,
        api_key=key,
        base_url="https://openrouter.ai/api/v1",
        temperature=0.2,
        max_tokens=max_tokens,
        model_kwargs={"response_format": {"type": "json_object"}},
    )


def build_page_editor_llm(api_key: str | None = None) -> Any:
    """Build a tool-calling model for the conversational Page Editor Agent.

    The course-generation model intentionally enables JSON mode because it
    emits complete, machine-parsed artefacts. The editor instead needs normal
    assistant messages *and* provider tool calls, so JSON mode must not leak
    into this configuration.
    """

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
    # 1) With JSON mode on (see build_llm), the response IS raw JSON — try
    #    parsing it as-is FIRST, before ever looking for a ```fence```. A
    #    component's content can legitimately contain a ```code``` sample as
    #    plain characters inside a JSON string; if fence-stripping ran first
    #    and treated that incidental pair of backticks as the "real" outer
    #    fence, it would slice out and corrupt an otherwise perfectly valid,
    #    much larger response.
    try:
        parsed = json.loads(text.strip())
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict) and isinstance(parsed.get("a2ui_messages"), list):
            return parsed["a2ui_messages"]
    except Exception:
        pass

    # 2) Fallback for a model/provider that doesn't fully honor JSON mode and
    #    still wraps its response in a ```json fence.
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

    # 3) Last resort: extract all JSON arrays and choose one that looks like messages.
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
    # See _extract_json_array: try the raw response as-is first, since JSON
    # mode means there's normally no ```fence``` at all, and incidental
    # backticks inside a string value could otherwise be mistaken for one.
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
    """Structured-output LLM calls occasionally come back unparseable (a
    malformed fence, a dropped bracket) even with a correct prompt and
    fixed extractor — that's an inherent risk of asking a model for exact
    JSON. Retrying with a fresh sample is cheap relative to failing the
    whole generation outright.

    llm.invoke() itself is inside the try/except, not just the parser call:
    with JSON mode enabled, a response cut off at the token limit can make
    the client raise directly (e.g. "Could not parse response content as
    the length limit was reached") instead of returning a response object
    with truncated .content — that used to skip every retry attempt and
    fail on the very first one."""
    last_exc: Exception | None = None
    for _attempt in range(max_attempts):
        response = None
        try:
            response = llm.invoke(messages)
            content = getattr(response, "content", "")
            if isinstance(content, list):
                content = "".join(str(x) for x in content)
            return parser(str(content))
        except Exception as exc:  # noqa: BLE001 - deliberately broad, see docstring
            finish_reason = (
                (getattr(response, "response_metadata", None) or {}).get("finish_reason")
                if response is not None
                else None
            )
            truncated = finish_reason == "length" or "length limit was reached" in str(exc)
            if truncated:
                # The model hit the token/length limit mid-JSON — no amount
                # of retrying with the same limit fixes this, so say so
                # plainly instead of letting a bare "Expecting value: line N
                # column M" (or the client's own raw error) bubble up on the
                # final attempt.
                last_exc = ValueError(
                    "LLM response was truncated (hit the token/length limit) before finishing valid JSON. "
                    "Raise OPENROUTER_MAX_TOKENS or shorten the request."
                )
            else:
                last_exc = exc
            continue
    assert last_exc is not None
    raise last_exc


def _language_instruction(target_language: str) -> str:
    if target_language == "en":
        return "Use English for every learner-facing string."
    return "Use Simplified Chinese for every learner-facing string."


def plan_curriculum(llm: Any, resource_text: str, target_language: str = "zh") -> dict[str, Any]:
    system_prompt = textwrap.dedent(
        f"""
        You are an A2Learn agent that MUST output a curriculum plan as a JSON object.
        Return ONLY a JSON object, no explanation.

        Requirements:
        - {_language_instruction(target_language)}
        - Be concise and structured.
        - Include: title, summary, learningObjectives (array), modules (array).
        - Each module: id, title, goals (array), keyConcepts (array), activities (array of strings).
        """
    ).strip()
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
    component_choices = ", ".join(enabled_components) if enabled_components is not None else (
        "LearningPath, ConceptCard, MentalModel, DetailedExplanation, QuizCard, DeepDivePrompt, "
        "ScenarioDialogue, Timeline, ClozeTest, DragAndDropMatch, InteractiveSandbox, ResourceList, "
        "PaperAbstract, LiteratureReference, InteractiveFormula"
    )
    system_prompt = textwrap.dedent(
        f"""
        You are an A2Learn agent that MUST output a site plan as a JSON object.
        Return ONLY a JSON object, no explanation.

        Requirements:
        - {_language_instruction(target_language)}
        - Include: siteTitle, surfaces (array).
        - Each surface: surfaceId, title, description, moduleId (optional), recommendedComponents (array).
        - recommendedComponents must be chosen only from: {component_choices}.
        - HARD CAP: at most 4 surfaces total, even for a broad/complex topic.
          The next generation step writes rich, detailed content for every
          surface in a single response with a finite token budget — more
          surfaces here directly risks that response getting cut off before
          finishing valid JSON. Prefer merging closely related sub-topics into
          one surface over adding a 5th+ surface.
        - recommendedComponents per surface: at most 6, for the same reason.
        """
    ).strip()
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


def _load_a2ui_examples_text(
    target_language: str,
    example_ids: tuple[str, ...] | None = None,
) -> str:
    if example_ids is not None:
        return load_reference_examples(example_ids, target_language)
    from pathlib import Path

    examples_dir = Path(__file__).parent.parent / "packages" / "a2learn-catalog" / "examples" / "Website"
    if target_language == "en":
        examples_dir = Path(__file__).parent.parent / "apps" / "viewer" / "public" / "examples" / "en"
    if not examples_dir.exists():
        return ""
    examples = []
    for file_path in sorted(examples_dir.glob("*.json")):
        try:
            # Source files are bare arrays (also used by the static example
            # gallery elsewhere) — wrap each one in the {"a2ui_messages": [...]}
            # envelope this prompt now asks for, so the shown examples match
            # the requested output shape.
            raw_array = json.loads(file_path.read_text(encoding="utf-8"))
            wrapped = json.dumps({"a2ui_messages": raw_array}, ensure_ascii=False)
            examples.append(f"Example ({file_path.name}):\n{wrapped}")
        except Exception:
            continue
    if not examples:
        return ""
    return "\n\nHere are some examples of valid A2UI message arrays:\n" + "\n\n".join(examples)


def _a2ui_system_prompt(
    target_language: str,
    scope_instruction: str,
    enabled_components: tuple[str, ...] | None = None,
    example_ids: tuple[str, ...] | None = None,
    visual_intent: str = "",
) -> str:
    """Shared prompt body for both the single-shot (generate_a2ui_messages)
    and per-surface (generate_a2ui_messages_per_surface) generators —
    `scope_instruction` is the only part that differs between them (whole
    course vs. one surface)."""
    lang_instruction = (
        "TARGET LANGUAGE: CHINESE (简体中文). All generated titles, descriptions, definitions, dialogues, analogies, and tooltips MUST be in clear, engaging, professional Chinese."
        if target_language == "zh" else
        "TARGET LANGUAGE: ENGLISH. All generated titles, descriptions, definitions, dialogues, analogies, and tooltips MUST be in fluent, clear, engaging, professional English."
    )

    component_constraint = (
        "- COMPONENT ALLOWLIST: You may use only these custom learning components: "
        + (", ".join(enabled_components) or "none")
        + ". Column and Text remain available for structural layout. Do not use any other custom learning component."
        if enabled_components is not None
        else "- Components MUST be practical for interactive learning and should prefer: LearningPath, ConceptCard, MentalModel, DetailedExplanation, QuizCard, DeepDivePrompt, ScenarioDialogue, Timeline, ClozeTest, DragAndDropMatch, InteractiveSandbox, ResourceList, PaperAbstract, LiteratureReference, InteractiveFormula."
    )
    visual_instruction = (
        f"- VISUAL AND CONTENT INTENT: {visual_intent}\n"
        "  Reflect this intent through hierarchy, content density, and component choice. Do not output CSS."
        if visual_intent
        else ""
    )

    system_prompt = textwrap.dedent(
        f"""
        You are an A2Learn agent that MUST directly output A2UI v0.9 messages.
        {scope_instruction}

        {lang_instruction}

        Hard requirements:
        - TOKEN BUDGET (读完再写，非常重要): this response has a finite token
          budget. A response that runs out of budget mid-JSON is invalid and
          the ENTIRE generation fails — a shorter but complete, valid response
          is always better than a longer one that gets cut off. Be concise and
          information-dense rather than exhaustive:
          - Per component, use roughly 250-650 characters for a meaningful
            explanation when the topic requires it. Prefer 2-4 connected
            sentences over a one-line definition, while still avoiding
            repetition and unnecessary filler.
          - ScenarioDialogue: at most 4-5 message turns total.
          - DetailedExplanation: cover the 2-3 most important points, not an
            exhaustive list.
          - Do not repeat the same explanation, example, or term definition
            across multiple components — say it once, well.
        - Your response is parsed as raw JSON (no markdown fence needed or
          wanted). A component's text/content string may contain literal
          backtick characters (e.g. to show code) — that's fine, they're just
          characters inside a JSON string; just make sure the string itself is
          properly JSON-escaped (e.g. real newlines inside it written as \\n).
        - Every message MUST include: "version": "v0.9".
        - Must include createSurface and updateComponents.
        - createSurface.catalogId MUST be "{DEFAULT_CATALOG_ID}".
        {component_constraint}
        {visual_instruction}
        - 5-STEP PROBLEM-DRIVEN MODULE METHODOLOGY:
          Every module MUST strictly follow these 5 sequential steps internally:
          1. Introduce the background and practical pain point.
          2. Build a first-principles model and explain why the naive approach fails.
          3. Explain the key conceptual shift.
          4. Show how the idea is implemented in practice.
          5. Summarize the module with an intuitive takeaway and connected terminology.
        - PURE CONTENT TITLES:
          Write clean, direct subject-matter titles for all components and headers.
        - CONCRETE REAL EXAMPLES (用具体数据步步演推代替抽象公式):
          When explaining data structures or algorithms, NEVER use abstract formulas like "shifting half the array O(N)".
          ALWAYS provide a concrete step-by-step numeric trace:
          1. State the exact initial data (e.g., `[10, 20, 30, 50, 60]`).
          2. State the target operation (e.g., "Insert 25").
          3. Trace each memory move step-by-step (e.g., "60 -> index 5, 50 -> index 4, 30 -> index 3").
          4. Conclude with real-world impact (e.g., "Inserting 1 element forced 3 RAM moves; 1,000,000 items forces 500,000 RAM moves!").
        - EXPLANATION DEPTH AND TERM ORDER: Explain one important idea at a
          time. When a technical term appears for the first time, immediately
          explain it in plain language and, when appropriate, wrap that term
          with a semantic HTML definition tag. Do not define one unfamiliar
          term with two or three other unexplained terms. If a new term is
          necessary, introduce it with its role, a concrete example, and why
          the learner needs it before using it as a building block.
        - GLOSSARY & TERM ANNOTATION: Weave key terms into a connected
          paragraph rather than stacking a list of definitions. Each paragraph
          should connect the mechanism, an example, and the practical effect.
        - CLEAN CONCEPT CARD EXAMPLES: Never wrap ConceptCard example strings in HTML tags like <pre><code>...</code></pre>. Use clean plain text lines with arrow flow steps.
        - EXPLANATORY CODE COMMENTS: Whenever you generate a code block,
          InteractiveSandbox snippet, or code-like example, add substantial
          inline comments to every non-trivial step. Each comment should tell
          the learner what the line does, why it is needed, and, when useful,
          show the concrete input, intermediate value, or expected output.
          Do not merely repeat the API or function name; explain the mechanism
          in plain language so a learner can follow the code without guessing
          what an unfamiliar term means.
        - MARKDOWN EXAMPLES: For ConceptCard `example` fields that mix prose
          and code, use real Markdown: keep each list item on its own line,
          leave a blank line before code, and wrap every code sample in a
          fenced block such as ```conf or ```python. Never concatenate prose,
          configuration directives, and code onto one line.
        - Output format example:
          {{"a2ui_messages": [
            {{"version":"v0.9","createSurface":{{"surfaceId":"main","catalogId":"{DEFAULT_CATALOG_ID}"}}}},
            {{"version":"v0.9","updateComponents":{{"surfaceId":"main","components":[...]}}}}
          ]}}
        """
    ).strip()

    examples_text = _load_a2ui_examples_text(target_language, example_ids)
    if examples_text:
        system_prompt += "\n" + examples_text
    return system_prompt


def generate_a2ui_messages(
    llm: Any,
    resource_text: str,
    target_language: str = "zh",
    enabled_components: tuple[str, ...] | None = None,
    example_ids: tuple[str, ...] | None = None,
    visual_intent: str = "",
) -> list[dict[str, Any]]:
    system_prompt = _a2ui_system_prompt(
        target_language,
        'Return ONLY a JSON object of the form {"a2ui_messages": [...]}, where '
        "the array holds ALL A2UI messages for the ENTIRE course (every "
        "surface's createSurface + updateComponents), no explanation.",
        enabled_components,
        example_ids,
        visual_intent,
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
) -> list[dict[str, Any]]:
    """Generates one surface at a time instead of the whole course in a
    single completion. Splitting shrinks each individual JSON response a
    model has to get exactly right, which measurably lowered the odds of
    hitting a parse failure on richer/longer topics during testing — at the
    cost of one LLM call per surface instead of one call total."""
    surfaces = site_plan.get("surfaces") if isinstance(site_plan, dict) else None
    if not surfaces:
        return generate_a2ui_messages(
            llm, resource_text, target_language, enabled_components, example_ids, visual_intent
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
        system_prompt = _a2ui_system_prompt(
            target_language,
            'Return ONLY a JSON object of the form {"a2ui_messages": [...]}, '
            "containing EXACTLY ONE createSurface message and its matching "
            f'updateComponents message, both for surfaceId "{surface_id}" — '
            "do not generate any other surface, no explanation.",
            enabled_components,
            example_ids,
            visual_intent,
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
    """Asks the LLM to fix an a2ui_messages array that failed
    validate_a2ui_messages, given the exact validation error it hit.
    Structurally invalid output (a missing catalogId, an empty
    updateComponents.components list, etc.) is otherwise an all-or-nothing
    failure — this targets just what the error names instead of discarding
    an entire course's worth of already-generated content and starting over."""
    system_prompt = textwrap.dedent(
        """
        You are an A2Learn agent that fixes an invalid A2UI v0.9 message
        array. You will be given the array and the exact validation error it
        failed with. Return ONLY a corrected JSON object of the form
        {"a2ui_messages": [...]} containing the FULL array (every message,
        not just the changed ones) with ONLY the problem described by the
        error fixed. Do not rewrite, shorten, or otherwise change any
        content that the error doesn't mention.
        """
    ).strip()
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
    """Generates structured course JSON directly based on the custom prompt template."""
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
