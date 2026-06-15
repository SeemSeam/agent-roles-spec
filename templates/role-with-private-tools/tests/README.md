# Validation Notes

Validate this template by checking:

- `role.toml` parses and lists `contents.tool_manifests`.
- `tools/mcp-tools.toml` parses and matches the preview tool-manifest schema.
- plugin templates do not contain real credentials.
- no installed dependencies, generated config, package caches, logs, screenshots,
  traces, or runtime state are present in Role source.
