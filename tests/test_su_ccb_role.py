from __future__ import annotations

import json
from pathlib import Path
import sys

from agent_roles.catalog import aliases_for, canonical_role_id
from agent_roles.cli import run
from agent_roles.manifest import load_role


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_ROOT = REPO_ROOT / "roles" / "su-ccb"


def _run_json(argv: list[str], tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("AGENT_ROLES_STORE", str(tmp_path / "store"))
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(REPO_ROOT))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    code = run(argv + ["--json"], stdout=sys.stdout, stderr=sys.stderr)
    captured = capsys.readouterr()
    assert code == 0, captured.err
    return json.loads(captured.out)


def test_su_ccb_role_loads_with_packaged_skill_inventory() -> None:
    role = load_role(ROLE_ROOT)

    assert role.id == "agentroles.su_ccb"
    assert role.name == "SU-CCB Workflow Operator"
    assert role.version == "0.1.0"
    assert role.catalog_level == "preview"
    assert role.default_agent_name == "su_ccb"

    identity = role.table("identity")
    assert identity["interaction_mode"] == "interactive"
    assert identity["initiates_actions"] is True
    assert "SU-CCB engineering workflow" in identity["purpose"]

    packaging = role.table("packaging")
    assert packaging["shape"] == "single-role"
    assert packaging["surfaces"] == ["coordinator", "executor", "document_maintainer"]
    assert "one installed Role" in packaging["projection"]
    assert "Do not split SU-CCB" in packaging["split_policy"]

    contents = role.table("contents")
    assert contents["memory"] == ["memory.md"]
    assert len(contents["skills"]) == 20
    assert "skills/su-flow" in contents["skills"]
    assert "skills/ccb-execute" in contents["skills"]
    assert "skills/ccb-doc" in contents["skills"]
    assert contents["plugins"] == ["plugins/claude-ccb"]
    assert "lib" in contents["tools"]
    assert "references/kernel" in contents["references"]

    permissions = role.table("permissions")
    assert permissions["read_files"] is True
    assert permissions["write_files"] is True
    assert permissions["network"] is True
    assert permissions["secrets"] == "none"

    assert role.adapter("claude-code")["display_name"] == "su_ccb"
    assert role.adapter("codex")["display_name"] == "su_ccb_codex"
    assert role.adapter("ccb")["display_name"] == "su_ccb"

    for relative in (
        "README.md",
        "memory.md",
        "skills/su-flow/SKILL.md",
        "skills/ccb-execute/SKILL.md",
        "skills/ccb-doc/SKILL.md",
        "lib/runtime/index.mjs",
        "references/kernel/README.md",
        "plugins/claude-ccb/plugin.json",
        "adapters/ccb/README.md",
        "tests/validation.md",
    ):
        assert ROLE_ROOT.joinpath(relative).is_file()

    provenance = ROLE_ROOT.joinpath("references/provenance.md").read_text(encoding="utf-8")
    assert "su-ccb-claude-plugin" in provenance
    assert "su-ccb-codex-skills" in provenance
    assert "6607c74e49bc2f79e1a63301d9615c81c9f0a2f9" in provenance
    assert "646cf721e15624a207b4c59089b491e45b24587d" in provenance


def test_su_ccb_installs_and_aliases_resolve_from_catalog(tmp_path: Path, monkeypatch, capsys) -> None:
    assert canonical_role_id("su-ccb", sources=(REPO_ROOT,)) == "agentroles.su_ccb"
    assert canonical_role_id("su_ccb", sources=(REPO_ROOT,)) == "agentroles.su_ccb"
    assert canonical_role_id("su.ccb", sources=(REPO_ROOT,)) == "agentroles.su_ccb"
    assert canonical_role_id("ccb-workflow", sources=(REPO_ROOT,)) == "agentroles.su_ccb"
    assert set(aliases_for("agentroles.su_ccb", sources=(REPO_ROOT,))) == {
        "ccb-workflow",
        "su-ccb",
        "su.ccb",
        "su_ccb",
    }

    install = _run_json(["install", "su-ccb"], tmp_path, monkeypatch, capsys)
    assert install["role_status"] == "installed"
    assert install["role_id"] == "agentroles.su_ccb"
    assert install["version"] == "0.1.0"
    assert install["catalog_level"] == "preview"

    resolved = _run_json(["resolve", "ccb-workflow"], tmp_path, monkeypatch, capsys)
    assert resolved["status"] == "ok"
    assert resolved["requested_role_id"] == "ccb-workflow"
    assert resolved["role_id"] == "agentroles.su_ccb"
    assert resolved["installed"] is True


def test_su_ccb_list_discovers_role_from_clean_store(tmp_path: Path, monkeypatch, capsys) -> None:
    listing = _run_json(["list"], tmp_path, monkeypatch, capsys)
    rows = {row["role_id"]: row for row in listing["roles"]}

    assert "agentroles.su_ccb" in rows
    row = rows["agentroles.su_ccb"]
    assert row["version"] == "0.1.0"
    assert row["catalog_level"] == "preview"
    assert row["status"] == "available"
    assert row["update_reason"] == "not_installed"
    assert set(row["aliases"]) == {"ccb-workflow", "su-ccb", "su.ccb", "su_ccb"}
