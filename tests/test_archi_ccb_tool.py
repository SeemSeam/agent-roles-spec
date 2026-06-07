from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import subprocess
import sys

from agent_roles.cli import run


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_ROOT = REPO_ROOT / "roles" / "archi"
REFERENCE_ROOT = REPO_ROOT / "reference_roles" / "archi"
ROLE_TOOL = ROLE_ROOT / "adapters" / "ccb" / "tools" / "architec_tool.py"
REFERENCE_TOOL = REFERENCE_ROOT / "adapters" / "ccb" / "tools" / "architec_tool.py"
SYNCED_FILES = (
    "role.toml",
    "adapters/ccb/README.md",
    "adapters/ccb/adapter.toml",
    "adapters/ccb/memory.md",
    "adapters/ccb/skills/archi-tooling/SKILL.md",
    "adapters/ccb/tools/architec_tool.py",
)


def _load_tool():
    spec = importlib.util.spec_from_file_location("architec_tool_under_test", ROLE_TOOL)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _completed(args: list[str], returncode: int, stdout: str = "", stderr: str = ""):
    return subprocess.CompletedProcess(args, returncode, stdout, stderr)


def _paths(tmp_path: Path) -> dict[str, Path]:
    return {
        "root": tmp_path / "archi",
        "manifest": tmp_path / "archi" / "manifest.json",
    }


def _run_json(argv: list[str], tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("AGENT_ROLES_STORE", str(tmp_path / "store"))
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(REPO_ROOT))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    code = run(argv + ["--json"], stdout=sys.stdout, stderr=sys.stderr)
    captured = capsys.readouterr()
    assert code == 0, captured.err
    return json.loads(captured.out)


def test_archi_role_and_reference_role_stay_in_sync() -> None:
    for rel in SYNCED_FILES:
        assert ROLE_ROOT.joinpath(rel).read_text(encoding="utf-8") == REFERENCE_ROOT.joinpath(rel).read_text(
            encoding="utf-8"
        )


def test_install_uses_npm_archi_package_and_records_manifest(tmp_path: Path, monkeypatch, capsys) -> None:
    tool = _load_tool()
    paths = _paths(tmp_path)
    calls: list[list[str]] = []

    def fake_which(name: str):
        return {"npm": "/bin/npm", "archi": "/bin/archi"}.get(name)

    def fake_run(args: list[str], *, timeout_s: float):
        calls.append(args)
        if args == ["/bin/npm", "install", "-g", "@seemseam/archi"]:
            return _completed(args, 0)
        if args == ["/bin/archi", "--version"]:
            return _completed(args, 0, stdout="Architec CLI version: 0.2.15\n")
        return _completed(args, 1, stderr="unexpected command")

    monkeypatch.setattr(tool, "_paths", lambda: paths)
    monkeypatch.setattr(tool.shutil, "which", fake_which)
    monkeypatch.setattr(tool, "_run", fake_run)

    assert tool.install_or_update("install") == 0
    output = capsys.readouterr().out
    assert ["/bin/npm", "install", "-g", "@seemseam/archi"] in calls
    assert not any("pip" in part for call in calls for part in call)
    assert "package_manager: npm" in output
    assert "npm_package: @seemseam/archi" in output
    manifest = json.loads(paths["manifest"].read_text(encoding="utf-8"))
    assert manifest["schema"] == "ccb-tool-archi/v1"
    assert manifest["npm_package"] == "@seemseam/archi"
    assert manifest["archi_binary"] == "/bin/archi"


def test_update_honors_custom_npm_package(tmp_path: Path, monkeypatch, capsys) -> None:
    tool = _load_tool()
    paths = _paths(tmp_path)
    calls: list[list[str]] = []
    monkeypatch.setenv("CCB_ARCHI_NPM_PACKAGE", "@example/archi")
    monkeypatch.setattr(tool, "_paths", lambda: paths)
    monkeypatch.setattr(tool.shutil, "which", lambda name: {"npm": "/bin/npm", "archi": "/bin/archi"}.get(name))

    def fake_run(args: list[str], *, timeout_s: float):
        calls.append(args)
        if args == ["/bin/npm", "install", "-g", "@example/archi"]:
            return _completed(args, 0)
        if args == ["/bin/archi", "--version"]:
            return _completed(args, 0, stdout="custom archi\n")
        return _completed(args, 1, stderr="unexpected command")

    monkeypatch.setattr(tool, "_run", fake_run)

    assert tool.install_or_update("update") == 0
    assert ["/bin/npm", "install", "-g", "@example/archi"] in calls


