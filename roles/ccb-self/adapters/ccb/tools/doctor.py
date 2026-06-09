#!/usr/bin/env python3
"""Read-only doctor helper for agentroles.ccb_self.

The helper emits JSON only. It shells out to stable CCB control-plane
diagnostics and does not read credentials, provider auth files, runtime
authority files directly, or tmux state directly.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from typing import Any


COMMANDS: tuple[tuple[str, ...], ...] = (
    ("ping", "ccbd"),
    ("doctor",),
    ("ps",),
    ("queue", "--detail", "all"),
    ("fault", "list"),
    ("config", "validate"),
    ("reload", "--dry-run"),
)


def _ccb_bin() -> str | None:
    configured = os.environ.get("CCB_BIN")
    if configured:
        return configured
    return shutil.which("ccb")


def _run(ccb_bin: str, args: tuple[str, ...]) -> dict[str, Any]:
    cmd = (ccb_bin, *args)
    try:
        completed = subprocess.run(
            cmd,
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=20,
        )
    except subprocess.TimeoutExpired as exc:
        return {
            "command": list(cmd),
            "status": "timeout",
            "returncode": None,
            "stdout": (exc.stdout or "")[-12000:] if isinstance(exc.stdout, str) else "",
            "stderr": (exc.stderr or "")[-12000:] if isinstance(exc.stderr, str) else "",
        }
    except OSError as exc:
        return {
            "command": list(cmd),
            "status": "error",
            "returncode": None,
            "stdout": "",
            "stderr": f"{type(exc).__name__}: {exc}",
        }
    return {
        "command": list(cmd),
        "status": "ok" if completed.returncode == 0 else "failed",
        "returncode": completed.returncode,
        "stdout": completed.stdout[-12000:],
        "stderr": completed.stderr[-12000:],
    }


def main() -> int:
    ccb_bin = _ccb_bin()
    if not ccb_bin:
        payload = {
            "status": "error",
            "summary": "ccb executable not found",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "findings": [
                {
                    "severity": "error",
                    "domain": "tooling",
                    "message": "Set CCB_BIN or ensure ccb is on PATH.",
                }
            ],
            "evidence": [],
            "recommended_actions": ["Install or expose the CCB CLI, then rerun doctor.py."],
        }
        print(json.dumps(payload, indent=2, sort_keys=True))
        return 2

    evidence = [_run(ccb_bin, args) for args in COMMANDS]
    failed = [item for item in evidence if item["status"] != "ok"]
    status = "ok" if not failed else "warn"
    findings = [
        {
            "severity": "warn",
            "domain": "ccb-control-plane",
            "message": "One or more read-only diagnostics failed.",
            "commands": [item["command"] for item in failed],
        }
    ] if failed else []
    payload = {
        "status": status,
        "summary": "read-only CCB self diagnostics completed",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "findings": findings,
        "evidence": evidence,
        "recommended_actions": [
            "Inspect failed command output before choosing a repair.",
            "Use CCB control-plane repair commands only after maintenance gates pass.",
        ] if failed else [],
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0 if status == "ok" else 1


if __name__ == "__main__":
    raise SystemExit(main())
