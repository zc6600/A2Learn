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
        - PROBLEM-DRIVEN PEDAGOGY (问题驱动教学法):
          Do NOT dump technical frameworks or jargon upfront. Structure learning around a progressive narrative:
          1. Start with a real-world PAIN POINT or QUESTION (e.g., "Why does searching 1,000,000 records get painfully slow?").
          2. Introduce simple INTUITION / METAPHOR before code or math.
          3. Introduce tech concepts ONLY as solution responses to the pain point ("How do we jump directly to the target drawer?").
          4. When a new obstacle arises ("What if two keys get assigned to the same drawer?"), introduce the next concept (Collision Resolution) as the logical fix.
        - GLOSSARY ANNOTATION: When mentioning obscure, technical, or precursor concepts in explanations (such as algorithms, metrics, or mechanisms), wrap them with a semantic HTML definition tag: <dfn title="一句话通俗注解">生僻概念</dfn>. Example: "Python 字典在冲突时使用 <dfn title="哈希冲突时按规则查找下一个空槽位的方法">开放寻址法</dfn> 解决。"
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

