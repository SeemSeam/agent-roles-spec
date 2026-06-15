# Decision 004: Role Setup Is In-Agent Setup, Not Uninstall Authority

Date: 2026-06-15

## Status

Accepted for planning.

## Context

`agentroles.frontend_engineer` now carries `tools/mcp-tools.toml`, MCP toolbox
templates, and a need for provider-aware setup checks after the Role is loaded.
The initial direction used `mcp_install`, but that name is too narrow: future
Roles may need plugin projection, private wrapper commands, browser runtime
checks, AGY availability checks, provider config fragments, and repair handoff
in addition to MCP setup.

The current spec also forbids hidden installers in memory or prompt text and
keeps Role source separate from provider state, credentials, generated config,
package caches, browser profiles, screenshots, traces, worktrees, and
projection records.

## Decision

Model runtime setup as an explicit in-agent Role setup entrypoint with
provider-shared runtime reuse, while keeping role config uninstall in the
manager layer:

- A Role may carry a skill named `role-setup` with user-facing alias
  `role_setup`.
- A Role may carry a reviewable script such as `tools/role_setup.py` or
  `tools/role_setup.mjs`.
- The skill/script runs after the Role is loaded inside the current
  agent/provider environment.
- The default mode is `check` or `plan`; it may inspect environment, provider
  config, installed tool availability, plugin projection inputs, and declared
  tool manifests.
- `apply` and `repair` modes may hand off mutating work only with explicit user
  approval or Project Binding policy.
- Reusable runtime installs go to provider-shared managed paths so projects
  using the same provider do not redownload tools.
- Project-specific selected resources, URLs, enabled tools, and permissions go
  to Project Binding.
- Provider global config should prefer one agent-roles bridge/router that reads
  the current project binding instead of globally exposing every declared MCP
  server.
- Every manager-side mutating setup should write projection ownership records
  outside Role source.
- Role config uninstall must run from the `agent-roles` or Host Adapter layer
  that owns Project Binding, mounted-instance state, and projection records.
- `role_setup` must not expose an in-agent uninstall mode.
- Global provider config writes require an explicit global scope selection.

`role_install` is not the primary term because `agent-roles install` already
means Role source installation. `role_setup` describes post-load runtime
activation without overloading the source-store install command.

## Consequences

- `agent-roles add <role>` remains a source-store operation with no tool side
  effects.
- Host Adapters can call `role_setup --mode check` on startup without making
  changes.
- Host Adapters can offer one shallow `setup` action instead of exposing a
  `tools install/doctor/uninstall` command tree.
- Subsequent projects can reuse provider-shared runtime and only create or
  update lightweight project binding.
- Host Adapters or `agent-roles` can offer `unmount` as the manager-side
  cleanup pair for setup, backed by projection records.
- Provider detection and config writing stay provider-aware and happen in the
  same environment that will use the runtime tools.
- Secrets stay external. Scripts may reference environment variable names but
  must never write token values into Role source.

## Open Follow-Up

Define the first manager-side Host Adapter implementation, including package
installation, provider config patching, projection-record format, repair
behavior, and role config uninstall/unmount cleanup.
