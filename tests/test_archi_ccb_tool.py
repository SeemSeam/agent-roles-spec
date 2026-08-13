from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tomllib

from agent_roles.cli import run
from agent_roles.manifest import load_role


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_ROOT = REPO_ROOT / "roles" / "archi"
REFERENCE_ROOT = REPO_ROOT / "reference_roles" / "archi"
ROLE_TOOL = ROLE_ROOT / "adapters" / "ccb" / "tools" / "architec_tool.py"
REFERENCE_TOOL = REFERENCE_ROOT / "adapters" / "ccb" / "tools" / "architec_tool.py"
METHOD_SKILLS = (
    "skills/archi-dependency-topology",
    "skills/archi-module-boundaries",
    "skills/archi-fitness-functions",
    "skills/archi-decision-drift",
    "skills/archi-change-impact",
    "skills/archi-distributed-systems",
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


def _role_source_files(root: Path) -> set[str]:
    return {
        path.relative_to(root).as_posix()
        for path in root.rglob("*")
        if path.is_file() and "__pycache__" not in path.parts and path.suffix != ".pyc"
    }


def test_archi_role_and_reference_role_stay_in_sync() -> None:
    role_files = _role_source_files(ROLE_ROOT)
    reference_files = _role_source_files(REFERENCE_ROOT)
    assert role_files == reference_files
    for rel in sorted(role_files):
        assert ROLE_ROOT.joinpath(rel).read_text(encoding="utf-8") == REFERENCE_ROOT.joinpath(rel).read_text(
            encoding="utf-8"
        )


def test_archi_all_skills_have_yaml_frontmatter() -> None:
    for skill in sorted(ROLE_ROOT.rglob("SKILL.md")):
        text = skill.read_text(encoding="utf-8")
        lines = text.splitlines()
        assert lines[:1] == ["---"], skill
        end = lines[1:].index("---") + 1
        frontmatter = "\n".join(lines[1:end])
        assert "name:" in frontmatter, skill
        assert "description:" in frontmatter, skill
        assert len(frontmatter.split("description:", 1)[1].strip()) > 10, skill


def test_archi_role_declares_tool_independent_evidence_design() -> None:
    role = load_role(ROLE_ROOT)

    assert role.id == "agentroles.archi"
    assert role.version == "0.5.0"
    assert "without depending on one tool" in role.description

    identity = role.table("identity")
    assert any("direct source review" in item for item in identity["responsibilities"])
    assert any("decision drift" in item for item in identity["responsibilities"])
    assert any("fitness functions" in item for item in identity["responsibilities"])

    contents = role.table("contents")
    assert "skills/archi-evidence-map" in contents["skills"]
    for skill in METHOD_SKILLS:
        assert skill in contents["skills"]
    assert "skills/architecture-review" in contents["skills"]
    assert "skills/vendor/code-review-and-quality" in contents["skills"]
    assert "skills/vendor/improve-codebase-architecture" in contents["skills"]
    assert "skills/vendor/requesting-code-review" in contents["skills"]
    assert "skills/vendor/receiving-code-review" in contents["skills"]
    assert contents["references"] == [
        "references/architecture-toolbox.md",
        "references/vendored-skill-provenance.md",
    ]
    assert contents["tests"] == ["tests/validation.md", "tests/evaluation.toml"]

    permissions = role.table("permissions")
    assert permissions["read_files"] is True
    assert permissions["write_files"] is False
    assert permissions["network"] is False

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
    assert "archi-dependency-topology" in memory
    assert "archi-distributed-systems" in memory
    assert "vendored public skills" in memory
    assert "Do not block architecture review just because Architec" in evidence_skill
    assert "ADRs, decision logs, and git history" in evidence_skill
    assert "vendored `code-review-and-quality`" in evidence_skill
    assert "dependency-cruiser" in tools
    assert "ArchUnit" in tools
    assert "OpenTelemetry" in tools
    assert "Semgrep" in toolbox
    assert "CodeQL" in toolbox
    assert "Coverage Audit" in toolbox
    assert "Candidate Scorecard" in toolbox
    assert "Blueprint Gate" in toolbox
    assert "archi-change-impact" in toolbox
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


def test_archi_method_skills_are_review_only_tool_optional_and_degradable() -> None:
    for skill in METHOD_SKILLS:
        text = ROLE_ROOT.joinpath(skill, "SKILL.md").read_text(encoding="utf-8")
        assert "Degraded Semantics" in text
        assert "tool" in text.lower() or "evidence" in text.lower()
        assert "Stay review-only" in text or "review-only" in text
        assert "Do not install" in text or "Do not add or run new tools" in text or "Stay review-only" in text
        assert "evidence, not" in text or "generated structural evidence" in text or "provided evidence" in text

    fitness = ROLE_ROOT.joinpath("skills/archi-fitness-functions/SKILL.md").read_text(
        encoding="utf-8"
    )
    assert "Do not implement the gate" in fitness
    assert "write-enabled Role" in fitness
    assert "unless the user explicitly asks to implement" not in fitness


def test_archi_evaluation_suite_contract() -> None:
    role = load_role(ROLE_ROOT)
    suite = tomllib.loads((ROLE_ROOT / "tests" / "evaluation.toml").read_text(encoding="utf-8"))
    scoring = suite["scoring"]
    cases = suite["cases"]

    assert suite["role_id"] == role.id == "agentroles.archi"
    assert suite["max_iterations"] == 2
    assert scoring["pass_score"] == 80
    assert scoring["critical_min"] == 4
    assert scoring["critical_dimensions"] == [
        "role_fidelity",
        "boundary_discipline",
        "evidence_discipline",
    ]
    assert [case["id"] for case in cases if case["required"]] == [
        "multi-evidence-architecture-analysis",
        "no-architec-degraded-mode",
        "review-only-boundary",
        "impact-reliability-regression",
    ]
    assert {case["id"]: case["kind"] for case in cases} == {
        "multi-evidence-architecture-analysis": "capability",
        "no-architec-degraded-mode": "degraded",
        "review-only-boundary": "boundary",
        "impact-reliability-regression": "regression",
    }
    for case in cases:
        for dimension in scoring["critical_dimensions"]:
            assert dimension in case["rubric"], case["id"]
        assert case["oracle"]["must_address"], case["id"]
        assert case["oracle"]["must_not"], case["id"]
        for rubric_text in case["rubric"].values():
            assert rubric_text not in case["prompt"]

    boundary = next(case for case in cases if case["id"] == "review-only-boundary")
    assert any("write-enabled Role" in item for item in boundary["oracle"]["must_address"])


def test_archi_catalog_readmes_match_role_revision_and_canonical_commands() -> None:
    readmes = [REPO_ROOT / "README.md", *sorted((REPO_ROOT / "docs" / "i18n").glob("README.*.md"))]
    for readme in readmes:
        text = readme.read_text(encoding="utf-8")
        marker = "<summary><strong>agentroles.archi</strong>"
        assert marker in text, readme
        block = text.split(marker, 1)[1].split("</details>", 1)[0]
        assert "`0.5.0`" in block, readme
        assert "agent-roles add agentroles.archi" in block, readme
        assert "agent-roles update agentroles.archi" in block, readme
        assert "`0.2.3`" not in block, readme


def test_archi_has_no_required_architec_dependency_or_hidden_install_path() -> None:
    role_metadata = tomllib.loads(ROLE_ROOT.joinpath("role.toml").read_text(encoding="utf-8"))
    assert role_metadata["permissions"]["network"] is False
    assert role_metadata["permissions"]["write_files"] is False

    ccb_adapter = tomllib.loads((ROLE_ROOT / "adapters" / "ccb" / "adapter.toml").read_text(encoding="utf-8"))
    assert ccb_adapter["tools"]["architec"]["required"] is False
    assert ccb_adapter["tools"]["architec"]["runtime_network"] is False

    combined = "\n".join(
        path.read_text(encoding="utf-8")
        for path in [
            ROLE_ROOT / "memory.md",
            ROLE_ROOT / "tools" / "README.md",
            ROLE_ROOT / "skills" / "archi-evidence-map" / "SKILL.md",
            ROLE_ROOT / "skills" / "archi-dependency-topology" / "SKILL.md",
            ROLE_ROOT / "skills" / "archi-change-impact" / "SKILL.md",
        ]
    )
    assert "never depend on one tool" in combined
    assert "optional evidence" in combined
    assert "If no graph tool is available" in combined
    assert "Do not install tools" in combined or "Do not install or refresh generated graphs" in combined
    assert "managed virtual environment" not in combined
    assert "pip install" not in combined


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
    install = _run_json(["install", "agentroles.archi"], tmp_path, monkeypatch, capsys)
    assert install["role_id"] == "agentroles.archi"
    assert install["version"] == "0.5.0"

    update = _run_json(["update", "agentroles.archi"], tmp_path, monkeypatch, capsys)
    installed_path = Path(update["path"])
    expected_root = tmp_path / "store" / "installed" / "agentroles.archi"
    assert installed_path.is_dir()
    assert installed_path == expected_root / "current"

    current = expected_root / "current"
    assert current.exists()
    assert current.resolve() == installed_path.resolve()

    doctor = _run_json(["doctor", "agentroles.archi"], tmp_path, monkeypatch, capsys)
    assert doctor["status"] == "ok"
    assert doctor["installed"] is True
    assert doctor["installed_path"] == str(installed_path)
