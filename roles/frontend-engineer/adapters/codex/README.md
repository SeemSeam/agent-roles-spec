# Codex Adapter Notes

Potential Codex surfaces for this role include skills, memory, commands, MCP
configuration, and managed home projections.

The Role source documents frontend design-engineering behavior and optional
tool workflows. It does not write `~/.codex/config.toml`, install MCP servers,
store browser profiles, or configure AGY credentials.

If a Codex adapter supports `contents.tool_manifests`, it may consume
`tools/mcp-tools.toml` and `plugins/frontend-mcp-toolbox/` to project
provider-shared MCP runtime into a managed runtime. Generated config,
installed packages, credentials, screenshots, traces, and browser state remain
Codex runtime or Project Binding state, not Role source.

The preferred Codex projection is a stable agent-roles bridge in Codex's
provider config. The bridge reads the current project's binding and loads
already-installed provider-shared tools, so other projects do not need to
redownload MCP packages and do not see tools unless their binding enables them.

The `role-setup` skill and `tools/role_setup.py` script may be used as a
provider-aware check/plan entrypoint after mount. Mutation modes should write
only through adapter-owned projection output, provider-shared runtime files,
and project binding files.
Role config uninstall should run from the `agent-roles` or Codex adapter layer
that owns projection records, not from inside a Codex agent session.

If a Codex adapter mounts this Role, project-specific instance naming, scope,
permissions, MCP servers, selected Figma files, local dev-server URLs, and
prompt additions belong in the adapter's Project Binding representation, not
in the Role source.

Generated Codex-native assets are projection output and must not be written
back into this Role source directory.
