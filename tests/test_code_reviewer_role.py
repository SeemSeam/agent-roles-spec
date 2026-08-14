from __future__ import annotations

import json
from pathlib import Path
import sys

from agent_roles.catalog import aliases_for, canonical_role_id
from agent_roles.cli import run
from agent_roles.manifest import load_role


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_ROOT = REPO_ROOT / "roles" / "code-reviewer"


def _run_json(argv: list[str], tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("AGENT_ROLES_STORE", str(tmp_path / "store"))
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(REPO_ROOT))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    code = run(argv + ["--json"], stdout=sys.stdout, stderr=sys.stderr)
    captured = capsys.readouterr()
    assert code == 0, captured.err
    return json.loads(captured.out)


def test_code_reviewer_role_loads_with_five_score_contract() -> None:
    role = load_role(ROLE_ROOT)

    assert role.id == "agentroles.code_reviewer"
    assert role.name == "Code Reviewer"
    assert role.version == "0.2.0"
    assert role.catalog_level == "experimental"
    assert "five independent quality scores" in role.description

    identity = role.table("identity")
    assert identity["default_agent_name"] == "code_reviewer"
    assert identity["interaction_mode"] == "review-only"
    assert identity["initiates_actions"] is False
    assert any("Score correctness" in item for item in identity["responsibilities"])
    assert any("silently fixing" in item for item in identity["responsibilities"])
    assert any("Implement, patch" in item for item in identity["non_goals"])
    assert any("high total score" in item for item in identity["non_goals"])

    contents = role.table("contents")
    assert contents["memory"] == ["memory.md"]
    assert contents["skills"] == ["skills/review-code-quality"]
    assert contents["templates"] == ["templates/review-report.md"]
    assert contents["tests"] == ["tests/validation.md"]
    assert "references" not in contents

    permissions = role.table("permissions")
    assert permissions == {
        "read_files": True,
        "write_files": False,
        "network": False,
        "secrets": "none",
    }

    for adapter in ("ccb", "codex", "claude-code", "hive"):
        assert role.adapter(adapter)["display_name"] == "code_reviewer"

    for relative in (
        "README.md",
        "memory.md",
        "skills/review-code-quality/SKILL.md",
        "skills/review-code-quality/agents/openai.yaml",
        "templates/review-report.md",
        "adapters/ccb/README.md",
        "adapters/codex/README.md",
        "adapters/claude-code/README.md",
        "adapters/hive/README.md",
        "tests/validation.md",
    ):
        assert ROLE_ROOT.joinpath(relative).is_file()


def test_code_reviewer_content_keeps_scoring_and_verdicts_simple() -> None:
    memory = ROLE_ROOT.joinpath("memory.md").read_text(encoding="utf-8")
    skill = ROLE_ROOT.joinpath("skills/review-code-quality/SKILL.md").read_text(
        encoding="utf-8"
    )
    report = ROLE_ROOT.joinpath("templates/review-report.md").read_text(
        encoding="utf-8"
    )
    validation = ROLE_ROOT.joinpath("tests/validation.md").read_text(
        encoding="utf-8"
    )

    assert skill.startswith("---\n")
    assert "name: review-code-quality" in skill
    assert "five independent quality scores" in skill
    assert "**Correctness**" in skill
    assert "**Simplicity and readability**" in skill
    assert "**Error handling and fallback integrity**" in skill
    assert "**Design and maintainability**" in skill
    assert "**Tests and risk control**" in skill
    assert "Do not deduct without evidence" in skill
    assert "Never let it override the verdict rules" in skill
    assert "Always report five independent integer scores" in memory
    assert "verdict: approve|approve_with_comments|changes_required|blocked" in report
    assert report.count("<1-5>/5") == 5
    assert "silent degradation" in validation


def test_code_reviewer_installs_and_aliases_resolve(
    tmp_path: Path, monkeypatch, capsys
) -> None:
    expected_aliases = {"code-reviewer", "code_reviewer", "reviewer", "checker"}
    assert set(aliases_for("agentroles.code_reviewer", sources=(REPO_ROOT,))) == expected_aliases
    for alias in expected_aliases:
        assert canonical_role_id(alias, sources=(REPO_ROOT,)) == "agentroles.code_reviewer"

    install = _run_json(["install", "code-reviewer"], tmp_path, monkeypatch, capsys)
    assert install["role_status"] == "installed"
    assert install["role_id"] == "agentroles.code_reviewer"
    assert install["version"] == "0.2.0"

    resolved = _run_json(["resolve", "reviewer"], tmp_path, monkeypatch, capsys)
    assert resolved["status"] == "ok"
    assert resolved["role_id"] == "agentroles.code_reviewer"
    assert resolved["installed"] is True
