#!/usr/bin/env python3
"""A2Learn Competition Submission Packager.

Packages the project into a clean zip archive for competition submission,
automatically removing sensitive secrets, temporary caches, virtual environments,
runtime databases, and deployment credentials.
"""

from __future__ import annotations

import argparse
import fnmatch
import os
from pathlib import Path
import re
import sys
import zipfile

# Root directory of the repository
REPO_ROOT = Path(__file__).resolve().parent.parent

# Exact folder/file names to exclude anywhere
GLOBAL_EXCLUDE_NAMES = {
    # Version control & IDEs
    ".git",
    ".github",
    ".idea",
    ".vscode",
    ".gemini",
    ".wrangler",
    ".kamal",
    # Environments & dependencies
    ".venv",
    "venv",
    "env",
    "node_modules",
    # Build outputs & caches
    "dist",
    ".vite",
    "build",
    "__pycache__",
    ".pytest_cache",
    ".ruff_cache",
    ".mypy_cache",
    "htmlcov",
    # Runtime storage & temp folders
    ".a2learn",
    "outputs",
    # System artifacts
    ".DS_Store",
    "Thumbs.db",
}

# File patterns to exclude anywhere
GLOBAL_EXCLUDE_PATTERNS = [
    ".env",
    ".env.*",
    "*.pyc",
    "*.pyo",
    "*.pyd",
    "*.sqlite3",
    "*.sqlite3-*",
    "*.pem",
    "*.key",
    "*.id_rsa",
    "id_ed25519*",
    "*.pfx",
    "*.p12",
    "*.log",
    "*.bak",
    "*.swp",
    "*.swo",
]

# Patterns that should NOT be excluded even if matching above
ALWAYS_INCLUDE_PATTERNS = [
    ".env.example",
    ".gitignore",
    ".dockerignore",
]

# Suspicious token regexes for sanity scanning
SECRET_PATTERNS = [
    (r"sk-[a-zA-Z0-9_-]{24,}", "OpenAI / OpenRouter API Key"),
    (r"ghp_[a-zA-Z0-9]{36}", "GitHub Personal Access Token"),
    (r"-----BEGIN (RSA|OPENSSH|EC|DSA|PRIVATE) KEY-----", "Private SSH/TLS Key"),
    (r"(?i)password\s*=\s*['\"][^'\"]{8,}['\"]", "Hardcoded Password Assignment"),
]


def is_always_included(path_rel: str) -> bool:
    name = Path(path_rel).name
    return any(fnmatch.fnmatch(name, pat) for pat in ALWAYS_INCLUDE_PATTERNS)


def should_exclude(
    rel_path: Path,
    include_third_party: bool = False,
    include_scratch: bool = False,
    include_draft: bool = False,
    output_zip_name: str = "",
) -> tuple[bool, str]:
    """Determine if a relative path should be excluded, returning (should_exclude, reason)."""
    parts = rel_path.parts
    path_str = str(rel_path)

    # Don't pack the output zip itself
    if rel_path.name == output_zip_name:
        return True, "Target output zip file"

    # Always include whitelist (like .env.example)
    if is_always_included(path_str):
        return False, ""

    # Check directory / filename exact matches
    for part in parts:
        if part in GLOBAL_EXCLUDE_NAMES:
            return True, f"Matches excluded name '{part}'"

    # Check pattern matches
    for pat in GLOBAL_EXCLUDE_PATTERNS:
        if fnmatch.fnmatch(rel_path.name, pat):
            return True, f"Matches pattern '{pat}'"

    # Check third_party
    if not include_third_party and parts[0] == "third_party":
        return True, "third_party excluded (setup.sh will fetch A2UI automatically)"

    # Check scratch
    if not include_scratch and parts[0] == "scratch":
        return True, "scratch/ temporary folder excluded"

    # Check draft
    if not include_draft and parts[0] == "draft":
        return True, "draft/ notebook folder excluded"

    # Check data runtime files
    if parts[0] == "data":
        if len(parts) > 1 and parts[1] == "knowledge-files":
            return True, "data/knowledge-files/ runtime uploads excluded"

    return False, ""


def scan_file_for_secrets(file_path: Path) -> list[tuple[int, str, str]]:
    """Scan a text file for potential leaked secrets. Return list of (line_no, pattern_name, match_text)."""
    findings = []
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            for line_no, line in enumerate(f, 1):
                # Skip comments or template files
                if file_path.name == ".env.example":
                    continue
                for pattern, name in SECRET_PATTERNS:
                    m = re.search(pattern, line)
                    if m:
                        # Ignore false positives like placeholder strings in UI components
                        matched = m.group(0)
                        if "xxxxxxxx" in matched or "[redacted" in matched:
                            continue
                        findings.append((line_no, name, matched[:8] + "..." + matched[-4:]))
    except Exception:
        pass
    return findings


def categorize_file(rel_path: Path) -> str:
    """Categorize file for summary report."""
    suffix = rel_path.suffix.lower()
    if suffix in [".py", ".pyi"]:
        return "Python Code"
    elif suffix in [".ts", ".js", ".tsx", ".jsx", ".mjs"]:
        return "Frontend (TS/JS)"
    elif suffix in [".json", ".jsonc"]:
        return "JSON / Schemas"
    elif suffix in [".md", ".txt"]:
        return "Documentation"
    elif suffix in [".html", ".css", ".svg", ".png", ".jpg", ".webp"]:
        return "UI & Assets"
    elif suffix in [".sh", ".bash", ".toml", ".yml", ".yaml", ".ini"]:
        return "Configs & Scripts"
    else:
        return "Other"


