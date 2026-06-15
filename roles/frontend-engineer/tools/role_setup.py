#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import tomllib
from typing import Any


SCHEMA = "agent-role/role-setup/preview-0.1"
MODES = {"check", "plan", "apply", "repair"}
PROVIDERS = {"auto", "codex", "claude-code", "ccb", "hive", "vscode"}


def read_toml(path: Path) -> dict[str, Any]:
    with path.open("rb") as handle:
        payload = tomllib.load(handle)
    if not isinstance(payload, dict):
        raise ValueError(f"TOML must decode to a table: {path}")
    return payload


def role_root_from_script() -> Path:
    return Path(__file__).resolve().parents[1]


def normalize_role_path(role_id: str) -> str:
    return role_id.replace(".", "_").replace("/", "_")


def default_state_root() -> Path:
    xdg_state = os.environ.get("XDG_STATE_HOME")
    if xdg_state:
        return Path(xdg_state).expanduser().resolve()
    return (Path.home() / ".local" / "state").resolve()


def load_role(role_root: Path) -> tuple[dict[str, Any], dict[str, Any]]:
    role = read_toml(role_root / "role.toml")
    contents = role.get("contents") or {}
    if not isinstance(contents, dict):
        contents = {}
    return role, contents


def manifest_paths(role_root: Path, contents: dict[str, Any]) -> list[Path]:
    paths = contents.get("tool_manifests") or []
    if isinstance(paths, str):
        paths = [paths]
    return [role_root / str(path) for path in paths]


def load_manifests(role_root: Path, contents: dict[str, Any]) -> list[dict[str, Any]]:
    loaded: list[dict[str, Any]] = []
    for path in manifest_paths(role_root, contents):
        payload = read_toml(path)
        loaded.append(
            {
                "path": str(path),
                "name": payload.get("name", ""),
                "version": payload.get("version", ""),
                "runtime": payload.get("runtime") or {},
                "tools": payload.get("tools") or [],
            }
        )
    return loaded


def env_path(name: str) -> Path | None:
    value = os.environ.get(name)
    return Path(value).expanduser().resolve() if value else None


def detect_provider(args: argparse.Namespace, project_root: Path) -> tuple[dict[str, Any], list[str]]:
    warnings: list[str] = []
    requested = args.provider
    provider_home = Path(args.provider_home).expanduser().resolve() if args.provider_home else None
    env_provider = os.environ.get("AGENT_ROLES_PROVIDER", "").strip().lower()
    env_home = env_path("AGENT_ROLES_PROVIDER_HOME")

    if requested != "auto":
        provider = requested
    elif env_provider:
        provider = env_provider
    else:
        signals: list[str] = []
        if env_path("CODEX_HOME") or (Path.home() / ".codex" / "config.toml").exists():
            signals.append("codex")
        if (project_root / ".mcp.json").exists() or (Path.home() / ".config" / "claude").exists():
            signals.append("claude-code")
        if (project_root / ".ccb").exists():
            signals.append("ccb")
        unique = sorted(set(signals))
        if len(unique) == 1:
            provider = unique[0]
        elif len(unique) > 1:
            provider = "ambiguous"
            warnings.append(
                "Multiple provider markers detected; pass --provider and --provider-home before setup handoff."
            )
        else:
            provider = "unknown"
            warnings.append("No provider marker detected; pass --provider before setup handoff.")

    provider_home = provider_home or env_home
    host_adapter = provider

    if provider == "codex":
        provider_home = provider_home or env_path("CODEX_HOME") or (Path.home() / ".codex")
        config_target = provider_home / "config.toml"
    elif provider == "claude-code":
        provider_home = provider_home or (Path.home() / ".config" / "claude")
        config_target = project_root / ".mcp.json"
    elif provider == "ccb":
        provider_home = provider_home or (project_root / ".ccb")
        config_target = provider_home / "provider-state" / "<provider>" / "home"
    elif provider == "vscode":
        provider_home = provider_home or (project_root / ".vscode")
        config_target = provider_home / "mcp.json"
    elif provider == "hive":
        provider_home = provider_home or (default_state_root() / "hive")
        config_target = provider_home / "mcp.json"
    else:
        config_target = None

    if provider_home and ".ccb" in provider_home.parts:
        host_adapter = "ccb"

    return (
        {
            "requested": requested,
            "detected": provider,
            "host_adapter": host_adapter,
            "home": str(provider_home) if provider_home else "",
            "config_target": str(config_target) if config_target else "",
        },
        warnings,
    )


