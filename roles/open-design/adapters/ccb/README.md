# CCB Adapter Notes

Mount `agentroles.open-design` as `open-design`.

CCB may use this Role as a source-carrying Open Design wrapper. CCB runtime
state, provider-state directories, panes, reloads, ask routing, generated
projection output, and tool installation ledgers remain CCB-owned behavior.

When CCB projects this Role into a Codex-backed agent, it should expose only
these active startup skills:

- `skills/open-design-workbench`
- `skills/od-contribute`

Do not recursively project upstream Open Design `SKILL.md` files from
`upstream/open-design/skills`, `upstream/open-design/design-templates`, or
`upstream/open-design/plugins`. Keep those files as on-disk references and load
individual files only after the wrapper skill selects them for a task.

If CCB supports role-scoped tool projection, it may consume
`tools/open-design-tools.toml` and the vendored upstream source to prepare a
provider-shared Open Design runtime. Generated MCP config, daemon data,
credentials, package caches, local projects, screenshots, traces, logs, and
plugin state must stay outside Role source.

Role unmount should be manager-side and based on CCB or agent-roles projection
ownership records, not on commands run from inside an Open Design agent
session.
