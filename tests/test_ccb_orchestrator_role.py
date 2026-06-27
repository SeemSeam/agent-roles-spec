from __future__ import annotations

from pathlib import Path

from agent_roles.manifest import load_role


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_ROOT = REPO_ROOT / "roles" / "ccb-orchestrator"


def test_ccb_orchestrator_role_loads_with_capacity_skill() -> None:
    role = load_role(ROLE_ROOT)

    assert role.id == "agentroles.ccb_orchestrator"
    assert role.name == "CCB Loop Orchestrator"
    assert role.version == "0.1.0"
    assert role.catalog_level == "experimental"
    assert "CCB agentic execution loops" in role.description

    identity = role.table("identity")
    assert identity["default_agent_name"] == "orchestrator"
    assert identity["initiates_actions"] is True
    assert any("1-4 node budget" in item for item in identity["responsibilities"])
    assert any("returned agent names" in item for item in identity["responsibilities"])
    assert any("Direct ccb reload" in item for item in identity["non_goals"])

    contents = role.table("contents")
    assert contents["memory"] == ["memory.md"]
    assert contents["skills"] == ["skills/orchestrator-capacity"]
    assert contents["references"] == ["references/capacity-boundary.md"]
    assert contents["templates"] == [
        "templates/capacity-request.json",
        "templates/worker-ask.md",
        "templates/checker-ask.md",
        "templates/round-aggregation.md",
    ]
    assert contents["tests"] == ["tests/validation.md"]

    assert ROLE_ROOT.joinpath("skills/orchestrator-capacity/SKILL.md").is_file()
    skill = ROLE_ROOT.joinpath("skills/orchestrator-capacity/SKILL.md").read_text(encoding="utf-8")
    assert "ccb loop capacity ensure" in skill
    assert "Do not use `ccb loop run-once`" in skill
    assert "Do not edit `.ccb/ccb.config`" in skill

    assert role.adapter("ccb")["display_name"] == "orchestrator"
    assert role.adapter("codex")["display_name"] == "orchestrator"
    assert role.adapter("claude-code")["display_name"] == "orchestrator"


def test_ccb_orchestrator_role_has_static_source_boundary() -> None:
    memory = ROLE_ROOT.joinpath("memory.md").read_text(encoding="utf-8")
    boundary = ROLE_ROOT.joinpath("references/capacity-boundary.md").read_text(encoding="utf-8")
    validation = ROLE_ROOT.joinpath("tests/validation.md").read_text(encoding="utf-8")

    assert "Do not mutate project files directly" in memory
    assert "Only use CCB-owned commands" in memory
    assert "Direct ccb reload" in boundary
    assert "repeat 3" in validation
