"""Configuration for the OpenAI-compatible text-to-speech provider."""

from __future__ import annotations

import os
from dataclasses import dataclass

DEFAULT_TTS_MODEL = "hexgrad/kokoro-82m"
DEFAULT_TTS_ENDPOINT = "https://openrouter.ai/api/v1/audio/speech"
DEFAULT_TTS_FORMAT = "mp3"

# Kokoro voices are language-specific. The environment variable override is
# intentionally still the final authority so a model or voice can be swapped
# without changing application code.
DEFAULT_TTS_VOICES: dict[str, dict[str, str]] = {
    "hexgrad/kokoro-82m": {
        "zh": "zf_xiaobei",
        "en": "af_heart",
    },
    "openai/tts-1": {
        "zh": "alloy",
        "en": "alloy",
    },
}


@dataclass(frozen=True)
class TTSConfig:
    model: str
    endpoint: str
    voice: str
    response_format: str = DEFAULT_TTS_FORMAT
    http_referer: str | None = None
    title: str | None = None


def load_tts_config(language: str = "zh") -> TTSConfig:
    """Load TTS settings from environment variables.

    The model, voice, endpoint, and format are all replaceable without a code
    change. Model presets only provide sensible language-aware voice defaults.
    """
    model = (os.getenv("A2LEARN_TTS_MODEL") or DEFAULT_TTS_MODEL).strip()
    configured_endpoint = os.getenv("A2LEARN_TTS_ENDPOINT")
    if configured_endpoint:
        endpoint = configured_endpoint.strip()
    else:
        base_url = os.getenv("OPENAI_BASE_URL")
        if not base_url:
            endpoint = DEFAULT_TTS_ENDPOINT
        else:
            endpoint = base_url.rstrip("/")
            if not endpoint.endswith("/audio/speech"):
                endpoint += "/audio/speech"
    language_key = "en" if language == "en" else "zh"
    preset_voice = DEFAULT_TTS_VOICES.get(model, {}).get(language_key, "alloy")
    language_voice = os.getenv(f"A2LEARN_TTS_VOICE_{language_key.upper()}")
    voice = (language_voice or os.getenv("A2LEARN_TTS_VOICE") or preset_voice).strip()
    response_format = (os.getenv("A2LEARN_TTS_RESPONSE_FORMAT") or DEFAULT_TTS_FORMAT).strip()
    return TTSConfig(
        model=model,
        endpoint=endpoint,
        voice=voice,
        response_format=response_format,
        http_referer=os.getenv("A2LEARN_TTS_HTTP_REFERER") or None,
        title=os.getenv("A2LEARN_TTS_TITLE") or None,
    )
