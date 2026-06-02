# Host Adapters v1 Preview

Status: draft preview

## Purpose

A host adapter describes how a specific host would consume a RolePack.

The core specification stays host-neutral. Host adapters define mapping rules
for Claude Code, Codex, CCB, Hive, and future hosts without changing the source
RolePack format.

## Terms

- `Host`: a consumer environment such as Claude Code, Codex, CCB, or Hive.
- `Adapter`: host-specific rules for consuming a RolePack.
- `Harness`: compatibility or conformance test environment for an adapter.
- `Mount`: activate a RolePack as a specialist agent.
- `Unmount`: remove generated assets and deactivate the role.

## Adapter Contract

An adapter document should describe:

- supported RolePack content types
- unsupported content behavior
- host-native surfaces used by the adapter
- whether role-scoped isolation is possible
- whether mount/unmount cleanup is supported
- which generated files are owned by the role projection
- what behavior is deferred

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

May consume RolePacks through a CCB adapter. CCB's internal role store,
projection, reload, ask, sidebar, and provider-state implementation remain
CCB-owned implementation details, not RolePack specification requirements.

### Hive

May consume RolePacks through a Hive adapter. Hive should publish a capability
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
