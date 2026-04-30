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


def build_llm() -> Any:
    api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPEN_ROUTER_API_KEY")
    if not api_key or ChatOpenAI is None:
        raise RuntimeError(
            "OPENROUTER_API_KEY is required and langchain_openai must be installed."
        )
    model = os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL)
    return ChatOpenAI(
        model=model,
        api_key=api_key,
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


def generate_a2ui_messages(llm: Any, resource_text: str) -> list[dict[str, Any]]:
    system_prompt = textwrap.dedent(
        f"""
        You are an A2Learn agent that MUST directly output A2UI v0.9 messages.
        Return ONLY a JSON array of messages, no explanation.

        Hard requirements:
        - Every message MUST include: "version": "v0.9".
        - Must include createSurface and updateComponents.
        - createSurface.catalogId MUST be "{DEFAULT_CATALOG_ID}".
        - Components MUST be practical for interactive learning and should prefer:
          LearningPath, ConceptCard, QuizCard, DeepDivePrompt, ScenarioDialogue,
          Timeline, ClozeTest, DragAndDropMatch, InteractiveSandbox, ResourceList.
        - Use stable IDs and keep components connected under a root layout.
        - Use Chinese text for learner-facing content.
        - Output format example:
          [
            {{"version":"v0.9","createSurface":{{"surfaceId":"main","catalogId":"{DEFAULT_CATALOG_ID}"}}}},
            {{"version":"v0.9","updateComponents":{{"surfaceId":"main","components":[...]}}}}
          ]
        """
    ).strip()

    user_prompt = (
        "请根据以下教学资源直接生成 A2UI 消息数组（组件树），不要先产课程摘要。\n\n"
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
