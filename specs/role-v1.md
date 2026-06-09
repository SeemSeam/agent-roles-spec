# Role v1 Preview

Status: draft preview

## Purpose

A Role is a portable definition for one specialist AI agent.

It describes who the role is, what it is responsible for, what content it
carries, and how compatible hosts may mount it as an isolated role instance.
Role source is a static module definition: it is reviewable, versioned, and
portable. Mounting a Role into a concrete project must not mutate the Role
source by default.

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
- `role.toml`: the Role Definition. See [metadata-v1.md](metadata-v1.md).
- `memory.md`: durable role instructions, working style, and operating
  boundaries.
- `skills/`: reusable capabilities carried by the role.
- `prompts/`: prompt fragments, examples, and reusable task templates.
- `tools/`: tool documentation, runbooks, scripts, and explicit lifecycle
  notes. The preview spec does not imply that hosts execute these files.
- `plugins/`: host-native plugin files bundled with the role.
- `adapters/`: host-specific notes or metadata for this role.
- `tests/`: validation notes, fixtures, or conformance examples.

## Role Definition And Role Memory

`role.toml` is the compact, machine-readable Role Definition. It declares the
Role's stable identity, responsibilities, non-goals, content inventory,
advisory permission needs, and host adapter hints.

`memory.md` is durable instruction content for mounted agents. It may describe
the Role's operating posture, examples, domain framing, and output guidance.
Role memory is still source content: it must not store project-specific task
objectives, progress logs, session summaries, provider state, or private
project state.

If the Role Definition and role memory conflict, the Role Definition is the
authoritative contract and validators should report the inconsistency.

## Plugin Content

Plugin content is role-contained source content. It may include host-native
plugin files that a future host adapter can project into a role-scoped runtime
environment.

The preview spec does not require a global plugin manager, plugin marketplace,
or external plugin dependency resolver.

## Source And Projection Boundary

Role files are source content. Source content is reviewable and versioned with
the role.

A host adapter may generate host-native files from role source content. Those
generated files are projection output — they should be traceable to the role
and removable on unmount. Projection output must not be written back into the
Role source directory.

Examples of projection output may include:

- host-native skill files
- host-native agent or subagent files
- memory bundles
- command wrappers
- MCP configuration fragments
- role-contained plugin content copied or linked into a managed location

The preview spec does not define a runtime implementation for projection or
cleanup. Host adapters own that behavior.

## Mounted Role And Project Binding

A mounted Role is a host-owned instance of Role source in a concrete project.
Project-specific configuration belongs outside Role source. This includes:

- mounted instance or display name
- project scope and working-directory constraints
- concrete task objective
- actual permission grants
- team or group interaction topology
- project-specific prompt additions or parameters
- runtime progress, traces, handoff notes, and session state

For v0.1, Project Binding is a concept rather than a required cross-host file
format. Host adapters should describe how they represent binding semantics
without redefining the core Role source format.

## Forbidden Content

A Role must not contain:

- credentials
- API keys or auth tokens
- provider sessions, conversation logs, or conversation histories
- runtime pid files, socket paths, pane, lifecycle, or completion authority files
- runtime progress, handoff state, trace logs, or mounted instance state
- concrete project task objectives or project binding state
- project-private state

Tool installation, update, and diagnostic behavior must be declared in metadata
or documented under `tools/`. Hidden installer behavior embedded in memory or
prompt text is forbidden.

## Permission Declarations

Permission metadata in the preview is a high-level declaration of role needs,
not an enforcement mechanism and not an automatic grant.

Host adapters may use permission declarations to decide whether a role can be
mounted safely, but the preview spec does not provide a complete permission
runtime. Fine-grained path, command, tool, or effect semantics are deferred.
Adapters should report or ignore unsupported declarations deterministically;
they must not silently treat advisory declarations as grants.

## Compatibility

The core role source format is host-neutral. Claude Code, Codex, CCB, Hive, and
future hosts should consume the same role source through host adapters.

Unsupported content should be rejected or ignored deterministically by the
adapter. It must not be silently projected into the wrong host surface.
