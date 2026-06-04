# Role v1 Preview

Status: draft preview

## Purpose

A Role is a portable definition for one specialist AI agent.

It describes who the role is, what it is responsible for, what content it
carries, and how compatible hosts may mount it as an isolated role instance.

This document defines the first public role directory convention. It is intentionally
conservative: runtime mounting, hot reload, registries, and host-specific
installers are future work.

## Directory Shape

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
- `adapters/`: host-specific notes or metadata for this role.
- `tests/`: validation notes, fixtures, or conformance examples.

## Plugin Content

Plugin content is role-contained source content. It may include host-native
plugin files that a future host adapter can project into a role-scoped runtime
environment.

The preview spec does not require a global plugin manager, plugin marketplace,
or external plugin dependency resolver.

## Source And Projection Boundary

Role files are source content. Source content is reviewable and versioned with
the role. The Role Definition carries the package `version`, and published
catalog roles should also carry `created_at` and `updated_at` revision
timestamps. See [metadata-v1.md](metadata-v1.md).

A host adapter may generate host-native files from role source content. Those
generated files are projection output — they should be traceable to the role
and removable on unmount.

Examples of projection output may include:

- host-native skill files
- host-native agent or subagent files
- memory bundles
- command wrappers
- MCP configuration fragments
- role-contained plugin content copied or linked into a managed location

The preview spec does not define a runtime implementation for projection or
cleanup. Host adapters own that behavior.

## Forbidden Content

A Role must not contain:

- credentials
- API keys or auth tokens
- provider sessions, conversation logs, or conversation histories
- runtime pid files, socket paths, pane, lifecycle, or completion authority files
- project-private state

Tool installation, update, and diagnostic behavior must be declared in metadata
or documented under `tools/`. Hidden installer behavior embedded in memory or
prompt text is forbidden.

## Permission Declarations

Permission metadata in the preview is a declaration of role needs, not an
enforcement mechanism.

Host adapters may use permission declarations to decide whether a role can be
mounted safely, but the preview spec does not provide a complete permission
runtime.

## Compatibility

The core role source format is host-neutral. Claude Code, Codex, CCB, Hive, and
future hosts should consume the same role source through host adapters.

Unsupported content should be rejected or ignored deterministically by the
adapter. It must not be silently projected into the wrong host surface.
