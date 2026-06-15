# Codex Adapter Notes

Potential Codex surfaces for this role include skills, memory, commands, MCP
configuration, and managed home projections.

The Role source documents frontend design-engineering behavior and optional
tool workflows. It does not write `~/.codex/config.toml`, install MCP servers,
store browser profiles, or configure AGY credentials.

If a Codex adapter supports `contents.tool_manifests`, it may consume
`tools/mcp-tools.toml` and `plugins/frontend-mcp-toolbox/` to project
role-private MCP configuration into a managed runtime. Generated config,
installed packages, credentials, screenshots, traces, and browser state remain
Codex runtime or Project Binding state, not Role source.

If a Codex adapter mounts this Role, project-specific instance naming, scope,
permissions, MCP servers, selected Figma files, local dev-server URLs, and
prompt additions belong in the adapter's Project Binding representation, not
in the Role source.

Generated Codex-native assets are projection output and must not be written
back into this Role source directory.
