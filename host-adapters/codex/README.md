# Codex Adapter Contract Preview

This adapter contract describes how Codex may consume Roles.

Potential host-native surfaces include:

- skills
- memory files
- commands
- MCP configuration
- role-contained plugin content
- managed provider-home projections when a host supplies them

Hot reload is not required by this preview contract.

An implementation should keep role projection separate from provider sessions
and user-global runtime state.
