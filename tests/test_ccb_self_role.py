from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import sys

from agent_roles.cli import run
from agent_roles.manifest import load_role


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_ROOT = REPO_ROOT / "roles" / "ccb-self"
DOCTOR_TOOL = ROLE_ROOT / "adapters" / "ccb" / "tools" / "doctor.py"


def _load_doctor_tool():
    spec = importlib.util.spec_from_file_location("ccb_self_doctor_under_test", DOCTOR_TOOL)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    previous = sys.dont_write_bytecode
    sys.dont_write_bytecode = True
    try:
        spec.loader.exec_module(module)
    finally:
        sys.dont_write_bytecode = previous
    return module


def _run_json(argv: list[str], tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("AGENT_ROLES_STORE", str(tmp_path / "store"))
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(REPO_ROOT))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    code = run(argv + ["--json"], stdout=sys.stdout, stderr=sys.stderr)
    captured = capsys.readouterr()
    assert code == 0, captured.err
    return json.loads(captured.out)


def test_ccb_self_role_loads_with_ccb_adapter_metadata() -> None:
    role = load_role(ROLE_ROOT)

    assert role.id == "agentroles.ccb_self"
    assert role.name == "CCB Self Maintainer"
    assert role.version == "0.2.0"
    assert role.catalog_level == "preview"
    assert role.default_agent_name == "ccb_self"
    assert role.providers == ("codex", "claude")

    contents = role.table("contents")
    assert contents["memory"] == ["memory.md"]
    assert set(contents["skills"]) == {
        "skills/ccb-self-diagnose",
        "skills/ccb-self-recover",
        "skills/ccb-self-chain",
        "skills/ccb-comm-reply-recover",
        "skills/ccb-expert-reference",
        "skills/ccb-config",
    }
    assert contents["references"] == [
        "references/runtime-authority.md",
        "references/recovery-runbooks.md",
        "references/tmux-ccb-quickstart.md",
        "references/ccb-project-index.md",
        "references/ccb-manuals-index.md",
        "references/ccb-source-map.md",
        "references/ccb-command-surface.md",
        "references/ccb-runtime-flows.md",
        "references/ccb-role-and-config-system.md",
        "references/ccb-release-and-test-gates.md",
        "references/ccb-knowledge-refresh.md",
    ]
    assert contents["tests"] == ["tests/validation.md"]

    ccb = role.adapter("ccb")
    assert ccb["default_agent_name"] == "ccb_self"
    assert ccb["recommended_provider"] == "codex"
    assert ccb["skill_projection"]["strategy"] == "copy-generic-skills"


def test_ccb_self_installs_and_aliases_resolve_from_catalog(tmp_path: Path, monkeypatch, capsys) -> None:
    install = _run_json(["install", "ccb-self"], tmp_path, monkeypatch, capsys)
    assert install["role_status"] == "installed"
    assert install["role_id"] == "agentroles.ccb_self"
    assert install["version"] == "0.2.0"
    assert install["catalog_level"] == "preview"

    resolved = _run_json(["resolve", "ccb_self"], tmp_path, monkeypatch, capsys)
    assert resolved["status"] == "ok"
    assert resolved["requested_role_id"] == "ccb_self"
    assert resolved["role_id"] == "agentroles.ccb_self"
    assert resolved["installed"] is True


def test_ccb_self_doctor_helper_runs_declared_read_only_commands(monkeypatch, capsys) -> None:
    tool = _load_doctor_tool()
    calls: list[tuple[str, ...]] = []

    def fake_run(ccb_bin: str, args: tuple[str, ...]):
        calls.append(args)
        return {
            "command": [ccb_bin, *args],
            "status": "ok",
            "returncode": 0,
            "stdout": "",
            "stderr": "",
        }

    monkeypatch.setattr(tool, "_ccb_bin", lambda: "/bin/ccb")
    monkeypatch.setattr(tool, "_run", fake_run)

    assert tool.main() == 0
    payload = json.loads(capsys.readouterr().out)
    assert payload["status"] == "ok"
    assert payload["findings"] == []
    assert calls == list(tool.COMMANDS)


def test_ccb_self_distributable_skill_text_has_no_local_source_paths() -> None:
    for base in ("skills", "references"):
        paths = ROLE_ROOT.joinpath(base).rglob("*.md")
        for path in paths:
            text = path.read_text(encoding="utf-8")
            assert "/home/bfly/yunwei/ccb_source" not in text
            assert "/home/bfly/yunwei/test_ccb2" not in text


def test_ccb_self_expert_references_include_github_and_manuals() -> None:
    project_index = ROLE_ROOT.joinpath("references/ccb-project-index.md").read_text(
        encoding="utf-8"
    )
    manuals_index = ROLE_ROOT.joinpath("references/ccb-manuals-index.md").read_text(
        encoding="utf-8"
    )
    skill = ROLE_ROOT.joinpath("skills/ccb-expert-reference/SKILL.md").read_text(
        encoding="utf-8"
    )

    assert "https://github.com/SeemSeam/claude_codex_bridge" in project_index
    assert "docs/manuals/developer-guide/" in manuals_index
    assert "docs/manuals/user-guide/" in manuals_index
    assert "docs/manuals/ccb-self-expert-guide.md" in manuals_index
    assert "ccb-source-map.md" in skill
    assert "ccb-release-and-test-gates.md" in skill
    assert "When the current project is not a CCB source checkout" in skill


def test_ccb_self_review_followups_are_encoded() -> None:
    memory = ROLE_ROOT.joinpath("memory.md").read_text(encoding="utf-8")
    command_surface = ROLE_ROOT.joinpath("references/ccb-command-surface.md").read_text(
        encoding="utf-8"
    )
    recover = ROLE_ROOT.joinpath("skills/ccb-self-recover/SKILL.md").read_text(
        encoding="utf-8"
    )
    chain = ROLE_ROOT.joinpath("skills/ccb-self-chain/SKILL.md").read_text(
        encoding="utf-8"
    )
    refresh = ROLE_ROOT.joinpath("references/ccb-knowledge-refresh.md").read_text(
        encoding="utf-8"
    )

    assert "## Skill Routing" in memory
    assert "ccb-comm-reply-recover" in memory
    assert "ccb-expert-reference" in memory
    assert "doctor [ps|logs <agent_name>|storage]" in command_surface
    assert "Recent\" means created within the last 30 minutes" in recover
    assert "## Reload Aftermath" in recover
    assert "Prefer ccb-comm-reply-recover" in chain
    assert "role version increments" in refresh
