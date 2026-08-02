"""Convert an Agent-authored course_content.json into A2UI messages.

This is intentionally a local-only command. The caller (for example, a Codex
skill) authors the structured course JSON; this module only parses, validates,
and exports the deterministic A2UI representation.
"""

import argparse
import json
from pathlib import Path
from typing import Any

from .io import export_messages, write_json
from .parser import parse_json_to_a2ui
from .validate import validate_a2ui_messages


def convert_course_content(
    input_path: str | Path,
    output_path: str | Path | None = None,
    sync_viewer: bool = False,
) -> dict[str, str]:
    """Parse and validate course content without making any network/LLM call."""
    source = Path(input_path)
    if not source.is_file():
        raise FileNotFoundError(f"Course content file not found: {source}")

    try:
        data: Any = json.loads(source.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {source}: {exc}") from exc

    if not isinstance(data, dict):
        raise ValueError("course_content.json must contain a JSON object.")

    messages = parse_json_to_a2ui(data)
    validate_a2ui_messages(messages)

    if output_path:
        destination = Path(output_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(
            json.dumps(messages, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        result = {"course_content_path": str(source.resolve()), "messages_path": str(destination.resolve())}
        if sync_viewer:
            export_result = export_messages(messages, output_dir=str(destination.parent))
            viewer_path = Path(export_result["viewer_messages_path"])
            if viewer_path.resolve() != destination.resolve():
                destination.write_text(
                    json.dumps(messages, ensure_ascii=False, indent=2), encoding="utf-8"
                )
            result["viewer_messages_path"] = str(viewer_path.resolve())
        return result

    output_dir = source.parent
    output_file = write_json(output_dir, "site_messages.json", messages)
    result = {"course_content_path": str(source.resolve()), "messages_path": output_file}
    if sync_viewer:
        export_result = export_messages(messages, output_dir=str(output_dir))
        result["viewer_messages_path"] = export_result["viewer_messages_path"]
    return result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert Agent-authored course_content.json to A2UI messages."
    )
    parser.add_argument("--input", "-i", required=True, help="Path to course_content.json")
    parser.add_argument(
        "--output", "-o", help="Output path for site_messages.json (defaults beside input)"
    )
    parser.add_argument(
        "--sync-viewer",
        action="store_true",
        help="Also copy messages to apps/viewer/public/generated/site_messages.json",
    )
    args = parser.parse_args()
    result = convert_course_content(args.input, args.output, args.sync_viewer)
    for key, value in result.items():
        print(f"[A2Learn] {key}: {value}")


if __name__ == "__main__":
    main()
