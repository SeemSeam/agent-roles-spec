#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CCB markdown artifact lint 公共工具。"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Iterable

try:
    import yaml
except ImportError as exc:  # pragma: no cover - 运行环境缺依赖时给出明确错误
    raise SystemExit("ERROR: 需要 PyYAML：pip install pyyaml") from exc


@dataclass
class Issue:
    severity: str
    rule_id: str
    message: str


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def extract_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    if not text.startswith("---"):
        return {}, text
    match = re.match(r"\A---\s*\n(?P<yaml>.*?)(?:\n---\s*\n|\n---\s*\Z)(?P<body>.*)\Z", text, re.S)
    if not match:
        return {}, text
    data = yaml.safe_load(match.group("yaml")) or {}
    if not isinstance(data, dict):
        return {}, match.group("body")
    return data, match.group("body")


def markdown_files(paths: Iterable[Path]) -> list[Path]:
    files: list[Path] = []
    for raw_path in paths:
        path = raw_path.resolve()
        if path.is_dir():
            files.extend(sorted(p for p in path.rglob("*.md") if p.is_file()))
        elif path.is_file():
            files.append(path)
    return files


def relative_to_root(path: Path, root: Path | None = None) -> str:
    base = root or repo_root()
    try:
        return path.resolve().relative_to(base.resolve()).as_posix()
    except ValueError:
        return str(path)


def print_file_result(root: Path, path: Path, issues: list[Issue]) -> None:
    errors = [issue for issue in issues if issue.severity == "ERROR"]
    warnings = [issue for issue in issues if issue.severity == "WARNING"]
    print(f"FILE: {relative_to_root(path, root)}")
    print(f"STATUS: {'PASS' if not errors else 'FAIL'}")
    print(f"ERRORS: {len(errors)}")
    print(f"WARNINGS: {len(warnings)}")
    for issue in issues:
        print(f"  [{issue.severity}] {issue.rule_id}: {issue.message}")
    print()


def run_markdown_lint(paths: list[Path], lint_one: Callable[[Path, Path], list[Issue]], root: Path) -> int:
    files = markdown_files(paths)
    total_errors = 0
    total_warnings = 0
    passed = 0

    for path in files:
        issues = lint_one(path, root)
        errors = sum(1 for issue in issues if issue.severity == "ERROR")
        warnings = sum(1 for issue in issues if issue.severity == "WARNING")
        total_errors += errors
        total_warnings += warnings
        if errors == 0:
            passed += 1
        print_file_result(root, path, issues)

    failed = len(files) - passed
    print("SUMMARY")
    print(f"FILES: {len(files)}")
    print(f"PASSED: {passed}")
    print(f"FAILED: {failed}")
    print(f"ERRORS: {total_errors} WARNINGS: {total_warnings}")
    print(f"ALL_GREEN: {'yes' if failed == 0 and total_errors == 0 else 'no'}")
    return 0 if failed == 0 and total_errors == 0 else 1


def section_body(text: str, aliases: list[str]) -> str | None:
    joined = "|".join(re.escape(name) for name in aliases)
    heading = re.compile(rf"^\s*(?P<marks>#{{1,6}})\s*(?:{joined})(?:\s*[（(].*?[）)]|\s*[:：].*)?\s*$", re.I)
    any_heading = re.compile(r"^\s*(?P<marks>#{1,6})\s+\S+")
    lines = text.splitlines()
    start: int | None = None
    parent_level: int | None = None

    for index, line in enumerate(lines):
        match = heading.match(line.strip())
        if match:
            start = index + 1
            parent_level = len(match.group("marks"))
            break
    if start is None:
        return None

    end = len(lines)
    in_fence = False
    for index in range(start, len(lines)):
        line = lines[index]
        if line.strip().startswith("```"):
            in_fence = not in_fence
            continue
        match = any_heading.match(line)
        # 子节归属于父节；只有同级或更高层级标题才结束当前 section。
        if not in_fence and match and parent_level is not None and len(match.group("marks")) <= parent_level:
            end = index
            break
    return "\n".join(lines[start:end]).strip()
