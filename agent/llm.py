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
    return ChatOpenAI(
        model=model,
        api_key=key,
        base_url="https://openrouter.ai/api/v1",
        temperature=0.2,
    )



def _extract_json_array(text: str) -> list[dict[str, Any]]:
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    candidate = (fenced.group(1) if fenced else text).strip()

    # 1) Try parse full payload directly.
    try:
        parsed = json.loads(candidate)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict) and isinstance(parsed.get("a2ui_messages"), list):
            return parsed["a2ui_messages"]
    except Exception:
        pass

    # 2) Try extracting all JSON arrays and choose one that looks like messages.
    matches = re.findall(r"\[[\s\S]*?\]", candidate)
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
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    candidate = (fenced.group(1) if fenced else text).strip()

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
        parsed = json.loads(sliced)
        if isinstance(parsed, dict):
            return parsed

    raise ValueError("LLM did not return a valid JSON object.")


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
    response = llm.invoke(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    )
    content = getattr(response, "content", "")
    if isinstance(content, list):
        content = "".join(str(x) for x in content)
    return _extract_json_object(str(content))


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
        """
    ).strip()
    user_prompt = "请把下面 curriculum 转成站点结构（site plan），每个 surface 对应一个学习页面。\n\n" + json.dumps(
        curriculum, ensure_ascii=False
    )
    response = llm.invoke(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    )
    content = getattr(response, "content", "")
    if isinstance(content, list):
        content = "".join(str(x) for x in content)
    return _extract_json_object(str(content))


def generate_a2ui_messages(llm: Any, resource_text: str) -> list[dict[str, Any]]:
    from pathlib import Path

    examples_text = ""
    examples_dir = Path(__file__).parent.parent / "packages" / "a2learn-catalog" / "examples" / "Website"
    if examples_dir.exists():
        examples = []
        for file_path in sorted(examples_dir.glob("*.json")):
            try:
                content = file_path.read_text(encoding="utf-8")
                examples.append(f"Example ({file_path.name}):\n```json\n{content}\n```")
            except Exception:
                continue
        if examples:
            examples_text = "\n\nHere are some examples of valid A2UI message arrays:\n" + "\n\n".join(examples)

    system_prompt = textwrap.dedent(
        f"""
        You are an A2Learn agent that MUST directly output A2UI v0.9 messages.
        Return ONLY a JSON array of messages, no explanation.

        Hard requirements:
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
          [
            {{"version":"v0.9","createSurface":{{"surfaceId":"main","catalogId":"{DEFAULT_CATALOG_ID}"}}}},
            {{"version":"v0.9","updateComponents":{{"surfaceId":"main","components":[...]}}}}
          ]
        """
    ).strip()

    if examples_text:
        system_prompt += "\n" + examples_text

    user_prompt = (
        "请根据以下教学资源直接生成 A2UI 消息数组（组件树）。\n\n"
        f"Resource text:\n{resource_text}"
    )

    response = llm.invoke(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    )
    content = getattr(response, "content", "")
    if isinstance(content, list):
        content = "".join(str(x) for x in content)
    return _extract_json_array(str(content))


def generate_structured_json(llm: Any, resource_text: str, prompt_template: str) -> dict[str, Any]:
    """Generates structured course JSON directly based on the custom prompt template."""
    system_prompt = prompt_template.strip()
    user_prompt = f"请根据以下教学资源生成结构化课程 JSON 对象。\n\nResource text:\n{resource_text}"
    response = llm.invoke(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
    )
    content = getattr(response, "content", "")
    if isinstance(content, list):
        content = "".join(str(x) for x in content)
    return _extract_json_object(str(content))

