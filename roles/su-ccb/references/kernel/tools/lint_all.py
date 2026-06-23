#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CCB lint 聚合入口。"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def run_step(name: str, command: list[str], root: Path) -> bool:
    print(f"== {name} ==")
    result = subprocess.run(command, cwd=root, text=True, capture_output=True)
    if result.stdout:
        print(result.stdout.rstrip())
    if result.stderr:
        print(result.stderr.rstrip())
    ok = result.returncode == 0
    print(f"{name}: {'PASS' if ok else 'FAIL'}")
    print()
    return ok


def main() -> int:
    root = repo_root()
    tool_dir = Path(__file__).resolve().parent
    examples = tool_dir / "examples"
    py = sys.executable
    steps = [
        ("manifest", [py, str(tool_dir / "lint_manifest.py")]),
        ("consult_brief", [py, str(tool_dir / "lint_manifest.py"), "--consult-brief", str(examples / "consult_brief_pass.md")]),
        ("spec", [py, str(tool_dir / "lint_spec.py"), str(examples / "spec_lint_pass.md")]),
        ("dispatch_brief", [py, str(tool_dir / "lint_dispatch_brief.py"), str(examples / "dispatch_brief_pass.md")]),
    ]

    results = [run_step(name, command, root) for name, command in steps]
    print("SUMMARY")
    print(f"CHECKS: {len(results)}")
    print(f"PASSED: {sum(1 for item in results if item)}")
    print(f"FAILED: {sum(1 for item in results if not item)}")
    print(f"ALL_GREEN: {'yes' if all(results) else 'no'}")
    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