def provider_runtime_root(args: argparse.Namespace, role_id: str, role_version: str, provider: dict[str, Any]) -> Path:
    if args.runtime_root:
        return Path(args.runtime_root).expanduser().resolve()
    base = env_path("AGENT_ROLES_PROVIDER_RUNTIME_ROOT") or env_path("AGENT_ROLES_RUNTIME_ROOT")
    if base is None:
        base = default_state_root() / "agent-roles"
    provider_id = str(provider.get("detected") or provider.get("requested") or "unknown")
    return (base / "providers" / provider_id / "tools" / normalize_role_path(role_id) / role_version).resolve()


def project_binding_target(project_root: Path, role_id: str, provider: dict[str, Any]) -> Path:
    provider_id = str(provider.get("detected") or provider.get("requested") or "unknown")
    return (
        project_root
        / ".agent-roles"
        / "bindings"
        / provider_id
        / f"{normalize_role_path(role_id)}.json"
    )


def tool_command(tool_id: str) -> str:
    mapping = {
        "agy": "agy",
        "style-dictionary": "style-dictionary",
    }
    return mapping.get(tool_id, "")


def collect_tools(manifests: list[dict[str, Any]]) -> list[dict[str, Any]]:
    tools: list[dict[str, Any]] = []
    for manifest in manifests:
        for item in manifest["tools"]:
            if not isinstance(item, dict):
                continue
            install = item.get("install") or {}
            doctor = item.get("doctor") or {}
            required_secrets = [str(name) for name in item.get("requires_secrets") or []]
            missing_secrets = [name for name in required_secrets if not os.environ.get(name)]
            command = tool_command(str(item.get("id", "")))
            available = bool(command and shutil.which(command))
            status = "declared"
            if missing_secrets:
                status = "missing_secret"
            elif command:
                status = "available" if available else "missing_command"
            elif item.get("requires_project"):
                status = "project_input_required"
            tools.append(
                {
                    "id": item.get("id", ""),
                    "kind": item.get("kind", ""),
                    "optional": bool(item.get("optional", True)),
                    "status": status,
                    "install_mode": install.get("mode", ""),
                    "required_secret_names": required_secrets,
                    "missing_secret_names": missing_secrets,
                    "requires_project": item.get("requires_project") or [],
                    "doctor_checks": doctor.get("checks") or [],
                    "command": command,
                    "command_available": available if command else None,
                    "manifest": manifest["path"],
                }
            )
    return tools


def planned_actions(
    *,
    mode: str,
    manifests: list[dict[str, Any]],
    tools: list[dict[str, Any]],
    provider: dict[str, Any],
    runtime: Path,
    binding_target: Path,
    contents: dict[str, Any],
    role_root: Path,
) -> tuple[list[dict[str, Any]], list[str]]:
    actions: list[dict[str, Any]] = []
    projections: list[str] = []

    for manifest in manifests:
        actions.append({"action": "read_manifest", "path": manifest["path"], "mutates": False})

    for tool in tools:
        actions.append(
            {
                "action": "check_tool",
                "tool_id": tool["id"],
                "status": tool["status"],
                "install_mode": tool["install_mode"],
                "mutates": False,
            }
        )

    plugins = contents.get("plugins") or []
    if isinstance(plugins, str):
        plugins = [plugins]
    for plugin in plugins:
        plugin_path = role_root / str(plugin)
        projections.append(str(runtime / "provider-bridge" / Path(str(plugin)).name))
        actions.append(
            {
                "action": "project_plugin_template",
                "source": str(plugin_path),
                "target": projections[-1],
                "mutates": False,
                "would_mutate": mode in {"apply", "repair"},
                "requires_host_adapter": True,
            }
        )

    if provider.get("config_target"):
        projections.append(str(provider["config_target"]))
        actions.append(
            {
                "action": "ensure_provider_bridge",
                "target": provider["config_target"],
                "scope": "provider-shared",
                "mutates": False,
                "would_mutate": mode in {"apply", "repair"},
                "requires_host_adapter": True,
            }
        )
    projections.append(str(binding_target))
    actions.append(
        {
            "action": "project_binding",
            "target": str(binding_target),
            "scope": "project-private",
            "mutates": False,
            "would_mutate": mode in {"apply", "repair"},
            "requires_host_adapter": True,
        }
    )

    return actions, projections


