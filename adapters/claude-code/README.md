# Claude Code Adapter Contract Preview

This adapter contract describes how Claude Code may consume RolePacks.

Potential host-native surfaces include:

- subagents
- skills
- memory files
- commands
- MCP servers
- role-contained plugin content

Live mounting, hot reload, and global plugin installation are outside this
preview contract.

An implementation should state which generated assets it owns and how those
assets can be removed on unmount.
