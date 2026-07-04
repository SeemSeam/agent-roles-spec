# CCB Adapter Notes

Mount `agentroles.open-design` as `open-design`.

CCB may use this Role as a source-carrying Open Design wrapper. CCB runtime
state, provider-state directories, panes, reloads, ask routing, generated
projection output, and tool installation ledgers remain CCB-owned behavior.

If CCB supports role-scoped tool projection, it may consume
`tools/open-design-tools.toml` and the vendored upstream source to prepare a
provider-shared Open Design runtime. Generated MCP config, daemon data,
credentials, package caches, local projects, screenshots, traces, logs, and
plugin state must stay outside Role source.

Role unmount should be manager-side and based on CCB or agent-roles projection
ownership records, not on commands run from inside an Open Design agent
session.
