from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
import importlib
from pathlib import Path
from typing import Any


class AgentRolesError(ValueError):
    pass


@dataclass(frozen=True)
class Role:
    id: str
    name: str
    version: str
    created_at: str
    updated_at: str
    description: str
    root: Path
    manifest: dict[str, Any]

    @property
    def default_agent_name(self) -> str:
        identity = self.table("identity")
        return str(
            identity.get("default_agent_name")
            or identity.get("default_name")
            or self.id.rsplit(".", 1)[-1]
        ).strip()

    @property
    def providers(self) -> tuple[str, ...]:
        adapter = self.adapter("ccb")
        providers = adapter.get("supported_providers") or ()
        if isinstance(providers, str):
            providers = (providers,)
        return tuple(str(item).strip().lower() for item in providers if str(item).strip())

    def table(self, key: str) -> dict[str, Any]:
        value = self.manifest.get(key) or {}
        if not isinstance(value, dict):
            raise AgentRolesError(f"{self.root}: role manifest {key} must be a table")
        return dict(value)

    def adapter(self, host: str) -> dict[str, Any]:
        adapter_path = self.root / "adapters" / host / "adapter.toml"
        if adapter_path.is_file():
            payload = read_toml(adapter_path)
            return payload if isinstance(payload, dict) else {}
        adapters = self.manifest.get("adapters") or {}
        if isinstance(adapters, dict):
            value = adapters.get(host) or {}
            if isinstance(value, dict):
                return dict(value)
        return {}

    def summary(self) -> dict[str, object]:
        return {
            "role_id": self.id,
            "name": self.name,
            "version": self.version,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "description": self.description,
            "default_agent_name": self.default_agent_name,
            "providers": list(self.providers),
            "path": str(self.root),
        }


def normalize_role_id(value: str) -> str:
    role_id = str(value or "").strip().lower()
    if not role_id or "." not in role_id:
        raise AgentRolesError("role id must use publisher.role form, for example agentroles.archi")
    allowed = set("abcdefghijklmnopqrstuvwxyz0123456789._-")
    if any(ch not in allowed for ch in role_id):
        raise AgentRolesError(f"invalid role id: {value!r}")
    return role_id


def load_role(path: Path) -> Role:
    root = Path(path).expanduser()
    manifest_path = root / "role.toml"
    if not manifest_path.is_file():
        raise AgentRolesError(f"role manifest not found: {manifest_path}")
    payload = read_toml(manifest_path)
    schema = str(payload.get("schema") or "").strip()
    if not schema.startswith("agent-role/preview-"):
        raise AgentRolesError(f"{root}: unsupported role schema: {schema!r}")
    role_id = normalize_role_id(str(payload.get("id") or ""))
    name = str(payload.get("name") or "").strip()
    version = str(payload.get("version") or "").strip()
    created_at = normalize_timestamp(payload.get("created_at"), field="created_at", root=root)
    updated_at = normalize_timestamp(payload.get("updated_at"), field="updated_at", root=root)
    description = str(payload.get("description") or "").strip()
    if not name or not version or not description:
        raise AgentRolesError(f"{root}: role manifest requires name, version, and description")
    return Role(
        id=role_id,
        name=name,
        version=version,
        created_at=created_at,
        updated_at=updated_at,
        description=description,
        root=root,
        manifest=payload,
    )


def normalize_timestamp(value: object, *, field: str, root: Path) -> str:
    if value is None or value == "":
        return ""
    if isinstance(value, datetime):
        normalized = value
        if normalized.tzinfo is None:
            return normalized.replace(microsecond=0).isoformat()
        return (
            normalized.astimezone(timezone.utc)
            .replace(microsecond=0)
            .isoformat()
            .replace("+00:00", "Z")
        )
    if isinstance(value, date):
        return value.isoformat()
    if not isinstance(value, str):
        raise AgentRolesError(
            f"{root}: role manifest {field} must be an ISO 8601 string, date, or datetime"
        )
    raw = value.strip()
    if not raw:
        return ""
    candidate = raw.replace("Z", "+00:00")
    try:
        if "T" in candidate:
            datetime.fromisoformat(candidate)
        else:
            date.fromisoformat(candidate)
    except ValueError as exc:
        raise AgentRolesError(
            f"{root}: role manifest {field} must use ISO 8601, for example 2026-06-04T00:00:00Z"
        ) from exc
    return raw


def read_toml(path: Path) -> dict[str, Any]:
    try:
        tomllib = importlib.import_module("tomllib")
    except ModuleNotFoundError as exc:
        raise AgentRolesError("Agent Roles requires Python 3.11+ for TOML parsing") from exc
    try:
        payload = tomllib.loads(Path(path).read_text(encoding="utf-8"))
    except Exception as exc:
        raise AgentRolesError(f"invalid TOML {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise AgentRolesError(f"TOML must decode to a table: {path}")
    return dict(payload)
