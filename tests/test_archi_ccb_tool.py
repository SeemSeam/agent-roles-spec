from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import subprocess
import sys

import pytest

from agent_roles.cli import run


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_TOOL = REPO_ROOT / "roles" / "archi" / "adapters" / "ccb" / "tools" / "architec_tool.py"
REFERENCE_TOOL = (
    REPO_ROOT / "reference_roles" / "archi" / "adapters" / "ccb" / "tools" / "architec_tool.py"
)
ROLE_TOML = REPO_ROOT / "roles" / "archi" / "role.toml"
REFERENCE_ROLE_TOML = REPO_ROOT / "reference_roles" / "archi" / "role.toml"


def _load_tool():
    spec = importlib.util.spec_from_file_location("architec_tool_under_test", ROLE_TOOL)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _completed(args: list[str], returncode: int, stdout: str = "", stderr: str = ""):
    return subprocess.CompletedProcess(args, returncode, stdout, stderr)


def _make_paths(tmp_path: Path, *, executable_python: bool = True) -> dict[str, Path]:
    root = tmp_path / "architec"
    venv = root / "venv"
    venv_bin = venv / ("Scripts" if sys.platform == "win32" else "bin")
    venv_python = venv_bin / ("python.exe" if sys.platform == "win32" else "python")
    if executable_python:
        _make_executable(venv_python)
    return {
        "root": root,
        "bin_dir": root / "bin",
        "venv": venv,
        "venv_python": venv_python,
        "archi_binary": venv_bin / ("archi.exe" if sys.platform == "win32" else "archi"),
        "wrapper": root / "bin" / ("ccb-archi.cmd" if sys.platform == "win32" else "ccb-archi"),
        "bin_link": tmp_path / "user-bin" / ("ccb-archi.cmd" if sys.platform == "win32" else "ccb-archi"),
        "manifest": root / "manifest.json",
    }