def package_project(
    output_path: Path,
    include_third_party: bool = False,
    include_scratch: bool = False,
    include_draft: bool = False,
    dry_run: bool = False,
    strict: bool = False,
) -> int:
    """Main packaging routine."""
    print("=" * 60)
    print(" 📦 A2Learn Competition Submission Packager")
    print("=" * 60)
    print(f"📁 Source Root:   {REPO_ROOT}")
    print(f"🎯 Output Target: {output_path}")
    print(f"⚙️  Third Party:   {'Included' if include_third_party else 'Excluded (downloaded via setup.sh)'}")
    print(f"⚙️  Scratch / Draft: {'Included' if (include_scratch or include_draft) else 'Excluded'}")
    print("-" * 60)

    files_to_pack: list[tuple[Path, Path]] = []
    excluded_count = 0
    total_uncompressed_bytes = 0
    secret_warnings: list[tuple[str, int, str, str]] = []

    # Collect files
    for root, dirs, files in os.walk(REPO_ROOT):
        root_path = Path(root)
        rel_dir = root_path.relative_to(REPO_ROOT)

        # Filter dirs in-place for efficiency
        dirs[:] = [
            d for d in dirs
            if not should_exclude(
                rel_dir / d,
                include_third_party=include_third_party,
                include_scratch=include_scratch,
                include_draft=include_draft,
                output_zip_name=output_path.name,
            )[0]
        ]

        for file_name in files:
            file_path = root_path / file_name
            rel_file = file_path.relative_to(REPO_ROOT)

            exclude, reason = should_exclude(
                rel_file,
                include_third_party=include_third_party,
                include_scratch=include_scratch,
                include_draft=include_draft,
                output_zip_name=output_path.name,
            )

            if exclude:
                excluded_count += 1
                continue

            # Secret check
            findings = scan_file_for_secrets(file_path)
            for line_no, pattern_name, match_snippet in findings:
                secret_warnings.append((str(rel_file), line_no, pattern_name, match_snippet))

            size = file_path.stat().st_size
            total_uncompressed_bytes += size
            files_to_pack.append((file_path, rel_file))

    # Handle secret scan results
    if secret_warnings:
        print("\n⚠️  [SECURITY WARNING] Potential secrets detected in files to be packed:")
        for file_str, line_no, pat_name, snippet in secret_warnings:
            print(f"   - {file_str}:{line_no} -> {pat_name} ({snippet})")
        if strict:
            print("\n❌ Packaging aborted due to --strict flag. Please remove secrets before packaging.")
            return 1
        print("   Proceeding with caution... (Please double check above matches)\n")
    else:
        print("🛡️  Privacy & Secret Scan: PASSED (No API keys or sensitive secrets detected)")

    # Breakdown by category
    categories: dict[str, int] = {}
    for _, rel in files_to_pack:
        cat = categorize_file(rel)
        categories[cat] = categories.get(cat, 0) + 1

    print("\n📊 File Composition:")
    for cat, count in sorted(categories.items(), key=lambda x: -x[1]):
        print(f"   • {cat:<20}: {count:>4} files")

    print(f"\n📦 Summary:")
    print(f"   • Total Files to Package: {len(files_to_pack)}")
    print(f"   • Total Excluded Files:  {excluded_count}")
    print(f"   • Total Raw Size:        {total_uncompressed_bytes / (1024 * 1024):.2f} MB")

    if dry_run:
        print("\n🔍 Dry-run complete. No zip archive was created.")
        return 0

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Write Zip Archive
    print(f"\n🚀 Creating zip archive: {output_path} ...")
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for abs_file, rel_file in files_to_pack:
            # Package with clean normalized relative path
            zipf.write(abs_file, arcname=str(rel_file))

    # Verify Zip integrity
    with zipfile.ZipFile(output_path, "r") as zipf:
        bad_file = zipf.testzip()
        if bad_file:
            print(f"❌ Zip verification failed on: {bad_file}")
            return 1

    zip_size = output_path.stat().st_size
    ratio = (1 - (zip_size / total_uncompressed_bytes)) * 100 if total_uncompressed_bytes else 0

    print(f"✅ Zip Created Successfully!")
    print(f"   • Archive Path: {output_path.resolve()}")
    print(f"   • Zip File Size: {zip_size / (1024 * 1024):.2f} MB (Compression: {ratio:.1f}%)")
    print(f"   • Integrity Check: PASSED")
    print("=" * 60)
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="Package A2Learn repository into a clean zip archive for competition submission."
    )
    parser.add_argument(
        "-o", "--output",
        type=str,
        default="A2Learn-submission.zip",
        help="Output zip file path (default: A2Learn-submission.zip in repo root)",
    )
    parser.add_argument(
        "--include-third-party",
        action="store_true",
        help="Include third_party/ directory (default: excluded, setup.sh downloads A2UI)",
    )
    parser.add_argument(
        "--include-scratch",
        action="store_true",
        help="Include scratch/ development scripts",
    )
    parser.add_argument(
        "--include-draft",
        action="store_true",
        help="Include draft/ experiment notebooks",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scan and report without creating the zip file",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Fail if any suspicious secret pattern is detected",
    )

    args = parser.parse_args()
    output_path = Path(args.output)
    if not output_path.is_absolute():
        output_path = REPO_ROOT / output_path

    code = package_project(
        output_path=output_path,
        include_third_party=args.include_third_party,
        include_scratch=args.include_scratch,
        include_draft=args.include_draft,
        dry_run=args.dry_run,
        strict=args.strict,
    )
    sys.exit(code)


if __name__ == "__main__":
    main()
