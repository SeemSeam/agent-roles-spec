# Tool Manifest v1 Preview

Status: draft preview

## Purpose

A tool manifest is an optional Role-contained declaration for tools that a Role
may use, including MCP servers, CLIs, browser runtimes, helper libraries, and
host-native wrappers.

The manifest makes a Role more self-describing without making installation
implicit. It describes what the Role needs, how a compatible Host Adapter can
install or project it into a provider-shared, role-private, project-private, or
host-provided runtime surface, how to diagnose it, and what must stay outside
Role source.

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
description = "Optional provider-shared MCP tools for this Role."

[runtime]
scope = "provider-shared"
install_policy = "explicit"
store_hint = "{provider_runtime}/tools/example-role"
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
  "server is configured in the provider-shared runtime",
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
  `documentation-only`. Roles may also use `provider-shared` when tools should
  be installed once per provider and reused across projects through project
  bindings.
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
- install tools into a provider-shared, role-private, or project-private
  runtime store;
- generate MCP configuration fragments as projection output;
- run documented doctor checks;
- write adapter-owned projection records for generated runtime/projection
  output;
- remove adapter-owned projection output during manager-side unmount.

User-facing command surfaces should stay shallow. A Host Adapter should prefer
one provider-aware `setup` or mount action that reads the tool manifest,
projects approved tools, and reports next steps, plus one `check` action for
diagnostics. For tools shared across projects, setup should install the runtime
once per provider, then create or update project-private bindings. Provider
global config should prefer one agent-roles bridge/router that reads the
current project binding, instead of globally exposing every declared MCP
server. Role-carried skills or scripts should use broad setup names such as
`role_setup` rather than MCP-specific installer names when they also cover
plugin projection, provider config, or repair. Role config uninstall should be
owned by the agent-roles or Host Adapter layer, not by an in-agent setup
script. Avoid exposing separate public `tools install`, `tools doctor`, and
`tools uninstall` command trees unless a host has a strong reason.

They must not:

- install tools silently from memory or prompt text;
- write generated runtime files back into Role source;
- store credentials, tokens, browser profiles, Figma files, traces, screenshots,
  AGY worktrees, package caches, or provider sessions in Role source;
- treat advisory `permissions` or `store_hint` values as authorization grants;
- ask a Role-carried in-agent setup script to delete runtime or provider
  configuration;
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

## Provider-Shared Tools

Provider-shared tools are installed once for a provider and reused across
projects. Example locations:

```text
~/.roles/providers/<provider>/tools/<tool-id>/<version>/
~/.local/state/agent-roles/providers/<provider>/tools/<role-id>/<version>/
```

Provider-shared runtime may contain downloaded MCP packages, wrapper commands,
browser runtimes, and package caches. It must not contain project-specific
resources such as selected Figma files, Storybook URLs, local dev-server URLs,
permission grants, traces, screenshots, or browser profiles.

Project-specific activation belongs to Project Binding. A provider bridge may
be projected once into the provider config; it should read the current project
binding and expose only the tools enabled for that project.

## MCP Notes

MCP servers fit the tool-manifest model well, but they are still runtime
capabilities:

- MCP server packages may be installed in a provider-shared runtime when the
  Host Adapter supports reusable tools, or in a role-private runtime for hosts
  that need stricter role isolation.
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
