"""Media generation subpackage for audio narration and image generation."""

from .image_generation import GeneratedImageStore, enrich_a2ui_messages_with_images
from .narration import audio_dir, build_page_narration, rewrite_page_narration, synthesize
from .tts_config import TTSConfig, load_tts_config

__all__ = [
    "GeneratedImageStore",
    "enrich_a2ui_messages_with_images",
    "audio_dir",
    "build_page_narration",
    "rewrite_page_narration",
    "synthesize",
    "TTSConfig",
    "load_tts_config",
]
