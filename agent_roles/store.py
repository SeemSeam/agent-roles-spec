from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import tempfile
from typing import Any

from .manifest import AgentRolesError, Role, load_role


INSTALL_SCHEMA = "agent-roles-install/v1"


@dataclass(frozen=True)
class InstalledRole:
    role_id: str
    version: str
    digest: str
    path: Path
    metadata: dict[str, Any]


def store_root() -> Path:
    value = str(os.environ.get("AGENT_ROLES_STORE") or "").strip()
    if value:
        return Path(value).expanduser()
    return Path.home() / ".roles"


def installed_root() -> Path:
    return store_root() / "installed"


def catalogs_root() -> Path:
    return store_root() / "catalogs"


def install_role_assets(role: Role, *, source: Path, source_kind: str, status: str = "installed") -> dict[str, object]:
    root = installed_root() / role.id
    staging_parent = root / ".staging"
    staging_parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=f"{role.version}-", dir=str(staging_parent)))
    shutil.rmtree(staging)
    try:
        shutil.copytree(source, staging, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", ".DS_Store"))
        digest = tree_digest(staging)
        target = root / "current"
        try:
            _replace_current(target, staging)
        except Exception:
            if target.exists() or target.is_symlink():
                if target.is_symlink() or target.is_file():
                    target.unlink()
                else:
                    shutil.rmtree(target)
            shutil.copytree(staging, target)
    finally:
        if staging.exists():
            shutil.rmtree(staging, ignore_errors=True)
    metadata = {
        "schema": INSTALL_SCHEMA,
        "id": role.id,
        "version": role.version,
        "role_created_at": role.created_at,
        "role_updated_at": role.updated_at,
        "catalog_level": role.catalog_level,
        "source": source_kind,
        "source_path": str(source),
        "digest": f"sha256:{digest}",
        "installed_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
    }
    _write_json(root / "install.json", metadata)
    return {
        "role_status": status,
        "role_id": role.id,
        "version": role.version,
        "created_at": role.created_at,
        "updated_at": role.updated_at,
        "catalog_level": role.catalog_level,
        "digest": f"sha256:{digest}",
        "path": str((root / "current").resolve()),
        "source": source_kind,
        "store_root": str(store_root()),
    }


def load_installed_metadata(role_id: str) -> dict[str, Any]:
    path = installed_root() / role_id / "install.json"
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return dict(payload) if isinstance(payload, dict) else {}


def load_installed(role_id: str) -> InstalledRole | None:
    metadata = load_installed_metadata(role_id)
    if not metadata:
        return None
    version = str(metadata.get("version") or "").strip()
    digest = str(metadata.get("digest") or "").strip()
    digest_hex = digest.removeprefix("sha256:")
    path = _installed_role_path(installed_root() / role_id, version=version, digest=digest_hex)
    if not (path / "role.toml").is_file():
        return None
    return InstalledRole(role_id=role_id, version=version, digest=digest, path=path, metadata=metadata)


def _installed_role_path(root: Path, *, version: str, digest: str) -> Path:
    current = root / "current"
    if current.exists():
        if current.is_symlink():
            try:
                resolved = current.resolve()
            except Exception:
                resolved = None
            if resolved is not None:
                return resolved
        elif current.is_dir():
            return current

    legacy_versions = root / "versions"
    if not legacy_versions.is_dir():
        return current

    if version and digest:
        direct = root / "versions" / version / digest
        if direct.is_dir():
            return direct

    candidates: list[Path] = []
    for legacy_version in sorted(legacy_versions.iterdir(), key=lambda item: item.name):
        if not legacy_version.is_dir():
            continue
        if (legacy_version / "role.toml").is_file():
            candidates.append(legacy_version)
            continue
        for legacy_digest in sorted(legacy_version.iterdir(), key=lambda item: item.name):
            if legacy_digest.is_dir() and (legacy_digest / "role.toml").is_file():
                candidates.append(legacy_digest)
    if candidates:
        return candidates[-1]
    return current


def load_installed_role(role_id: str) -> Role | None:
    installed = load_installed(role_id)
    if installed is None:
        return None
    try:
        return load_role(installed.path)
    except AgentRolesError:
        return None


def installed_role_ids() -> tuple[str, ...]:
    root = installed_root()
    if not root.is_dir():
        return ()
    return tuple(sorted(child.name for child in root.iterdir() if child.is_dir()))


def tree_digest(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(Path(root).rglob("*")):
        rel = path.relative_to(root)
        digest.update(str(rel).encode("utf-8"))
        digest.update(b"\0")
        if path.is_file():
            digest.update(path.read_bytes())
        elif path.is_symlink():
            digest.update(str(path.readlink()).encode("utf-8"))
        digest.update(b"\0")
    return digest.hexdigest()


def _replace_current(current: Path, target: Path) -> None:
    if current.exists() or current.is_symlink():
        if current.is_symlink() or current.is_file():
            current.unlink()
        else:
            shutil.rmtree(current)
    try:
        shutil.move(str(target), str(current))
    except Exception:
        shutil.copytree(target, current)


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=True, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)
