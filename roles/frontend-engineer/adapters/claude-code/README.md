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

If a Claude Code adapter mounts this Role, project-specific instance naming,
scope, permissions, team topology, and prompt additions belong outside Role
source.

Generated Claude-native assets are projection output and must not be written
back into this Role source directory.
