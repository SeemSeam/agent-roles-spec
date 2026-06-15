from __future__ import annotations

import json
from pathlib import Path
import sys

from agent_roles.catalog import aliases_for, canonical_role_id
from agent_roles.cli import run
from agent_roles.manifest import load_role, read_toml


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_ROOT = REPO_ROOT / "roles" / "frontend-engineer"


def _run_json(argv: list[str], tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("AGENT_ROLES_STORE", str(tmp_path / "store"))
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(REPO_ROOT))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    code = run(argv + ["--json"], stdout=sys.stdout, stderr=sys.stderr)
    captured = capsys.readouterr()
    assert code == 0, captured.err
    return json.loads(captured.out)


def test_frontend_engineer_role_loads_with_expected_inventory() -> None:
    role = load_role(ROLE_ROOT)

    assert role.id == "agentroles.frontend_engineer"
    assert role.name == "Frontend Design Engineer"
    assert role.version == "0.2.0"
    assert role.catalog_level == "experimental"

    identity = role.table("identity")
    assert identity["interaction_mode"] == "interactive"
    assert identity["initiates_actions"] is False
    assert "production frontend UI" in identity["purpose"]
    assert any("Figma context" in item for item in identity["responsibilities"])
    assert any("AGY worktrees" in item for item in identity["non_goals"])

    contents = role.table("contents")
    assert contents["memory"] == ["memory.md"]
    assert contents["skills"] == [
        "skills/frontend-brief",
        "skills/visual-direction",
        "skills/design-system-tokens",
        "skills/component-composition",
        "skills/figma-to-code",
        "skills/responsive-accessibility",
        "skills/browser-quality",
        "skills/agy-frontend-delegate",
        "skills/demo-kb-curation",
    ]
    assert contents["references"] == [
        "references/design-system-and-tokens.md",
        "references/accessibility-and-browser-quality.md",
        "references/mcp-and-agy-workflows.md",
        "references/demo-catalog.md",
    ]
    assert contents["tools"] == ["tools/README.md", "tools/mcp-tools.toml"]
    assert contents["tool_manifests"] == ["tools/mcp-tools.toml"]
    assert contents["plugins"] == ["plugins/frontend-mcp-toolbox"]
    assert contents["tests"] == ["tests/validation.md"]

    permissions = role.table("permissions")
    assert permissions["read_files"] is True
    assert permissions["write_files"] is True
    assert permissions["network"] is True
    assert permissions["secrets"] == "none"

    assert role.adapter("codex")["display_name"] == "frontend"
    assert role.adapter("claude-code")["display_name"] == "frontend"
    assert role.adapter("ccb")["display_name"] == "frontend"
    assert role.adapter("hive")["display_name"] == "frontend"

    for relative in (
        "README.md",
        "memory.md",
        "skills/frontend-brief/SKILL.md",
        "skills/visual-direction/SKILL.md",
        "skills/design-system-tokens/SKILL.md",
        "skills/component-composition/SKILL.md",
        "skills/figma-to-code/SKILL.md",
        "skills/responsive-accessibility/SKILL.md",
        "skills/browser-quality/SKILL.md",
        "skills/agy-frontend-delegate/SKILL.md",
        "skills/demo-kb-curation/SKILL.md",
        "references/design-system-and-tokens.md",
        "references/accessibility-and-browser-quality.md",
        "references/mcp-and-agy-workflows.md",
        "references/demo-catalog.md",
        "tools/README.md",
        "tools/mcp-tools.toml",
        "plugins/frontend-mcp-toolbox/README.md",
        "plugins/frontend-mcp-toolbox/mcp.json.template",
        "adapters/codex/README.md",
        "adapters/claude-code/README.md",
        "adapters/ccb/README.md",
        "adapters/hive/README.md",
        "tests/validation.md",
    ):
        assert ROLE_ROOT.joinpath(relative).is_file()

    memory = ROLE_ROOT.joinpath("memory.md").read_text(encoding="utf-8")
    assert "Treat AGY output as a candidate diff" in memory
    assert "Do not invent component props" in memory

    tools = ROLE_ROOT.joinpath("tools/README.md").read_text(encoding="utf-8")
    assert "does not install tools by itself" in tools
    assert "MCP server config files" in tools

    tool_manifest = read_toml(ROLE_ROOT / "tools" / "mcp-tools.toml")
    assert tool_manifest["schema"] == "agent-role/tool-manifest/preview-0.1"
    assert tool_manifest["runtime"]["scope"] == "role-private"
    assert tool_manifest["runtime"]["install_policy"] == "explicit"
    tool_ids = {tool["id"] for tool in tool_manifest["tools"]}
    assert {
        "figma-mcp",
        "storybook-mcp",
        "playwright-mcp",
        "chrome-devtools-mcp",
        "context-docs-mcp",
        "shadcn-mcp",
        "style-dictionary",
        "agy",
    }.issubset(tool_ids)
    assert "FIGMA_ACCESS_TOKEN" in next(
        tool for tool in tool_manifest["tools"] if tool["id"] == "figma-mcp"
    )["requires_secrets"]


