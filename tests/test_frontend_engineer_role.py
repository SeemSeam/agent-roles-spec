from __future__ import annotations

import json
import os
from pathlib import Path
import sys
import subprocess

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
    assert role.version == "0.3.0"
    assert role.catalog_level == "experimental"

    identity = role.table("identity")
    assert identity["interaction_mode"] == "interactive"
    assert identity["initiates_actions"] is False
    assert "production frontend UI" in identity["purpose"]
    assert any("Figma context" in item for item in identity["responsibilities"])
    assert any("role-scoped setup" in item for item in identity["responsibilities"])
    assert any("AGY worktrees" in item for item in identity["non_goals"])
    assert any("inside an agent session" in item for item in identity["non_goals"])

    contents = role.table("contents")
    assert contents["memory"] == ["memory.md"]
    assert contents["skills"] == [
        "skills/frontend-brief",
        "skills/ui-ux-pro-max",
        "skills/visual-direction",
        "skills/design-system-tokens",
        "skills/component-composition",
        "skills/figma-to-code",
        "skills/responsive-accessibility",
        "skills/browser-quality",
        "skills/role-setup",
        "skills/agy-frontend-delegate",
        "skills/demo-kb-curation",
    ]
    assert contents["references"] == [
        "references/design-system-and-tokens.md",
        "references/accessibility-and-browser-quality.md",
        "references/mcp-and-agy-workflows.md",
        "references/demo-catalog.md",
        "references/ui-ux-pro-max-provenance.md",
    ]
    assert contents["tools"] == ["tools/README.md", "tools/mcp-tools.toml", "tools/role_setup.py"]
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
        "skills/ui-ux-pro-max/SKILL.md",
        "skills/ui-ux-pro-max/scripts/search.py",
        "skills/ui-ux-pro-max/data/colors.csv",
        "skills/ui-ux-pro-max/LICENSE",
        "skills/visual-direction/SKILL.md",
        "skills/design-system-tokens/SKILL.md",
        "skills/component-composition/SKILL.md",
        "skills/figma-to-code/SKILL.md",
        "skills/responsive-accessibility/SKILL.md",
        "skills/browser-quality/SKILL.md",
        "skills/role-setup/SKILL.md",
        "skills/agy-frontend-delegate/SKILL.md",
        "skills/demo-kb-curation/SKILL.md",
        "references/design-system-and-tokens.md",
        "references/accessibility-and-browser-quality.md",
        "references/mcp-and-agy-workflows.md",
        "references/demo-catalog.md",
        "references/ui-ux-pro-max-provenance.md",
        "tools/README.md",
        "tools/mcp-tools.toml",
        "tools/role_setup.py",
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
    assert "vendored `ui-ux-pro-max` skill" in memory

    provenance = ROLE_ROOT.joinpath("references/ui-ux-pro-max-provenance.md").read_text(encoding="utf-8")
    assert "nextlevelbuilder/ui-ux-pro-max-skill" in provenance
    assert "b7e3af80f6e331f6fb456667b82b12cade7c9d35" in provenance
    assert "Treatment: `vendored_intact`" in provenance

    tools = ROLE_ROOT.joinpath("tools/README.md").read_text(encoding="utf-8")
    assert "does not install tools by itself" in tools
    assert "role_setup" in tools
    assert "MCP server config files" in tools

    tool_manifest = read_toml(ROLE_ROOT / "tools" / "mcp-tools.toml")
    assert tool_manifest["schema"] == "agent-role/tool-manifest/preview-0.1"
    assert tool_manifest["runtime"]["scope"] == "provider-shared"
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
        for line in frontmatter.splitlines():
            if ": " not in line:
                continue
            _, value = line.split(": ", 1)
            if ": " in value:
                assert value.startswith(('"', "'", "|", ">")), skill_path


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
    assert install["version"] == "0.3.0"
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
    assert row["version"] == "0.3.0"
    assert row["catalog_level"] == "experimental"
    assert row["status"] == "available"
    assert row["update_reason"] == "not_installed"
    assert set(row["aliases"]) == {
        "frontend",
        "frontend-designer",
        "frontend-engineer",
        "ui-engineer",
    }


