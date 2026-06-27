from __future__ import annotations

from pathlib import Path

from agent_roles.manifest import load_role


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_ROOT = REPO_ROOT / "roles" / "code-reviewer"


def test_code_reviewer_role_loads_with_review_boundary() -> None:
    role = load_role(ROLE_ROOT)

    assert role.id == "agentroles.code_reviewer"
    assert role.name == "Code Reviewer"
    assert role.version == "0.1.0"
    assert role.catalog_level == "experimental"
    assert "worker output" in role.description

    identity = role.table("identity")
    assert identity["default_agent_name"] == "code_reviewer"
    assert identity["interaction_mode"] == "review_gate"
    assert identity["initiates_actions"] is False
    assert any("test evidence" in item for item in identity["responsibilities"])
    assert any("fallback" in item for item in identity["responsibilities"])
    assert any("Implement the worker task" in item for item in identity["non_goals"])

    contents = role.table("contents")
    assert contents["memory"] == ["memory.md"]
    assert contents["references"] == ["references/review-boundaries.md"]
    assert contents["templates"] == ["templates/review-report.md"]
    assert contents["tests"] == ["tests/validation.md"]

    permissions = role.table("permissions")
    assert permissions["read_files"] is True
    assert permissions["write_files"] is False
    assert permissions["secrets"] == "none"

    assert role.adapter("ccb")["display_name"] == "code_reviewer"
    assert role.adapter("codex")["display_name"] == "code_reviewer"
    assert role.adapter("claude-code")["display_name"] == "code_reviewer"


def test_code_reviewer_role_files_capture_checker_contract() -> None:
    memory = ROLE_ROOT.joinpath("memory.md").read_text(encoding="utf-8")
    boundaries = ROLE_ROOT.joinpath("references/review-boundaries.md").read_text(encoding="utf-8")
    report = ROLE_ROOT.joinpath("templates/review-report.md").read_text(encoding="utf-8")
    validation = ROLE_ROOT.joinpath("tests/validation.md").read_text(encoding="utf-8")

    assert "status: pass|rework_required|blocked|escalate" in memory
    assert "Do not patch code" in memory
    assert "Silent fallback" in boundaries
    assert "fallback_audit" in report
    assert "does not edit files" in validation
