import json
import os
import re
import textwrap
from typing import Any

from dotenv import load_dotenv

from .config import DEFAULT_CATALOG_ID, DEFAULT_MODEL

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


def plan_curriculum(llm: Any, resource_text: str) -> dict[str, Any]:
    system_prompt = textwrap.dedent(
        """
        You are an A2Learn agent that MUST output a curriculum plan as a JSON object.
        Return ONLY a JSON object, no explanation.

        Requirements:
        - Use Chinese for learner-facing strings.
        - Be concise and structured.
        - Include: title, summary, learningObjectives (array), modules (array).
        - Each module: id, title, goals (array), keyConcepts (array), activities (array of strings).
        """
    ).strip()
    user_prompt = f"请基于以下教学资源规划一份课程大纲（curriculum）。\n\nResource text:\n{resource_text}"
    return _invoke_and_parse(
        llm,
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        _extract_json_object,
    )


def build_site_plan(llm: Any, curriculum: dict[str, Any]) -> dict[str, Any]:
    system_prompt = textwrap.dedent(
        f"""
        You are an A2Learn agent that MUST output a site plan as a JSON object.
        Return ONLY a JSON object, no explanation.

        Requirements:
        - Use Chinese for learner-facing strings.
        - Include: siteTitle, surfaces (array).
        - Each surface: surfaceId, title, description, moduleId (optional), recommendedComponents (array).
        - recommendedComponents must be chosen from: LearningPath, ConceptCard, MentalModel, DetailedExplanation, QuizCard, DeepDivePrompt,
          ScenarioDialogue, Timeline, ClozeTest, DragAndDropMatch, InteractiveSandbox, ResourceList, PaperAbstract, LiteratureReference, InteractiveFormula.
        - HARD CAP: at most 4 surfaces total, even for a broad/complex topic.
          The next generation step writes rich, detailed content for every
          surface in a single response with a finite token budget — more
          surfaces here directly risks that response getting cut off before
          finishing valid JSON. Prefer merging closely related sub-topics into
          one surface over adding a 5th+ surface.
        - recommendedComponents per surface: at most 6, for the same reason.
        """
    ).strip()
    user_prompt = "请把下面 curriculum 转成站点结构（site plan），每个 surface 对应一个学习页面。\n\n" + json.dumps(
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


def _load_a2ui_examples_text() -> str:
    from pathlib import Path

    examples_dir = Path(__file__).parent.parent / "packages" / "a2learn-catalog" / "examples" / "Website"
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


def _a2ui_system_prompt(target_language: str, scope_instruction: str) -> str:
    """Shared prompt body for both the single-shot (generate_a2ui_messages)
    and per-surface (generate_a2ui_messages_per_surface) generators —
    `scope_instruction` is the only part that differs between them (whole
    course vs. one surface)."""
    lang_instruction = (
        "TARGET LANGUAGE: CHINESE (简体中文). All generated titles, descriptions, definitions, dialogues, analogies, and tooltips MUST be in clear, engaging, professional Chinese."
        if target_language == "zh" else
        "TARGET LANGUAGE: ENGLISH. All generated titles, descriptions, definitions, dialogues, analogies, and tooltips MUST be in fluent, clear, engaging, professional English."
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
          - Per component, keep any single text/content/description field to
            roughly 150-400 Chinese characters (a few sentences), not multiple
            paragraphs.
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
        - Components MUST be practical for interactive learning and should prefer:
          LearningPath, ConceptCard, MentalModel, DetailedExplanation, QuizCard, DeepDivePrompt, ScenarioDialogue,
          Timeline, ClozeTest, DragAndDropMatch, InteractiveSandbox, ResourceList, PaperAbstract, LiteratureReference, InteractiveFormula.
        - 5-STEP PROBLEM-DRIVEN MODULE METHODOLOGY (5 步问题驱动教学法则):
          Every module MUST strictly follow these 5 sequential steps internally:
          1. 介绍背景，引出现实问题 (Background & Practical Pain Point)
          2. 从第一性原理出发建立基本模型 + Naive 解决方案及其缺陷 (First-Principles Model & Naive Solution + Why Naive fails)
          3. 介绍解决思路 Mindset (Paradigm Shift / Core Breakthrough Mindset)
          4. Mindset 的实际落地方式 (具体回答/工程方案。若落地衍生新工程难题，则在新 Module 中开启下一轮探索)
          5. 本模块总结 (Module Summary using AnalogyCard: Part 1 Intuitive takeaway summary paragraph, Part 2 Technical term summary paragraph with bold <dfn title="通俗注解"><strong>术语名称</strong></dfn> hover tooltips).
        - PURE CONTENT TITLES (绝对去除框架标号与元描述废话):
          Write clean, direct subject-matter titles for all components and headers.
          STRICTLY FORBIDDEN IN TITLES & HEADINGS:
          - NO "关卡 1 ❓", "关卡 2 🔀", "关卡 3 📈", "关卡 4 🛡️" prefixes!
          - NO "第一性原理与 Naive 方案及缺陷" meta labels!
          - NO "解决思路 Mindset：", "工程落地：", "本模块总结：" meta tags!
          - NO "Step 1 | 介绍背景...", "Step 2 | 第一性原理..." prefixes!
        - CONCRETE REAL EXAMPLES (用具体数据步步演推代替抽象公式):
          When explaining data structures or algorithms, NEVER use abstract formulas like "shifting half the array O(N)".
          ALWAYS provide a concrete step-by-step numeric trace:
          1. State the exact initial data (e.g., `[10, 20, 30, 50, 60]`).
          2. State the target operation (e.g., "Insert 25").
          3. Trace each memory move step-by-step (e.g., "60 -> index 5, 50 -> index 4, 30 -> index 3").
          4. Conclude with real-world impact (e.g., "Inserting 1 element forced 3 RAM moves; 1,000,000 items forces 500,000 RAM moves!").
        - GLOSSARY & TERM ANNOTATION: NEVER output formulaic "请牢记以下..." lists. Weave key terms into a connected paragraph. Always wrap technical terms with semantic HTML definition tags: <dfn title="一句话通俗注解"><strong>术语名称</strong></dfn>. Example: "Python 字典在冲突时使用 <dfn title="哈希冲突时按规则查找下一个空槽位的方法"><strong>开放寻址法</strong></dfn> 解决。"
        - Output format example:
          {{"a2ui_messages": [
            {{"version":"v0.9","createSurface":{{"surfaceId":"main","catalogId":"{DEFAULT_CATALOG_ID}"}}}},
            {{"version":"v0.9","updateComponents":{{"surfaceId":"main","components":[...]}}}}
          ]}}
        """
    ).strip()

    examples_text = _load_a2ui_examples_text()
    if examples_text:
        system_prompt += "\n" + examples_text
    return system_prompt


def generate_a2ui_messages(llm: Any, resource_text: str, target_language: str = "zh") -> list[dict[str, Any]]:
    system_prompt = _a2ui_system_prompt(
        target_language,
        'Return ONLY a JSON object of the form {"a2ui_messages": [...]}, where '
        "the array holds ALL A2UI messages for the ENTIRE course (every "
        "surface's createSurface + updateComponents), no explanation.",
    )
    user_prompt = (
        "请根据以下教学资源直接生成 A2UI 消息数组（组件树）。\n\n"
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
) -> list[dict[str, Any]]:
    """Generates one surface at a time instead of the whole course in a
    single completion. Splitting shrinks each individual JSON response a
    model has to get exactly right, which measurably lowered the odds of
    hitting a parse failure on richer/longer topics during testing — at the
    cost of one LLM call per surface instead of one call total."""
    surfaces = site_plan.get("surfaces") if isinstance(site_plan, dict) else None
    if not surfaces:
        return generate_a2ui_messages(llm, resource_text, target_language)

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
        )
        user_prompt = (
            "请只为下面指定的这一个 surface 生成 A2UI 消息（createSurface + updateComponents），"
            f'surfaceId 为 "{surface_id}"。\n\n'
            f"Resource text:\n{resource_text}\n\n"
            "# 完整站点结构（仅供了解上下文与其他 surface 的关系，不要重复生成）\n"
            f"{site_overview}\n\n"
            "# 本 surface 的规划\n"
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


def generate_structured_json(llm: Any, resource_text: str, prompt_template: str) -> dict[str, Any]:
    """Generates structured course JSON directly based on the custom prompt template."""
    system_prompt = prompt_template.strip()
    user_prompt = f"请根据以下教学资源生成结构化课程 JSON 对象。\n\nResource text:\n{resource_text}"
    return _invoke_and_parse(
        llm,
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        _extract_json_object,
    )

