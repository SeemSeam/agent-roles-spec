from __future__ import annotations

import json
from pathlib import Path

from agent_roles.cli import run


def _write_role(root: Path, role_id: str = "agentroles.demo", version: str = "0.1.0") -> Path:
    role = root / "roles" / role_id.rsplit(".", 1)[-1]
    role.mkdir(parents=True)
    (role / "role.toml").write_text(
        f'''schema = "agent-role/preview-0.1"
id = "{role_id}"
name = "Demo Role"
version = "{version}"
created_at = "2026-06-04T00:00:00Z"
updated_at = "2026-06-04T00:00:00Z"
description = "Demo role."
license = "Apache-2.0"

[identity]
default_name = "demo"
purpose = "Demo."
responsibilities = ["Demo."]
non_goals = ["Demo."]
''',
        encoding="utf-8",
    )
    (role / "memory.md").write_text("Demo memory.\n", encoding="utf-8")
    return role


def test_version_exits_successfully(capsys) -> None:
    code = run(["--version"], stdout=__import__("sys").stdout, stderr=__import__("sys").stderr)
    captured = capsys.readouterr()
    assert code == 0
    assert captured.out.startswith("agent-roles ")


def _run_json(argv: list[str], tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("AGENT_ROLES_STORE", str(tmp_path / "store"))
    code = run(argv + ["--json"], stdout=__import__("sys").stdout, stderr=__import__("sys").stderr)
    captured = capsys.readouterr()
    assert code == 0, captured.err
    return json.loads(captured.out)


def _run_failed_json(argv: list[str], tmp_path: Path, monkeypatch, capsys):
    monkeypatch.setenv("AGENT_ROLES_STORE", str(tmp_path / "store"))
    code = run(argv + ["--json"], stdout=__import__("sys").stdout, stderr=__import__("sys").stderr)
    captured = capsys.readouterr()
    assert code == 1, captured.out
    return json.loads(captured.err)


def test_install_and_resolve_from_catalog(tmp_path: Path, monkeypatch, capsys) -> None:
    catalog = tmp_path / "catalog"
    role = _write_role(catalog)
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(catalog))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")

    install = _run_json(["install", "agentroles.demo"], tmp_path, monkeypatch, capsys)
    assert install["role_status"] == "installed"
    assert install["role_id"] == "agentroles.demo"
    assert install["version"] == "0.1.0"
    assert install["updated_at"] == "2026-06-04T00:00:00Z"
    assert Path(install["path"]).is_dir()

    resolve = _run_json(["resolve", "agentroles.demo"], tmp_path, monkeypatch, capsys)
    assert resolve["status"] == "ok"
    assert resolve["installed"] is True
    assert resolve["installed_path"] == install["path"]
    assert resolve["version"] == "0.1.0"
    assert resolve["updated_at"] == "2026-06-04T00:00:00Z"

    metadata = tmp_path / "store" / "installed" / "agentroles.demo" / "install.json"
    assert metadata.is_file()
    assert json.loads(metadata.read_text(encoding="utf-8"))["role_updated_at"] == "2026-06-04T00:00:00Z"
    assert role.is_dir()


def test_update_requires_existing_install(tmp_path: Path, monkeypatch, capsys) -> None:
    catalog = tmp_path / "catalog"
    _write_role(catalog)
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(catalog))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")

    update = _run_failed_json(["update", "agentroles.demo"], tmp_path, monkeypatch, capsys)
    assert update["schema"] == "agent-roles/error/v1"
    assert "role is not installed" in update["error"]


def test_invalid_role_timestamp_fails(tmp_path: Path, monkeypatch, capsys) -> None:
    catalog = tmp_path / "catalog"
    role = _write_role(catalog)
    text = role.joinpath("role.toml").read_text(encoding="utf-8")
    role.joinpath("role.toml").write_text(text.replace("2026-06-04T00:00:00Z", "not-a-date", 1), encoding="utf-8")
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(catalog))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")

    install = _run_failed_json(["install", "--path", str(role)], tmp_path, monkeypatch, capsys)
    assert install["schema"] == "agent-roles/error/v1"
    assert "created_at" in install["error"]


