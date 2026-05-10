import json
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

from .config import MAX_CHARS_PER_FILE, MAX_FILES, MAX_TOTAL_CHARS, READABLE_SUFFIXES


def extract_text_from_path(resource_path: str) -> str:
    path = Path(resource_path)
    if not path.exists():
        raise FileNotFoundError(f"Resource path not found: {resource_path}")

    chunks: list[str] = []
    file_count = 0
    total_chars = 0

    def add_file(file_path: Path) -> bool:
        nonlocal file_count, total_chars
        if file_count >= MAX_FILES or total_chars >= MAX_TOTAL_CHARS:
            return True
        if file_path.suffix.lower() not in READABLE_SUFFIXES:
            return False
        try:
            with file_path.open("r", encoding="utf-8", errors="ignore") as f:
                content = f.read(MAX_CHARS_PER_FILE).strip()
        except Exception:
            return False
        if not content:
            return False
        file_count += 1
        header = f"\n\n# FILE: {file_path}\n"
        remain = max(0, MAX_TOTAL_CHARS - total_chars - len(header))
        if remain <= 0:
            return True
        piece = content[:remain]
        chunks.append(f"{header}{piece}")
        total_chars += len(header) + len(piece)
        return file_count >= MAX_FILES or total_chars >= MAX_TOTAL_CHARS

    if path.is_file():
        add_file(path)
    else:
        for file_path in sorted(path.rglob("*")):
            if file_path.is_file() and add_file(file_path):
                break

    if not chunks:
        raise ValueError("No readable content found in the resource.")
    return "\n".join(chunks)


def create_output_dir(task_id: str | None = None) -> Path:
    if not task_id:
        task_id = datetime.now().strftime("%Y%m%d-%H%M%S")
    output_dir = Path("outputs") / task_id
    output_dir.mkdir(parents=True, exist_ok=True)
    return output_dir


def write_json(output_dir: str | Path, filename: str, payload: Any) -> str:
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)
    path = out / filename
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(path.resolve())


def export_messages(a2ui_messages: list[dict[str, Any]], output_dir: str | None = None) -> dict[str, str]:
    out_dir = Path(output_dir) if output_dir else create_output_dir()
    out_dir.mkdir(parents=True, exist_ok=True)

    messages_path = out_dir / "site_messages.json"
    messages_path.write_text(
        json.dumps(a2ui_messages, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    sync_viewer = os.getenv("A2LEARN_SYNC_VIEWER", "1") != "0"
    viewer_target = os.getenv(
        "A2LEARN_VIEWER_MESSAGES_PATH",
        "apps/viewer/public/generated/site_messages.json",
    )
    viewer_messages_path = Path(viewer_target)
    if sync_viewer:
        viewer_messages_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(messages_path, viewer_messages_path)

    return {
        "output_dir": str(out_dir.resolve()),
        "generated_messages_path": str(
            viewer_messages_path.resolve() if sync_viewer else messages_path.resolve()
        ),
        "output_messages_path": str(messages_path.resolve()),
        "viewer_messages_path": str(viewer_messages_path.resolve()) if sync_viewer else "",
    }
