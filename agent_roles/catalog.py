from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
import shutil
import subprocess
from typing import Any

from .manifest import AgentRolesError, load_role, normalize_role_id, read_toml
from .store import catalogs_root, installed_role_ids, load_installed_metadata, tree_digest


DEFAULT_AGENT_ROLES_SPEC_GIT_URL = "https://github.com/SeemSeam/agent-roles-spec"


@dataclass(frozen=True)
class SourceRole:
    source: str
    role_id: str
    version: str
    created_at: str
    updated_at: str
    digest: str
    path: Path
    name: str
    description: str
    catalog_level: str
    aliases: tuple[str, ...] = ()
    duplicates: tuple[str, ...] = ()


def canonical_role_id(role_id: str, *, sources: tuple[Path, ...] | None = None) -> str:
    normalized = normalize_role_ref(role_id)
    aliases = load_aliases(sources=sources)
    seen: set[str] = set()
    current = normalized
    while current in aliases and current not in seen:
        seen.add(current)
        current = normalize_role_ref(aliases[current])
    return normalize_role_id(current)


def normalize_role_ref(value: str) -> str:
    role_ref = str(value or "").strip().lower()
    if not role_ref:
        raise AgentRolesError("role id is required")
    allowed = set("abcdefghijklmnopqrstuvwxyz0123456789._-")
    if any(ch not in allowed for ch in role_ref):
        raise AgentRolesError(f"invalid role id: {value!r}")
    return role_ref


def aliases_for(role_id: str, *, sources: tuple[Path, ...] | None = None) -> tuple[str, ...]:
    canonical = canonical_role_id(role_id, sources=sources)
    aliases = load_aliases(sources=sources)
    return tuple(sorted(alias for alias, target in aliases.items() if canonical_role_id(target, sources=sources) == canonical))


def load_aliases(*, sources: tuple[Path, ...] | None = None) -> dict[str, str]:
    result: dict[str, str] = {"archi": "agentroles.archi", "ccb.archi": "agentroles.archi"}
    for source in sources or catalog_source_paths(refresh=False):
        path = source / "aliases.toml"
        if not path.is_file():
            continue
        try:
            payload = read_toml(path)
        except AgentRolesError:
            continue
        aliases = payload.get("aliases") or {}
        if not isinstance(aliases, dict):
            continue
        for alias, target in aliases.items():
            try:
                result[normalize_role_ref(str(alias))] = normalize_role_ref(str(target))
            except AgentRolesError:
                continue
    return result


def catalog_source_paths(*, refresh: bool = False) -> tuple[Path, ...]:
    candidates: list[Path] = []
    env_value = str(os.environ.get("AGENT_ROLES_SPEC_HOME") or os.environ.get("AGENT_ROLES_CATALOG") or "").strip()
    if env_value:
        candidates.extend(Path(item).expanduser() for item in env_value.split(os.pathsep) if item.strip())
    cwd = Path.cwd()
    if _looks_like_catalog(cwd):
        candidates.append(cwd)
    remote = ensure_default_catalog(refresh=refresh)
    if remote is not None:
        candidates.append(remote)
    deduped: list[Path] = []
    seen: set[Path] = set()
    for candidate in candidates:
        if not _looks_like_catalog(candidate):
            continue
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        deduped.append(resolved)
        seen.add(resolved)
    return tuple(deduped)


def discover_source_roles(*, refresh: bool = False, include_reference: bool | None = None) -> tuple[SourceRole, ...]:
    sources = catalog_source_paths(refresh=refresh)
    return discover_roles_from_paths(sources, include_reference=include_reference)


