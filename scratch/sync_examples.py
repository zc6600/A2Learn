import json
from pathlib import Path

# Load site_messages.json generated from build_5steps_messages.py
site_messages_path = Path("apps/viewer/public/generated/site_messages.json")
if site_messages_path.exists():
    hash_table_messages = json.loads(site_messages_path.read_text(encoding="utf-8"))
    
    # Save into examples/Website/hash-table.json
    target_example = Path("packages/a2learn-catalog/examples/Website/hash-table.json")
    target_example.write_text(json.dumps(hash_table_messages, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"SAVED_GOLD_EXAMPLE: {target_example}")

print("COMPLETED_SYNCING_HASH_TABLE_TO_EXAMPLES")
