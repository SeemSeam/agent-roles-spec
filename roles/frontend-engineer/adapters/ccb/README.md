# CCB Adapter Notes

CCB may consume this Role through a CCB adapter. CCB's internal role store,
projection, reload, ask, sidebar, provider-state, and multi-agent routing
remain CCB-owned implementation details.

The Role may document an `agy` delegation workflow, but any actual ask routing,
worktree association, AGY process state, or review handoff belongs to CCB
runtime or Project Binding, not Role source.

If CCB supports role-scoped tool projection, it may consume
`tools/mcp-tools.toml` and `plugins/frontend-mcp-toolbox/` to prepare a private
frontend MCP runtime. Runtime installs should be provider-shared inside CCB's
provider-state for the active provider where possible; generated config, logs,
screenshots, traces, and worktrees must stay outside Role source.

CCB should prefer a provider-state bridge that reads the current project's
binding and loads provider-shared tools. This allows another project using the
same provider to reuse downloaded MCP packages without inheriting this
project's selected Figma file, Storybook URL, browser target, or permissions.

The `role-setup` skill and `tools/role_setup.py` script should run inside the
active provider-state context so it can distinguish CCB-owned provider homes
from global provider homes. Role config uninstall should be coordinated by CCB
or `agent-roles` outside the agent session, using CCB-owned projection records
and mounted-instance state.

Generated CCB-native assets are projection output and must not be written back
into this Role source directory.
