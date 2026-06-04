from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
from typing import Any, Sequence, TextIO

from . import __version__
from .catalog import (
    canonical_role_id,
    discover_roles_from_paths,
    find_source_role,
    role_catalog_status,
)
from .manifest import AgentRolesError, load_role, normalize_role_id
from .store import (
    install_role_assets,
    installed_root,
    installed_role_ids,
    load_installed,
    load_installed_metadata,
    load_installed_role,
    store_root,
)


def main(argv: Sequence[str] | None = None) -> int:
    return run(argv if argv is not None else sys.argv[1:], stdout=sys.stdout, stderr=sys.stderr)


def run(argv: Sequence[str], *, stdout: TextIO, stderr: TextIO) -> int:
    parser = build_parser()
    try:
        args = parser.parse_args(list(argv))
    except SystemExit as exc:
        return int(exc.code if exc.code is not None else 0)
    try:
        payload = dispatch(args)
    except AgentRolesError as exc:
        payload = {"schema": "agent-roles/error/v1", "status": "failed", "error": str(exc)}
        _emit(payload, json_output=getattr(args, "json", False), stdout=stderr)
        return 1
    _emit(payload, json_output=getattr(args, "json", False), stdout=stdout)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="agent-roles")
    parser.add_argument("--version", action="version", version=f"%(prog)s {__version__}")
    sub = parser.add_subparsers(dest="command", required=True)

    list_parser = sub.add_parser("list")
    list_parser.add_argument("--json", action="store_true", default=False)
    list_parser.add_argument("--refresh", action="store_true", default=False)

    install = sub.add_parser("install")
    install.add_argument("role_id", nargs="?")
    install.add_argument("--path", default=None)
    install.add_argument("--json", action="store_true", default=False)

    update = sub.add_parser("update")
    update.add_argument("role_id")
    update.add_argument("--json", action="store_true", default=False)

    upgrade = sub.add_parser("upgrade")
    upgrade.add_argument("role_id", nargs="?")
    upgrade.add_argument("--all", action="store_true", default=False)
    upgrade.add_argument("--json", action="store_true", default=False)

    sync = sub.add_parser("sync")
    sync.add_argument("path", nargs="?", default=".")
    sync.add_argument("--json", action="store_true", default=False)

    doctor = sub.add_parser("doctor")
    doctor.add_argument("role_id")
    doctor.add_argument("--json", action="store_true", default=False)

    resolve = sub.add_parser("resolve")
    resolve.add_argument("role_id")
    resolve.add_argument("--json", action="store_true", default=False)
    return parser


def dispatch(args: argparse.Namespace) -> dict[str, Any]:
    if args.command == "list":
        return cmd_list(refresh=bool(args.refresh))
    if args.command == "install":
        return cmd_install(args.role_id, source_path=Path(args.path) if args.path else None)
    if args.command == "update":
        return cmd_update(args.role_id)
    if args.command == "upgrade":
        return cmd_upgrade(args.role_id, all_roles=bool(args.all))
    if args.command == "sync":
        return cmd_sync(Path(args.path))
    if args.command == "doctor":
        return cmd_doctor(args.role_id)
    if args.command == "resolve":
        return cmd_resolve(args.role_id)
    raise AgentRolesError(f"unknown command: {args.command}")


def cmd_list(*, refresh: bool = False) -> dict[str, Any]:
    return {
        "schema": "agent-roles/list/v1",
        "status": "ok",
        "store_root": str(store_root()),
        "installed_root": str(installed_root()),
        "roles": list(role_catalog_status(refresh=refresh)),
    }


