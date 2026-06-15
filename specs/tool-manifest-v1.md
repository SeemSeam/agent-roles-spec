# Tool Manifest v1 Preview

Status: draft preview

## Purpose

A tool manifest is an optional Role-contained declaration for tools that a Role
may use, including MCP servers, CLIs, browser runtimes, helper libraries, and
host-native wrappers.

The manifest makes a Role more self-describing without making installation
implicit. It describes what the Role needs, how a compatible Host Adapter can
install or project it into a role-private runtime, how to diagnose it, and what
must stay outside Role source.

This is a backwards-compatible extension. Existing Roles that only document
tools in `tools/README.md` remain valid. Hosts that do not understand tool
manifests should reject or ignore them deterministically.

## File Location

Tool manifests normally live under `tools/`, for example:

```text
role/
  role.toml
  tools/
    README.md
    mcp-tools.toml
  plugins/
    role-toolbox/
      README.md
      mcp.json.template
```

Declare them from `role.toml` with the optional `contents.tool_manifests`
field:

```toml
[contents]
tools = ["tools/README.md", "tools/mcp-tools.toml"]
tool_manifests = ["tools/mcp-tools.toml"]
plugins = ["plugins/role-toolbox"]
```

`contents.tool_manifests` is an index. It does not replace `contents.tools`;
it makes machine-readable tool manifests discoverable while keeping older
tool-documentation flows intact.

## Manifest Shape

Preview tool manifests use TOML:

```toml
schema = "agent-role/tool-manifest/preview-0.1"
name = "Example MCP Tool Manifest"
version = "0.1.0"
description = "Optional role-private MCP tools for this Role."

[runtime]
scope = "role-private"
install_policy = "explicit"
store_hint = "{role_runtime}/tools"
secrets = "external"
cleanup = "unmount-owned"

[[tools]]
id = "example-mcp"
kind = "mcp-server"
optional = true
adapter_targets = ["codex", "claude-code"]
description = "Example MCP server projected by compatible Host Adapters."
requires_secrets = ["EXAMPLE_API_TOKEN"]

[tools.install]
mode = "host-provided"
notes = "The Host Adapter chooses the concrete package or command."

[tools.doctor]
checks = [
  "server is configured in the role-private runtime",
  "required environment variables are supplied by Project Binding",
]
```

Recommended top-level fields:

- `schema`: preview schema marker. Current value:
  `agent-role/tool-manifest/preview-0.1`.
- `name`: human-readable manifest name.
- `version`: manifest version, independent of tool package versions.
- `description`: short explanation of the tool set.
- `runtime`: role-scoped runtime expectations.
- `tools`: one table per declared tool.

Recommended `runtime` fields:

- `scope`: one of `role-private`, `project-private`, `host-provided`, or
  `documentation-only`.
- `install_policy`: one of `explicit`, `manual`, `host-managed`, or `none`.
- `store_hint`: advisory runtime location template. It must not be an actual
  write grant.
- `secrets`: normally `external` or `none`.
- `cleanup`: expected cleanup posture such as `unmount-owned`, `manual`, or
  `host-owned`.

Recommended `tools` fields:

- `id`: stable local tool id inside this Role.
- `kind`: one of `mcp-server`, `cli`, `browser-runtime`, `library`,
  `adapter-plugin`, or `other`.
- `optional`: whether the Role can still operate without the tool.
- `description`: why this Role references the tool.
- `adapter_targets`: host adapters that may consume the declaration.
- `requires_secrets`: environment variable names only, never values.
- `requires_project`: optional project prerequisites such as a running app,
  Storybook instance, or selected design file.
- `install`: install mode and reviewable notes.
- `doctor`: health-check descriptions.
- `projection`: optional template or plugin files a Host Adapter may project.

## Lifecycle Semantics

Tool manifests are declarations, not executable grants.

Compatible Host Adapters may use a tool manifest to:

- ask the user whether to install optional tools;
- install tools into a role-private or project-private runtime store;
- generate MCP configuration fragments as projection output;
- run documented doctor checks;
- remove adapter-owned projection output during unmount.

They must not:

- install tools silently from memory or prompt text;
- write generated runtime files back into Role source;
- store credentials, tokens, browser profiles, Figma files, traces, screenshots,
  AGY worktrees, package caches, or provider sessions in Role source;
- treat advisory `permissions` or `store_hint` values as authorization grants;
- project unsupported content into the wrong host surface.

## Role-Private Tools

Role-private tools are installed outside the Role source directory, in a
Host-owned runtime path. Example locations:

```text
~/.roles/runtime/<role-id>/tools/
.agent-roles/runtime/<mounted-instance>/tools/
```

The exact location is Host Adapter behavior, not core Role source format. Role
source may include wrapper scripts, templates, manifests, and plugin content,
but runtime caches and generated config remain projection output.

## MCP Notes

MCP servers fit the tool-manifest model well, but they are still runtime
capabilities:

- MCP server packages may be installed in a role-private runtime when the Host
  Adapter supports it.
- MCP config fragments may be generated from Role-contained templates.
- Credentials and selected resources belong to Project Binding or host runtime
  configuration.
- Public examples in `tools/` or `plugins/` are not actual permissions.

## Compatibility

This preview extension is additive:

- old Roles without `contents.tool_manifests` remain valid;
- old hosts may ignore `contents.tool_manifests`;
- new hosts should preserve existing `tools/README.md` documentation behavior;
- Role package-manager installation still copies source content only and does
  not mount, install, or start tools by itself.
