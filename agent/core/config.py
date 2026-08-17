"""Configuration constants for A2Learn agent."""

import os

READABLE_SUFFIXES = {".md", ".txt", ".json", ".yaml", ".yml", ".csv", ".html"}
MAX_TOTAL_CHARS = 12000
MAX_FILES = 30
MAX_CHARS_PER_FILE = 2000

DEFAULT_CATALOG_ID = "https://a2learn.ai/spec/v1/catalog.json"
DEFAULT_MODEL = "deepseek/deepseek-v4-flash"


def default_generation_model() -> str:
    return os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL)


def allowed_generation_models() -> tuple[str, ...]:
    """Return models which the public generation API may select per session.

    The server default is always allowed. Deployments can add a comma-separated
    list with ``A2LEARN_ALLOWED_GENERATION_MODELS`` for controlled benchmarks.
    """
    configured = os.getenv("A2LEARN_ALLOWED_GENERATION_MODELS", "")
    models = [default_generation_model()]
    models.extend(model.strip() for model in configured.split(",") if model.strip())
    return tuple(dict.fromkeys(models))