def test_install_reports_missing_npm(tmp_path: Path, monkeypatch, capsys) -> None:
    tool = _load_tool()
    monkeypatch.setattr(tool, "_paths", lambda: _paths(tmp_path))
    monkeypatch.setattr(tool.shutil, "which", lambda _: None)

    assert tool.install_or_update("install") == 1
    output = capsys.readouterr().out
    assert "architec_status: failed" in output
    assert "reason: npm is not available" in output


def test_install_reports_missing_archi_binary_after_npm_install(tmp_path: Path, monkeypatch, capsys) -> None:
    tool = _load_tool()
    paths = _paths(tmp_path)

    def fake_which(name: str):
        return {"npm": "/bin/npm"}.get(name)

    def fake_run(args: list[str], *, timeout_s: float):
        if args == ["/bin/npm", "install", "-g", "@seemseam/archi"]:
            return _completed(args, 0)
        return _completed(args, 1, stderr="unexpected command")

    monkeypatch.setattr(tool, "_paths", lambda: paths)
    monkeypatch.setattr(tool.shutil, "which", fake_which)
    monkeypatch.setattr(tool, "_run", fake_run)

    assert tool.install_or_update("install") == 1
    output = capsys.readouterr().out
    assert "architec_status: failed" in output
    assert "reason: archi binary not found after npm install" in output
    assert "Ensure the npm global bin directory is on PATH." in output


def test_doctor_selects_archi_and_reports_legacy_ccb_archi_residue(tmp_path: Path, monkeypatch, capsys) -> None:
    tool = _load_tool()
    config = tmp_path / "llmgateway.yaml"
    config.write_text("model: test\n", encoding="utf-8")
    monkeypatch.setenv("LLMGATEWAY_CONFIG", str(config))
    monkeypatch.setattr(tool, "_paths", lambda: _paths(tmp_path))
    monkeypatch.setattr(
        tool.shutil,
        "which",
        lambda name: {"npm": "/bin/npm", "archi": "/bin/archi", "ccb-archi": "/old/ccb-archi"}.get(name),
    )

    def fake_run(args: list[str], *, timeout_s: float):
        if args == ["/bin/archi", "--help"]:
            return _completed(args, 0, stdout="usage: archi\n")
        if args == ["/bin/archi", "--version"]:
            return _completed(args, 0, stdout="Architec CLI version: 0.2.15\n")
        return _completed(args, 1, stderr="unexpected command")

    monkeypatch.setattr(tool, "_run", fake_run)

    assert tool.doctor() == 0
    output = capsys.readouterr().out
    assert "architec_status: ok" in output
    assert "selected_binary: /bin/archi" in output
    assert "selected_kind: path_archi" in output
    assert "legacy_ccb_archi: /old/ccb-archi" in output
    assert "legacy ccb-archi wrapper detected and ignored" in output
    assert "route_check_command: archi --check ." in output


def test_doctor_reports_llmgateway_missing_as_degraded_without_secret(monkeypatch, capsys) -> None:
    tool = _load_tool()
    monkeypatch.setenv("LLMGATEWAY_CONFIG", "secret-token-should-not-print")
    monkeypatch.setattr(tool.shutil, "which", lambda name: {"npm": "/bin/npm", "archi": "/bin/archi"}.get(name))
    monkeypatch.setattr(tool, "_llmgateway_config", lambda: None)

    def fake_run(args: list[str], *, timeout_s: float):
        if args == ["/bin/archi", "--help"]:
            return _completed(args, 0, stdout="usage: archi\n")
        if args == ["/bin/archi", "--version"]:
            return _completed(args, 0, stdout="Architec CLI version: 0.2.15\n")
        return _completed(args, 1, stderr="unexpected command")

    monkeypatch.setattr(tool, "_run", fake_run)

    assert tool.doctor() == 0
    output = capsys.readouterr().out
    assert "architec_status: degraded" in output
    assert "reason: llmgateway config is missing; Archi LLM analysis is not ready" in output
    assert "llm_readiness: degraded" in output
    assert "LLMGATEWAY_CONFIG" in output
    assert "LLM_GATEWAY_CONFIG" in output
    assert "~/.llmgateway/config.yaml" in output
    assert "~/.llmgateway/config.toml" in output
    assert "~/.config/llmgateway/config.yaml" in output
    assert "~/.config/llmgateway/config.toml" in output
    assert "secret-token-should-not-print" not in output


