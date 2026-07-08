# Codex Adapter Notes

Mount `agentroles.open-design` as `open-design`.

Codex should project only the wrapper memory and these active skills into
Codex-native startup surfaces:

- `skills/open-design-workbench`
- `skills/od-contribute`

Do not project `upstream/open-design/skills`,
`upstream/open-design/design-templates`, or `upstream/open-design/plugins` as
startup skills. They contain hundreds of upstream `SKILL.md` files and should
remain on disk as a searchable reference library. `open-design-workbench`
selects and reads specific upstream files only when the current task needs
them.

The full upstream Open Design source is available under `upstream/open-design/`
for inspection and optional runtime planning.

If Codex supports tool manifests, it may consume
`tools/open-design-tools.toml` to plan provider-shared Open Design runtime,
`od` CLI access, and MCP projection. Generated Codex config, MCP fragments,
provider state, credentials, daemon data, package installs, screenshots,
traces, and local ports remain outside Role source.

Do not write `~/.codex/config.toml` or install MCP servers directly from this
Role source without explicit adapter-owned approval and projection records.
