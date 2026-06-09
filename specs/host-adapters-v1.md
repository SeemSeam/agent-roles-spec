# Host Adapters v1 Preview

Status: draft preview

## Purpose

A host adapter describes how a specific host would consume a Role.

The core specification stays host-neutral. Host adapters define mapping rules
for Claude Code, Codex, CCB, Hive, and future hosts without changing the core
Role source format.

## Terms

- `Host`: a consumer environment such as Claude Code, Codex, CCB, or Hive.
- `Adapter`: host-specific rules for consuming a Role.
- `Harness`: compatibility or conformance test environment for an adapter.
- `Mount`: activate a Role as a specialist agent.
- `Unmount`: remove generated assets and deactivate the role.

## Adapter Contract

An adapter document should describe:

- supported Role content types
- unsupported content behavior
- host-native surfaces used by the adapter
- how Project Binding semantics are represented, if mounting is supported
- whether role-scoped isolation is possible
- whether mount/unmount cleanup is supported
- which generated files are owned by the role projection
- what behavior is deferred

## Project Binding

Project Binding is the host-specific configuration that mounts a Role source
definition into a concrete project. It is separate from the Role Definition.

For v0.1, the core spec defines the concept but does not require one shared
cross-host binding file format. A host adapter that supports mounting should
describe how it represents:

- Role id and version being mounted
- mounted instance or display name
- project scope or working-directory limits
- actual permission grants approved for the mounted instance
- project-specific prompt additions or parameters, if supported
- team or group interaction topology, if supported
- generated projection outputs owned by the mounted Role
- unmount cleanup behavior for owned projection outputs

The binding layer may configure or narrow a Role for a concrete project. It
must not redefine the Role's stable identity, responsibilities, or non-goals.
If those stable fields need to change, the correct operation is to fork or
derive a new Role.

## Projection Integrity

Adapters may generate host-native assets from Role source. Those assets are
projection output, not Role source.

Adapters should keep projection output traceable to the mounted Role and
removable during unmount. Adapter-generated output must not be written back
into the Role source directory.

## Planned Hosts

### Claude Code

May map role content to Claude-native surfaces such as subagents, skills,
plugin content, commands, MCP servers, memory, or project/user/plugin scopes.

The preview does not promise live runtime mounting.

### Codex

May map role content to Codex-native surfaces such as skills, plugin content,
commands, MCP configuration, memory, or managed home projections.

Hot reload is not required by this preview contract.

### CCB

May consume Roles through a CCB adapter. CCB's internal role store,
projection, reload, ask, sidebar, and provider-state implementation remain
CCB-owned implementation details, not role specification requirements.

### Hive

May consume Roles through a Hive adapter. Hive should publish a capability
profile rather than pushing Hive runtime details into the core spec.

## Capability Profile

Future adapter docs should be able to state whether a host supports:

- native agents or subagents
- skills
- role-contained plugin content
- MCP
- role-scoped tools
- memory projection
- isolated mount
- hot reload
- unmount cleanup

Capabilities should be declared honestly per host. The core spec must not
assume every host supports the same runtime behavior.
