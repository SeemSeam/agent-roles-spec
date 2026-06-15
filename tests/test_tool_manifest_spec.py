from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from agent_roles.manifest import read_toml


REPO_ROOT = Path(__file__).resolve().parents[1]


def _assert_schema_accepts(schema: dict[str, Any], payload: Any, path: str = "$") -> None:
    if "const" in schema:
        assert payload == schema["const"], path
    if "enum" in schema:
        assert payload in schema["enum"], path

    schema_type = schema.get("type")
    if schema_type == "object":
        assert isinstance(payload, dict), path
        for key in schema.get("required") or []:
            assert key in payload, f"{path}.{key}"
        properties = schema.get("properties") or {}
        for key, value in payload.items():
            if key in properties:
                _assert_schema_accepts(properties[key], value, f"{path}.{key}")
    elif schema_type == "array":
        assert isinstance(payload, list), path
        min_items = schema.get("minItems")
        if min_items is not None:
            assert len(payload) >= int(min_items), path
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, item in enumerate(payload):
                _assert_schema_accepts(item_schema, item, f"{path}[{index}]")
    elif schema_type == "string":
        assert isinstance(payload, str), path
        min_length = schema.get("minLength")
        if min_length is not None:
            assert len(payload) >= int(min_length), path
    elif schema_type == "boolean":
        assert isinstance(payload, bool), path


def test_tool_manifest_schema_accepts_template_and_frontend_manifest() -> None:
    schema = json.loads((REPO_ROOT / "schemas" / "tool-manifest.schema.json").read_text(encoding="utf-8"))

    for manifest_path in (
        REPO_ROOT / "templates" / "role-with-private-tools" / "tools" / "mcp-tools.toml",
        REPO_ROOT / "roles" / "frontend-engineer" / "tools" / "mcp-tools.toml",
    ):
        payload = read_toml(manifest_path)
        _assert_schema_accepts(schema, payload, path=str(manifest_path))
        assert payload["runtime"]["scope"] in {"role-private", "project-private"}
        assert payload["runtime"]["install_policy"] in {"explicit", "manual", "host-managed"}


def test_private_tool_templates_do_not_contain_real_secret_values() -> None:
    template_paths = (
        REPO_ROOT / "templates" / "role-with-private-tools" / "plugins" / "private-toolbox" / "mcp.json.template",
        REPO_ROOT / "roles" / "frontend-engineer" / "plugins" / "frontend-mcp-toolbox" / "mcp.json.template",
    )

    for template_path in template_paths:
        payload = json.loads(template_path.read_text(encoding="utf-8"))
        encoded = json.dumps(payload)
        assert "<adapter-resolved-" in encoded
        assert "sk-" not in encoded
        assert "figd_" not in encoded
        assert "ghp_" not in encoded