def _run_role_setup(tmp_path: Path, *args: str) -> dict[str, object]:
    project_root = tmp_path / "project"
    provider_home = tmp_path / "codex-home"
    runtime_root = tmp_path / "runtime"
    project_root.mkdir(parents=True, exist_ok=True)
    provider_home.mkdir(parents=True, exist_ok=True)
    env = {
        **os.environ,
        "AGENT_ROLES_PROVIDER": "codex",
        "AGENT_ROLES_PROVIDER_HOME": str(provider_home),
        "AGENT_ROLES_RUNTIME_ROOT": str(runtime_root),
    }
    result = subprocess.run(
        [
            sys.executable,
            str(ROLE_ROOT / "tools" / "role_setup.py"),
            "--role-root",
            str(ROLE_ROOT),
            "--project-root",
            str(project_root),
            "--json",
            *args,
        ],
        cwd=REPO_ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr or result.stdout
    payload = json.loads(result.stdout)
    assert "FIGMA_ACCESS_TOKEN" in result.stdout
    assert "figd_" not in result.stdout
    assert "sk-" not in result.stdout
    return payload


def test_frontend_role_setup_check_is_non_mutating(tmp_path: Path) -> None:
    payload = _run_role_setup(tmp_path, "--mode", "check")

    assert payload["schema"] == "agent-role/role-setup/preview-0.1"
    assert payload["status"] == "ok"
    assert payload["mutated"] is False
    assert payload["role_id"] == "agentroles.frontend_engineer"
    assert payload["role_version"] == "0.3.0"
    assert payload["provider"]["detected"] == "codex"
    assert payload["runtime_scope"] == "provider-shared"
    assert payload["provider_runtime_root"].startswith(str(tmp_path / "runtime"))
    assert "/providers/codex/tools/" in payload["provider_runtime_root"]
    assert payload["project_binding"]["scope"] == "project-private"
    assert payload["project_binding"]["target"].endswith(
        ".agent-roles/bindings/codex/agentroles_frontend_engineer.json"
    )
    assert payload["provider_bridge"]["required"] is True
    assert "shared tools are reused" in payload["provider_bridge"]["purpose"]
    assert payload["manager_lifecycle"]["uninstall_owner"].startswith("agent-roles")
    assert "does not uninstall" in payload["manager_lifecycle"]["notes"]
    assert any(manifest["path"].endswith("tools/mcp-tools.toml") for manifest in payload["manifests"])
    tools = {tool["id"]: tool for tool in payload["tools"]}
    assert tools["figma-mcp"]["missing_secret_names"] == ["FIGMA_ACCESS_TOKEN"]
    assert tools["agy"]["command"] == "agy"
    assert not (tmp_path / "runtime").exists()


def test_frontend_role_setup_plan_apply_and_repair_are_handoffs(tmp_path: Path) -> None:
    plan_payload = _run_role_setup(tmp_path, "--mode", "plan")

    assert plan_payload["status"] == "ok"
    assert plan_payload["mutated"] is False
    assert plan_payload["requires_host_adapter"] is False
    assert plan_payload["handoff"]["required"] is False
    assert all(action["mutates"] is False for action in plan_payload["actions"])

    for mode in ("apply", "repair"):
        payload = _run_role_setup(tmp_path, "--mode", mode, "--yes")
        projection_actions = [
            action
            for action in payload["actions"]
            if action["action"] in {"project_plugin_template", "ensure_provider_bridge", "project_binding"}
        ]

        assert payload["status"] == "needs_host_adapter"
        assert payload["mutated"] is False
        assert payload["requires_host_adapter"] is True
        assert payload["handoff"] == {
            "required": True,
            "script_mutates": False,
            "mutation_owner": "Host Adapter or agent-roles setup",
        }
        assert projection_actions
        assert all(action["mutates"] is False for action in payload["actions"])
        assert all(action["would_mutate"] is True for action in projection_actions)
        assert all(action["requires_host_adapter"] is True for action in projection_actions)

    assert not (tmp_path / "runtime").exists()


def test_frontend_role_setup_resolves_relative_project_root_to_absolute(tmp_path: Path) -> None:
    project_root = tmp_path / "project"
    provider_home = tmp_path / "codex-home"
    runtime_root = tmp_path / "runtime"
    project_root.mkdir()
    provider_home.mkdir()
    env = {
        **os.environ,
        "AGENT_ROLES_PROVIDER": "codex",
        "AGENT_ROLES_PROVIDER_HOME": str(provider_home),
        "AGENT_ROLES_RUNTIME_ROOT": str(runtime_root),
    }
    result = subprocess.run(
        [
            sys.executable,
            str(ROLE_ROOT / "tools" / "role_setup.py"),
            "--role-root",
            str(ROLE_ROOT),
            "--project-root",
            ".",
            "--mode",
            "check",
            "--json",
        ],
        cwd=project_root,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr or result.stdout
    payload = json.loads(result.stdout)
    expected_binding = (
        project_root / ".agent-roles" / "bindings" / "codex" / "agentroles_frontend_engineer.json"
    ).resolve()

    assert payload["role_root"] == str(ROLE_ROOT.resolve())
    assert payload["project_root"] == str(project_root.resolve())
    assert payload["provider"]["home"] == str(provider_home.resolve())
    assert payload["provider"]["config_target"] == str((provider_home / "config.toml").resolve())
    assert payload["project_binding"]["target"] == str(expected_binding)
    assert Path(payload["runtime_root"]).is_absolute()
    assert all(Path(path).is_absolute() for path in payload["projection_outputs"])


def test_frontend_role_setup_apply_stops_on_ambiguous_provider(tmp_path: Path) -> None:
    project_root = tmp_path / "project"
    fake_home = tmp_path / "home"
    project_root.mkdir()
    fake_home.mkdir()
    (project_root / ".mcp.json").write_text("{}", encoding="utf-8")
    (project_root / ".ccb").mkdir()
    env = {**os.environ, "HOME": str(fake_home)}
    for key in (
        "AGENT_ROLES_PROVIDER",
        "AGENT_ROLES_PROVIDER_HOME",
        "AGENT_ROLES_PROVIDER_RUNTIME_ROOT",
        "AGENT_ROLES_RUNTIME_ROOT",
        "CODEX_HOME",
    ):
        env.pop(key, None)

    result = subprocess.run(
        [
            sys.executable,
            str(ROLE_ROOT / "tools" / "role_setup.py"),
            "--role-root",
            str(ROLE_ROOT),
            "--project-root",
            str(project_root),
            "--mode",
            "apply",
            "--yes",
            "--json",
        ],
        cwd=REPO_ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 2
    payload = json.loads(result.stdout)
    assert payload["status"] == "ambiguous_provider"
    assert payload["mutated"] is False
    assert payload["requires_host_adapter"] is True
    assert all(action["mutates"] is False for action in payload["actions"])
    assert any("Multiple provider markers" in warning for warning in payload["warnings"])


def test_frontend_role_setup_does_not_offer_in_agent_uninstall(tmp_path: Path) -> None:
    project_root = tmp_path / "project"
    provider_home = tmp_path / "codex-home"
    project_root.mkdir()
    provider_home.mkdir()
    env = {
        **os.environ,
        "AGENT_ROLES_PROVIDER": "codex",
        "AGENT_ROLES_PROVIDER_HOME": str(provider_home),
    }
    result = subprocess.run(
        [
            sys.executable,
            str(ROLE_ROOT / "tools" / "role_setup.py"),
            "--role-root",
            str(ROLE_ROOT),
            "--project-root",
            str(project_root),
            "--mode",
            "uninstall",
            "--json",
        ],
        cwd=REPO_ROOT,
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 2
    assert "invalid choice" in result.stderr