def test_frontend_engineer_skills_have_yaml_frontmatter() -> None:
    for skill_path in sorted(ROLE_ROOT.glob("skills/*/SKILL.md")):
        text = skill_path.read_text(encoding="utf-8")
        assert text.startswith("---\n"), skill_path
        closing = text.find("\n---\n", 4)
        assert closing > 0, skill_path
        frontmatter = text[4:closing]
        assert "\nname:" in f"\n{frontmatter}", skill_path
        assert "\ndescription:" in f"\n{frontmatter}", skill_path


def test_frontend_engineer_installs_and_aliases_resolve_from_catalog(
    tmp_path: Path, monkeypatch, capsys
) -> None:
    assert canonical_role_id("frontend", sources=(REPO_ROOT,)) == "agentroles.frontend_engineer"
    assert canonical_role_id("frontend-engineer", sources=(REPO_ROOT,)) == "agentroles.frontend_engineer"
    assert canonical_role_id("frontend-designer", sources=(REPO_ROOT,)) == "agentroles.frontend_engineer"
    assert canonical_role_id("ui-engineer", sources=(REPO_ROOT,)) == "agentroles.frontend_engineer"
    assert set(aliases_for("agentroles.frontend_engineer", sources=(REPO_ROOT,))) == {
        "frontend",
        "frontend-designer",
        "frontend-engineer",
        "ui-engineer",
    }

    install = _run_json(["install", "frontend"], tmp_path, monkeypatch, capsys)
    assert install["role_status"] == "installed"
    assert install["role_id"] == "agentroles.frontend_engineer"
    assert install["version"] == "0.2.0"
    assert install["catalog_level"] == "experimental"

    resolved = _run_json(["resolve", "ui-engineer"], tmp_path, monkeypatch, capsys)
    assert resolved["status"] == "ok"
    assert resolved["requested_role_id"] == "ui-engineer"
    assert resolved["role_id"] == "agentroles.frontend_engineer"
    assert resolved["installed"] is True


def test_frontend_engineer_list_discovers_role_from_clean_store(
    tmp_path: Path, monkeypatch, capsys
) -> None:
    listing = _run_json(["list"], tmp_path, monkeypatch, capsys)
    rows = {row["role_id"]: row for row in listing["roles"]}

    assert "agentroles.frontend_engineer" in rows
    row = rows["agentroles.frontend_engineer"]
    assert row["version"] == "0.2.0"
    assert row["catalog_level"] == "experimental"
    assert row["status"] == "available"
    assert row["update_reason"] == "not_installed"
    assert set(row["aliases"]) == {
        "frontend",
        "frontend-designer",
        "frontend-engineer",
        "ui-engineer",
    }
