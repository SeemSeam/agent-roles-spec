# CCB Adapter Notes

CCB may consume this Role through a CCB adapter. CCB's internal role store,
projection, reload, ask, sidebar, provider-state, and multi-agent routing
remain CCB-owned implementation details.

The Role may document an `agy` delegation workflow, but any actual ask routing,
worktree association, AGY process state, or review handoff belongs to CCB
runtime or Project Binding, not Role source.

If CCB supports role-scoped tool projection, it may consume
`tools/mcp-tools.toml` and `plugins/frontend-mcp-toolbox/` to prepare a private
frontend MCP runtime. Runtime installs, generated config, logs, screenshots,
traces, and worktrees must stay outside Role source.

Generated CCB-native assets are projection output and must not be written back
into this Role source directory.
