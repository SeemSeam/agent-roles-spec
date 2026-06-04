# Package Manager And Roles Store

Date: 2026-06-04

## Objective

Define the first `agent-roles` package-management layer for `.roles` content
sync, installation, update, diagnostics, digest metadata, and alias migration.

This layer is host-neutral package management. Hosts such as CCB still own
project config, project locks, projection, reload, prompt policy, localized
output, and runtime behavior.

## Responsibilities

`agent-roles` owns:

- catalog discovery and sync
- the `.roles` package store
- `list`, `install`, `update`, `sync`, `doctor`, and `resolve`
- role version, digest, source, provenance, and installed path metadata
- aliases such as `ccb.archi -> agentroles.archi`
- package-level validation and machine-readable diagnostics

Hosts own:

- project adoption and locks
- provider/session/runtime projection
- host-specific tool execution policy
- human prompts and i18n
- daemon, sidebar, ask, mailbox, and reload behavior

## First CLI Slice

The first executable slice exposes JSON output:

```bash
python -m agent_roles list --json
python -m agent_roles install agentroles.archi --json
python -m agent_roles update agentroles.archi --json
python -m agent_roles sync . --json
python -m agent_roles doctor agentroles.archi --json
python -m agent_roles resolve agentroles.archi --json
```

The repo-local `cli/agent-roles` wrapper calls the same Python module. Host
adapters should consume the JSON form and ignore the human text form.

## Store Shape

The preview default is:

```text
~/.roles/
  catalogs/
  installed/
    agentroles.archi/
      current -> versions/<version>/<digest>/
      install.json
      versions/<version>/<digest>/
```

`AGENT_ROLES_STORE` may override this root for tests and host-managed
environments.

## CCB Compatibility

The first CCB compatibility requirements are:

- canonical id `agentroles.archi`
- legacy alias `ccb.archi`
- content-addressed installed paths
- stable JSON for install/update/sync/list/doctor/resolve
- installed paths that CCB can project from without network access
- metadata that CCB can copy into `.ccb/role-lock.json`

CCB may keep a compatibility bridge for its current
`$XDG_DATA_HOME/ccb/roles/` store while it learns to read the spec-owned
`.roles/installed` store.
