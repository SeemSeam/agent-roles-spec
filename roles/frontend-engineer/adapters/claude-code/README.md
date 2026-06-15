# Claude Code Adapter Notes

Potential Claude Code surfaces for this role include subagents, skills, memory,
commands, MCP servers, and plugin content.

This preview Role does not require a live Claude Code mount implementation. It
carries optional MCP/tool manifest declarations and template content, but
Claude project `.mcp.json`, credentials, selected Figma files, local ports, and
browser state are Project Binding or host runtime concerns.

If a Claude Code adapter supports role-contained plugin content and
`contents.tool_manifests`, it may use `plugins/frontend-mcp-toolbox/` as
projection input. Generated `.mcp.json` files remain host-owned projection
output and must be removable on unmount.

The `role-setup` skill and `tools/role_setup.py` script may be used after mount
to check or plan Claude project MCP projection. Mutation requires adapter
ownership tracking; global Claude user config should not be changed when a
project `.mcp.json` target is available. Role config uninstall belongs to the
`agent-roles` or Claude Code adapter layer that owns the project binding.

If Claude Code supports a stable bridge command, prefer projecting one bridge
that reads project binding and uses provider-shared tools. If only project
`.mcp.json` is supported, keep that projection project-private while reusing
the provider-shared downloaded tool runtime.

If a Claude Code adapter mounts this Role, project-specific instance naming,
scope, permissions, team topology, and prompt additions belong outside Role
source.

Generated Claude-native assets are projection output and must not be written
back into this Role source directory.
