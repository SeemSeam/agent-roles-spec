# Host Adapter Strategy

Date: 2026-06-02

## Principle

The core RolePack specification must stay host-neutral. Claude Code, Codex,
CCB, Hive, and future hosts consume the same role package through adapters.

An adapter may render, project, mount, reload, or unmount role contents in a
host-specific way, but adapter behavior must not redefine the core package.

## Terms

- `Host`: a consumer environment such as Claude Code, Codex, CCB, or Hive.
- `Adapter`: host-specific rules for consuming a RolePack.
- `Harness`: a compatibility or conformance test environment for an adapter.
- `Mount`: activate a RolePack as a specialist agent.
- `Unmount`: remove generated assets and deactivate the role.

## Planned Adapter Contracts

### Claude Code

The adapter contract should describe how a RolePack can map to Claude-native
surfaces such as subagents, skills, plugin content, commands, MCP servers, and
memory.

The v0.1 contract should be descriptive only. It should not promise live
mount/unmount behavior.

### Codex

The adapter contract should describe how a RolePack can map to Codex-native
surfaces such as skills, plugin content, commands, MCP configuration, and
memory.

The v0.1 contract should avoid assuming a universal hot reload path.

### CCB

The adapter contract should describe CCB as one possible consumer, not as the
source of the core spec. CCB's internal role store, projection, reload, ask,
sidebar, and provider-state implementation remain CCB-owned.

### Hive

Hive should be treated as an early host partner. Its adapter should provide a
capability profile and role consumption contract without pushing Hive runtime
details into the core spec.

## Capability Profile

Future adapters should declare capabilities such as:

- native agents or subagents
- native skills
- plugin content support
- MCP support
- role-scoped tools
- memory projection
- isolated mount support
- hot reload support
- unmount cleanup support

Capability profiles should describe what a host can honestly support rather
than forcing all hosts into the same runtime shape.
