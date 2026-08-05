"""Page narration extraction and optional OpenRouter / OpenAI TTS generation."""

from __future__ import annotations

import hashlib
import json
import os
import ssl
import tempfile
from pathlib import Path
from typing import Any, Mapping
from urllib.request import Request, urlopen

import certifi


def _texts(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value.strip()] if value.strip() else []
    if isinstance(value, Mapping):
        result: list[str] = []
        for key, child in value.items():
            if key.lower() in {"id", "url", "image", "icon", "style", "theme"}:
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
    language_name = "Chinese" if language == "zh" else "English"
    prompt = (
        "Rewrite the following A2Learn page into a complete spoken teaching script. "
        f"Write in {language_name}. Preserve every important fact, formula, example, "
        "question, and conclusion, but do not read UI labels, component IDs, URLs, "
        "or styling instructions aloud. Add natural transitions and brief explanations "
        "so a learner can follow the page without reading it. Do not invent facts. "
        "Return only the script, with no Markdown heading and no meta commentary.\n\n"
        "PAGE JSON:\n" + json.dumps(document, ensure_ascii=False)
    )
    response = llm.invoke([
        {"role": "system", "content": "You are an expert educational script writer."},
        {"role": "user", "content": prompt},
    ])
    content = getattr(response, "content", "")
    script = "".join(str(item) for item in content) if isinstance(content, list) else str(content)
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
    model = model or os.getenv("A2LEARN_TTS_MODEL", "openai/tts-1")
    default_voice = "alloy"
    voice = voice or os.getenv("A2LEARN_TTS_VOICE", default_voice)
    endpoint = os.getenv(
        "A2LEARN_TTS_ENDPOINT",
        os.getenv("OPENAI_BASE_URL", "https://openrouter.ai/api/v1").rstrip("/") + "/audio/speech",
    )

    audio_id = hashlib.sha256(f"{model}\0{voice}\0{text}".encode()).hexdigest()
    path = audio_dir() / f"{audio_id}.mp3"
    if not path.exists():
        request = Request(
            endpoint,
            data=json.dumps({"model": model, "input": text, "voice": voice, "response_format": "mp3"}).encode(),
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            method="POST",
        )
        tls_context = ssl.create_default_context(cafile=certifi.where())
        with urlopen(request, timeout=360, context=tls_context) as response:  # noqa: S310
            with tempfile.NamedTemporaryFile(dir=path.parent, prefix=f".{audio_id}.", suffix=".tmp", delete=False) as temp:
                temp.write(response.read())
                temp_path = Path(temp.name)
            os.replace(temp_path, path)
    return audio_id, path
