# Schemas

This directory will contain full validation schemas after the v0.1 metadata
conventions are stable enough to encode.

The current preview metadata rules are documented in
[../specs/metadata-v1.md](../specs/metadata-v1.md). The package manager already
requires `version` and validates optional `created_at` / `updated_at` timestamp
fields when they appear in `role.toml`. It also exposes optional
`catalog.level` metadata as `catalog_level` in list/resolve/install payloads,
defaulting omitted levels to `preview`.

Additional preview schemas:

- [tool-manifest.schema.json](tool-manifest.schema.json): optional
  role-contained tool/MCP manifest shape for hosts that support
  provider-shared, role-private, or project-private tool runtime projection.
  Older Roles and older hosts can ignore these manifests.