def test_doctor_reports_missing_archi_as_failure(monkeypatch, capsys) -> None:
    tool = _load_tool()
    monkeypatch.setattr(tool.shutil, "which", lambda name: {"npm": "/bin/npm", "ccb-archi": "/old/ccb-archi"}.get(name))

    assert tool.doctor() == 1
    output = capsys.readouterr().out
    assert "architec_status: missing" in output
    assert "archi CLI is not available" in output
    assert "selected_binary: " in output
    assert "legacy_ccb_archi: /old/ccb-archi" in output


def test_doctor_reports_archi_help_failure(monkeypatch, capsys) -> None:
    tool = _load_tool()
    monkeypatch.setattr(tool.shutil, "which", lambda name: {"npm": "/bin/npm", "archi": "/bin/archi"}.get(name))

    def fake_run(args: list[str], *, timeout_s: float):
        if args == ["/bin/archi", "--help"]:
            return _completed(args, 2, stderr="broken")
        if args == ["/bin/archi", "--version"]:
            return _completed(args, 0, stdout="Architec CLI version: 0.2.15\n")
        return _completed(args, 1, stderr="unexpected command")

    monkeypatch.setattr(tool, "_run", fake_run)

    assert tool.doctor() == 1
    output = capsys.readouterr().out
    assert "architec_status: failed" in output
    assert "reason: archi CLI does not pass --help" in output
    assert "help_status: failed" in output


def test_ccb_adapter_guidance_does_not_prefer_legacy_ccb_archi() -> None:
    text = "\n".join(
        [
            (ROLE_ROOT / "adapters" / "ccb" / "memory.md").read_text(encoding="utf-8"),
            (ROLE_ROOT / "adapters" / "ccb" / "skills" / "archi-tooling" / "SKILL.md").read_text(encoding="utf-8"),
            (REFERENCE_ROOT / "adapters" / "ccb" / "memory.md").read_text(encoding="utf-8"),
            (REFERENCE_ROOT / "adapters" / "ccb" / "skills" / "archi-tooling" / "SKILL.md").read_text(
                encoding="utf-8"
            ),
        ]
    )
    forbidden = (
        "Prefer `ccb-archi`",
        "ccb-archi --check",
        "ccb-archi --help",
        "ccb-archi --version",
        "command -v ccb-archi",
        "managed Architec venv",
        "Python venv",
        "pip install",
    )
    for phrase in forbidden:
        assert phrase not in text
    for line in text.splitlines():
        if "ccb-archi" in line:
            lowered = line.lower()
            assert any(word in lowered for word in ("legacy", "stale", "residue")), line


def test_agent_roles_archi_install_update_doctor_store_current(tmp_path: Path, monkeypatch, capsys) -> None:
    install = _run_json(["install", "archi"], tmp_path, monkeypatch, capsys)
    assert install["role_id"] == "agentroles.archi"
    assert install["version"] == "0.2.2"

    update = _run_json(["update", "archi"], tmp_path, monkeypatch, capsys)
    installed_path = Path(update["path"])
    expected_root = tmp_path / "store" / "installed" / "agentroles.archi"
    assert installed_path.is_dir()
    assert installed_path.parent == expected_root / "versions" / update["version"]
    assert installed_path.parent.name == update["version"]
    assert len(installed_path.name) == 64

    current = expected_root / "current"
    assert current.exists()
    assert current.resolve() == installed_path.resolve()

    doctor = _run_json(["doctor", "archi"], tmp_path, monkeypatch, capsys)
    assert doctor["status"] == "ok"
    assert doctor["installed"] is True
    assert doctor["installed_path"] == str(installed_path)
