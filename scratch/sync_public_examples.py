import json
from pathlib import Path

src_dir = Path("packages/a2learn-catalog/examples/Website")
dest_dir = Path("apps/viewer/public/examples")
dest_dir.mkdir(parents=True, exist_ok=True)

for json_file in src_dir.glob("*.json"):
    data = json_file.read_text(encoding="utf-8")
    (dest_dir / json_file.name).write_text(data, encoding="utf-8")
    print(f"COPIED_TO_PUBLIC: {dest_dir / json_file.name}")

print("PUBLIC_EXAMPLES_SYNC_COMPLETE")
