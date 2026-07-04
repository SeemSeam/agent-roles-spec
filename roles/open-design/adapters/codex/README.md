# Codex Adapter Notes

Mount `agentroles.open-design` as `open-design`.

Codex may project the wrapper memory and `open-design-workbench` skill into
Codex-native surfaces. The full upstream Open Design source is available under
`upstream/open-design/` for inspection and optional runtime planning.

If Codex supports tool manifests, it may consume
`tools/open-design-tools.toml` to plan provider-shared Open Design runtime,
`od` CLI access, and MCP projection. Generated Codex config, MCP fragments,
provider state, credentials, daemon data, package installs, screenshots,
traces, and local ports remain outside Role source.

Do not write `~/.codex/config.toml` or install MCP servers directly from this
Role source without explicit adapter-owned approval and projection records.
