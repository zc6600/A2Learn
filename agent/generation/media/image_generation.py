"""Automatic, cached image generation for A2UI social-narrative components."""

from __future__ import annotations

import base64
import hashlib
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any, ClassVar

import requests

OPENROUTER_IMAGE_URL = "https://openrouter.ai/api/v1/images"
DEFAULT_IMAGE_MODEL = "bytedance-seed/seedream-4.5"
MAX_IMAGE_PROMPT_CHARS = 1_000
DEFAULT_IMAGE_TIMEOUT_SECONDS = 90
MAX_IMAGE_TIMEOUT_SECONDS = 120


def _literal_string(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()[:MAX_IMAGE_PROMPT_CHARS]
    if isinstance(value, dict) and isinstance(value.get("literalString"), str):
        return value["literalString"].strip()[:MAX_IMAGE_PROMPT_CHARS]
    return ""


@dataclass(frozen=True)
class GeneratedImageStore:
    directory: Path
    model: str = DEFAULT_IMAGE_MODEL
    _locks: ClassVar[dict[str, Lock]] = {}
    _locks_guard: ClassVar[Lock] = Lock()

    @classmethod
    def from_env(cls) -> "GeneratedImageStore":
        return cls(
            Path(os.getenv("A2LEARN_IMAGE_STORE_DIR", "./outputs/a2learn_images")).expanduser(),
            os.getenv("A2LEARN_IMAGE_MODEL", DEFAULT_IMAGE_MODEL),
        )

    def image_id(self, prompt: str) -> str:
        material = f"{self.model}\0{prompt}".encode("utf-8")
        return hashlib.sha256(material).hexdigest()

    def path_for(self, image_id: str) -> Path:
        return self.directory / f"{image_id}.png"

    def url_for(self, image_id: str) -> str:
        return f"/api/generated-images/{image_id}.png"

    @classmethod
    def _lock_for(cls, image_id: str) -> Lock:
        with cls._locks_guard:
            return cls._locks.setdefault(image_id, Lock())

    @staticmethod
    def _timeout_seconds() -> float:
        try:
            configured = float(os.getenv("A2LEARN_IMAGE_TIMEOUT_SECONDS", str(DEFAULT_IMAGE_TIMEOUT_SECONDS)))
        except ValueError:
            configured = DEFAULT_IMAGE_TIMEOUT_SECONDS
        return max(1, min(MAX_IMAGE_TIMEOUT_SECONDS, configured))

    def generate(self, prompt: str, api_key: str | None) -> str | None:
        """Return a cached/generated API URL, or None without raising."""
        if not prompt or not api_key:
            return None
        image_id = self.image_id(prompt)
        destination = self.path_for(image_id)
        if destination.is_file() and destination.stat().st_size > 0:
            return self.url_for(image_id)

        with self._lock_for(image_id):
            if destination.is_file() and destination.stat().st_size > 0:
                return self.url_for(image_id)
            try:
                response = requests.post(
                    OPENROUTER_IMAGE_URL,
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": self.model, "prompt": prompt},
                    timeout=self._timeout_seconds(),
                )
                response.raise_for_status()
                payload = response.json()
                encoded = payload["data"][0]["b64_json"]
                image_bytes = base64.b64decode(encoded, validate=True)
                if not image_bytes:
                    return None
                destination.parent.mkdir(parents=True, exist_ok=True)
                temporary = destination.with_suffix(".tmp")
                temporary.write_bytes(image_bytes)
                temporary.replace(destination)
                return self.url_for(image_id)
            except (KeyError, IndexError, TypeError, ValueError, requests.RequestException, OSError):
                return None


def _image_targets(messages: list[dict[str, Any]]) -> list[tuple[dict[str, Any], str]]:
    """Find social component records that requested an image but have no URL."""
    targets: list[tuple[dict[str, Any], str]] = []
    for message in messages:
        components = message.get("updateComponents", {}).get("components", []) if isinstance(message, dict) else []
        if not isinstance(components, list):
            continue
        for component in components:
            if not isinstance(component, dict):
                continue
            if component.get("component") == "ScenarioDialogue":
                for item in component.get("messages", []):
                    if isinstance(item, dict) and not item.get("imageUrl"):
                        prompt = _literal_string(item.get("imagePrompt"))
                        if prompt:
                            targets.append((item, prompt))
            if component.get("component") == "SocialMoments":
                for post in component.get("posts", []):
                    if isinstance(post, dict) and not post.get("imageUrls"):
                        prompt = _literal_string(post.get("imagePrompt"))
                        if prompt:
                            targets.append((post, prompt))
    return targets


def enrich_a2ui_messages_with_images(
    messages: list[dict[str, Any]],
    *,
    image_limit: int,
    api_key: str | None,
    store: GeneratedImageStore | None = None,
) -> list[dict[str, Any]]:
    """Generate up to image_limit images and write their A2UI URLs in place."""
    if image_limit <= 0 or not api_key:
        return messages
    selected: dict[str, list[dict[str, Any]]] = {}
    for target, prompt in _image_targets(messages):
        if prompt not in selected and len(selected) >= image_limit:
            continue
        selected.setdefault(prompt, []).append(target)
    if not selected:
        return messages

    image_store = store or GeneratedImageStore.from_env()
    worker_count = min(4, len(selected))
    with ThreadPoolExecutor(max_workers=worker_count) as executor:
        futures = {executor.submit(image_store.generate, prompt, api_key): prompt for prompt in selected}
        for future in as_completed(futures):
            prompt = futures[future]
            try:
                image_url = future.result()
            except Exception:
                image_url = None
            if not image_url:
                continue
            for target in selected[prompt]:
                if "characterId" in target:
                    target["imageUrl"] = {"literalString": image_url}
                else:
                    target["imageUrls"] = [{"literalString": image_url}]
    return messages
