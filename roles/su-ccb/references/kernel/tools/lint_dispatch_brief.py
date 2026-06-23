#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CCB dispatch / handoff brief lint。"""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from lint_common import Issue, read_text, repo_root, run_markdown_lint, section_body


REQUIRED_SECTIONS = {
    "fact": ["FACT", "Facts", "事实"],
    "interpretation": ["INTERPRETATION", "Interpretation", "理解"],
    "decision": ["DECISION NEEDED", "Decision Needed", "DECISION", "决策"],
    "challenge": ["CHALLENGE REQUEST", "Challenge Request", "挑战请求"],
}

MODE_RE = re.compile(r"^\s*(?:MODE|Mode|模式)\s*[:：]\s*\S+", re.M)
RISK_RE = re.compile(r"^\s*(?:Risk|风险)\s*[:：]\s*\S+", re.I | re.M)
REQ_ID_RE = re.compile(r"\bCCB_REQ_ID\s*[:：]\s*\S+")


def has_large_paste(text: str) -> bool:
    quote_lines = sum(1 for line in text.splitlines() if line.strip().startswith(">"))
    if quote_lines > 20:
        return True

    fence_lines = 0
    in_fence = False
    for line in text.splitlines():
        if line.strip().startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            fence_lines += 1
    return fence_lines > 80


def lint_dispatch_brief(path: Path, root: Path) -> list[Issue]:
    text = read_text(path)
    issues: list[Issue] = []

    def error(rule_id: str, message: str) -> None:
        issues.append(Issue("ERROR", rule_id, message))

    def warn(rule_id: str, message: str) -> None:
        issues.append(Issue("WARNING", rule_id, message))

    missing_sections = []
    for key, aliases in REQUIRED_SECTIONS.items():
        body = section_body(text, aliases)
        if body is None or not body.strip():
            missing_sections.append(key)
    if missing_sections:
        error("dispatch_brief_required_sections", f"缺少 handoff 分区: {', '.join(missing_sections)}")

    if not MODE_RE.search(text):
        error("dispatch_brief_mode_declared", "brief 必须声明 MODE/模式")
    if not RISK_RE.search(text):
        error("dispatch_brief_risk_declared", "brief 必须声明风险等级")
    if has_large_paste(text):
        error("dispatch_brief_no_large_paste", "brief 夹带大段已有文档内容，需改为摘要或路径引用")

    if not REQ_ID_RE.search(text):
        warn("dispatch_brief_req_id_warn", "缺少 CCB_REQ_ID，建议用于跨工具追踪")

    return issues


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Lint CCB dispatch / handoff brief markdown")
    parser.add_argument("paths", nargs="+", type=Path, help="brief 文件或目录")
    parser.add_argument("--root", type=Path, default=None, help="仓库根目录，默认自动推导")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = args.root.resolve() if args.root else repo_root()
    return run_markdown_lint(args.paths, lint_dispatch_brief, root)


if __name__ == "__main__":
    raise SystemExit(main())