def cmd_install(role_id: str | None, *, source_path: Path | None = None) -> dict[str, Any]:
    if source_path is not None:
        source = Path(source_path).expanduser().resolve()
        role = load_role(source)
        if role_id is not None and role.id != canonical_role_id(role_id):
            raise AgentRolesError(f"role source id mismatch: requested {role_id}, found {role.id}")
        payload = install_role_assets(role, source=source, source_kind="path", status="installed")
        payload["schema"] = "agent-roles/install/v1"
        payload["status"] = "ok"
        return payload
    if not role_id:
        raise AgentRolesError("role id is required unless --path is provided")
    source_role = find_source_role(role_id)
    if source_role is None:
        raise AgentRolesError(f"role source not found: {role_id}")
    role = load_role(source_role.path)
    payload = install_role_assets(role, source=source_role.path, source_kind=source_role.source, status="installed")
    payload["schema"] = "agent-roles/install/v1"
    payload["status"] = "ok"
    return payload


def cmd_update(role_id: str) -> dict[str, Any]:
    canonical = canonical_role_id(role_id)
    payload = _update_installed_role(canonical, role_status="updated")
    payload["schema"] = "agent-roles/update/v1"
    payload["status"] = "ok"
    payload["requested_role_id"] = normalize_role_id(role_id)
    return payload


def cmd_upgrade(role_id: str | None, *, all_roles: bool = False) -> dict[str, Any]:
    if role_id and all_roles:
        raise AgentRolesError("use either a role id or --all, not both")
    if role_id:
        payload = _update_installed_role(canonical_role_id(role_id), role_status="upgraded")
        payload["schema"] = "agent-roles/update/v1"
        payload["status"] = "ok"
        payload["command"] = "upgrade"
        payload["requested_role_id"] = normalize_role_id(role_id)
        return payload
    rows: list[dict[str, Any]] = []
    failed = 0
    for installed_id in installed_role_ids():
        try:
            payload = _update_installed_role(installed_id, role_status="upgraded")
        except AgentRolesError as exc:
            failed += 1
            rows.append({"role_id": installed_id, "status": "failed", "error": str(exc)})
            continue
        rows.append(
            {
                "role_id": payload["role_id"],
                "status": payload["role_status"],
                "version": payload["version"],
                "created_at": payload["created_at"],
                "updated_at": payload["updated_at"],
                "digest": payload["digest"],
                "path": payload["path"],
                "source": payload["source"],
            }
        )
    return {
        "schema": "agent-roles/upgrade/v1",
        "status": "partial" if failed else "ok",
        "store_root": str(store_root()),
        "roles": rows,
        "error_count": failed,
    }


def cmd_sync(path: Path) -> dict[str, Any]:
    source_root = Path(path).expanduser().resolve()
    if not source_root.exists():
        raise AgentRolesError(f"sync path does not exist: {source_root}")
    roles = discover_roles_from_paths((source_root,))
    if not roles:
        raise AgentRolesError(f"no roles found at sync path: {source_root}")
    rows: list[dict[str, Any]] = []
    for source_role in roles:
        metadata = load_installed_metadata(source_role.role_id)
        source_digest = f"sha256:{source_role.digest}"
        if not metadata:
            rows.append(
                {
                    "role_id": source_role.role_id,
                    "status": "skipped_not_installed",
                    "version": source_role.version,
                    "created_at": source_role.created_at,
                    "updated_at": source_role.updated_at,
                    "digest": source_digest,
                    "path": str(source_role.path),
                }
            )
            continue
        if str(metadata.get("version") or "") == source_role.version and str(metadata.get("digest") or "") == source_digest:
            rows.append(
                {
                    "role_id": source_role.role_id,
                    "status": "current",
                    "version": source_role.version,
                    "created_at": source_role.created_at,
                    "updated_at": source_role.updated_at,
                    "digest": source_digest,
                    "path": str(source_role.path),
                }
            )
            continue
        role = load_role(source_role.path)
        payload = install_role_assets(role, source=source_role.path, source_kind=source_role.source, status="synced")
        rows.append(
            {
                "role_id": role.id,
                "status": "synced",
                "version": role.version,
                "created_at": role.created_at,
                "updated_at": role.updated_at,
                "digest": str(payload.get("digest") or ""),
                "path": str(payload.get("path") or ""),
            }
        )
    return {
        "schema": "agent-roles/sync/v1",
        "status": "ok",
        "path": str(source_root),
        "roles": rows,
    }


