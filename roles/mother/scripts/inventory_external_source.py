#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
from typing import Any


SCHEMA = "agent-roles/mother-source-inventory/v1"
SKIP_DIRS = {
    ".git",
    ".hg",
    ".svn",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".tox",
    ".venv",
    "__pycache__",
    "build",
    "dist",
    "node_modules",
    "venv",
}
TEXT_SUFFIXES = {
    ".cfg",
    ".css",
    ".ini",
    ".js",
    ".json",
    ".md",
    ".mjs",
    ".py",
    ".sh",
    ".toml",
    ".ts",
    ".txt",
    ".yaml",
    ".yml",
}
PACKAGE_FILES = {
    "package.json",
    "pyproject.toml",
    "setup.py",
    "setup.cfg",
    "requirements.txt",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
}
PLUGIN_FILES = {
    "plugin.json",
    "marketplace.json",
    "manifest.json",
}
LICENSE_NAMES = {
    "license",
    "license.md",
    "license.txt",
    "copying",
    "notice",
    "notice.md",
}
SUSPICIOUS_PATH_RE = re.compile(
    r"(^|/)(\.env|.*secret.*|.*credential.*|.*token.*|.*session.*|.*history.*|.*\.pem|.*\.key|.*pid|.*sock)$",
    re.IGNORECASE,
)
TEXT_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("private_key", re.compile(r"BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY")),
    ("api_key_or_secret", re.compile(r"\b(api[_-]?key|secret|password|passwd|credential)\b", re.IGNORECASE)),
    ("auth_token", re.compile(r"\b(token|Authorization:|Bearer )\b", re.IGNORECASE)),
    ("local_absolute_path", re.compile(r"(/home/[^\s'\"`]+|/Users/[^\s'\"`]+|[A-Za-z]:\\Users\\[^\s'\"`]+)")),
    ("runtime_state_path", re.compile(r"(\.ccb/agents|provider-state|conversation|session|pid|socket)", re.IGNORECASE)),
    ("project_ccb_state", re.compile(r"(docs/\.ccb|\.ccb/)")),
    ("write_api", re.compile(r"(writeFile|fs\.write|open\([^\n)]*['\"]w|rm -rf|shutil\.rmtree)")),
    ("process_spawn", re.compile(r"(child_process|exec\(|spawn\(|subprocess\.|os\.system)")),
    ("installer_command", re.compile(r"(npm install|pip install|git clone|plugin marketplace)", re.IGNORECASE)),
)
REFERENCE_MENTION_RE = re.compile(r"((?:\.\./)+)?(?:references|scripts|lib|templates|assets)/[A-Za-z0-9_./-]+")


def main() -> int:
    parser = argparse.ArgumentParser(description="Inventory external source before Role packaging.")
    parser.add_argument("source", help="Local source tree to inspect.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON output.")
    parser.add_argument(
        "--large-threshold",
        type=int,
        default=512 * 1024,
        help="File size in bytes that should be reported as large.",
    )
    args = parser.parse_args()

    root = Path(args.source).expanduser().resolve()
    if not root.is_dir():
        parser.error(f"source is not a directory: {root}")

    inventory = build_inventory(root, large_threshold=args.large_threshold)
    print(json.dumps(inventory, ensure_ascii=False, indent=2 if args.pretty else None, sort_keys=True))
    return 0


def build_inventory(root: Path, *, large_threshold: int) -> dict[str, Any]:
    files = list(iter_files(root))
    categories: dict[str, list[str]] = {
        "skills": [],
        "references": [],
        "scripts": [],
        "templates_assets": [],
        "hooks": [],
        "plugin_manifests": [],
        "package_metadata": [],
        "tests": [],
        "licenses": [],
        "large_files": [],
        "suspicious_paths": [],
    }
    text_matches: dict[str, list[dict[str, Any]]] = {}
    reference_mentions: dict[str, list[str]] = {}

    for path in files:
        rel = relpath(path, root)
        parts = Path(rel).parts
        lower_parts = tuple(part.lower() for part in parts)
        name = path.name.lower()
        size = path.stat().st_size

        if name == "skill.md":
            categories["skills"].append(str(Path(rel).parent))
        if "references" in lower_parts:
            categories["references"].append(rel)
        if "scripts" in lower_parts or path.suffix.lower() in {".py", ".sh", ".mjs"}:
            categories["scripts"].append(rel)
        if any(part in {"templates", "template", "assets"} for part in lower_parts):
            categories["templates_assets"].append(rel)
        if "hooks" in lower_parts or "hook" in name:
            categories["hooks"].append(rel)
        if name in PLUGIN_FILES and ("plugin" in rel.lower() or name != "manifest.json"):
            categories["plugin_manifests"].append(rel)
        if name in PACKAGE_FILES:
            categories["package_metadata"].append(rel)
        if is_test_file(path, lower_parts):
            categories["tests"].append(rel)
        if name in LICENSE_NAMES:
            categories["licenses"].append(rel)
        if size >= large_threshold:
            categories["large_files"].append(rel)
        if SUSPICIOUS_PATH_RE.search(rel):
            categories["suspicious_paths"].append(rel)

        if is_text_file(path):
            scan_text(path, rel, text_matches, reference_mentions)

    for key in categories:
        categories[key] = sorted(set(categories[key]))
    for key in list(text_matches):
        text_matches[key] = text_matches[key][:100]
    for key in list(reference_mentions):
        reference_mentions[key] = sorted(set(reference_mentions[key]))[:100]

    return {
        "schema": SCHEMA,
        "source_root": str(root),
        "file_count": len(files),
        "categories": categories,
        "text_matches": text_matches,
        "reference_mentions": reference_mentions,
        "summary": {
            "skills": len(categories["skills"]),
            "references": len(categories["references"]),
            "scripts": len(categories["scripts"]),
            "templates_assets": len(categories["templates_assets"]),
            "plugin_manifests": len(categories["plugin_manifests"]),
            "tests": len(categories["tests"]),
            "suspicious_paths": len(categories["suspicious_paths"]),
            "match_kinds": sorted(text_matches),
        },
    }


def iter_files(root: Path) -> list[Path]:
    result: list[Path] = []
    for current, dirnames, filenames in os.walk(root):
        dirnames[:] = [name for name in dirnames if name not in SKIP_DIRS]
        current_path = Path(current)
        for filename in filenames:
            result.append(current_path / filename)
    return sorted(result)


def relpath(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def is_text_file(path: Path) -> bool:
    if path.suffix.lower() in TEXT_SUFFIXES:
        return True
    return path.name.lower() in (PACKAGE_FILES | LICENSE_NAMES | PLUGIN_FILES)


def is_test_file(path: Path, lower_parts: tuple[str, ...]) -> bool:
    name = path.name.lower()
    return (
        "__tests__" in lower_parts
        or "tests" in lower_parts
        or name.startswith("test_")
        or name.endswith(".test.js")
        or name.endswith(".test.mjs")
        or name.endswith(".test.ts")
        or name.endswith("_test.py")
    )


def scan_text(
    path: Path,
    rel: str,
    text_matches: dict[str, list[dict[str, Any]]],
    reference_mentions: dict[str, list[str]],
) -> None:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return
    for label, pattern in TEXT_PATTERNS:
        for match in pattern.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            text_matches.setdefault(label, []).append({"path": rel, "line": line})
            if len(text_matches[label]) >= 100:
                break
    mentions = [match.group(0).rstrip(".,;:)") for match in REFERENCE_MENTION_RE.finditer(text)]
    if mentions:
        reference_mentions.setdefault(rel, []).extend(mentions)


if __name__ == "__main__":
    raise SystemExit(main())
