from __future__ import annotations

import json
from pathlib import Path
import sys

from agent_roles.catalog import aliases_for, canonical_role_id
from agent_roles.cli import run
from agent_roles.manifest import load_role


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_ROOT = REPO_ROOT / "roles" / "coder"


def _run_json(argv: list[str], tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("AGENT_ROLES_STORE", str(tmp_path / "store"))
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(REPO_ROOT))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    code = run(argv + ["--json"], stdout=sys.stdout, stderr=sys.stderr)
    captured = capsys.readouterr()
    assert code == 0, captured.err
    return json.loads(captured.out)


def test_coder_role_loads_with_expected_inventory() -> None:
    role = load_role(ROLE_ROOT)

    assert role.id == "agentroles.coder"
    assert role.name == "Coder"
    assert role.version == "0.1.0"
    assert role.catalog_level == "experimental"
    assert "repo-native" in role.description
    assert "silent fallbacks" in role.description

    identity = role.table("identity")
    assert identity["interaction_mode"] == "interactive"
    assert identity["initiates_actions"] is False
    assert "focused code changes" in identity["purpose"]
    assert any("smallest code change" in item for item in identity["responsibilities"])
    assert any("large-file growth" in item for item in identity["responsibilities"])
    assert any("silent fallbacks" in item for item in identity["responsibilities"])
    assert any("Approve code for merge" in item for item in identity["non_goals"])
    assert any("architecture" in item.lower() for item in identity["non_goals"])

    contents = role.table("contents")
    assert contents["memory"] == ["memory.md"]
    assert contents["skills"] == [
        "skills/code-context-scan",
        "skills/minimal-implementation",
        "skills/test-backed-change",
        "skills/bug-fix-prove-it",
        "skills/fallback-discipline",
        "skills/large-file-control",
        "skills/repo-style-following",
        "skills/source-check-before-api-use",
        "skills/ci-failure-fix",
        "skills/safe-dependency-change",
    ]
    assert contents["references"] == [
        "references/coding-discipline.md",
        "references/role-boundaries.md",
    ]
    assert contents["templates"] == [
        "templates/implementation-brief.md",
        "templates/change-slice.md",
        "templates/code-style-contract.md",
        "templates/fallback-discipline.md",
        "templates/large-file-control.md",
        "templates/test-proof.md",
        "templates/dependency-change-gate.md",
        "templates/final-report.md",
    ]
    assert contents["tests"] == ["tests/validation.md"]

    permissions = role.table("permissions")
    assert permissions["read_files"] is True
    assert permissions["write_files"] is True
    assert permissions["network"] is True
    assert permissions["secrets"] == "none"

    assert role.adapter("codex")["display_name"] == "coder"
    assert role.adapter("claude-code")["display_name"] == "coder"
    assert role.adapter("ccb")["display_name"] == "coder"
    assert role.adapter("hive")["display_name"] == "coder"

    for relative in (
        "README.md",
        "memory.md",
        "skills/code-context-scan/SKILL.md",
        "skills/minimal-implementation/SKILL.md",
        "skills/test-backed-change/SKILL.md",
        "skills/bug-fix-prove-it/SKILL.md",
        "skills/fallback-discipline/SKILL.md",
        "skills/large-file-control/SKILL.md",
        "skills/repo-style-following/SKILL.md",
        "skills/source-check-before-api-use/SKILL.md",
        "skills/ci-failure-fix/SKILL.md",
        "skills/safe-dependency-change/SKILL.md",
        "references/coding-discipline.md",
        "references/role-boundaries.md",
        "templates/implementation-brief.md",
        "templates/change-slice.md",
        "templates/code-style-contract.md",
        "templates/fallback-discipline.md",
        "templates/large-file-control.md",
        "templates/test-proof.md",
        "templates/dependency-change-gate.md",
        "templates/final-report.md",
        "adapters/codex/README.md",
        "adapters/claude-code/README.md",
        "adapters/ccb/README.md",
        "adapters/hive/README.md",
        "tests/validation.md",
    ):
        assert ROLE_ROOT.joinpath(relative).is_file()