def test_upgrade_single_role_alias(tmp_path: Path, monkeypatch, capsys) -> None:
    catalog = tmp_path / "catalog"
    role = _write_role(catalog, version="0.1.0")
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(catalog))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    _run_json(["install", "agentroles.demo"], tmp_path, monkeypatch, capsys)

    text = (role / "role.toml").read_text(encoding="utf-8")
    (role / "role.toml").write_text(text.replace('version = "0.1.0"', 'version = "0.2.0"'), encoding="utf-8")

    upgrade = _run_json(["upgrade", "agentroles.demo"], tmp_path, monkeypatch, capsys)
    assert upgrade["schema"] == "agent-roles/update/v1"
    assert upgrade["command"] == "upgrade"
    assert upgrade["role_status"] == "upgraded"
    assert upgrade["version"] == "0.2.0"
    assert upgrade["updated_at"] == "2026-06-04T00:00:00Z"


def test_upgrade_all_installed_roles(tmp_path: Path, monkeypatch, capsys) -> None:
    catalog = tmp_path / "catalog"
    role = _write_role(catalog, version="0.1.0")
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(catalog))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    _run_json(["install", "agentroles.demo"], tmp_path, monkeypatch, capsys)

    text = (role / "role.toml").read_text(encoding="utf-8")
    (role / "role.toml").write_text(text.replace('version = "0.1.0"', 'version = "0.3.0"'), encoding="utf-8")

    upgrade = _run_json(["upgrade"], tmp_path, monkeypatch, capsys)
    assert upgrade["schema"] == "agent-roles/upgrade/v1"
    assert upgrade["status"] == "ok"
    assert upgrade["roles"][0]["role_id"] == "agentroles.demo"
    assert upgrade["roles"][0]["status"] == "upgraded"
    assert upgrade["roles"][0]["version"] == "0.3.0"
    assert upgrade["roles"][0]["updated_at"] == "2026-06-04T00:00:00Z"


def test_sync_updates_only_installed_same_id_roles(tmp_path: Path, monkeypatch, capsys) -> None:
    catalog = tmp_path / "catalog"
    role = _write_role(catalog, version="0.1.0")
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(catalog))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")
    _run_json(["install", "agentroles.demo"], tmp_path, monkeypatch, capsys)

    text = (role / "role.toml").read_text(encoding="utf-8")
    (role / "role.toml").write_text(text.replace('version = "0.1.0"', 'version = "0.2.0"'), encoding="utf-8")

    sync = _run_json(["sync", str(catalog)], tmp_path, monkeypatch, capsys)
    assert sync["roles"][0]["status"] == "synced"
    assert sync["roles"][0]["version"] == "0.2.0"


def test_alias_resolves_to_canonical_role(tmp_path: Path, monkeypatch, capsys) -> None:
    catalog = tmp_path / "catalog"
    _write_role(catalog, role_id="agentroles.archi")
    (catalog / "aliases.toml").write_text(
        'schema = "agent-roles-aliases/v1"\n\n[aliases]\n"ccb.archi" = "agentroles.archi"\n',
        encoding="utf-8",
    )
    monkeypatch.setenv("AGENT_ROLES_SPEC_HOME", str(catalog))
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")

    install = _run_json(["install", "ccb.archi"], tmp_path, monkeypatch, capsys)
    assert install["role_id"] == "agentroles.archi"

    doctor = _run_json(["doctor", "ccb.archi"], tmp_path, monkeypatch, capsys)
    assert doctor["role_id"] == "agentroles.archi"
    assert doctor["requested_role_id"] == "ccb.archi"


def test_remote_disabled_without_catalog_has_no_home_fallback(tmp_path: Path, monkeypatch, capsys) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("AGENT_ROLES_SPEC_HOME", raising=False)
    monkeypatch.delenv("AGENT_ROLES_CATALOG", raising=False)
    monkeypatch.setenv("AGENT_ROLES_NO_REMOTE", "1")

    listing = _run_json(["list"], tmp_path, monkeypatch, capsys)
    assert listing["roles"] == []
