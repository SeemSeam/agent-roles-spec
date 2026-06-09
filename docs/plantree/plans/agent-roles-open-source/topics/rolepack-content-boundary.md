# RolePack Content Boundary

Date: 2026-06-02

## Purpose

Define what a RolePack can carry for the first public specification preview.

## RolePack Contents

A RolePack may contain:

- role identity and responsibilities
- role memory
- skills
- prompts and templates
- tool scripts and tool documentation
- plugin content
- MCP configuration or examples
- host adapter metadata
- validation notes and conformance tests

The package should let a reviewer understand what the role is, what it carries,
what it needs, and how a compatible host may mount it.

## Plugin Content

Concrete role directories may include plugin content directly under the role.
The README should not frame plugins as export targets or external dependencies
by default.

For v0.1, it is enough to say that compatible hosts may project plugin content
into their native plugin/capability surfaces.

## Forbidden Content

A RolePack must not contain:

- credentials
- API keys or auth tokens
- provider sessions or conversation logs
- runtime pid, socket, pane, lifecycle, or completion authority files
- project-private state
- hidden installer behavior embedded in memory or prompt text

Tools and installer behavior must be declared and reviewable.

## Boundary

RolePack content is source content. Host-generated files are projection output.

The v0.1 spec should emphasize that generated assets must be traceable and
removable, but the first release does not need to implement the runtime that
performs projection cleanup.

## Role Definition And Role Memory

Date: 2026-06-09

Current terminology uses `Role` as the core object. Older `RolePack` wording in
this planning topic is historical until the terminology migration lands.

For v0.1, treat Role source as a static module definition:

- `role.toml` is the Role Definition. It is the machine-readable manifest and
  review contract for the Role's stable identity, responsibilities, non-goals,
  content inventory, advisory permission needs, and host adapter hints.
- `memory.md` is durable role instruction content. It gives the mounted agent
  prose guidance about working style, operating boundaries, examples, and
  domain framing.
- The Role Definition should be compact and parseable. Role memory may be
  longer and instruction-oriented, but it is still stable source content.
- Neither the Role Definition nor role memory should contain a project-specific
  task objective, progress log, conversation history, provider state, or
  project-private state.

The role-level `identity.purpose` describes why the Role exists across tasks.
Concrete task objectives belong to the request, Project Binding, mounted role
instance, or host-owned runtime state.

## Mounted Role And Project Binding

A Role should not be mutated when it is mounted into a concrete project.
Mounting is closer to instantiating a module than editing a module's source.

Project-specific information belongs outside Role source, including:

- mounted instance name
- project scope
- actual permission grants
- task objective
- team or group interaction topology
- project-specific prompt additions or parameters
- runtime progress and handoff state

Future Host Adapter or Role Manager work may define a Project Binding format.
For v0.1, it is enough to document the concept and preserve the source/runtime
boundary.

## Modular Design Model

Use a programming-module analogy to keep the v0.1 design stable:

| Layer | Module Analogy | Ownership |
| :--- | :--- | :--- |
| Role Definition | module metadata / interface | Stable Role source |
| Role memory | module documentation plus durable instructions | Stable Role source |
| Project Binding | constructor arguments / dependency injection | Project or host adapter |
| Mounted Role | instantiated object | Host runtime |
| Projection output | generated host-native assets | Host adapter |
| Runtime state | process memory / logs / session state | Host runtime |

The Role source layer should be versionable and reviewable like source code.
Mounting a Role into a project should not mutate that source layer.

## Field Placement Rules

Fields that belong in the Role Definition:

- stable id, name, version, schema, description, and license
- role-level purpose, responsibilities, and non-goals
- optional advisory interaction posture, such as `interaction_mode`
- optional advisory action posture, such as `initiates_actions`
- source content inventory
- high-level advisory permission needs
- machine-readable adapter hints

Fields that belong outside Role source:

- mounted instance name
- concrete task objective
- project scope and working-directory constraints
- actual permission grants
- team or group interaction topology
- project-specific prompt additions
- runtime progress, traces, and handoff state

Fork a Role when changing its stable identity, responsibilities, non-goals, or
role memory. Use Project Binding when changing instance name, project scope,
permission grants, task objective, or team topology.

## v0.1 Minimal Role Definition

The first release should keep the Role Definition small:

```toml
schema = "agent-role/preview-0.1"
id = "publisher.rolename"
name = "Role Human Name"
version = "0.1.0"
description = "One-line summary of what this role does."
license = "Apache-2.0"

[identity]
purpose = "Why this role exists across tasks."
responsibilities = [
  "What this role owns"
]
non_goals = [
  "What this role deliberately does not do"
]
```

Optional advisory posture fields may be added after the minimum identity
contract is stable:

```toml
[identity]
interaction_mode = "review-only" # review-only | interactive | autonomous
initiates_actions = false
```

Preview permission metadata should stay high-level and advisory:

```toml
[permissions]
read_files = true
write_files = false
network = false
```

Avoid path-level permission semantics in v0.1. In particular, do not use a path
such as `tools/README.md` as if it were an executable permission grant.

## Source Integrity Rule

Host adapters may read Role source and generate host-native projection output,
but projection output must not be written back into the Role source directory.

Examples of projection output include generated subagent files, host-native
skill files, memory bundles, command wrappers, MCP fragments, and role-scoped
plugin projections. These outputs should be traceable to the mounted Role and
removable during unmount, but they are not Role source.

## Tools Preview Rule

For v0.1, `tools/` is source content that may contain tool documentation,
runbooks, scripts, and lifecycle notes. The preview spec should not imply that
host adapters will execute files under `tools/`.

Tool installation, update, and execution behavior must be explicit and
reviewable. Hidden installer behavior embedded in memory or prompt text remains
forbidden.

## Deferred Design Items

Defer these items until the spec has at least one or two concrete adapter
implementations to learn from:

- a unified Project Binding file format
- path-level permission and effect declarations
- treating `[contents]` as an execution manifest
- complete execution and interaction contracts
- role-level `goal` or `outcomes` fields beyond the current identity trio
- runtime progress, plan, or state directories
- hooks, supervisor enforcement, trace, and semantic drift checks