def discover_roles_from_paths(
    sources: tuple[Path, ...],
    *,
    include_reference: bool | None = None,
) -> tuple[SourceRole, ...]:
    discovered: dict[str, SourceRole] = {}
    duplicates: dict[str, list[str]] = {}
    include_ref = _include_reference_default() if include_reference is None else include_reference
    aliases = load_aliases(sources=sources)
    reverse_aliases: dict[str, list[str]] = {}
    for alias, target in aliases.items():
        reverse_aliases.setdefault(canonical_role_id(target, sources=sources), []).append(alias)
    for source in sources:
        for role_path in iter_role_paths(source, include_reference=include_ref):
            try:
                role = load_role(role_path)
            except AgentRolesError:
                continue
            canonical = canonical_role_id(role.id, sources=sources)
            source_role = SourceRole(
                source=_source_name(source),
                role_id=canonical,
                version=role.version,
                created_at=role.created_at,
                updated_at=role.updated_at,
                digest=tree_digest(role.root),
                path=role.root.resolve(),
                name=role.name,
                description=role.description,
                catalog_level=role.catalog_level,
                aliases=tuple(sorted(reverse_aliases.get(canonical) or ())),
            )
            existing = discovered.get(canonical)
            if existing is None:
                discovered[canonical] = source_role
                continue
            duplicates.setdefault(canonical, []).append(f"{source_role.source}:{source_role.path}")
    roles: list[SourceRole] = []
    for role_id, source_role in discovered.items():
        dupes = tuple(duplicates.get(role_id) or ())
        if dupes:
            source_role = SourceRole(
                source=source_role.source,
                role_id=source_role.role_id,
                version=source_role.version,
                created_at=source_role.created_at,
                updated_at=source_role.updated_at,
                digest=source_role.digest,
                path=source_role.path,
                name=source_role.name,
                description=source_role.description,
                catalog_level=source_role.catalog_level,
                aliases=source_role.aliases,
                duplicates=dupes,
            )
        roles.append(source_role)
    return tuple(sorted(roles, key=lambda item: item.role_id))


def role_catalog_status(*, refresh: bool = False) -> tuple[dict[str, object], ...]:
    source_roles = {role.role_id: role for role in discover_source_roles(refresh=refresh)}
    installed = set(installed_role_ids())
    rows: list[dict[str, object]] = []
    for role_id, source_role in sorted(source_roles.items()):
        metadata = load_installed_metadata(role_id)
        installed_version = str(metadata.get("version") or "") if role_id in installed else ""
        installed_updated_at = str(metadata.get("role_updated_at") or "") if role_id in installed else ""
        installed_digest = str(metadata.get("digest") or "") if role_id in installed else ""
        source_digest = f"sha256:{source_role.digest}"
        if role_id not in installed:
            status = "available"
            update_reason = "not_installed"
        elif installed_version != source_role.version or installed_digest != source_digest:
            status = "update_available"
            update_reason = _update_reason(
                installed_version=installed_version,
                source_version=source_role.version,
                installed_digest=installed_digest,
                source_digest=source_digest,
            )
        else:
            status = "current"
            update_reason = ""
        rows.append(
            {
                "role_id": role_id,
                "source": source_role.source,
                "version": source_role.version,
                "created_at": source_role.created_at,
                "updated_at": source_role.updated_at,
                "catalog_level": source_role.catalog_level,
                "installed_version": installed_version,
                "installed_updated_at": installed_updated_at,
                "digest": source_digest,
                "installed_digest": installed_digest,
                "status": status,
                "update_reason": update_reason,
                "path": str(source_role.path),
                "name": source_role.name,
                "description": source_role.description,
                "aliases": list(source_role.aliases),
                "duplicates": list(source_role.duplicates),
            }
        )
    for role_id in sorted(installed - set(source_roles)):
        metadata = load_installed_metadata(role_id)
        rows.append(
            {
                "role_id": role_id,
                "source": str(metadata.get("source") or ""),
                "version": "",
                "created_at": "",
                "updated_at": "",
                "catalog_level": str(metadata.get("catalog_level") or ""),
                "installed_version": str(metadata.get("version") or ""),
                "installed_updated_at": str(metadata.get("role_updated_at") or ""),
                "digest": "",
                "installed_digest": str(metadata.get("digest") or ""),
                "status": "installed_source_missing",
                "update_reason": "source_missing",
                "path": str(metadata.get("source_path") or ""),
                "name": "",
                "description": "",
                "aliases": [],
                "duplicates": [],
            }
        )
    return tuple(rows)


