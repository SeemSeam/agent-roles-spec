# Codex Adapter Notes

Mount `agentroles.coder` as `coder`.

Codex should project the role memory and lightweight skills into provider
surfaces that support implementation workflows. Project-specific commands,
approval policy, hooks, MCP, and sandbox settings belong to Codex config or
Project Binding, not this Role source.

The role may write project files when asked, but it does not approve merges,
push code, install dependencies, or run destructive commands without explicit
user or Host Adapter approval.