def test_coder_memory_references_and_templates_capture_design() -> None:
    memory = ROLE_ROOT.joinpath("memory.md").read_text(encoding="utf-8")
    discipline = ROLE_ROOT.joinpath("references/coding-discipline.md").read_text(encoding="utf-8")
    boundaries = ROLE_ROOT.joinpath("references/role-boundaries.md").read_text(encoding="utf-8")
    fallback = ROLE_ROOT.joinpath("templates/fallback-discipline.md").read_text(encoding="utf-8")
    large_file = ROLE_ROOT.joinpath("templates/large-file-control.md").read_text(encoding="utf-8")
    dependency = ROLE_ROOT.joinpath("templates/dependency-change-gate.md").read_text(encoding="utf-8")
    style = ROLE_ROOT.joinpath("templates/code-style-contract.md").read_text(encoding="utf-8")

    assert "focused implementation engineer" in memory
    assert "Fallback Discipline" in memory
    assert "Large File Control" in memory
    assert "Do not claim formal approval yourself" in memory
    assert "OpenAI Codex manual" in discipline
    assert "addyosmani/agent-skills" in discipline
    assert "mattpocock/skills" in discipline
    assert "awesome-skills/code-review-skill" in discipline
    assert "no third-party skills are copied" in discipline
    assert "referenced only" in discipline
    assert "Formal code review or merge approval" in boundaries
    assert "empty catch blocks" in fallback
    assert "Do not split files mechanically" in large_file
    assert "Approval" in dependency
    assert "Do not introduce inheritance" in style


def test_coder_skills_have_safe_yaml_frontmatter() -> None:
    for skill_path in sorted(ROLE_ROOT.glob("skills/*/SKILL.md")):
        text = skill_path.read_text(encoding="utf-8")
        assert text.startswith("---\n"), skill_path
        closing = text.find("\n---\n", 4)
        assert closing > 0, skill_path
        frontmatter = text[4:closing]
        assert "\nname:" in f"\n{frontmatter}", skill_path
        assert "\ndescription:" in f"\n{frontmatter}", skill_path
        for line in frontmatter.splitlines():
            if ": " not in line:
                continue
            _, value = line.split(": ", 1)
            if ": " in value:
                assert value.startswith(('"', "'", "|", ">")), skill_path


def test_coder_installs_and_aliases_resolve_from_catalog(
    tmp_path: Path, monkeypatch, capsys
) -> None:
    assert canonical_role_id("coder", sources=(REPO_ROOT,)) == "agentroles.coder"
    assert canonical_role_id("code-writer", sources=(REPO_ROOT,)) == "agentroles.coder"
    assert canonical_role_id("implementation-engineer", sources=(REPO_ROOT,)) == "agentroles.coder"
    assert set(aliases_for("agentroles.coder", sources=(REPO_ROOT,))) == {
        "coder",
        "code-writer",
        "implementation-engineer",
    }

    install = _run_json(["install", "coder"], tmp_path, monkeypatch, capsys)
    assert install["role_status"] == "installed"
    assert install["role_id"] == "agentroles.coder"
    assert install["version"] == "0.1.0"
    assert install["catalog_level"] == "experimental"

    resolved = _run_json(["resolve", "code-writer"], tmp_path, monkeypatch, capsys)
    assert resolved["status"] == "ok"
    assert resolved["requested_role_id"] == "code-writer"
    assert resolved["role_id"] == "agentroles.coder"
    assert resolved["installed"] is True


def test_coder_list_discovers_role_from_clean_store(tmp_path: Path, monkeypatch, capsys) -> None:
    listing = _run_json(["list"], tmp_path, monkeypatch, capsys)
    rows = {row["role_id"]: row for row in listing["roles"]}

    assert "agentroles.coder" in rows
    row = rows["agentroles.coder"]
    assert row["version"] == "0.1.0"
    assert row["catalog_level"] == "experimental"
    assert row["status"] == "available"
    assert row["update_reason"] == "not_installed"
    assert set(row["aliases"]) == {
        "coder",
        "code-writer",
        "implementation-engineer",
    }
