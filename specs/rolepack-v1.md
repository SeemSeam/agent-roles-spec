# RolePack v1 Preview

Status: draft preview

## Purpose

A RolePack is a portable package for one specialist AI agent role.

It describes who the role is, what it is responsible for, what content it
carries, and how compatible hosts may mount it as an isolated role instance.

This document defines the first public package convention. It is intentionally
conservative: runtime mounting, hot reload, registries, and host-specific
installers are future work.

## Package Shape

```text
role/
  README.md
  role.toml
  memory.md
  skills/
  prompts/
  tools/
  plugins/
  adapters/
  tests/
```

Only `README.md`, `role.toml`, and at least one useful role content source are
expected in the preview. A minimal role can contain only metadata and memory.

## Content Types

- `README.md`: human-facing explanation, examples, and role boundaries.
- `role.toml`: role metadata. See [metadata-v1.md](metadata-v1.md).
- `memory.md`: durable role instructions and operating boundaries.
- `skills/`: reusable capabilities carried by the role.
- `prompts/`: prompt fragments, examples, and reusable task templates.
- `tools/`: tool scripts, runbooks, and explicit lifecycle documentation.
- `plugins/`: host-native plugin files bundled with the role.
- `adapters/`: host-specific notes or metadata.
- `tests/`: validation notes, fixtures, or conformance examples.

## Plugin Content

Plugin content is role-contained source content. It may include host-native
plugin files that a future host adapter can project into a role-scoped runtime
environment.

The preview spec does not require a global plugin manager, plugin marketplace,
or external plugin dependency resolver.

## Source And Projection Boundary

RolePack files are source content.

Host-generated files are projection output. A future host adapter should make
generated assets traceable and removable, but this preview does not define a
runtime implementation.

## Forbidden Content

A RolePack must not contain:

- credentials
- API keys or auth tokens
- provider sessions or conversation logs
- runtime pid, socket, pane, lifecycle, or completion authority files
- project-private state
- hidden installer behavior embedded in memory or prompt text

Tool installation, update, and diagnostic behavior must be declared in metadata
or documented under `tools/`.

## Compatibility

The core RolePack format is host-neutral. Claude Code, Codex, CCB, Hive, and
future hosts should consume the same source package through host adapters.

Unsupported content should be rejected or ignored deterministically by the
adapter. It must not be silently projected into the wrong host surface.
