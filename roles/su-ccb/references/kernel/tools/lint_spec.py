#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CCB spec markdown lint。"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from lint_common import Issue, extract_frontmatter, read_text, repo_root, run_markdown_lint, section_body


REQUIRED_SECTIONS = {
    "target": ["目标", "Goal"],
    "constraints": ["硬约束", "约束", "Constraints"],
    "non_goals": ["不做", "不做的事", "非目标", "Non-goals", "Non Goals"],
    "acceptance": ["验收", "验收标准", "验收（行为层）", "Acceptance"],
}

MEASURABLE_RE = re.compile(
    r"(?:\d|≥|<=|>=|不得|不改|不写|不动|必须|至少|全部|返回|存在|通过|保持|匹配|成功|失败|pass|exit|ALL_GREEN)",
    re.I,
)
PATH_RE = re.compile(r"\b(?:apps|docs|references|su-ccb-[\w.-]+)[/\][^\s`]+")
PATH_LINE_RE = re.compile(r"\b(?:apps|docs|references|su-ccb-[\w.-]+)[/\][^\s`]+:\d+(?:-\d+)?")
COMMAND_RE = re.compile(r"^\s*(?:\$|PS>|pwsh(?:\.exe)?\s|cmd\s+/c\s|rm\s+-rf\s|git\s+reset\s+--hard\b)", re.I | re.M)


def lint_spec(path: Path, root: Path) -> list[Issue]:
    text = read_text(path)
    frontmatter, body = extract_frontmatter(text)
    issues: list[Issue] = []

    def error(rule_id: str, message: str) -> None:
        issues.append(Issue("ERROR", rule_id, message))

    def warn(rule_id: str, message: str) -> None:
        issues.append(Issue("WARNING", rule_id, message))

    missing_ids = [key for key in ("spec_id", "task_id") if not frontmatter.get(key)]
    if missing_ids:
        error("spec_frontmatter_identity", f"frontmatter 缺少标识字段: {', '.join(missing_ids)}")

    section_bodies: dict[str, str | None] = {}
    missing_sections: list[str] = []
    for key, aliases in REQUIRED_SECTIONS.items():
        found = section_body(body, aliases)
        section_bodies[key] = found
        if found is None:
            missing_sections.append("/".join(aliases[:2]))
    if missing_sections:
        error("spec_required_sections", f"缺少必需段: {', '.join(missing_sections)}")

    acceptance = section_bodies.get("acceptance") or ""
    acceptance_lines = [line.strip() for line in acceptance.splitlines() if line.strip()]
    if acceptance_lines and not any(MEASURABLE_RE.search(line) for line in acceptance_lines):
        error("spec_measurable_acceptance", "验收段缺少可度量或二值判定表述")
    elif not acceptance_lines and "acceptance" not in missing_sections:
        error("spec_measurable_acceptance", "验收段不能为空")

    # Spec 是派工契约；代码行号级定位和 diff 属实现细节，应直接失败。
    if PATH_LINE_RE.search(text):
        error("spec_boundary_no_line_ranges", "发现代码/文档路径带行号范围，越过派工契约边界")
    if re.search(r"```diff|^\s*@@\s|^\s*(?:\+\+\+|---)\s+[ab]/", text, re.I | re.M):
        error("spec_boundary_no_large_diff", "发现 diff / patch 片段，spec 不应夹带实现补丁")
    if COMMAND_RE.search(text):
        error("spec_boundary_no_hardcoded_commands", "发现硬编码 shell 命令；除外部契约外应放入实施阶段")

    if PATH_RE.search(text):
        warn("spec_boundary_path_reference_warn", "发现具体路径引用；请确认它是输入/范围契约而非实现指引")

    return issues


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Lint CCB dispatch spec markdown")
    parser.add_argument("paths", nargs="+", type=Path, help="spec 文件或目录")
    parser.add_argument("--root", type=Path, default=None, help="仓库根目录，默认自动推导")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = args.root.resolve() if args.root else repo_root()
    return run_markdown_lint(args.paths, lint_spec, root)


if __name__ == "__main__":
    raise SystemExit(main())
