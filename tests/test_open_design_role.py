from __future__ import annotations

import json
from pathlib import Path
import sys

from agent_roles.catalog import canonical_role_id
from agent_roles.cli import run
from agent_roles.manifest import load_role, read_toml


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_ROOT = REPO_ROOT / "roles" / "open-design"


def _run_json(argv: list[str], tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("AGENT_ROLES_STORE", str(tmp_path / "store"))
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(REPO_ROOT))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    code = run(argv + ["--json"], stdout=sys.stdout, stderr=sys.stderr)
    captured = capsys.readouterr()
    assert code == 0, captured.err
    return json.loads(captured.out)


def test_open_design_role_loads_with_expected_inventory() -> None:
    role = load_role(ROLE_ROOT)

    assert role.id == "agentroles.open-design"
    assert role.name == "Open Design"
    assert role.version == "0.1.0"
    assert role.catalog_level == "experimental"
    assert "Role wrapper" in role.description
    assert "Agent Roles" in role.description

    identity = role.table("identity")
    assert identity["interaction_mode"] == "interactive"
    assert identity["initiates_actions"] is False
    assert "Open Design design workbench" in identity["purpose"]
    assert any("wrapper around nexu-io/open-design" in item for item in identity["responsibilities"])
    assert any("silently" in item for item in identity["non_goals"])
    assert any("already installed" in item for item in identity["non_goals"])

    contents = role.table("contents")
    assert contents["memory"] == ["memory.md"]
    assert contents["skills"] == [
        "skills/open-design-workbench",
        "skills/od-contribute",
        "upstream/open-design/skills",
    ]
    assert contents["prompts"] == ["prompts/od-contribute-command.md"]
    assert contents["tool_manifests"] == ["tools/open-design-tools.toml"]
    assert "plugins/open-design-claude" in contents["plugins"]
    assert "plugins/open-design-marketplace" in contents["plugins"]
    assert "upstream/open-design/plugins" in contents["plugins"]
    assert "references/open-design-github" in contents["references"]
    assert "references/open-design-vaunt" in contents["references"]
    assert "upstream/open-design/design-systems" in contents["references"]
    assert "templates/open-design-runtime-config" in contents["templates"]
    assert "upstream/open-design/design-templates" in contents["templates"]

    permissions = role.table("permissions")
    assert permissions["read_files"] is True
    assert permissions["write_files"] is True
    assert permissions["network"] is True
    assert permissions["secrets"] == "external"

    assert role.adapter("codex")["display_name"] == "open-design"
    assert role.adapter("claude-code")["display_name"] == "open-design"
    assert role.adapter("ccb")["display_name"] == "open-design"
    assert role.adapter("hive")["display_name"] == "open-design"


def test_open_design_wrapper_and_upstream_source_exist() -> None:
    required_files = [
        "README.md",
        "memory.md",
        "role.toml",
        "skills/open-design-workbench/SKILL.md",
        "skills/od-contribute/SKILL.md",
        "skills/od-contribute/scripts/check-prereqs.sh",
        "prompts/od-contribute-command.md",
        "plugins/open-design-claude/plugin.json",
        "plugins/open-design-claude/mcp.json",
        "plugins/open-design-marketplace/marketplace.json",
        "plugins/community-import-smoke-test-claude/plugin.json",
        "templates/open-design-runtime-config/dockerignore",
        "templates/open-design-runtime-config/root.gitignore",
        "templates/open-design-runtime-config/node-version.txt",
        "templates/open-design-runtime-config/landing-page.env.example",
        "templates/open-design-runtime-config/deploy.env.example",
        "templates/open-design-runtime-config/helmignore",
        "templates/open-design-runtime-config/html-ppt.clawscan-allow",
        "references/open-design-github/pull_request_template.md",
        "references/open-design-vaunt/config.yaml",
        "references/open-design-superpowers/plans/2026-05-10-linux-client-parity.md",
        "references/open-design-blueprint.md",
        "references/open-design-provenance.md",
        "tools/README.md",
        "tools/open-design-tools.toml",
        "adapters/codex/README.md",
        "adapters/claude-code/README.md",
        "adapters/ccb/README.md",
        "adapters/hive/README.md",
        "tests/validation.md",
        "upstream/open-design/README.md",
        "upstream/open-design/LICENSE",
        "upstream/open-design/package.json",
        "upstream/open-design/pnpm-lock.yaml",
        "upstream/open-design/apps/daemon/bin/od.mjs",
        "upstream/open-design/skills/README.md",
        "upstream/open-design/design-systems/README.md",
        "upstream/open-design/docs/skills-protocol.md",
        "upstream/open-design/docs/agent-adapters.md",
    ]
    for relative in required_files:
        assert ROLE_ROOT.joinpath(relative).is_file(), relative

    required_dirs = [
        "upstream/open-design/skills",
        "upstream/open-design/design-systems",
        "upstream/open-design/design-templates",
        "upstream/open-design/templates",
        "upstream/open-design/plugins",
        "upstream/open-design/apps",
        "upstream/open-design/packages",
    ]
    for relative in required_dirs:
        assert ROLE_ROOT.joinpath(relative).is_dir(), relative

    assert len(list((ROLE_ROOT / "upstream/open-design/skills").glob("*/SKILL.md"))) >= 150
    assert len(list((ROLE_ROOT / "upstream/open-design/design-systems").glob("*/DESIGN.md"))) >= 140


