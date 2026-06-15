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
- whether tool manifests, provider-shared installs, and role-private installs
  are supported
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

## Tool Manifest Projection

If a Host Adapter supports `contents.tool_manifests`, it should publish a
capability profile that states:

- whether MCP server declarations are supported;
- whether role-private tool installation is supported;
- whether provider-shared tool installation is supported;
- where role-private runtime files are stored;
- when user or host approval is required before install/update/uninstall;
- which projection outputs are owned by the mounted Role;
- how doctor checks report missing tools, missing secrets, and unsupported
  declarations;
- how unmount removes generated config and adapter-owned runtime files.
- how setup ownership is recorded for later repair and manager-side unmount
  cleanup.

Adapters must preserve the source/projection boundary. A tool manifest may
produce host-native MCP configuration fragments, wrapper commands, or plugin
projection output, but those generated files remain host-owned and removable.
Credentials, browser profiles, selected Figma files, local dev-server URLs,
package caches, AGY worktrees, screenshots, traces, and logs remain Project
Binding or runtime concerns.

Adapters should separate provider-shared runtime from project binding. MCP
packages, wrappers, and reusable browser/runtime dependencies may be installed
once per provider and reused across projects. Project-specific selected files,
URLs, permissions, and enabled-tool lists belong to Project Binding. When a
provider supports it, prefer projecting one agent-roles bridge/router into the
provider config; the bridge reads the current project binding and exposes only
the tools enabled for that project.

Adapters should keep user-facing commands simple: prefer a single
provider-aware setup or mount step for projection and a single check step for
diagnostics. More granular lifecycle operations may exist internally, but they
should not be the primary command model.

When a Role carries a `role-setup` skill or `tools/role_setup.*` script, the
adapter may use it as the in-provider check/plan entrypoint. Mutating
`apply` and `repair` behavior remains adapter-owned and should write or
consume projection records outside Role source. Role config uninstall should
not be delegated to the in-agent script; it belongs to the agent-roles or Host
Adapter layer that can see Project Binding, mounted instances, other active
windows, and projection ownership.

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
- tool manifests
- memory projection
- isolated mount
- hot reload
- unmount cleanup

Capabilities should be declared honestly per host. The core spec must not
assume every host supports the same runtime behavior.
