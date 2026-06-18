from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import subprocess
import sys

from agent_roles.cli import run
from agent_roles.manifest import load_role


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_ROOT = REPO_ROOT / "roles" / "archi"
REFERENCE_ROOT = REPO_ROOT / "reference_roles" / "archi"
ROLE_TOOL = ROLE_ROOT / "adapters" / "ccb" / "tools" / "architec_tool.py"
REFERENCE_TOOL = REFERENCE_ROOT / "adapters" / "ccb" / "tools" / "architec_tool.py"
SYNCED_FILES = (
    "role.toml",
    "README.md",
    "memory.md",
    "references/architecture-toolbox.md",
    "references/vendored-skill-provenance.md",
    "skills/archi-evidence-map/SKILL.md",
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
    role_vendor_files = {
        path.relative_to(ROLE_ROOT).as_posix()
        for path in ROLE_ROOT.joinpath("skills/vendor").rglob("*")
        if path.is_file()
    }
    reference_vendor_files = {
        path.relative_to(REFERENCE_ROOT).as_posix()
        for path in REFERENCE_ROOT.joinpath("skills/vendor").rglob("*")
        if path.is_file()
    }
    assert role_vendor_files == reference_vendor_files
    for rel in sorted(role_vendor_files):
        assert ROLE_ROOT.joinpath(rel).read_text(encoding="utf-8") == REFERENCE_ROOT.joinpath(rel).read_text(
            encoding="utf-8"
        )


def test_archi_role_declares_tool_independent_evidence_design() -> None:
    role = load_role(ROLE_ROOT)

    assert role.id == "agentroles.archi"
    assert role.version == "0.4.0"
    assert "without depending on one tool" in role.description

    identity = role.table("identity")
    assert any("direct source review" in item for item in identity["responsibilities"])

    contents = role.table("contents")
    assert "skills/archi-evidence-map" in contents["skills"]
    assert "skills/architecture-review" in contents["skills"]
    assert "skills/vendor/code-review-and-quality" in contents["skills"]
    assert "skills/vendor/improve-codebase-architecture" in contents["skills"]
    assert "skills/vendor/requesting-code-review" in contents["skills"]
    assert "skills/vendor/receiving-code-review" in contents["skills"]
    assert contents["references"] == [
        "references/architecture-toolbox.md",
        "references/vendored-skill-provenance.md",
    ]

    ccb_adapter = ROLE_ROOT / "adapters" / "ccb" / "adapter.toml"
    assert "required = false" in ccb_adapter.read_text(encoding="utf-8")

    memory = ROLE_ROOT.joinpath("memory.md").read_text(encoding="utf-8")
    readme = ROLE_ROOT.joinpath("README.md").read_text(encoding="utf-8")
    tools = ROLE_ROOT.joinpath("tools/README.md").read_text(encoding="utf-8")
    evidence_skill = ROLE_ROOT.joinpath("skills/archi-evidence-map/SKILL.md").read_text(encoding="utf-8")
    toolbox = ROLE_ROOT.joinpath("references/architecture-toolbox.md").read_text(encoding="utf-8")
    provenance = ROLE_ROOT.joinpath("references/vendored-skill-provenance.md").read_text(encoding="utf-8")
    deepening = ROLE_ROOT.joinpath("skills/vendor/improve-codebase-architecture/SKILL.md").read_text(
        encoding="utf-8"
    )

    assert "never depend on one tool" in memory
    assert "project-native dependency rules" in memory
    assert "vendored public skills" in memory
    assert "Do not block architecture review just because Architec" in evidence_skill
    assert "vendored `code-review-and-quality`" in evidence_skill
    assert "dependency-cruiser" in tools
    assert "ArchUnit" in tools
    assert "Semgrep" in toolbox
    assert "CodeQL" in toolbox
    assert "Copying license-cleared focused skills: allowed" in toolbox
    assert "Vendored Public Skills" in readme
    assert "Public Skills Carried Or Fused Into Archi" in toolbox
    assert "addyosmani/agent-skills" in readme
    assert "mattpocock/skills" in readme
    assert "obra/superpowers" in readme
    assert "awesome-skills/code-review-skill" in readme
    assert "maragudk/skills" in readme
    assert "vendored_intact" in provenance
    assert "vendored_modified" in provenance
    assert ROLE_ROOT.joinpath("skills/vendor/code-review-and-quality/LICENSE").is_file()
    assert ROLE_ROOT.joinpath("skills/vendor/improve-codebase-architecture/LICENSE").is_file()
    assert ROLE_ROOT.joinpath("skills/vendor/requesting-code-review/LICENSE").is_file()
    assert ROLE_ROOT.joinpath("skills/vendor/receiving-code-review/LICENSE").is_file()
    assert "Do not write project files" in deepening
    assert "xdg-open" not in deepening
    assert "cdn.tailwindcss.com" not in deepening


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
    assert install["version"] == "0.4.0"

    update = _run_json(["update", "archi"], tmp_path, monkeypatch, capsys)
    installed_path = Path(update["path"])
    expected_root = tmp_path / "store" / "installed" / "agentroles.archi"
    assert installed_path.is_dir()
    assert installed_path == expected_root / "current"

    current = expected_root / "current"
    assert current.exists()
    assert current.resolve() == installed_path.resolve()

    doctor = _run_json(["doctor", "archi"], tmp_path, monkeypatch, capsys)
    assert doctor["status"] == "ok"
    assert doctor["installed"] is True
    assert doctor["installed_path"] == str(installed_path)