def _make_executable(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
    if sys.platform != "win32":
        path.chmod(0o755)


def _run_json(argv: list[str], tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("AGENT_ROLES_STORE", str(tmp_path / "store"))
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(REPO_ROOT))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    code = run(argv + ["--json"], stdout=sys.stdout, stderr=sys.stderr)
    captured = capsys.readouterr()
    assert code == 0, captured.err
    return json.loads(captured.out)


def test_archi_role_and_reference_role_stay_in_sync() -> None:
    assert ROLE_TOOL.read_text(encoding="utf-8") == REFERENCE_TOOL.read_text(encoding="utf-8")
    assert ROLE_TOML.read_text(encoding="utf-8") == REFERENCE_ROLE_TOML.read_text(encoding="utf-8")


def test_ensure_venv_restores_missing_pip_with_ensurepip(tmp_path: Path, monkeypatch) -> None:
    tool = _load_tool()
    paths = _make_paths(tmp_path)
    calls: list[list[str]] = []
    pip_checks = 0

    def fake_run(args: list[str], *, timeout_s: float):
        nonlocal pip_checks
        calls.append(args)
        if args == [str(paths["venv_python"]), "-m", "pip", "--version"]:
            pip_checks += 1
            return _completed(args, 0 if pip_checks == 2 else 1, stderr="No module named pip")
        if args == [str(paths["venv_python"]), "-m", "ensurepip", "--upgrade"]:
            return _completed(args, 0)
        if "--clear" in args:
            pytest.fail("venv --clear should not run when ensurepip repairs pip")
        return _completed(args, 1, stderr="unexpected command")

    monkeypatch.setattr(tool, "_run", fake_run)

    tool._ensure_venv(paths)

    assert [str(paths["venv_python"]), "-m", "ensurepip", "--upgrade"] in calls
    assert not any("--clear" in call for call in calls)


def test_ensure_venv_rebuilds_when_ensurepip_does_not_restore_pip(tmp_path: Path, monkeypatch) -> None:
    tool = _load_tool()
    paths = _make_paths(tmp_path)
    calls: list[list[str]] = []
    pip_checks = 0

    def fake_run(args: list[str], *, timeout_s: float):
        nonlocal pip_checks
        calls.append(args)
        if args == [str(paths["venv_python"]), "-m", "pip", "--version"]:
            pip_checks += 1
            return _completed(args, 0 if pip_checks == 3 else 1, stderr="No module named pip")
        if args == [str(paths["venv_python"]), "-m", "ensurepip", "--upgrade"]:
            return _completed(args, 1, stderr="ensurepip failed")
        if args[:3] == [sys.executable, "-m", "venv"] and "--clear" in args:
            return _completed(args, 0)
        return _completed(args, 1, stderr="unexpected command")

    monkeypatch.setattr(tool, "_run", fake_run)

    tool._ensure_venv(paths)

    assert any(call[:3] == [sys.executable, "-m", "venv"] and "--clear" in call for call in calls)


def test_ensure_venv_reports_pip_unavailable_after_repair_attempts(tmp_path: Path, monkeypatch) -> None:
    tool = _load_tool()
    paths = _make_paths(tmp_path)

    def fake_run(args: list[str], *, timeout_s: float):
        if args == [str(paths["venv_python"]), "-m", "pip", "--version"]:
            return _completed(args, 1, stderr="No module named pip")
        if args == [str(paths["venv_python"]), "-m", "ensurepip", "--upgrade"]:
            return _completed(args, 1, stderr="ensurepip failed")
        if args[:3] == [sys.executable, "-m", "venv"] and "--clear" in args:
            return _completed(args, 0)
        return _completed(args, 1, stderr="unexpected command")

    monkeypatch.setattr(tool, "_run", fake_run)

    with pytest.raises(RuntimeError, match="pip unavailable"):
        tool._ensure_venv(paths)


def test_install_reports_managed_venv_not_installable(tmp_path: Path, monkeypatch, capsys) -> None:
    tool = _load_tool()
    paths = _make_paths(tmp_path)

    monkeypatch.setattr(tool, "_paths", lambda: paths)
    monkeypatch.setattr(
        tool,
        "_ensure_venv",
        lambda _: (_ for _ in ()).throw(
            RuntimeError("pip unavailable in managed Architec venv after ensurepip/rebuild")
        ),
    )

    assert tool.install_or_update("install") == 1
    output = capsys.readouterr().out
    assert "reason: managed venv is not installable" in output
    assert "pip unavailable in managed Architec venv after ensurepip/rebuild" in output
    assert "reason: pip install failed" not in output


def test_doctor_reports_llmgateway_missing_as_degraded_without_secret(tmp_path: Path, monkeypatch, capsys) -> None:
    tool = _load_tool()
    paths = _make_paths(tmp_path)
    _make_executable(paths["wrapper"])
    _make_executable(paths["archi_binary"])
    monkeypatch.setenv("LLMGATEWAY_CONFIG", "secret-token-should-not-print")
    monkeypatch.setattr(tool, "_paths", lambda: paths)
    monkeypatch.setattr(tool.shutil, "which", lambda _: None)
    monkeypatch.setattr(tool, "_llmgateway_config", lambda: None)
    monkeypatch.setattr(tool, "_run", lambda args, timeout_s: _completed(args, 0, stdout="usage: archi\n"))

    assert tool.doctor() == 0
    output = capsys.readouterr().out
    assert "architec_status: degraded" in output
    assert "reason: llmgateway config is missing; Architec LLM analysis is not ready" in output
    assert "llm_readiness: degraded" in output
    assert "LLMGATEWAY_CONFIG" in output
    assert "LLM_GATEWAY_CONFIG" in output
    assert "~/.llmgateway/config.yaml" in output
    assert "~/.llmgateway/config.toml" in output
    assert "~/.config/llmgateway/config.yaml" in output
    assert "~/.config/llmgateway/config.toml" in output
    assert "secret-token-should-not-print" not in output


def test_agent_roles_archi_install_update_doctor_store_current(tmp_path: Path, monkeypatch, capsys) -> None:
    install = _run_json(["install", "agentroles.archi"], tmp_path, monkeypatch, capsys)
    assert install["role_id"] == "agentroles.archi"
    assert install["version"] == "0.2.1"

    update = _run_json(["update", "agentroles.archi"], tmp_path, monkeypatch, capsys)
    installed_path = Path(update["path"])
    expected_root = tmp_path / "store" / "installed" / "agentroles.archi"
    assert installed_path.is_dir()
    assert installed_path.parent == expected_root / "versions" / update["version"]
    assert installed_path.parent.name == update["version"]
    assert len(installed_path.name) == 64

    current = expected_root / "current"
    assert current.exists()
    assert current.resolve() == installed_path.resolve()

    doctor = _run_json(["doctor", "agentroles.archi"], tmp_path, monkeypatch, capsys)
    assert doctor["status"] == "ok"
    assert doctor["installed"] is True
    assert doctor["installed_path"] == str(installed_path)
