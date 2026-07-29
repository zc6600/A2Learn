import json
from pathlib import Path

def fix_file(filepath: Path):
    text = filepath.read_text(encoding="utf-8")
    # Fix raw regex backslashes in JSON strings
    text = text.replace(r'Action:\s*(\w+)\[(.*?)\]', r'Action:\\s*(\\w+)\\[(.*?)\\]')
    # Validate JSON
    data = json.loads(text)
    filepath.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"VALIDATED_JSON: {filepath}")

fix_file(Path("packages/a2learn-catalog/examples/Website/agent-react.json"))
fix_file(Path("skill/references/examples/agent-react.json"))