def cmd_doctor(role_id: str) -> dict[str, Any]:
    canonical = canonical_role_id(role_id)
    source_role = find_source_role(canonical)
    installed = load_installed(canonical)
    role = load_installed_role(canonical)
    if role is None and source_role is not None:
        try:
            role = load_role(source_role.path)
        except AgentRolesError:
            role = None
    status = "ok" if source_role is not None or installed is not None else "missing"
    payload: dict[str, Any] = {
        "schema": "agent-roles/doctor/v1",
        "status": status,
        "role_id": canonical,
        "requested_role_id": normalize_role_id(role_id),
        "available": source_role is not None,
        "installed": installed is not None,
        "source_path": str(source_role.path) if source_role is not None else "",
        "installed_path": str(installed.path) if installed is not None else "",
        "store_root": str(store_root()),
    }
    if role is not None:
        payload.update(role.summary())
    return payload


def cmd_resolve(role_id: str) -> dict[str, Any]:
    canonical = canonical_role_id(role_id)
    installed = load_installed(canonical)
    source_role = find_source_role(canonical)
    if installed is not None:
        version = installed.version
        created_at = str(installed.metadata.get("role_created_at") or "")
        updated_at = str(installed.metadata.get("role_updated_at") or "")
        digest = installed.digest
    elif source_role is not None:
        version = source_role.version
        created_at = source_role.created_at
        updated_at = source_role.updated_at
        digest = f"sha256:{source_role.digest}"
    else:
        version = ""
        created_at = ""
        updated_at = ""
        digest = ""
    return {
        "schema": "agent-roles/resolve/v1",
        "status": "ok" if installed is not None or source_role is not None else "missing",
        "role_id": canonical,
        "requested_role_id": normalize_role_id(role_id),
        "installed": installed is not None,
        "installed_path": str(installed.path) if installed is not None else "",
        "version": version,
        "created_at": created_at,
        "updated_at": updated_at,
        "digest": digest,
        "source_path": str(source_role.path) if source_role is not None else "",
        "store_root": str(store_root()),
    }


def _update_installed_role(role_id: str, *, role_status: str) -> dict[str, object]:
    metadata = load_installed_metadata(role_id)
    if not metadata:
        raise AgentRolesError(f"role is not installed: {role_id}; run agent-roles install {role_id} first")
    source_kind = str(metadata.get("source") or "path").strip() or "path"
    source_path = str(metadata.get("source_path") or "").strip()
    source: Path | None = None
    source_role = None
    if source_kind != "path":
        source_role = find_source_role(role_id, refresh=True)
        if source_role is not None:
            source = source_role.path
            source_kind = source_role.source
    if source is None and source_path and Path(source_path).expanduser().is_dir():
        source = Path(source_path).expanduser().resolve()
    if source is None:
        source_role = find_source_role(role_id, refresh=True)
        if source_role is not None:
            source = source_role.path
            source_kind = source_role.source
    if source is None:
        raise AgentRolesError(f"role source not found for installed role: {role_id}")
    role = load_role(source)
    if role.id != role_id:
        raise AgentRolesError(f"role source id mismatch: requested {role_id}, found {role.id}")
    return install_role_assets(role, source=source, source_kind=source_kind, status=role_status)


def _emit(payload: dict[str, Any], *, json_output: bool, stdout: TextIO) -> None:
    if json_output:
        print(json.dumps(payload, ensure_ascii=True, sort_keys=True), file=stdout)
        return
    for key, value in payload.items():
        if isinstance(value, (list, dict)):
            continue
        print(f"{key}: {value}", file=stdout)
