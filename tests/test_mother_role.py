from __future__ import annotations

import json
from pathlib import Path
import sys

from agent_roles.catalog import aliases_for, canonical_role_id
from agent_roles.cli import run
from agent_roles.manifest import load_role


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_ROOT = REPO_ROOT / "roles" / "mother"


def _run_json(argv: list[str], tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("AGENT_ROLES_STORE", str(tmp_path / "store"))
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(REPO_ROOT))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    code = run(argv + ["--json"], stdout=sys.stdout, stderr=sys.stderr)
    captured = capsys.readouterr()
    assert code == 0, captured.err
    return json.loads(captured.out)


def test_mother_role_loads_with_expected_source_inventory() -> None:
    role = load_role(ROLE_ROOT)

    assert role.id == "agentroles.mother"
    assert role.name == "Role Mother"
    assert role.version == "0.2.0"
    assert role.catalog_level == "preview"
    assert role.default_agent_name == "mother"

    identity = role.table("identity")
    assert identity["interaction_mode"] == "interactive"
    assert identity["initiates_actions"] is False
    assert "audit existing Role source" in identity["purpose"]
    assert any("Research public skill construction" in item for item in identity["responsibilities"])

    contents = role.table("contents")
    assert contents["memory"] == ["memory.md"]
    assert contents["skills"] == ["skills/role-creation-audit"]
    assert contents["prompts"] == ["prompts/role-audit.md", "prompts/role-creation.md"]
    assert contents["references"] == ["references/skill-construction-research.md"]
    assert contents["tests"] == ["tests/validation.md"]

    permissions = role.table("permissions")
    assert permissions["read_files"] is True
    assert permissions["write_files"] is True
    assert permissions["network"] is True
    assert permissions["secrets"] == "none"

    assert role.adapter("codex")["display_name"] == "mother"
    assert role.adapter("ccb")["display_name"] == "mother"

    for relative in (
        "README.md",
        "memory.md",
        "skills/role-creation-audit/SKILL.md",
        "prompts/role-audit.md",
        "prompts/role-creation.md",
        "references/skill-construction-research.md",
        "tests/validation.md",
    ):
        assert ROLE_ROOT.joinpath(relative).is_file()

    research = ROLE_ROOT.joinpath("references/skill-construction-research.md").read_text(encoding="utf-8")
    assert "OpenAI Codex Agent Skills" in research
    assert "Claude skill authoring best practices" in research
    assert "Do not copy third-party examples wholesale" in research


def test_mother_installs_and_aliases_resolve_from_catalog(tmp_path: Path, monkeypatch, capsys) -> None:
    assert canonical_role_id("mother", sources=(REPO_ROOT,)) == "agentroles.mother"
    assert canonical_role_id("role-author", sources=(REPO_ROOT,)) == "agentroles.mother"
    assert canonical_role_id("role-auditor", sources=(REPO_ROOT,)) == "agentroles.mother"
    assert set(aliases_for("agentroles.mother", sources=(REPO_ROOT,))) == {
        "mother",
        "role-auditor",
        "role-author",
        "role-mother",
    }

    install = _run_json(["install", "role-author"], tmp_path, monkeypatch, capsys)
    assert install["role_status"] == "installed"
    assert install["role_id"] == "agentroles.mother"
    assert install["version"] == "0.2.0"
    assert install["catalog_level"] == "preview"

    resolved = _run_json(["resolve", "role-auditor"], tmp_path, monkeypatch, capsys)
    assert resolved["status"] == "ok"
    assert resolved["requested_role_id"] == "role-auditor"
    assert resolved["role_id"] == "agentroles.mother"
    assert resolved["installed"] is True


def test_mother_list_discovers_role_from_clean_store(tmp_path: Path, monkeypatch, capsys) -> None:
    listing = _run_json(["list"], tmp_path, monkeypatch, capsys)
    rows = {row["role_id"]: row for row in listing["roles"]}

    assert "agentroles.mother" in rows
    row = rows["agentroles.mother"]
    assert row["version"] == "0.2.0"
    assert row["catalog_level"] == "preview"
    assert row["status"] == "available"
    assert row["update_reason"] == "not_installed"
    assert set(row["aliases"]) == {"mother", "role-auditor", "role-author", "role-mother"}