def find_source_role(role_id: str, *, refresh: bool = False) -> SourceRole | None:
    canonical = canonical_role_id(role_id)
    for role in discover_source_roles(refresh=refresh):
        if role.role_id == canonical:
            return role
    return None


def _update_reason(
    *,
    installed_version: str,
    source_version: str,
    installed_digest: str,
    source_digest: str,
) -> str:
    version_changed = installed_version != source_version
    digest_changed = installed_digest != source_digest
    if version_changed and digest_changed:
        return "version_and_digest_changed"
    if version_changed:
        return "version_changed"
    if digest_changed:
        return "digest_changed"
    return ""


def iter_role_paths(source_root: Path, *, include_reference: bool = False) -> tuple[Path, ...]:
    root = Path(source_root).expanduser()
    candidates: list[Path] = []
    base_names = ("roles", "reference_roles") if include_reference else ("roles",)
    for base_name in base_names:
        base = root / base_name
        if not base.is_dir():
            continue
        for child in sorted(base.iterdir(), key=lambda item: item.name):
            if child.is_dir() and (child / "role.toml").is_file():
                candidates.append(child)
    if root.is_dir():
        for child in sorted(root.iterdir(), key=lambda item: item.name):
            if child.is_dir() and (child / "role.toml").is_file():
                candidates.append(child)
    if (root / "role.toml").is_file():
        candidates.append(root)
    deduped: list[Path] = []
    seen: set[Path] = set()
    for candidate in candidates:
        resolved = candidate.resolve()
        if resolved in seen:
            continue
        deduped.append(resolved)
        seen.add(resolved)
    return tuple(deduped)


def ensure_default_catalog(*, refresh: bool = False) -> Path | None:
    if _remote_disabled():
        return None
    target = catalogs_root() / "agent-roles-spec"
    if _looks_like_catalog(target):
        if refresh:
            _git_pull(target)
        return target.resolve()
    if target.exists():
        return None
    target.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["git", "clone", "--depth", "1", _remote_url(), str(target)]
    try:
        result = subprocess.run(
            cmd,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=_git_timeout(),
        )
    except Exception:
        return None
    if result.returncode != 0 or not _looks_like_catalog(target):
        shutil.rmtree(target, ignore_errors=True)
        return None
    return target.resolve()


def _git_pull(target: Path) -> None:
    if not (target / ".git").is_dir():
        return
    try:
        subprocess.run(
            ["git", "-C", str(target), "pull", "--ff-only"],
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=_git_timeout(),
        )
    except Exception:
        return


def _looks_like_catalog(path: Path) -> bool:
    root = Path(path).expanduser()
    return (root / "roles").is_dir() or (root / "reference_roles").is_dir()


def _source_name(path: Path) -> str:
    resolved = Path(path).resolve()
    if resolved.name == "agent-roles-spec":
        return "agentroles"
    if resolved == (catalogs_root() / "agent-roles-spec").resolve():
        return "agentroles"
    return "path"


def _include_reference_default() -> bool:
    value = str(os.environ.get("AGENT_ROLES_INCLUDE_REFERENCE") or "").strip().lower()
    return value in {"1", "true", "yes", "on"}


def _remote_disabled() -> bool:
    value = str(os.environ.get("AGENT_ROLES_NO_REMOTE") or "").strip().lower()
    return value in {"1", "true", "yes", "on"}


def _remote_url() -> str:
    return str(os.environ.get("AGENT_ROLES_SPEC_GIT_URL") or DEFAULT_AGENT_ROLES_SPEC_GIT_URL).strip()


def _git_timeout() -> float:
    raw = str(os.environ.get("AGENT_ROLES_GIT_TIMEOUT_SECONDS") or "60").strip()
    try:
        return max(1.0, float(raw))
    except ValueError:
        return 60.0
