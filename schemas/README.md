# Schemas

This directory will contain full validation schemas after the v0.1 metadata
conventions are stable enough to encode.

The current preview metadata rules are documented in
[../specs/metadata-v1.md](../specs/metadata-v1.md). The package manager already
requires `version` and validates optional `created_at` / `updated_at` timestamp
fields when they appear in `role.toml`.
