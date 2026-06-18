from __future__ import annotations

import json
from pathlib import Path
import sys

from agent_roles.catalog import aliases_for, canonical_role_id
from agent_roles.cli import run
from agent_roles.manifest import load_role


REPO_ROOT = Path(__file__).resolve().parents[1]
ROLE_ROOT = REPO_ROOT / "roles" / "mobile-app-engineer"


def _run_json(argv: list[str], tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("AGENT_ROLES_STORE", str(tmp_path / "store"))
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(REPO_ROOT))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    code = run(argv + ["--json"], stdout=sys.stdout, stderr=sys.stderr)
    captured = capsys.readouterr()
    assert code == 0, captured.err
    return json.loads(captured.out)


def test_mobile_app_engineer_role_loads_with_expected_inventory() -> None:
    role = load_role(ROLE_ROOT)

    assert role.id == "agentroles.mobile_app_engineer"
    assert role.name == "Mobile App Engineer"
    assert role.version == "0.2.0"
    assert role.catalog_level == "experimental"
    assert "React Native" in role.description
    assert "Flutter" in role.description
    assert "emulator/simulator labs" in role.description

    identity = role.table("identity")
    assert identity["interaction_mode"] == "interactive"
    assert identity["initiates_actions"] is False
    assert "production mobile apps" in identity["purpose"]
    assert any("asset" in item.lower() for item in identity["responsibilities"])
    assert any("simulators and Android emulators" in item for item in identity["responsibilities"])
    assert any("App Store" in item for item in identity["responsibilities"])
    assert any("signing keys" in item for item in identity["non_goals"])
    assert any("global SDK state" in item for item in identity["non_goals"])

    contents = role.table("contents")
    assert contents["memory"] == ["memory.md"]
    assert contents["skills"] == [
        "skills/mobile-app-brief",
        "skills/ui-ux-pro-max",
        "skills/mobile-ux-flow",
        "skills/mobile-stack-patterns",
        "skills/mobile-component-system",
        "skills/mobile-virtual-device-lab",
        "skills/mobile-device-quality",
        "skills/mobile-release-readiness",
        "skills/mobile-library-curation",
    ]
    assert contents["prompts"] == ["prompts/mobile-app-build.md"]
    assert contents["references"] == [
        "references/mobile-platform-and-stack-guide.md",
        "references/mobile-skill-and-asset-library.md",
        "references/mobile-quality-and-release.md",
        "references/ui-ux-pro-max-provenance.md",
    ]
    assert contents["tools"] == ["tools/README.md"]
    assert contents["tests"] == ["tests/validation.md"]

    permissions = role.table("permissions")
    assert permissions["read_files"] is True
    assert permissions["write_files"] is True
    assert permissions["network"] is True
    assert permissions["secrets"] == "none"

    assert role.adapter("codex")["display_name"] == "mobile"
    assert role.adapter("claude-code")["display_name"] == "mobile"
    assert role.adapter("ccb")["display_name"] == "mobile"
    assert role.adapter("hive")["display_name"] == "mobile"

    for relative in (
        "README.md",
        "memory.md",
        "skills/mobile-app-brief/SKILL.md",
        "skills/ui-ux-pro-max/SKILL.md",
        "skills/ui-ux-pro-max/scripts/search.py",
        "skills/ui-ux-pro-max/data/colors.csv",
        "skills/ui-ux-pro-max/LICENSE",
        "skills/mobile-ux-flow/SKILL.md",
        "skills/mobile-stack-patterns/SKILL.md",
        "skills/mobile-component-system/SKILL.md",
        "skills/mobile-virtual-device-lab/SKILL.md",
        "skills/mobile-device-quality/SKILL.md",
        "skills/mobile-release-readiness/SKILL.md",
        "skills/mobile-library-curation/SKILL.md",
        "references/mobile-platform-and-stack-guide.md",
        "references/mobile-skill-and-asset-library.md",
        "references/mobile-quality-and-release.md",
        "references/ui-ux-pro-max-provenance.md",
        "prompts/mobile-app-build.md",
        "tools/README.md",
        "adapters/codex/README.md",
        "adapters/claude-code/README.md",
        "adapters/ccb/README.md",
        "adapters/hive/README.md",
        "tests/validation.md",
    ):
        assert ROLE_ROOT.joinpath(relative).is_file()