def build_payload(args: argparse.Namespace) -> tuple[dict[str, Any], int]:
    role_root = Path(args.role_root).expanduser().resolve() if args.role_root else role_root_from_script()
    project_root = Path(args.project_root).expanduser().resolve() if args.project_root else Path.cwd().resolve()
    role, contents = load_role(role_root)
    role_id = str(role.get("id", ""))
    role_version = str(role.get("version", ""))
    manifests = load_manifests(role_root, contents)
    provider, warnings = detect_provider(args, project_root)
    runtime = provider_runtime_root(args, role_id, role_version, provider)
    binding_target = project_binding_target(project_root, role_id, provider)
    tools = collect_tools(manifests)
    actions, projections = planned_actions(
        mode=args.mode,
        manifests=manifests,
        tools=tools,
        provider=provider,
        runtime=runtime,
        binding_target=binding_target,
        contents=contents,
        role_root=role_root,
    )

    status = "ok"
    exit_code = 0
    mutated = False

    if provider["detected"] in {"ambiguous", "unknown"} and args.mode in {"apply", "repair"}:
        status = "ambiguous_provider"
        exit_code = 2
    elif args.mode in {"apply", "repair"} and not args.yes:
        status = "needs_approval"
        warnings.append(f"{args.mode} requires --yes or Host Adapter approval")
    elif args.mode in {"apply", "repair"} and args.yes:
        status = "needs_host_adapter"
        warnings.append(
            "preview script only checks and plans setup; package installation and provider config writes are Host Adapter work"
        )

    payload = {
        "schema": SCHEMA,
        "mode": args.mode,
        "status": status,
        "mutated": mutated,
        "requires_host_adapter": args.mode in {"apply", "repair"},
        "role_id": role_id,
        "role_version": role_version,
        "role_root": str(role_root),
        "project_root": str(project_root),
        "provider": provider,
        "runtime_scope": "provider-shared",
        "provider_runtime_root": str(runtime),
        "runtime_root": str(runtime),
        "project_binding": {
            "target": str(binding_target),
            "scope": "project-private",
            "purpose": "Enable this Role's provider-shared tools for the current project without reinstalling them.",
        },
        "manifests": [
            {
                "path": manifest["path"],
                "name": manifest["name"],
                "version": manifest["version"],
                "runtime": manifest["runtime"],
            }
            for manifest in manifests
        ],
        "tools": tools,
        "actions": actions,
        "projection_outputs": projections,
        "handoff": {
            "required": args.mode in {"apply", "repair"},
            "script_mutates": False,
            "mutation_owner": "Host Adapter or agent-roles setup",
        },
        "manager_lifecycle": {
            "setup_owner": "Host Adapter or agent-roles setup",
            "uninstall_owner": "agent-roles unmount or Host Adapter role-config remove",
            "projection_record_owner": "agent-roles Project Binding or Host Adapter runtime state",
            "unmount_command_hint": f"agent-roles unmount {role_id}" if role_id else "agent-roles unmount <role>",
            "notes": (
                "This in-agent script does not uninstall provider configuration. "
                "Role config uninstall must run from the agent-roles/Host Adapter layer "
                "that owns Project Binding and projection records."
            ),
        },
        "provider_bridge": {
            "required": True,
            "target": provider.get("config_target", ""),
            "purpose": (
                "Load agent-roles project bindings at provider startup so shared tools are reused "
                "across projects without globally exposing every Role tool."
            ),
        },
        "warnings": warnings,
    }
    return payload, exit_code


def print_text(payload: dict[str, Any]) -> None:
    print(f"role_setup {payload['mode']}: {payload['status']}")
    print(f"role: {payload['role_id']} {payload['role_version']}")
    print(f"provider: {payload['provider']['detected']} -> {payload['provider']['config_target']}")
    print(f"runtime: {payload['runtime_root']}")
    if payload["warnings"]:
        print("warnings:")
        for warning in payload["warnings"]:
            print(f"- {warning}")
    print("tools:")
    for tool in payload["tools"]:
        print(f"- {tool['id']}: {tool['status']}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Check and plan Role runtime setup.")
    parser.add_argument("--role-root", default="", help="Role source root. Defaults to this script's Role.")
    parser.add_argument("--project-root", default="", help="Project root for provider/project config detection.")
    parser.add_argument("--runtime-root", default="", help="Exact provider-shared runtime root override.")
    parser.add_argument("--provider-home", default="", help="Current provider home override.")
    parser.add_argument("--provider", choices=sorted(PROVIDERS), default="auto")
    parser.add_argument("--mode", choices=sorted(MODES), default="check")
    parser.add_argument("--yes", action="store_true", help="Approve apply/repair handoff to a Host Adapter.")
    parser.add_argument("--json", action="store_true", help="Emit JSON for Host Adapters.")
    args = parser.parse_args(argv)

    try:
        payload, exit_code = build_payload(args)
    except Exception as exc:
        payload = {"schema": SCHEMA, "status": "failed", "error": str(exc), "mutated": False}
        exit_code = 1

    if args.json:
        print(json.dumps(payload, indent=2, sort_keys=True))
    else:
        print_text(payload)
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