def test_open_design_tool_manifest_and_boundaries() -> None:
    manifest = read_toml(ROLE_ROOT / "tools" / "open-design-tools.toml")
    assert manifest["schema"] == "agent-role/tool-manifest/preview-0.1"
    assert manifest["runtime"]["scope"] == "provider-shared"
    assert manifest["runtime"]["install_policy"] == "explicit"
    assert manifest["runtime"]["secrets"] == "external"
    tool_ids = {tool["id"] for tool in manifest["tools"]}
    assert {"open-design-source", "od-cli", "open-design-mcp", "open-design-plugins"} <= tool_ids

    memory = ROLE_ROOT.joinpath("memory.md").read_text(encoding="utf-8")
    tools = ROLE_ROOT.joinpath("tools/README.md").read_text(encoding="utf-8")
    provenance = ROLE_ROOT.joinpath("references/open-design-provenance.md").read_text(encoding="utf-8")

    assert "not the same as an installed runtime" in memory
    assert "Host Adapter or user-approved" in memory
    assert "runtime concerns" in memory
    assert "not an installed runtime" in tools
    assert "f24bda9c97cf80a7d95c118ea7a5bbcdfe69f30d" in provenance
    assert "Treatment: `vendored_modified`" in provenance
    assert ".claude/skills/od-contribute" in provenance


def test_open_design_source_boundary_excludes_runtime_dependency_and_hidden_entrypoints() -> None:
    excluded = [
        ".git",
        "node_modules",
        ".next",
        "dist",
        "build",
        ".turbo",
        ".cache",
        "coverage",
        ".claude",
        ".claude-plugin",
        ".github",
        ".vaunt",
        ".dockerignore",
        ".node-version",
        ".mcp.json",
        ".env.example",
        ".helmignore",
        ".clawscan-allow",
    ]
    upstream = ROLE_ROOT / "upstream/open-design"
    for name in excluded:
        assert not any(path.name == name for path in upstream.rglob(name)), name


def test_open_design_installs_and_resolves_from_catalog(tmp_path: Path, monkeypatch, capsys) -> None:
    assert canonical_role_id("agentroles.open-design", sources=(REPO_ROOT,)) == "agentroles.open-design"

    install = _run_json(["install", "agentroles.open-design"], tmp_path, monkeypatch, capsys)
    assert install["role_status"] == "installed"
    assert install["role_id"] == "agentroles.open-design"
    assert install["version"] == "0.1.0"
    assert install["catalog_level"] == "experimental"

    resolved = _run_json(["resolve", "agentroles.open-design"], tmp_path, monkeypatch, capsys)
    assert resolved["status"] == "ok"
    assert resolved["requested_role_id"] == "agentroles.open-design"
    assert resolved["role_id"] == "agentroles.open-design"
    assert resolved["installed"] is True


def test_open_design_list_discovers_role_from_clean_store(tmp_path: Path, monkeypatch, capsys) -> None:
    listing = _run_json(["list"], tmp_path, monkeypatch, capsys)
    rows = {row["role_id"]: row for row in listing["roles"]}

    assert "agentroles.open-design" in rows
    row = rows["agentroles.open-design"]
    assert row["version"] == "0.1.0"
    assert row["catalog_level"] == "experimental"
    assert row["status"] == "available"
    assert row["update_reason"] == "not_installed"