def test_mobile_app_engineer_memory_and_references_capture_design() -> None:
    memory = ROLE_ROOT.joinpath("memory.md").read_text(encoding="utf-8")
    platform = ROLE_ROOT.joinpath("references/mobile-platform-and-stack-guide.md").read_text(encoding="utf-8")
    library = ROLE_ROOT.joinpath("references/mobile-skill-and-asset-library.md").read_text(encoding="utf-8")
    quality = ROLE_ROOT.joinpath("references/mobile-quality-and-release.md").read_text(encoding="utf-8")

    assert "senior mobile app engineer" in memory
    assert "device-evidence driven" in memory
    assert "React Native, Expo, Flutter, SwiftUI, and Jetpack Compose" in memory
    assert "mobile-virtual-device-lab" in memory
    assert "App Store" in quality
    assert "Google Play" in quality
    assert "Virtual Device Lab" in quality
    assert "sdkmanager" in quality
    assert "avdmanager" in quality
    assert "xcrun simctl" in quality
    assert "Expo Orbit" in quality
    assert "Expo Skills" in library
    assert "UI/UX Pro Max" in library
    assert "Callstack React Native Best Practices" in library
    assert "Software Mansion React Native skills" in library
    assert "Apple Design Resources" in library
    assert "Lucide React Native" in library
    assert "Rive React Native" in library
    assert "https://docs.expo.dev/skills/" in library
    assert "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill" in library
    assert "https://developer.apple.com/design/human-interface-guidelines/" in platform
    assert "https://developer.android.com/quality" in platform

    provenance = ROLE_ROOT.joinpath("references/ui-ux-pro-max-provenance.md").read_text(encoding="utf-8")
    assert "b7e3af80f6e331f6fb456667b82b12cade7c9d35" in provenance
    assert "Treatment: `vendored_intact`" in provenance


def test_mobile_app_engineer_skills_have_safe_yaml_frontmatter() -> None:
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


def test_mobile_app_engineer_installs_and_aliases_resolve_from_catalog(
    tmp_path: Path, monkeypatch, capsys
) -> None:
    assert canonical_role_id("mobile", sources=(REPO_ROOT,)) == "agentroles.mobile_app_engineer"
    assert canonical_role_id("mobile-app", sources=(REPO_ROOT,)) == "agentroles.mobile_app_engineer"
    assert canonical_role_id("mobile-app-engineer", sources=(REPO_ROOT,)) == "agentroles.mobile_app_engineer"
    assert canonical_role_id("app-engineer", sources=(REPO_ROOT,)) == "agentroles.mobile_app_engineer"
    assert set(aliases_for("agentroles.mobile_app_engineer", sources=(REPO_ROOT,))) == {
        "app-engineer",
        "mobile",
        "mobile-app",
        "mobile-app-engineer",
    }

    install = _run_json(["install", "mobile"], tmp_path, monkeypatch, capsys)
    assert install["role_status"] == "installed"
    assert install["role_id"] == "agentroles.mobile_app_engineer"
    assert install["version"] == "0.2.0"
    assert install["catalog_level"] == "experimental"

    resolved = _run_json(["resolve", "app-engineer"], tmp_path, monkeypatch, capsys)
    assert resolved["status"] == "ok"
    assert resolved["requested_role_id"] == "app-engineer"
    assert resolved["role_id"] == "agentroles.mobile_app_engineer"
    assert resolved["installed"] is True


def test_mobile_app_engineer_list_discovers_role_from_clean_store(
    tmp_path: Path, monkeypatch, capsys
) -> None:
    listing = _run_json(["list"], tmp_path, monkeypatch, capsys)
    rows = {row["role_id"]: row for row in listing["roles"]}

    assert "agentroles.mobile_app_engineer" in rows
    row = rows["agentroles.mobile_app_engineer"]
    assert row["version"] == "0.2.0"
    assert row["catalog_level"] == "experimental"
    assert row["status"] == "available"
    assert row["update_reason"] == "not_installed"
    assert set(row["aliases"]) == {
        "app-engineer",
        "mobile",
        "mobile-app",
        "mobile-app-engineer",
    }
