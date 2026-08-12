"""Page narration extraction and optional OpenRouter / OpenAI TTS generation."""

from __future__ import annotations

import hashlib
import json
import os
import ssl
import tempfile
from collections.abc import Mapping
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

import certifi

from .tts_config import TTSConfig, load_tts_config

IGNORED_NARRATION_KEYS = {
    "action",
    "activestepid",
    "catalogid",
    "children",
    "component",
    "docid",
    "documentid",
    "event",
    "icon",
    "id",
    "image",
    "mode",
    "name",
    "stepid",
    "style",
    "surfaceid",
    "tag",
    "target",
    "theme",
    "type",
    "url",
    "variant",
    "version",
}


def _texts(value: Any) -> list[str]:
    if isinstance(value, str):
        trimmed = value.strip()
        return [trimmed] if trimmed else []
    if isinstance(value, Mapping):
        result: list[str] = []
        for key, child in value.items():
            if str(key).lower() in IGNORED_NARRATION_KEYS:
                continue
            result.extend(_texts(child))
        return result
    if isinstance(value, list):
        result: list[str] = []
        for child in value:
            result.extend(_texts(child))
        return result
    return []


def build_page_narration(document: Mapping[str, Any], language: str = "zh") -> str:
    """Turn a PageDocument into a readable, complete presenter script."""
    lines: list[str] = []
    for component in document.get("components", []):
        if not isinstance(component, Mapping):
            continue
        props = component.get("props", {})
        parts = _texts(props)
        if parts:
            lines.extend(parts)
    if not lines:
        return ""
    if language == "en":
        return "Today we will learn the following.\n\n" + "\n\n".join(lines) + "\n\nThat concludes this page."
    return "今天我们来学习这一页的内容。\n\n" + "\n\n".join(lines) + "\n\n以上就是这一页的核心内容，接下来可以结合页面上的示例继续练习。"


def rewrite_page_narration(
    document: Mapping[str, Any],
    *,
    llm: Any,
    language: str = "zh",
) -> str:
    """Use an LLM to turn page facts into a spoken teaching script."""
    is_zh = language == "zh"
    system_prompt = (
        "你是一位优秀的教学名师与课程口播讲稿专家。你的任务是将结构化的交互式页面内容，转化为通顺流畅、生动易懂且富有教学感染力的口语化中文教学讲稿。"
        if is_zh
        else "You are an expert educational presenter and scriptwriter. Your task is to turn structured interactive page content into a natural, spoken, and engaging teaching narration script."
    )
    user_prompt = (
        "请将以下 A2Learn 页面内容改写为一份完整的口语化教学讲稿（口播文稿）。\n\n"
        "【编写要求】：\n"
        "1. 口语化与教学感：语言要通俗生动、亲切自然，像老师在面对面生动讲课一样，善用逻辑连接词与启发式提问引导学习者思考。\n"
        "2. 内容完整：完整保留页面中所有的核心知识点、直觉原理、算法/公式逻辑、典型案例、代码思路与总结，帮助学习者即便不看屏幕也能听懂。\n"
        "3. 严禁读出系统/组件标识：绝对不要出现任何组件 ID、DOM ID 或英文标记符（如 header-1, step1-background, learning-path-1, root, quiz-2, surface-module-1 等）。\n"
        "4. 严禁读出组件名与布局结构：绝对不要出现 Column, LearningPath, InteractiveSandbox, Text, props, variant 等组件类型名。\n"
        "5. 纯朗读文本格式：不要输出 Markdown 标题标记（如 #、##）、加粗符号（**）或代码块反引号，直接输出适合语音合成朗读的纯文本。\n"
        "6. 仅返回讲稿：不要包含任何前言、结语、问候语或元注释说明（例如不要输出“好的，这是为您编写的讲稿：”）。\n\n"
        "PAGE JSON:\n" + json.dumps(document, ensure_ascii=False)
        if is_zh
        else (
            "Rewrite the following A2Learn page into a complete spoken teaching narration script.\n\n"
            "Requirements:\n"
            "1. Conversational & engaging: Natural spoken style, as if a teacher is explaining concepts directly.\n"
            "2. Complete coverage: Preserve all key concepts, formulas, code logic, and examples.\n"
            "3. No internal IDs or UI labels: Never mention component IDs (e.g. header-1, step1-background, root) or component types (Column, LearningPath, etc.).\n"
            "4. Pure spoken text: No Markdown headers (#), bold markers (**), or backticks.\n"
            "5. Return only the script: No greeting, prelude, or meta commentary.\n\n"
            "PAGE JSON:\n" + json.dumps(document, ensure_ascii=False)
        )
    )
    response = llm.invoke([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ])
    content = getattr(response, "content", "")
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, Mapping):
                text = item.get("text")
                if isinstance(text, str):
                    parts.append(text)
            elif isinstance(item, str):
                parts.append(item)
        script = "".join(parts)
    else:
        script = str(content)
    script = script.strip()
    if not script:
        raise RuntimeError("Narration model returned an empty script")
    return script


def audio_dir() -> Path:
    path = Path(os.getenv("A2LEARN_AUDIO_DIR", ".a2learn/audio"))
    path.mkdir(parents=True, exist_ok=True)
    return path


def synthesize(
    text: str,
    *,
    language: str = "zh",
    api_key: str | None = None,
    model: str | None = None,
    voice: str | None = None,
) -> tuple[str, Path]:
    key = (
        api_key
        or os.getenv("OPENROUTER_API_KEY")
        or os.getenv("OPEN_ROUTER_API_KEY")
        or os.getenv("OPENAI_API_KEY")
    )
    if not key:
        raise RuntimeError("API Key is not configured for TTS")
    config = load_tts_config(language)
    if model or voice:
        config = TTSConfig(
            model=model or config.model,
            endpoint=config.endpoint,
            voice=voice or config.voice,
            response_format=config.response_format,
            http_referer=config.http_referer,
            title=config.title,
        )

    cache_key = (
        f"{config.endpoint}\0{config.model}\0{config.voice}\0"
        f"{config.response_format}\0{language}\0{text}"
    )
    audio_id = hashlib.sha256(cache_key.encode()).hexdigest()
    path = audio_dir() / f"{audio_id}.mp3"
    if not path.exists():
        request = Request(
            config.endpoint,
            data=json.dumps({
                "model": config.model,
                "input": text,
                "voice": config.voice,
                "response_format": config.response_format,
            }).encode(),
            headers={
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                **({"HTTP-Referer": config.http_referer} if config.http_referer else {}),
                **({"X-Title": config.title} if config.title else {}),
            },
            method="POST",
        )
        tls_context = ssl.create_default_context(cafile=certifi.where())
        temp_path: Path | None = None
        try:
            with urlopen(request, timeout=360, context=tls_context) as response:
                audio_bytes = response.read()
            if not audio_bytes:
                raise RuntimeError("TTS provider returned an empty audio file")
            with tempfile.NamedTemporaryFile(
                dir=path.parent,
                prefix=f".{audio_id}.",
                suffix=".tmp",
                delete=False,
            ) as temp:
                temp.write(audio_bytes)
                temp_path = Path(temp.name)
            os.replace(temp_path, path)
            temp_path = None
        finally:
            if temp_path is not None:
                temp_path.unlink(missing_ok=True)
    return audio_id, path
